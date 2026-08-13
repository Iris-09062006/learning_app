import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { NineRouterLessonDraftProvider, type LessonDraftProvider } from "@/features/content-pipeline/providers/lesson-draft-provider";
import {
  createContentTarget,
  createContentCurriculum,
  createSourceDocument,
  downloadSourceObject,
  getCourseGenerationContext,
  getCourseImport,
  getCourseImportGenerationContext,
  getCourseImportChunks,
  getGenerationContext,
  getLessonDraft,
  getSourceDocument,
  listLessonDrafts,
  listCourseImports,
  listContentChapters,
  listContentCourses,
  listContentTargets,
  persistGeneratedDraft,
  persistGeneratedCourseDraft,
  persistCourseOutline,
  persistCourseOutlineForJob,
  persistCourseLessonContentForJob,
  prepareCourseLessonGeneration,
  publishCourseImport,
  publishLessonDraft,
  removeSourceObject,
  replaceDocumentChunks,
  reviewLessonDraft,
  reviewCourseDraftBatch,
  reviewCourseImport,
  reviseCourseLessonContent,
  reviseLessonDraft,
  updateSourceStatus,
  failCourseImport,
  uploadSourceObject,
} from "@/features/content-pipeline/repositories/content-pipeline-repository";
import {
  SUPPORTED_SOURCE_MIME_TYPES,
  type LessonDraftReviewDecision,
  type CourseImportDraft,
  type CourseSourceChunk,
  type CourseSourceRef,
  type ProviderStructuredCourseOutline,
  type ProviderStructuredLessonDraft,
  type StructuredCourseOutline,
  type StructuredLessonDraft,
  type SupportedSourceMimeType,
} from "@/features/content-pipeline/types";
import { documentTitleFromFilename } from "@/features/content-pipeline/utils/document-title";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class ContentPipelineError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "INVALID_STATE"
      | "STORAGE_ERROR"
      | "EXTRACTION_ERROR"
      | "AI_PROVIDER_ERROR"
      | "RATE_LIMITED"
      | "DATABASE_ERROR",
    message: string
  ) {
    super(message);
    this.name = "ContentPipelineError";
  }
}

async function requireAdmin(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new ContentPipelineError("UNAUTHENTICATED", "Authentication is required.");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", authData.user.id).maybeSingle();
  if (!profile?.is_active || profile.role !== "admin") throw new ContentPipelineError("FORBIDDEN", "Active Admin role required.");
  return authData.user.id;
}

async function requireAiCapacity(scope: "ai:course-outline" | "ai:lesson-content", actorId: string) {
  const result = await checkRateLimit(scope, actorId);
  if (!result.allowed) {
    throw new ContentPipelineError("RATE_LIMITED", `Rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`);
  }
}

function sanitizeFilename(name: string): string {
  const normalized = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 120) || "source-document";
}

function asPositiveId(value: unknown, field: string): number {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ContentPipelineError("VALIDATION_ERROR", `${field} must be a positive integer.`);
  return id;
}

export async function uploadContentSource(file: File) {
  const adminId = await requireAdmin();
  if (!file.name || file.size < 1 || file.size > MAX_FILE_BYTES) throw new ContentPipelineError("VALIDATION_ERROR", "File must be between 1 byte and 10 MiB.");
  if (!SUPPORTED_SOURCE_MIME_TYPES.includes(file.type as SupportedSourceMimeType)) throw new ContentPipelineError("VALIDATION_ERROR", "Unsupported document type.");
  const storagePath = `${adminId}/${randomUUID()}/${sanitizeFilename(file.name)}`;
  try {
    await uploadSourceObject(storagePath, file);
    try {
      return await createSourceDocument({
        uploadedBy: adminId,
        originalFilename: file.name,
        storagePath,
        mimeType: file.type as SupportedSourceMimeType,
        sizeBytes: file.size,
      });
    } catch (error: unknown) {
      await removeSourceObject(storagePath);
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("STORAGE_ERROR", "Unable to store the source document.");
  }
}

export async function extractContentSource(value: unknown) {
  await requireAdmin();
  const id = asPositiveId(value, "documentId");
  const document = await getSourceDocument(id);
  if (!document) throw new ContentPipelineError("NOT_FOUND", "Source document not found.");
  if (!(["uploaded", "failed"] as const).includes(document.status as "uploaded" | "failed")) throw new ContentPipelineError("INVALID_STATE", "Source document cannot be extracted in its current state.");
  await updateSourceStatus(id, "extracting");
  try {
    const extractor = await import("@/features/content-pipeline/extraction/document-extractor");
    const buffer = await downloadSourceObject(document.storage_bucket, document.storage_path);
    const text = await extractor.extractDocumentText(buffer, document.mimeType);
    const chunks = extractor.chunkDocumentText(text);
    await replaceDocumentChunks(id, createHash("sha256").update(buffer).digest("hex"), text.length, chunks);
    return { documentId: id, status: "extracted" as const, chunkCount: chunks.length, characterCount: text.length };
  } catch (error: unknown) {
    const extractionCode = error instanceof Error && error.name === "DocumentExtractionError"
      ? (error as Error & { code?: unknown }).code
      : undefined;
    const errorCode = typeof extractionCode === "string" ? extractionCode : "EXTRACTION_FAILED";
    await updateSourceStatus(id, "failed", errorCode).catch(() => undefined);
    throw new ContentPipelineError("EXTRACTION_ERROR", "Unable to extract this document.");
  }
}

export async function generateLessonDraft(
  sourceDocumentIdValue: unknown,
  targetLessonIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  await requireAdmin();
  const sourceDocumentId = asPositiveId(sourceDocumentIdValue, "documentId");
  const targetLessonId = asPositiveId(targetLessonIdValue, "targetLessonId");
  const context = await getGenerationContext(sourceDocumentId, targetLessonId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Source document or target lesson not found.");
  const retryableGenerationFailure = context.document.status === "failed"
    && context.document.error_code === "GENERATION_FAILED";
  if (context.document.status !== "extracted" && !retryableGenerationFailure) {
    throw new ContentPipelineError("INVALID_STATE", "Source document must be extracted before generation.");
  }
  if (!context.chunks.length) throw new ContentPipelineError("INVALID_STATE", "Source document has no extracted chunks.");
  await updateSourceStatus(sourceDocumentId, "generating");
  try {
    const selectedChunks = [] as typeof context.chunks;
    let selectedCharacters = 0;
    for (const chunk of context.chunks) {
      if (selectedCharacters + chunk.content.length > 80_000 && selectedChunks.length > 0) break;
      selectedChunks.push(chunk);
      selectedCharacters += chunk.content.length;
    }
    const generated = await provider.generateLessonDraft({
      documentTitle: context.document.original_filename,
      lessonTitle: context.lesson.title,
      chunks: selectedChunks.map((chunk) => ({ chunkIndex: chunk.chunk_index, content: chunk.content })),
    });
    if (!generated.draft.sections.every((section) => Array.isArray(section.citationChunkIndexes))) {
      throw new Error("AI_RESPONSE_INVALID");
    }
    const draftId = await persistGeneratedDraft({
      sourceDocumentId,
      courseId: context.lesson.chapters.course_id,
      chapterId: context.lesson.chapter_id,
      targetLessonId,
      draft: generated.draft as StructuredLessonDraft,
      provider: generated.provider,
      model: generated.model,
    });
    return { lessonDraftId: draftId, status: "pending_review" as const };
  } catch {
    await updateSourceStatus(sourceDocumentId, "failed", "GENERATION_FAILED").catch(() => undefined);
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate a valid cited lesson draft.");
  }
}

export async function generateCourseDraft(
  sourceDocumentIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  await requireAdmin();
  const sourceDocumentId = asPositiveId(sourceDocumentIdValue, "documentId");
  const context = await getCourseGenerationContext(sourceDocumentId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Source document not found.");
  const retryableGenerationFailure = context.document.status === "failed"
    && context.document.error_code === "GENERATION_FAILED";
  if (context.document.status !== "extracted" && !retryableGenerationFailure) {
    throw new ContentPipelineError("INVALID_STATE", "Source document must be extracted before generation.");
  }
  if (!context.chunks.length) {
    throw new ContentPipelineError("INVALID_STATE", "Source document has no extracted chunks.");
  }
  await updateSourceStatus(sourceDocumentId, "generating");
  try {
    if (!provider.generateCourseDraft) throw new Error("AI_PROVIDER_UNSUPPORTED");
    const selectedChunks = [] as typeof context.chunks;
    let selectedCharacters = 0;
    for (const chunk of context.chunks) {
      if (selectedCharacters + chunk.content.length > 80_000 && selectedChunks.length > 0) break;
      selectedChunks.push(chunk);
      selectedCharacters += chunk.content.length;
    }
    const generated = await provider.generateCourseDraft({
      documentTitle: context.document.original_filename,
      chunks: selectedChunks.map((chunk) => ({
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
      })),
    });
    return await persistGeneratedCourseDraft({
      sourceDocumentId,
      courseSlug: curriculumSlug(generated.draft.title),
      draft: generated.draft,
      provider: generated.provider,
      model: generated.model,
    });
  } catch {
    await updateSourceStatus(sourceDocumentId, "failed", "GENERATION_FAILED").catch(() => undefined);
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate a valid cited Course draft.");
  }
}

function validateStringList(value: unknown, field: string, maxItems: number): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) {
    throw new ContentPipelineError("VALIDATION_ERROR", `${field} is invalid.`);
  }
  const items = value.map((item) => {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 300) {
      throw new ContentPipelineError("VALIDATION_ERROR", `${field} is invalid.`);
    }
    return item.trim();
  });
  if (new Set(items).size !== items.length) {
    throw new ContentPipelineError("VALIDATION_ERROR", `${field} contains duplicates.`);
  }
  return items;
}

function validateCourseOutline(value: unknown): StructuredCourseOutline {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Course outline is invalid.");
  }
  const outline = value as Record<string, unknown>;
  const allowedKeys = new Set(["title", "description", "learningObjectives", "lessons"]);
  if (!Object.keys(outline).every((key) => allowedKeys.has(key)) ||
    typeof outline.title !== "string" || !outline.title.trim() || outline.title.trim().length > 150 ||
    typeof outline.description !== "string" || !outline.description.trim() ||
    !Array.isArray(outline.lessons) || outline.lessons.length < 2 || outline.lessons.length > 20) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Course outline is invalid.");
  }
  const keys = new Set<string>();
  const lessons = outline.lessons.map((lesson) => {
    if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Outline Lesson is invalid.");
    }
    const item = lesson as Record<string, unknown>;
    const allowedLessonKeys = new Set(["clientKey", "title", "summary", "learningObjectives", "sourceChunkIndexes", "sourceRefs"]);
    const sourceChunkIndexes = Array.isArray(item.sourceChunkIndexes) ? item.sourceChunkIndexes : [];
    const rawSourceRefs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
    const sourceRefs = rawSourceRefs.map((sourceRef) => {
      if (!sourceRef || typeof sourceRef !== "object" || Array.isArray(sourceRef)) {
        throw new ContentPipelineError("VALIDATION_ERROR", "Outline Lesson is invalid.");
      }
      const ref = sourceRef as Record<string, unknown>;
      if (!Object.keys(ref).every((key) => ["sourceDocumentId", "chunkIndex"].includes(key)) ||
        !Number.isSafeInteger(ref.sourceDocumentId) || Number(ref.sourceDocumentId) <= 0 ||
        !Number.isSafeInteger(ref.chunkIndex) || Number(ref.chunkIndex) < 0) {
        throw new ContentPipelineError("VALIDATION_ERROR", "Outline Lesson is invalid.");
      }
      return { sourceDocumentId: Number(ref.sourceDocumentId), chunkIndex: Number(ref.chunkIndex) };
    });
    const sourceRefKeys = sourceRefs.map((ref) => `${ref.sourceDocumentId}:${ref.chunkIndex}`);
    if (!Object.keys(item).every((key) => allowedLessonKeys.has(key)) ||
      typeof item.clientKey !== "string" || !item.clientKey.trim() || item.clientKey.trim().length > 80 ||
      keys.has(item.clientKey.trim()) || typeof item.title !== "string" || !item.title.trim() ||
      item.title.trim().length > 150 || typeof item.summary !== "string" || !item.summary.trim() ||
      (sourceChunkIndexes.length < 1 && sourceRefs.length < 1) ||
      (sourceChunkIndexes.length > 0 && sourceRefs.length > 0) ||
      !sourceChunkIndexes.every((index) => Number.isInteger(index) && Number(index) >= 0) ||
      new Set(sourceChunkIndexes).size !== sourceChunkIndexes.length ||
      new Set(sourceRefKeys).size !== sourceRefKeys.length) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Outline Lesson is invalid.");
    }
    const clientKey = item.clientKey.trim();
    keys.add(clientKey);
    return {
      clientKey,
      title: item.title.trim(),
      summary: item.summary.trim(),
      learningObjectives: validateStringList(item.learningObjectives, "Lesson learning objectives", 12),
      sourceChunkIndexes: sourceChunkIndexes.map(Number),
      sourceRefs: sourceRefs.length ? sourceRefs : undefined,
    };
  });
  return {
    title: outline.title.trim(),
    description: outline.description.trim(),
    learningObjectives: validateStringList(outline.learningObjectives, "Course learning objectives", 20),
    lessons,
  };
}

function selectLegacyProviderChunks<T extends { content: string }>(chunks: T[]): T[] {
  const selected: T[] = [];
  let characters = 0;
  for (const chunk of chunks) {
    if (characters + chunk.content.length > 80_000 && selected.length > 0) break;
    selected.push(chunk);
    characters += chunk.content.length;
  }
  return selected;
}

export function selectCourseImportProviderChunks(
  chunks: CourseSourceChunk[],
  characterLimit = 80_000
): CourseSourceChunk[] {
  const groups = new Map<number, CourseSourceChunk[]>();
  for (const chunk of [...chunks].sort((left, right) =>
    left.sourceOrder - right.sourceOrder || left.chunkIndex - right.chunkIndex
  )) groups.set(chunk.sourceOrder, [...(groups.get(chunk.sourceOrder) ?? []), chunk]);
  const selected: CourseSourceChunk[] = [];
  let characters = 0;
  const orderedGroups = [...groups.entries()].sort(([left], [right]) => left - right).map(([, items]) => items);
  for (let chunkIndex = 0; orderedGroups.some((items) => chunkIndex < items.length); chunkIndex += 1) {
    for (const items of orderedGroups) {
      const chunk = items[chunkIndex];
      if (!chunk || chunk.content.length > characterLimit - characters) continue;
      selected.push(chunk);
      characters += chunk.content.length;
    }
  }
  return selected;
}

function sourceRefKey(ref: CourseSourceRef) {
  return `${ref.sourceDocumentId}:${ref.chunkIndex}`;
}

function sourceLabel(chunk: CourseSourceChunk) {
  const location = chunk.sourceDomain ?? chunk.sourceUrl ?? "private file";
  return `${chunk.sourceTitle} (${location}), local chunk ${chunk.chunkIndex}`;
}

function resolveJobOutline(
  value: unknown,
  context: NonNullable<Awaited<ReturnType<typeof getCourseImportGenerationContext>>>
) {
  const outline = validateCourseOutline(value);
  const byRef = new Map(context.chunks.map((chunk) => [sourceRefKey(chunk), chunk]));
  const legacySource = context.sources.length === 1 ? context.sources[0] : null;
  const lessons = outline.lessons.map((lesson) => {
    const refs = lesson.sourceRefs ?? (legacySource
      ? lesson.sourceChunkIndexes.map((chunkIndex) => ({
          sourceDocumentId: legacySource.sourceDocumentId,
          chunkIndex,
        }))
      : []);
    if (!refs.length || (!lesson.sourceRefs && !legacySource)) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Outline contains an ambiguous source reference.");
    }
    const resolved = refs.map((ref) => byRef.get(sourceRefKey(ref)));
    if (resolved.some((chunk) => !chunk)) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Outline contains an invalid source reference.");
    }
    return {
      clientKey: lesson.clientKey,
      title: lesson.title,
      summary: lesson.summary,
      learningObjectives: lesson.learningObjectives,
      sourceChunkIds: resolved.map((chunk) => chunk!.documentChunkId),
    };
  });
  return {
    title: outline.title,
    description: outline.description,
    learningObjectives: outline.learningObjectives,
    lessons,
  };
}

function mapProviderOutline(
  outline: ProviderStructuredCourseOutline,
  providerMap: Map<number, CourseSourceChunk>
) {
  return {
    ...outline,
    lessons: outline.lessons.map((lesson) => ({
      ...lesson,
      sourceChunkIndexes: [],
      sourceRefs: lesson.sourceRefs.map((sourceRef) => {
        const chunk = providerMap.get(sourceRef);
        if (!chunk) throw new ContentPipelineError("VALIDATION_ERROR", "Provider returned an unknown source reference.");
        return { sourceDocumentId: chunk.sourceDocumentId, chunkIndex: chunk.chunkIndex };
      }),
    })),
  };
}

export async function generateCourseOutline(
  sourceDocumentIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  const adminId = await requireAdmin();
  await requireAiCapacity("ai:course-outline", adminId);
  const sourceDocumentId = asPositiveId(sourceDocumentIdValue, "documentId");
  const context = await getCourseGenerationContext(sourceDocumentId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Source document not found.");
  const retryable = context.document.status === "failed" || context.document.status === "ready_for_review";
  if (context.document.status !== "extracted" && !retryable) {
    throw new ContentPipelineError("INVALID_STATE", "Source document must be extracted before outline generation.");
  }
  if (!context.chunks.length) throw new ContentPipelineError("INVALID_STATE", "Source document has no extracted chunks.");
  await updateSourceStatus(sourceDocumentId, "generating");
  try {
    if (!provider.generateCourseOutline) throw new Error("AI_PROVIDER_UNSUPPORTED");
    const chunks = selectLegacyProviderChunks(context.chunks);
    const generated = await provider.generateCourseOutline({
      documentTitle: context.document.original_filename,
      chunks: chunks.map((chunk) => ({ chunkIndex: chunk.chunk_index, content: chunk.content })),
    }, () => requireAiCapacity("ai:course-outline", adminId));
    return await persistCourseOutline({
      sourceDocumentId,
      outline: validateCourseOutline(generated.outline),
      provider: generated.provider,
      model: generated.model,
    });
  } catch (error) {
    await updateSourceStatus(sourceDocumentId, "failed", "OUTLINE_GENERATION_FAILED").catch(() => undefined);
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate a valid Course outline.");
  }
}

export async function generateCourseOutlineForJob(
  jobIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  const adminId = await requireAdmin();
  await requireAiCapacity("ai:course-outline", adminId);
  const jobId = asPositiveId(jobIdValue, "jobId");
  const context = await getCourseImportGenerationContext(jobId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (!context.sources.length || context.sources.some((source) =>
    !["extracted", "ready_for_review"].includes(source.status)
  )) throw new ContentPipelineError("INVALID_STATE", "Every attached source must contain usable extracted evidence.");
  const chunks = selectCourseImportProviderChunks(context.chunks);
  if (!chunks.length) throw new ContentPipelineError("INVALID_STATE", "Course import has no usable source chunks.");
  if (new Set(chunks.map((chunk) => chunk.sourceDocumentId)).size !== context.sources.length) {
    throw new ContentPipelineError("INVALID_STATE", "Every attached source must contribute provider context.");
  }
  const providerMap = new Map(chunks.map((chunk, sourceRef) => [sourceRef, chunk]));
  try {
    if (!provider.generateCourseOutline) throw new Error("AI_PROVIDER_UNSUPPORTED");
    const generated = await provider.generateCourseOutline({
      documentTitle: context.sources.map((source) => source.title).join("; "),
      chunks: chunks.map((chunk, sourceRef) => ({
        sourceRef,
        sourceLabel: sourceLabel(chunk),
        content: chunk.content,
      })),
    }, () => requireAiCapacity("ai:course-outline", adminId));
    if (!generated.outline.lessons.every((lesson) => "sourceRefs" in lesson)) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Provider returned ambiguous multi-source references.");
    }
    return await persistCourseOutlineForJob({
      jobId,
      outline: resolveJobOutline(
        mapProviderOutline(generated.outline as ProviderStructuredCourseOutline, providerMap),
        context
      ),
      provider: generated.provider,
      model: generated.model,
    });
  } catch (error) {
    await failCourseImport(jobId, "OUTLINE_GENERATION_FAILED").catch(() => undefined);
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate a valid Course outline.");
  }
}

export async function updateCourseOutline(jobIdValue: unknown, body: unknown) {
  await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const current = await getCourseImport(jobId);
  if (!current) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (current.status !== "outline_review") {
    throw new ContentPipelineError("INVALID_STATE", "Course outline cannot be edited in its current state.");
  }
  const context = await getCourseImportGenerationContext(jobId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Course import evidence not found.");
  return persistCourseOutlineForJob({
    jobId,
    outline: resolveJobOutline(body, context),
    provider: "admin_edit",
    model: null,
  });
}

export async function regenerateCourseOutline(jobIdValue: unknown, provider?: LessonDraftProvider) {
  await requireAdmin();
  const current = await getCourseImport(asPositiveId(jobIdValue, "jobId"));
  if (!current) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (current.status !== "outline_review" && current.status !== "failed") {
    throw new ContentPipelineError("INVALID_STATE", "Course outline cannot be regenerated in its current state.");
  }
  return generateCourseOutlineForJob(current.jobId, provider);
}

async function generateOneCourseLesson(
  job: CourseImportDraft,
  outlineLessonId: number,
  chunks: CourseSourceChunk[],
  provider: LessonDraftProvider,
  actorId: string
) {
  await requireAiCapacity("ai:lesson-content", actorId);
  const lesson = job.lessons.find((item) => item.id === outlineLessonId);
  if (!lesson) throw new ContentPipelineError("NOT_FOUND", "Outline Lesson not found.");
  const allowedIds = new Set((lesson.sourceChunks ?? []).map((chunk) => chunk.documentChunkId));
  let selected = chunks.filter((chunk) => allowedIds.has(chunk.documentChunkId));
  if (!selected.length && allowedIds.size === 0 && job.sources.length === 1) {
    const allowedIndexes = new Set(lesson.sourceChunkIndexes);
    selected = chunks.filter((chunk) => chunk.sourceDocumentId === job.sourceDocumentId
      && allowedIndexes.has(chunk.chunkIndex));
  }
  if (!selected.length || (allowedIds.size > 0 && selected.length !== allowedIds.size)) {
    throw new ContentPipelineError("INVALID_STATE", "Outline Lesson has invalid or foreign source context.");
  }
  const multiSource = job.sources.length > 1;
  const providerMap = new Map(selected.map((chunk, sourceRef) => [sourceRef, chunk]));
  const generated = await provider.generateLessonDraft({
    documentTitle: job.sourceFilename,
    lessonTitle: lesson.title,
    learningObjectives: lesson.learningObjectives,
    chunks: multiSource
      ? selected.map((chunk, sourceRef) => ({ sourceRef, sourceLabel: sourceLabel(chunk), content: chunk.content }))
      : selected.map((chunk) => ({ chunkIndex: chunk.chunkIndex, content: chunk.content })),
  });
  const providerDraft = generated.draft as StructuredLessonDraft | ProviderStructuredLessonDraft;
  const citations: Array<{ sectionIndex: number; documentChunkId: number }> = [];
  const sections = providerDraft.sections.map((section, sectionIndex) => {
    const providerRefs = "citationSourceRefs" in section && Array.isArray(section.citationSourceRefs) &&
      section.citationSourceRefs.every((sourceRef) => typeof sourceRef === "number")
      ? section.citationSourceRefs as number[] : null;
    const legacyIndexes = "citationChunkIndexes" in section && Array.isArray(section.citationChunkIndexes)
      ? section.citationChunkIndexes : null;
    const resolved = providerRefs
      ? providerRefs.map((sourceRef) => providerMap.get(sourceRef))
      : (legacyIndexes ?? []).map((chunkIndex) => selected.find((chunk) =>
          chunk.sourceDocumentId === job.sourceDocumentId && chunk.chunkIndex === chunkIndex));
    if (!resolved.length || resolved.some((chunk) => !chunk) ||
      new Set(resolved.map((chunk) => chunk!.documentChunkId)).size !== resolved.length) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Lesson contains an invalid source citation.");
    }
    for (const chunk of resolved) citations.push({ sectionIndex, documentChunkId: chunk!.documentChunkId });
    return {
      heading: section.heading,
      bodyMarkdown: section.bodyMarkdown,
      citationChunkIndexes: resolved.map((chunk) => chunk!.chunkIndex),
      citationSourceRefs: multiSource ? resolved.map((chunk) => ({
        sourceDocumentId: chunk!.sourceDocumentId,
        chunkIndex: chunk!.chunkIndex,
      })) : undefined,
    };
  });
  await persistCourseLessonContentForJob({
    jobId: job.jobId,
    outlineLessonId: lesson.id,
    draft: {
      title: providerDraft.title,
      summary: providerDraft.summary,
      estimatedMinutes: providerDraft.estimatedMinutes,
      sections,
    },
    citations,
    provider: generated.provider,
    model: generated.model,
  });
}

export async function generateCourseLessonContents(
  jobIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  const adminId = await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const job = await getCourseImport(jobId);
  if (!job) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (job.status === "content_review" && job.lessons.length > 0 && job.lessons.every((lesson) => lesson.contentDraft)) {
    return { jobId, status: "content_review" as const };
  }
  await prepareCourseLessonGeneration(jobId);
  const approvedJob = await getCourseImport(jobId);
  if (!approvedJob || approvedJob.approvedOutlineRevision !== approvedJob.outlineRevision) {
    throw new ContentPipelineError("INVALID_STATE", "Approved outline revision is unavailable.");
  }
  const chunks = await getCourseImportChunks(jobId);
  try {
    await Promise.all(approvedJob.lessons
      .filter((lesson) => !lesson.contentDraft)
      .map((lesson) => generateOneCourseLesson(approvedJob, lesson.id, chunks, provider, adminId)));
    return { jobId, status: "content_review" as const };
  } catch (error) {
    await failCourseImport(jobId, "LESSON_GENERATION_FAILED").catch(() => undefined);
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate all Lesson contents.");
  }
}

export async function regenerateCourseLessonContent(
  jobIdValue: unknown,
  outlineLessonIdValue: unknown,
  provider: LessonDraftProvider = new NineRouterLessonDraftProvider()
) {
  const adminId = await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const outlineLessonId = asPositiveId(outlineLessonIdValue, "outlineLessonId");
  const job = await getCourseImport(jobId);
  if (!job) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  await prepareCourseLessonGeneration(jobId);
  try {
    const approvedJob = await getCourseImport(jobId);
    if (!approvedJob || approvedJob.approvedOutlineRevision !== approvedJob.outlineRevision) {
      throw new ContentPipelineError("INVALID_STATE", "Approved outline revision is unavailable.");
    }
    await generateOneCourseLesson(approvedJob, outlineLessonId, await getCourseImportChunks(jobId), provider, adminId);
    return { jobId, outlineLessonId, status: "content_review" as const };
  } catch (error) {
    await failCourseImport(jobId, "LESSON_GENERATION_FAILED").catch(() => undefined);
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to regenerate Lesson content.");
  }
}

export async function submitCourseImportReview(jobIdValue: unknown, body: unknown) {
  await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Review body is invalid.");
  }
  const record = body as Record<string, unknown>;
  if (!["published", "rejected", "needs_revision"].includes(String(record.decision)) ||
    (record.comment !== undefined && record.comment !== null && typeof record.comment !== "string")) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Review decision is invalid.");
  }
  const comment = typeof record.comment === "string" ? record.comment.slice(0, 2000) : null;
  if (record.decision !== "published") return reviewCourseImport(jobId, String(record.decision), comment);
  let job = await getCourseImport(jobId);
  if (!job) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (job.status === "content_review") {
    await reviewCourseImport(jobId, "ready_to_publish", comment);
    job = { ...job, status: "ready_to_publish" };
  }
  if (job.status !== "ready_to_publish") {
    throw new ContentPipelineError("INVALID_STATE", "Course import is not ready to publish.");
  }
  return publishCourseImport(jobId, curriculumSlug(job.title));
}

export async function getCourseDraftQueue() {
  await requireAdmin();
  return listCourseImports();
}

export async function submitCourseDraftReview(sourceDocumentIdValue: unknown, body: unknown) {
  await requireAdmin();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Review body is invalid.");
  }
  const record = body as Record<string, unknown>;
  const decisions: LessonDraftReviewDecision[] = ["approved", "rejected", "needs_revision"];
  if (
    !decisions.includes(record.decision as LessonDraftReviewDecision) ||
    (record.comment !== undefined && record.comment !== null && typeof record.comment !== "string")
  ) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Review decision is invalid.");
  }
  return reviewCourseDraftBatch(
    asPositiveId(sourceDocumentIdValue, "sourceDocumentId"),
    record.decision as LessonDraftReviewDecision,
    typeof record.comment === "string" ? record.comment.slice(0, 2000) : null
  );
}

export async function getLessonDraftQueue(status?: string) {
  await requireAdmin();
  const allowed = ["pending_review", "needs_revision", "rejected", "approved", "published"];
  if (status && !allowed.includes(status)) throw new ContentPipelineError("VALIDATION_ERROR", "Invalid draft status.");
  return listLessonDrafts((status ?? "pending_review") as Parameters<typeof listLessonDrafts>[0]);
}

export async function getLessonDraftDetail(value: unknown) {
  await requireAdmin();
  const draft = await getLessonDraft(asPositiveId(value, "draftId"));
  if (!draft) throw new ContentPipelineError("NOT_FOUND", "Lesson draft not found.");
  return draft;
}

function validateDraft(value: unknown): StructuredLessonDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentPipelineError("VALIDATION_ERROR", "Draft body is invalid.");
  const draft = value as Record<string, unknown>;
  if (typeof draft.title !== "string" || !draft.title.trim() || draft.title.length > 150 || typeof draft.summary !== "string" || !draft.summary.trim() || !Number.isInteger(draft.estimatedMinutes) || Number(draft.estimatedMinutes) < 1 || Number(draft.estimatedMinutes) > 180 || !Array.isArray(draft.sections) || draft.sections.length < 1 || draft.sections.length > 12) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Draft fields are invalid.");
  }
  const sections = draft.sections.map((section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) throw new ContentPipelineError("VALIDATION_ERROR", "Draft section is invalid.");
    const record = section as Record<string, unknown>;
    if (typeof record.heading !== "string" || !record.heading.trim() || typeof record.bodyMarkdown !== "string" || !record.bodyMarkdown.trim() || !Array.isArray(record.citationChunkIndexes) || !record.citationChunkIndexes.every(Number.isInteger)) throw new ContentPipelineError("VALIDATION_ERROR", "Draft section is invalid.");
    return { heading: record.heading.trim(), bodyMarkdown: record.bodyMarkdown.trim(), citationChunkIndexes: record.citationChunkIndexes as number[] };
  });
  return { title: draft.title.trim(), summary: draft.summary.trim(), estimatedMinutes: Number(draft.estimatedMinutes), sections };
}

export async function updateLessonDraft(idValue: unknown, body: unknown) {
  await requireAdmin();
  const id = asPositiveId(idValue, "draftId");
  const current = await getLessonDraft(id);
  if (!current) throw new ContentPipelineError("NOT_FOUND", "Lesson draft not found.");
  const draft = validateDraft(body);
  const sameCitationSet = draft.sections.every((section, sectionIndex) => {
    const expected = (current.citations ?? [])
      .filter((citation) => citation.sectionIndex === sectionIndex)
      .map((citation) => citation.chunkIndex)
      .sort((left, right) => left - right);
    const received = [...new Set(section.citationChunkIndexes)].sort((left, right) => left - right);
    return expected.length === received.length && expected.every((value, index) => value === received[index]);
  });
  if (!sameCitationSet) throw new ContentPipelineError("VALIDATION_ERROR", "Citation indexes cannot be changed during text editing.");
  const revision = await reviseLessonDraft(id, draft);
  return { revision, status: "pending_review" as const };
}

export async function updateCourseLessonContent(idValue: unknown, body: unknown) {
  await requireAdmin();
  const draft = validateDraft(body);
  await reviseCourseLessonContent(asPositiveId(idValue, "lessonContentDraftId"), draft);
  return { status: "content_review" as const };
}

export async function submitLessonDraftReview(idValue: unknown, body: unknown) {
  await requireAdmin();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContentPipelineError("VALIDATION_ERROR", "Review body is invalid.");
  const record = body as Record<string, unknown>;
  const decisions: LessonDraftReviewDecision[] = ["approved", "rejected", "needs_revision"];
  if (!decisions.includes(record.decision as LessonDraftReviewDecision) || (record.comment !== undefined && record.comment !== null && typeof record.comment !== "string")) throw new ContentPipelineError("VALIDATION_ERROR", "Review decision is invalid.");
  const status = await reviewLessonDraft(asPositiveId(idValue, "draftId"), record.decision as LessonDraftReviewDecision, typeof record.comment === "string" ? record.comment.slice(0, 2000) : null);
  return { status };
}

export async function publishApprovedLessonDraft(idValue: unknown) {
  await requireAdmin();
  return publishLessonDraft(asPositiveId(idValue, "draftId"));
}

export async function getContentTargets() {
  await requireAdmin();
  const [items, chapters, courses] = await Promise.all([
    listContentTargets(),
    listContentChapters(),
    listContentCourses(),
  ]);
  return { items, chapters, courses };
}

export async function createNewContentTarget(body: unknown) {
  await requireAdmin();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Target body is invalid.");
  }
  const record = body as Record<string, unknown>;
  const chapterId = asPositiveId(record.chapterId, "chapterId");
  if (typeof record.title !== "string") {
    throw new ContentPipelineError("VALIDATION_ERROR", "Lesson title is required.");
  }
  const title = record.title.trim();
  if (!title || title.length > 150) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Lesson title must be between 1 and 150 characters.");
  }
  try {
    return await createContentTarget({ chapterId, title });
  } catch (error) {
    if (error instanceof Error && error.message === "CHAPTER_NOT_FOUND") {
      throw new ContentPipelineError("NOT_FOUND", "Target chapter was not found.");
    }
    throw new ContentPipelineError("DATABASE_ERROR", "Unable to create the target lesson.");
  }
}

function curriculumSlug(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "course";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function createNewContentCurriculum(body: unknown) {
  await requireAdmin();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Curriculum body is invalid.");
  }
  const record = body as Record<string, unknown>;
  if (record.mode !== "new") {
    throw new ContentPipelineError("VALIDATION_ERROR", "Destination mode is invalid.");
  }
  const sourceDocumentId = asPositiveId(record.sourceDocumentId, "sourceDocumentId");
  if (typeof record.courseTitle !== "string") {
    throw new ContentPipelineError("VALIDATION_ERROR", "Course title is required.");
  }
  const courseTitle = record.courseTitle.trim();
  if (!courseTitle || courseTitle.length > 150) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Course title must be between 1 and 150 characters.");
  }
  const source = await getSourceDocument(sourceDocumentId);
  if (!source) throw new ContentPipelineError("NOT_FOUND", "Source document not found.");
  const chapterTitle = documentTitleFromFilename(source.originalFilename);
  try {
    return await createContentCurriculum({ courseTitle, courseSlug: curriculumSlug(courseTitle), chapterTitle });
  } catch (error: unknown) {
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("DATABASE_ERROR", "Unable to create the content destination.");
  }
}
