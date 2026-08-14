import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  NineRouterLessonDraftProvider,
  type LessonDraftProvider,
  type PedagogicalLessonProvider,
} from "@/features/content-pipeline/providers/lesson-draft-provider";
import { TavilyWebSearchProvider } from "@/features/content-pipeline/providers/tavily-web-search-provider";
import { WebSearchProviderError, type WebSearchProvider } from "@/features/content-pipeline/providers/web-search-provider";
import {
  WebContentExtractionProviderError,
  type WebContentExtractionProvider,
} from "@/features/content-pipeline/providers/web-content-extraction-provider";
import { planResearchQueries } from "@/features/content-pipeline/research/course-research";
import { normalizeSearchResults } from "@/features/content-pipeline/research/normalize-search-results";
import { rankSearchResults } from "@/features/content-pipeline/research/rank-search-results";
import {
  createContentTarget,
  createContentCurriculum,
  createSourceDocument,
  materializeCourseImportSource,
  initializeCourseImportFromSources,
  attachCourseImportSource,
  detachCourseImportSource,
  removeStagedCourseImportSource,
  downloadSourceObject,
  getCourseGenerationContext,
  getCourseImport,
  getCourseImportGenerationContext,
  getCourseImportChunks,
  getGenerationContext,
  getLessonDraft,
  getSourceDocument,
  getSourceDocumentByStoragePath,
  getSourceDocumentChunkCount,
  getCourseImportJobIdForSource,
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
  QUALITY_FINDING_CODES,
  SUPPORTED_SOURCE_MIME_TYPES,
  type ApprovedLessonEvidence,
  type LessonDraftReviewDecision,
  type CourseImportDraft,
  type CourseResearchResult,
  type CourseSourceChunk,
  type CourseSourceRef,
  type EvidenceRefMap,
  type GeneratedLessonCandidate,
  type LessonBlueprint,
  type LessonQualityReview,
  type ProviderStructuredCourseOutline,
  type ProviderStructuredLessonDraft,
  type StructuredCourseOutline,
  type StructuredLessonDraft,
  type SupportedSourceMimeType,
  type TargetedCorrection,
} from "@/features/content-pipeline/types";
import { documentTitleFromFilename, documentTitleFromWebSource } from "@/features/content-pipeline/utils/document-title";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PEDAGOGICAL_MODEL = "gemini-3.6-flash";

export type ContentPipelineErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_STATE"
  | "INVALID_SOURCE"
  | "INVALID_SOURCE_REFERENCE"
  | "SOURCE_LIMIT_EXCEEDED"
  | "SOURCE_CONFLICT"
  | "SOURCE_MUTATION_LOCKED"
  | "STALE_OUTLINE"
  | "STORAGE_ERROR"
  | "FETCH_FAILED"
  | "EXTRACTION_ERROR"
  | "EXTRACTION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "AI_PROVIDER_ERROR"
  | "GENERATION_FAILED"
  | "PUBLICATION_FAILED"
  | "RATE_LIMITED"
  | "SEARCH_PROVIDER_AUTH"
  | "SEARCH_PROVIDER_QUOTA"
  | "SEARCH_PROVIDER_TIMEOUT"
  | "SEARCH_PROVIDER_UNAVAILABLE"
  | "WEB_EXTRACTION_UNAVAILABLE"
  | "DATABASE_ERROR";

export interface ContentPipelineOperationalSignal {
  event: "research" | "fetch" | "source_mutation" | "source_reference" | "outline_generation"
    | "stale_outline" | "lesson_generation" | "publication";
  outcome: "success" | "failure" | "retry" | "rejected";
  stage: string;
  code: string;
  actorId?: string;
  jobId?: number;
  sourceDocumentId?: number;
  durationMs?: number;
  byteCount?: number;
  redirectCount?: number;
  sourceCount?: number;
}

export function emitContentPipelineSignal(signal: ContentPipelineOperationalSignal): void {
  // The closed signal type is the privacy boundary: source/provider bodies, URLs, prompts,
  // credentials, tokens, private addresses, and storage paths cannot be passed to this logger.
  console.info("[content-pipeline] operational", signal);
}

export class ContentPipelineError extends Error {
  constructor(
    public readonly code: ContentPipelineErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ContentPipelineError";
  }
}

export class PedagogicalLessonGenerationError extends Error {
  readonly code = "LESSON_GENERATION_FAILED";

  constructor(public readonly cause?: unknown) {
    super("Unable to produce a Lesson candidate that passes pedagogical Quality Review.");
    this.name = "PedagogicalLessonGenerationError";
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

interface ResearchCursorPayload {
  version: 1;
  topicHash: string;
  providerCursors: Array<string | null>;
}

interface CourseResearchDependencies {
  provider?: WebSearchProvider;
  checkCapacity?: typeof checkRateLimit;
}

function decodeResearchCursor(value: unknown, topic: string, queryCount: number): Array<string | null> {
  if (value === undefined || value === null) return Array.from({ length: queryCount }, () => null);
  if (typeof value !== "string" || value.length > 500) throw new ContentPipelineError("VALIDATION_ERROR", "cursor is invalid.");
  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ResearchCursorPayload>;
    const topicHash = createHash("sha256").update(topic).digest("base64url").slice(0, 16);
    if (payload.version !== 1 || payload.topicHash !== topicHash || !Array.isArray(payload.providerCursors)
      || payload.providerCursors.length !== queryCount
      || payload.providerCursors.some((cursor) => cursor !== null && (typeof cursor !== "string" || cursor.length > 100))) {
      throw new Error("invalid cursor");
    }
    return payload.providerCursors;
  } catch {
    throw new ContentPipelineError("VALIDATION_ERROR", "cursor is invalid.");
  }
}

function encodeResearchCursor(topic: string, providerCursors: Array<string | null>): string | null {
  if (providerCursors.every((cursor) => cursor === null)) return null;
  const payload: ResearchCursorPayload = {
    version: 1,
    topicHash: createHash("sha256").update(topic).digest("base64url").slice(0, 16),
    providerCursors,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function searchProviderErrorCode(error: unknown): ContentPipelineErrorCode {
  if (error instanceof WebSearchProviderError) {
    return error.code === "AUTH" ? "SEARCH_PROVIDER_AUTH"
      : error.code === "QUOTA" ? "SEARCH_PROVIDER_QUOTA"
        : error.code === "TIMEOUT" ? "SEARCH_PROVIDER_TIMEOUT"
          : "SEARCH_PROVIDER_UNAVAILABLE";
  }
  return "SEARCH_PROVIDER_UNAVAILABLE";
}

function mapSearchProviderError(error: unknown): never {
  throw new ContentPipelineError(searchProviderErrorCode(error),
    "Web research is temporarily unavailable. Retry or use a manual URL or file.");
}

export function mapWebContentExtractionError(error: unknown): never {
  if (error instanceof WebContentExtractionProviderError) {
    if (error.code === "CONTENT_TOO_LARGE") {
      throw new ContentPipelineError("PAYLOAD_TOO_LARGE", "The extracted source is too large.", {
        extractionCategory: error.code,
      });
    }
    if (["CONFIGURATION", "AUTHENTICATION", "QUOTA", "TIMEOUT", "UPSTREAM"].includes(error.code)) {
      throw new ContentPipelineError(
        "WEB_EXTRACTION_UNAVAILABLE",
        "Web extraction is temporarily unavailable. Retry or use a file.",
        { extractionCategory: error.code },
      );
    }
    throw new ContentPipelineError(
      "EXTRACTION_ERROR",
      "The web source did not produce usable evidence.",
      { extractionCategory: error.code },
    );
  }
  throw new ContentPipelineError(
    "WEB_EXTRACTION_UNAVAILABLE",
    "Web extraction is temporarily unavailable. Retry or use a file.",
  );
}

export async function researchCourseSources(
  body: unknown,
  dependencies: CourseResearchDependencies = {},
): Promise<CourseResearchResult> {
  const adminId = await requireAdmin();
  const startedAt = Date.now();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContentPipelineError("VALIDATION_ERROR", "Request body is invalid.");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "topic" && key !== "cursor")) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Request body contains unknown fields.");
  }
  let plan;
  try {
    plan = planResearchQueries(input.topic);
  } catch (error) {
    throw new ContentPipelineError("VALIDATION_ERROR", error instanceof Error ? error.message : "topic is invalid.");
  }
  const cursors = decodeResearchCursor(input.cursor, plan.topic, plan.queries.length);
  const capacity = await (dependencies.checkCapacity ?? checkRateLimit)("content-research", adminId);
  if (!capacity.allowed) {
    throw new ContentPipelineError("RATE_LIMITED", `Rate limit exceeded. Retry after ${capacity.retryAfterSeconds} seconds.`, {
      retryAfterSeconds: capacity.retryAfterSeconds,
    });
  }
  const provider = dependencies.provider ?? new TavilyWebSearchProvider();
  try {
    const pages = await Promise.all(plan.queries.map((query, index) => {
      if (input.cursor !== undefined && cursors[index] === null) return Promise.resolve({ results: [], cursor: null, hasMore: false });
      return provider.search({ ...query, count: 20, cursor: cursors[index] });
    }));
    const normalized = normalizeSearchResults(pages.flatMap((page) => page.results));
    const queryStrings = plan.queries.map((query) => query.query);
    const results = rankSearchResults(normalized, plan.topic, queryStrings).slice(0, 20);
    const providerCursors = pages.map((page) => page.hasMore ? page.cursor : null);
    const cursor = encodeResearchCursor(plan.topic, providerCursors);
    emitContentPipelineSignal({
      event: "research", outcome: "success", stage: "provider_search", code: "OK",
      actorId: adminId, durationMs: Date.now() - startedAt, sourceCount: results.length,
    });
    return { topic: plan.topic, queries: queryStrings, results, cursor, hasMore: cursor !== null };
  } catch (error) {
    const code = searchProviderErrorCode(error);
    emitContentPipelineSignal({
      event: "research", outcome: "failure", stage: "provider_search", code,
      actorId: adminId, durationMs: Date.now() - startedAt,
    });
    mapSearchProviderError(error);
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

function asUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ContentPipelineError("VALIDATION_ERROR", `${field} must be a UUID.`);
  }
  return value.toLowerCase();
}

function asOptionalScore(value: unknown, field: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ContentPipelineError("VALIDATION_ERROR", `${field} must be between 0 and 1.`);
  }
  return value;
}

function mutationErrorCode(error: unknown): ContentPipelineErrorCode {
  const diagnostic = error instanceof Error ? error.message : "";
  if (/SOURCE_LIMIT_(?:REACHED|EXCEEDED)|SOURCE_COUNT_INVALID/i.test(diagnostic)) {
    return "SOURCE_LIMIT_EXCEEDED";
  }
  if (/EVIDENCE_LOCKED|JOB_SOURCE_LOCKED|LAST_SOURCE_REQUIRED|SOURCE_HAS_HISTORY|SOURCE_REMOVAL_FORBIDDEN|INITIALIZATION_IMMUTABLE/i.test(diagnostic)) {
    return "SOURCE_MUTATION_LOCKED";
  }
  if (/IDEMPOTENCY_CONFLICT|SOURCE_ALREADY_(?:ATTACHED|OWNED)|CONFLICT/i.test(diagnostic)) {
    return "SOURCE_CONFLICT";
  }
  if (/SOURCE_NOT_FOUND|SOURCE_NOT_ATTACHED|JOB_NOT_FOUND|NOT_FOUND/i.test(diagnostic)) {
    return "NOT_FOUND";
  }
  if (/SOURCE_INVALID|SOURCE_OWNERSHIP_INVALID|PROVENANCE_INVALID|RELEVANCE_INVALID|INITIALIZATION_INVALID|SOURCE_NOT_USABLE|SOURCE_NOT_EXTRACTED|EMPTY/i.test(diagnostic)) {
    return "INVALID_SOURCE";
  }
  return "DATABASE_ERROR";
}

function mapMutationError(error: unknown): never {
  const code = mutationErrorCode(error);
  const message = code === "SOURCE_LIMIT_EXCEEDED" ? "A Course import supports one to eight attached sources."
    : code === "SOURCE_MUTATION_LOCKED" ? "The evidence set cannot be changed in its current state."
      : code === "SOURCE_CONFLICT" ? "The source request conflicts with existing Course-import state."
        : code === "NOT_FOUND" ? "The requested source or Course import was not found."
          : code === "INVALID_SOURCE" ? "The source is not usable Course evidence."
            : "Unable to persist the source-set change.";
  throw new ContentPipelineError(code, message);
}

async function uploadDeterministicObject(path: string, file: File) {
  try {
    await uploadSourceObject(path, file);
    return null;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "STORAGE_OBJECT_EXISTS") throw error;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = await getSourceDocumentByStoragePath(path);
      if (existing) return existing;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await removeSourceObject(path);
    await uploadSourceObject(path, file);
    return null;
  }
}

export async function uploadStagedContentSource(file: File, idempotencyKeyValue: unknown) {
  const adminId = await requireAdmin();
  const idempotencyKey = asUuid(idempotencyKeyValue, "idempotencyKey");
  if (!file.name || file.size < 1 || file.size > MAX_FILE_BYTES) throw new ContentPipelineError("VALIDATION_ERROR", "File must be between 1 byte and 10 MiB.");
  if (!SUPPORTED_SOURCE_MIME_TYPES.includes(file.type as SupportedSourceMimeType)) throw new ContentPipelineError("VALIDATION_ERROR", "Unsupported document type.");
  const storagePath = `${adminId}/${idempotencyKey}/${sanitizeFilename(file.name)}`;
  const existing = await getSourceDocumentByStoragePath(storagePath);
  if (existing) {
    const jobId = await getCourseImportJobIdForSource(existing.id);
    return { sourceDocumentId: existing.id, status: existing.status, jobId, attached: jobId !== null };
  }
  let objectUploaded = false;
  try {
    const concurrent = await uploadDeterministicObject(storagePath, file);
    if (concurrent) {
      const jobId = await getCourseImportJobIdForSource(concurrent.id);
      return { sourceDocumentId: concurrent.id, status: concurrent.status, jobId, attached: jobId !== null };
    }
    objectUploaded = true;
    return await materializeCourseImportSource({
      originalFilename: file.name, storagePath, mimeType: file.type as SupportedSourceMimeType,
      sizeBytes: file.size, sourceType: "file", ingestionMethod: "uploaded", title: file.name,
    });
  } catch (error) {
    if (error instanceof ContentPipelineError) throw error;
    if (error instanceof Error && /CONFLICT|INVALID/.test(error.message)) mapMutationError(error);
    if (objectUploaded) await removeSourceObject(storagePath).catch(() => undefined);
    throw new ContentPipelineError("STORAGE_ERROR", "Unable to stage the source document.");
  }
}

interface UrlSourceIngestionDependencies {
  extractionProvider?: WebContentExtractionProvider;
  now?: () => Date;
}

export async function ingestUrlSource(body: unknown, dependencies: UrlSourceIngestionDependencies = {}) {
  const adminId = await requireAdmin();
  const startedAt = Date.now();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContentPipelineError("VALIDATION_ERROR", "Request body is invalid.");
  const input = body as Record<string, unknown>;
  const allowed = new Set(["url", "discovery", "title", "idempotencyKey", "authorityScore"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new ContentPipelineError("VALIDATION_ERROR", "Request body contains unknown fields.");
  if (typeof input.url !== "string" || input.url.length > 2_048) throw new ContentPipelineError("VALIDATION_ERROR", "A valid URL is required.");
  if (input.discovery !== "manual_url" && input.discovery !== "discovered") throw new ContentPipelineError("VALIDATION_ERROR", "discovery is invalid.");
  if (input.title !== undefined && (typeof input.title !== "string" || input.title.length > 300)) throw new ContentPipelineError("VALIDATION_ERROR", "title is invalid.");
  const idempotencyKey = asUuid(input.idempotencyKey, "idempotencyKey");
  const authorityScore = asOptionalScore(input.authorityScore, "authorityScore");
  try {
    const { validateWebUrl } = await import("@/features/content-pipeline/extraction/web-page-fetcher");
    validateWebUrl(input.url);
  } catch {
    emitContentPipelineSignal({ event: "fetch", outcome: "rejected", stage: "url_validation",
      code: "INVALID_SOURCE", actorId: adminId, durationMs: Date.now() - startedAt });
    throw new ContentPipelineError("INVALID_SOURCE", "The URL is not a safe public HTTP(S) destination.");
  }
  const storagePath = `${adminId}/${idempotencyKey}/snapshot.md`;
  const existing = await getSourceDocumentByStoragePath(storagePath);
  if (existing) {
    if (existing.status === "extracted" || existing.status === "ready_for_review") {
      const [chunkCount, jobId] = await Promise.all([
        getSourceDocumentChunkCount(existing.id), getCourseImportJobIdForSource(existing.id),
      ]);
      emitContentPipelineSignal({ event: "fetch", outcome: "retry", stage: "reuse_snapshot",
        code: "OK", actorId: adminId, sourceDocumentId: existing.id,
        durationMs: Date.now() - startedAt });
      return { sourceDocumentId: existing.id, status: existing.status, chunkCount, attached: jobId !== null, jobId, reused: true };
    }
    const extraction = await extractContentSource(existing.id);
    emitContentPipelineSignal({ event: "fetch", outcome: "retry", stage: "reuse_snapshot",
      code: "OK", actorId: adminId, sourceDocumentId: existing.id,
      durationMs: Date.now() - startedAt });
    return { sourceDocumentId: existing.id, status: extraction.status, chunkCount: extraction.chunkCount, attached: false, reused: true };
  }
  const capacity = await checkRateLimit("content-source:url", adminId);
  if (!capacity.allowed) throw new ContentPipelineError("RATE_LIMITED", `Rate limit exceeded. Retry after ${capacity.retryAfterSeconds} seconds.`);

  let materializedId: number | null = null;
  let objectUploaded = false;
  let failureStage = "provider_extraction";
  try {
    const [{ TavilyWebContentExtractionProvider }, { normalizeWebContentExtraction }, { serializeNormalizedWebExtractionSnapshot }] = await Promise.all([
      import("@/features/content-pipeline/providers/tavily-web-content-extraction-provider"),
      import("@/features/content-pipeline/providers/web-content-extraction-normalizer"),
      import("@/features/content-pipeline/extraction/web-snapshot"),
    ]);
    const provider = dependencies.extractionProvider ?? new TavilyWebContentExtractionProvider();
    const capturedAt = (dependencies.now ?? (() => new Date()))().toISOString();
    const providerResult = await provider.extract({ sourceUrl: input.url, capturedAt });
    failureStage = "response_normalization";
    const normalized = normalizeWebContentExtraction(providerResult, {
      title: typeof input.title === "string" ? input.title : undefined,
    });
    const title = documentTitleFromWebSource(normalized.title, normalized.canonicalUrl);
    failureStage = "snapshot_serialization";
    const snapshot = serializeNormalizedWebExtractionSnapshot({ ...normalized, title });
    const file = new File([snapshot], "snapshot.md", { type: "text/markdown" });
    failureStage = "snapshot_upload";
    const concurrent = await uploadDeterministicObject(storagePath, file);
    if (concurrent) {
      materializedId = concurrent.id;
      const extraction = await extractContentSource(materializedId);
      return { sourceDocumentId: materializedId, status: extraction.status, chunkCount: extraction.chunkCount, attached: false, reused: true };
    }
    objectUploaded = true;
    failureStage = "materialization";
    const materialized = await materializeCourseImportSource({
      originalFilename: `${sanitizeFilename(title)}.md`, storagePath, mimeType: "text/markdown",
      sizeBytes: file.size, sourceType: "web_page", ingestionMethod: input.discovery,
      sourceUrl: input.url, canonicalUrl: normalized.canonicalUrl, title,
      domain: new URL(normalized.canonicalUrl).hostname, authorityScore, fetchedAt: normalized.capturedAt,
    });
    materializedId = materialized.sourceDocumentId;
    failureStage = "stored_snapshot_chunking";
    const extraction = await extractContentSource(materializedId);
    if (extraction.chunkCount < 1) throw new ContentPipelineError("EXTRACTION_ERROR", "The page produced no usable evidence.");
    emitContentPipelineSignal({
      event: "fetch", outcome: "success", stage: "snapshot_extracted", code: "OK",
      actorId: adminId, sourceDocumentId: materializedId, durationMs: Date.now() - startedAt,
      byteCount: file.size,
    });
    return { sourceDocumentId: materializedId, status: extraction.status, chunkCount: extraction.chunkCount, attached: false, reused: false };
  } catch (error: unknown) {
    if (!(error instanceof WebContentExtractionProviderError)
      && error instanceof Error && /CONFLICT|INVALID/.test(error.message)) mapMutationError(error);
    if (!materializedId && objectUploaded) await removeSourceObject(storagePath).catch(() => undefined);
    const stableCode = error instanceof ContentPipelineError ? error.code
      : error instanceof WebContentExtractionProviderError ? error.code
        : "EXTRACTION_FAILED";
    emitContentPipelineSignal({
      event: "fetch", outcome: "failure", stage: failureStage,
      code: stableCode, actorId: adminId, sourceDocumentId: materializedId ?? undefined,
      durationMs: Date.now() - startedAt,
    });
    if (error instanceof ContentPipelineError) {
      if (!materializedId || error.details) throw error;
      throw new ContentPipelineError(error.code, error.message, { sourceDocumentId: materializedId });
    }
    if (error instanceof WebContentExtractionProviderError) mapWebContentExtractionError(error);
    throw new ContentPipelineError("EXTRACTION_FAILED", "The URL could not be captured as usable evidence.",
      materializedId ? { sourceDocumentId: materializedId } : undefined);
  }
}

export async function initializeCourseImport(body: unknown) {
  const adminId = await requireAdmin();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContentPipelineError("VALIDATION_ERROR", "Request body is invalid.");
  const input = body as { initializationKey?: unknown; sources?: unknown };
  const initializationKey = asUuid(input.initializationKey, "initializationKey");
  if (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 8) throw new ContentPipelineError("VALIDATION_ERROR", "sources must contain 1 to 8 usable sources.");
  const sources = input.sources.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentPipelineError("VALIDATION_ERROR", `sources[${index}] is invalid.`);
    const source = value as Record<string, unknown>;
    return { sourceDocumentId: asPositiveId(source.sourceDocumentId, `sources[${index}].sourceDocumentId`), relevanceScore: asOptionalScore(source.relevanceScore, `sources[${index}].relevanceScore`) };
  });
  if (new Set(sources.map((source) => source.sourceDocumentId)).size !== sources.length) throw new ContentPipelineError("VALIDATION_ERROR", "sources must be unique.");
  try {
    const result = await initializeCourseImportFromSources({ initializationKey, sources });
    emitContentPipelineSignal({ event: "source_mutation", outcome: "success", stage: "initialize",
      code: "OK", actorId: adminId, jobId: result.jobId ?? undefined, sourceCount: sources.length });
    return result;
  } catch (error) {
    emitContentPipelineSignal({ event: "source_mutation", outcome: "rejected", stage: "initialize",
      code: mutationErrorCode(error), actorId: adminId, sourceCount: sources.length });
    mapMutationError(error);
  }
}

export async function attachSourceToCourseImport(jobIdValue: unknown, body: unknown) {
  const adminId = await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContentPipelineError("VALIDATION_ERROR", "Request body is invalid.");
  const input = body as Record<string, unknown>;
  const sourceDocumentId = asPositiveId(input.sourceDocumentId, "sourceDocumentId");
  try {
    const result = await attachCourseImportSource({ jobId, sourceDocumentId, relevanceScore: asOptionalScore(input.relevanceScore, "relevanceScore") });
    emitContentPipelineSignal({ event: "source_mutation", outcome: "success", stage: "attach", code: "OK", actorId: adminId, jobId, sourceDocumentId });
    return result;
  } catch (error) {
    emitContentPipelineSignal({ event: "source_mutation", outcome: "rejected", stage: "attach", code: mutationErrorCode(error), actorId: adminId, jobId, sourceDocumentId });
    mapMutationError(error);
  }
}

export async function detachSourceFromCourseImport(jobIdValue: unknown, sourceDocumentIdValue: unknown) {
  const adminId = await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const sourceDocumentId = asPositiveId(sourceDocumentIdValue, "sourceDocumentId");
  try {
    const result = await detachCourseImportSource({ jobId, sourceDocumentId });
    emitContentPipelineSignal({ event: "source_mutation", outcome: "success", stage: "detach", code: "OK", actorId: adminId, jobId, sourceDocumentId });
    return result;
  } catch (error) {
    emitContentPipelineSignal({ event: "source_mutation", outcome: "rejected", stage: "detach", code: mutationErrorCode(error), actorId: adminId, jobId, sourceDocumentId });
    mapMutationError(error);
  }
}

export async function removeStagedSource(sourceDocumentIdValue: unknown) {
  const adminId = await requireAdmin();
  const sourceDocumentId = asPositiveId(sourceDocumentIdValue, "sourceDocumentId");
  try {
    const result = await removeStagedCourseImportSource(sourceDocumentId);
    await removeSourceObject(result.storagePath!);
    emitContentPipelineSignal({ event: "source_mutation", outcome: "success", stage: "remove_staged",
      code: "OK", actorId: adminId, sourceDocumentId });
    return { sourceDocumentId: result.sourceDocumentId, removed: true as const };
  } catch (error) {
    emitContentPipelineSignal({ event: "source_mutation", outcome: "rejected", stage: "remove_staged",
      code: mutationErrorCode(error), actorId: adminId, sourceDocumentId });
    mapMutationError(error);
  }
}

export async function getCourseImportSourceReview(jobIdValue: unknown) {
  await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const job = await getCourseImport(jobId);
  if (!job) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  return { jobId, status: job.status, outlineStale: job.outlineStale, sources: job.sources };
}

export async function extractContentSource(value: unknown) {
  await requireAdmin();
  const id = asPositiveId(value, "documentId");
  const document = await getSourceDocument(id);
  if (!document) throw new ContentPipelineError("NOT_FOUND", "Source document not found.");
  if (document.status === "extracted") {
    return { documentId: id, status: "extracted" as const, chunkCount: await getSourceDocumentChunkCount(id), characterCount: 0 };
  }
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

export function buildApprovedLessonEvidenceBoundary(
  job: CourseImportDraft,
  outlineLessonId: number,
  chunks: readonly CourseSourceChunk[]
): { evidence: ApprovedLessonEvidence; evidenceRefMap: EvidenceRefMap } {
  const lesson = job.lessons.find((item) => item.id === outlineLessonId);
  if (!lesson) throw new ContentPipelineError("NOT_FOUND", "Outline Lesson not found.");
  if (chunks.length < 1) {
    throw new ContentPipelineError("INVALID_STATE", "Course import has no approved Lesson evidence.");
  }
  const canonicalIds = chunks.map((chunk) => chunk.documentChunkId);
  const sourceKeys = chunks.map((chunk) => sourceRefKey(chunk));
  if (canonicalIds.some((id) => !Number.isInteger(id) || id < 1) ||
    new Set(canonicalIds).size !== canonicalIds.length ||
    new Set(sourceKeys).size !== sourceKeys.length ||
    chunks.some((chunk) => !chunk.content.trim() || !chunk.sourceTitle.trim())) {
    throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Course import evidence ownership is invalid.");
  }

  const approvedChunkIds = (lesson.sourceChunks ?? []).map((chunk) => chunk.documentChunkId);
  if (new Set(approvedChunkIds).size !== approvedChunkIds.length) {
    throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence contains duplicate ownership.");
  }
  let selected: CourseSourceChunk[];
  if (approvedChunkIds.length > 0) {
    const byId = new Map(chunks.map((chunk) => [chunk.documentChunkId, chunk]));
    selected = approvedChunkIds.map((documentChunkId) => byId.get(documentChunkId))
      .filter((chunk): chunk is CourseSourceChunk => chunk !== undefined);
    if (selected.length !== approvedChunkIds.length) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence is missing or foreign.");
    }
    for (const ownership of lesson.sourceChunks ?? []) {
      const chunk = selected.find((item) => item.documentChunkId === ownership.documentChunkId);
      if (!chunk || chunk.sourceDocumentId !== ownership.sourceDocumentId ||
        chunk.sourceOrder !== ownership.sourceOrder || chunk.chunkIndex !== ownership.chunkIndex) {
        throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence ownership is invalid.");
      }
    }
  } else {
    if (job.sources.length !== 1 || lesson.sourceChunkIndexes.length < 1 ||
      new Set(lesson.sourceChunkIndexes).size !== lesson.sourceChunkIndexes.length) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence is empty or ambiguous.");
    }
    const allowedIndexes = new Set(lesson.sourceChunkIndexes);
    selected = chunks.filter((chunk) => chunk.sourceDocumentId === job.sourceDocumentId &&
      allowedIndexes.has(chunk.chunkIndex));
    if (selected.length !== allowedIndexes.size) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence is missing or foreign.");
    }
  }
  selected.sort((left, right) => left.sourceOrder - right.sourceOrder || left.chunkIndex - right.chunkIndex);
  if (selected.length < 1 || lesson.learningObjectives.length < 1 ||
    lesson.learningObjectives.some((objective) => !objective.trim())) {
    throw new ContentPipelineError("INVALID_STATE", "Lesson has incomplete approved evidence.");
  }

  const frozenChunks = Object.freeze(selected.map((chunk) => Object.freeze({ ...chunk })));
  const evidenceRefMap = Object.freeze(frozenChunks.map((chunk, sourceRef) => Object.freeze({
    sourceRef,
    documentChunkId: chunk.documentChunkId,
    sourceDocumentId: chunk.sourceDocumentId,
    chunkIndex: chunk.chunkIndex,
    sourceLabel: sourceLabel(chunk),
    content: chunk.content,
  })));
  const evidence = Object.freeze({
    jobId: job.jobId,
    outlineLessonId: lesson.id,
    lessonTitle: lesson.title,
    learningObjectives: Object.freeze([...lesson.learningObjectives]),
    chunks: frozenChunks,
  });
  return Object.freeze({ evidence, evidenceRefMap });
}

export function normalizePedagogicalLessonCandidate(
  candidate: GeneratedLessonCandidate,
  blueprint: LessonBlueprint,
  evidenceRefMap: EvidenceRefMap,
  includeCitationSourceRefs: boolean
): { draft: StructuredLessonDraft; citations: Array<{ sectionIndex: number; documentChunkId: number }> } {
  if (!candidate || typeof candidate !== "object" || !candidate.title?.trim() ||
    candidate.title.trim().length > 150 || !candidate.summary?.trim() ||
    !Number.isInteger(candidate.estimatedMinutes) || candidate.estimatedMinutes < 1 ||
    candidate.estimatedMinutes > 180 || !Array.isArray(candidate.sections) ||
    candidate.sections.length !== blueprint.sections.length || candidate.sections.length < 1 ||
    candidate.sections.length > 12) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Generated Lesson candidate is invalid.");
  }
  const refs = new Map<number, EvidenceRefMap[number]>();
  const canonicalIds = new Set<number>();
  const sourceQualifiedKeys = new Set<string>();
  for (const [index, entry] of evidenceRefMap.entries()) {
    const sourceKey = `${entry.sourceDocumentId}:${entry.chunkIndex}`;
    if (entry.sourceRef !== index || refs.has(entry.sourceRef) ||
      !Number.isInteger(entry.documentChunkId) || entry.documentChunkId < 1 ||
      !Number.isInteger(entry.sourceDocumentId) || entry.sourceDocumentId < 1 ||
      !Number.isInteger(entry.chunkIndex) || entry.chunkIndex < 0 ||
      canonicalIds.has(entry.documentChunkId) || sourceQualifiedKeys.has(sourceKey)) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence mapping is invalid.");
    }
    refs.set(entry.sourceRef, entry);
    canonicalIds.add(entry.documentChunkId);
    sourceQualifiedKeys.add(sourceKey);
  }
  if (refs.size < 1) {
    throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson evidence mapping is empty.");
  }

  const citations: Array<{ sectionIndex: number; documentChunkId: number }> = [];
  const seenSectionKeys = new Set<string>();
  const sections = candidate.sections.map((section, sectionIndex) => {
    const planned = blueprint.sections[sectionIndex];
    if (!planned || !section || typeof section !== "object" || !section.sectionKey?.trim() ||
      seenSectionKeys.has(section.sectionKey) || section.sectionKey !== planned.sectionKey ||
      section.purpose !== planned.purpose || !section.heading?.trim() ||
      section.heading !== planned.heading || !section.bodyMarkdown?.trim() ||
      !Array.isArray(section.citationEvidenceRefs) || section.citationEvidenceRefs.length < 1 ||
      !section.citationEvidenceRefs.every(Number.isInteger) ||
      new Set(section.citationEvidenceRefs).size !== section.citationEvidenceRefs.length) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Generated Lesson sections do not match the blueprint.");
    }
    const permittedRefs = new Set(planned.evidenceRefs);
    const resolved = section.citationEvidenceRefs.map((sourceRef) => refs.get(sourceRef));
    if (resolved.some((entry) => entry === undefined) ||
      !section.citationEvidenceRefs.every((sourceRef) => permittedRefs.has(sourceRef))) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson contains an invalid source citation.");
    }
    const owned = resolved.filter((entry): entry is EvidenceRefMap[number] => entry !== undefined);
    if (new Set(owned.map((entry) => entry.documentChunkId)).size !== owned.length) {
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson contains an ambiguous source citation.");
    }
    for (const entry of owned) {
      citations.push({ sectionIndex, documentChunkId: entry.documentChunkId });
    }
    seenSectionKeys.add(section.sectionKey);
    return {
      heading: section.heading.trim(),
      bodyMarkdown: section.bodyMarkdown.trim(),
      citationChunkIndexes: owned.map((entry) => entry.chunkIndex),
      citationSourceRefs: includeCitationSourceRefs
        ? owned.map((entry) => ({ sourceDocumentId: entry.sourceDocumentId, chunkIndex: entry.chunkIndex }))
        : undefined,
    };
  });
  return {
    draft: {
      title: candidate.title.trim(),
      summary: candidate.summary.trim(),
      estimatedMinutes: candidate.estimatedMinutes,
      sections,
    },
    citations,
  };
}

export async function generatePedagogicalLessonSections(
  job: CourseImportDraft,
  outlineLessonId: number,
  chunks: readonly CourseSourceChunk[],
  provider: PedagogicalLessonProvider
) {
  const { evidence, evidenceRefMap } = buildApprovedLessonEvidenceBoundary(
    job,
    outlineLessonId,
    chunks
  );
  const planned = await provider.synthesizeEvidenceAndBlueprint({
    lessonTitle: evidence.lessonTitle,
    learningObjectives: evidence.learningObjectives,
    evidenceRefMap,
  });
  if (planned.model !== PEDAGOGICAL_MODEL) {
    throw new PedagogicalLessonGenerationError(new Error("PEDAGOGICAL_MODEL_MISMATCH"));
  }
  const generated = await provider.generateLessonSections({
    lessonTitle: evidence.lessonTitle,
    learningObjectives: evidence.learningObjectives,
    evidenceRefMap,
    synthesis: planned.synthesis,
    blueprint: planned.blueprint,
  });
  if (generated.model !== PEDAGOGICAL_MODEL) {
    throw new PedagogicalLessonGenerationError(new Error("PEDAGOGICAL_MODEL_MISMATCH"));
  }
  const normalized = normalizePedagogicalLessonCandidate(
    generated.result,
    planned.blueprint,
    evidenceRefMap,
    job.sources.length > 1
  );
  return {
    ...normalized,
    evidence,
    evidenceRefMap,
    synthesis: planned.synthesis,
    blueprint: planned.blueprint,
    candidate: generated.result,
    provider: generated.provider,
    model: generated.model,
  };
}

function hasOnlyObjectKeys(value: object, allowedKeys: readonly string[]): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateLessonQualityReview(
  review: LessonQualityReview,
  candidate: GeneratedLessonCandidate,
  evidenceRefMap: EvidenceRefMap
): void {
  if (!review || typeof review !== "object" || !hasOnlyObjectKeys(review, [
    "verdict", "findings", "reviewedSectionKeys",
  ]) || !["pass", "correctable", "reject"].includes(review.verdict) ||
    !Array.isArray(review.findings) || !Array.isArray(review.reviewedSectionKeys)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Lesson Quality Review is invalid.");
  }
  const sectionKeys = candidate.sections.map((section) => section.sectionKey);
  if (review.reviewedSectionKeys.length !== sectionKeys.length ||
    new Set(review.reviewedSectionKeys).size !== review.reviewedSectionKeys.length ||
    !review.reviewedSectionKeys.every((key, index) => key === sectionKeys[index])) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Lesson Quality Review coverage is invalid.");
  }
  const allowedSectionKeys = new Set(sectionKeys);
  const allowedEvidenceRefs = new Set(evidenceRefMap.map((entry) => entry.sourceRef));
  const allowedCodes = new Set<string>(QUALITY_FINDING_CODES);
  const globalCodes = new Set(["ARTICLE_LIKE_PROGRESSION", "OUTLINE_SCOPE_DRIFT"]);
  const findingKeys = new Set<string>();
  for (const finding of review.findings) {
    if (!finding || typeof finding !== "object" || !hasOnlyObjectKeys(finding, [
      "findingKey", "code", "disposition", "sectionKeys", "message", "evidenceRefs",
    ]) || !finding.findingKey?.trim() || findingKeys.has(finding.findingKey) ||
      !allowedCodes.has(finding.code) || !["correctable", "reject"].includes(finding.disposition) ||
      !Array.isArray(finding.sectionKeys) || new Set(finding.sectionKeys).size !== finding.sectionKeys.length ||
      !finding.sectionKeys.every((key) => allowedSectionKeys.has(key)) ||
      (finding.sectionKeys.length === 0 && !globalCodes.has(finding.code)) || !finding.message?.trim() ||
      (finding.evidenceRefs !== undefined && (!Array.isArray(finding.evidenceRefs) ||
        new Set(finding.evidenceRefs).size !== finding.evidenceRefs.length ||
        !finding.evidenceRefs.every((ref) => Number.isInteger(ref) && allowedEvidenceRefs.has(ref))))) {
      throw new ContentPipelineError("VALIDATION_ERROR", "Lesson Quality Review finding is invalid.");
    }
    findingKeys.add(finding.findingKey);
  }
  if ((review.verdict === "pass" && review.findings.length !== 0) ||
    (review.verdict !== "pass" && review.findings.length === 0) ||
    (review.verdict === "correctable" && review.findings.some((finding) => finding.disposition !== "correctable")) ||
    (review.verdict === "reject" && !review.findings.some((finding) => finding.disposition === "reject"))) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Lesson Quality Review verdict is contradictory.");
  }
}

export function mergeTargetedLessonCorrection(
  candidate: GeneratedLessonCandidate,
  correction: TargetedCorrection,
  review: LessonQualityReview,
  blueprint: LessonBlueprint,
  evidenceRefMap: EvidenceRefMap,
  includeCitationSourceRefs: boolean
) {
  validateLessonQualityReview(review, candidate, evidenceRefMap);
  if (review.verdict !== "correctable" || !correction || typeof correction !== "object" ||
    !hasOnlyObjectKeys(correction, [
      "addressedFindingKeys", "sections", "title", "summary", "estimatedMinutes",
    ]) || !Array.isArray(correction.addressedFindingKeys) || !Array.isArray(correction.sections)) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Targeted Lesson correction is invalid.");
  }
  const expectedFindingKeys = review.findings.map((finding) => finding.findingKey);
  if (correction.addressedFindingKeys.length !== expectedFindingKeys.length ||
    new Set(correction.addressedFindingKeys).size !== correction.addressedFindingKeys.length ||
    !correction.addressedFindingKeys.every((key, index) => key === expectedFindingKeys[index])) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Targeted correction does not address every finding.");
  }
  const requestedTargets = new Set(review.findings.flatMap((finding) => finding.sectionKeys));
  const orderedTargets = candidate.sections.map((section) => section.sectionKey)
    .filter((sectionKey) => requestedTargets.has(sectionKey));
  const returnedKeys = correction.sections.map((section) => section.sectionKey);
  if (returnedKeys.length !== orderedTargets.length || new Set(returnedKeys).size !== returnedKeys.length ||
    !returnedKeys.every((key, index) => key === orderedTargets[index])) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Targeted correction changed its authorized section set.");
  }
  const hasLessonLevelFinding = review.findings.some((finding) => finding.sectionKeys.length === 0);
  const includesMetadata = correction.title !== undefined || correction.summary !== undefined ||
    correction.estimatedMinutes !== undefined;
  if (includesMetadata && !hasLessonLevelFinding) {
    throw new ContentPipelineError("VALIDATION_ERROR", "Targeted correction changed unauthorized metadata.");
  }
  const correctionsByKey = new Map(correction.sections.map((section) => [section.sectionKey, section]));
  const mergedCandidate: GeneratedLessonCandidate = {
    title: correction.title ?? candidate.title,
    summary: correction.summary ?? candidate.summary,
    estimatedMinutes: correction.estimatedMinutes ?? candidate.estimatedMinutes,
    sections: candidate.sections.map((section) => correctionsByKey.get(section.sectionKey) ?? section),
  };
  const normalized = normalizePedagogicalLessonCandidate(
    mergedCandidate, blueprint, evidenceRefMap, includeCitationSourceRefs
  );
  return { candidate: mergedCandidate, ...normalized };
}

export async function generateReviewedPedagogicalLesson(
  job: CourseImportDraft,
  outlineLessonId: number,
  chunks: readonly CourseSourceChunk[],
  provider: PedagogicalLessonProvider
) {
  try {
    const phaseB = await generatePedagogicalLessonSections(job, outlineLessonId, chunks, provider);
    const reviewRequest = {
      lessonTitle: phaseB.evidence.lessonTitle,
      learningObjectives: phaseB.evidence.learningObjectives,
      evidenceRefMap: phaseB.evidenceRefMap,
      synthesis: phaseB.synthesis,
      blueprint: phaseB.blueprint,
      candidate: phaseB.candidate,
    };
    const initialReview = await provider.reviewLessonCandidate(reviewRequest);
    if (initialReview.model !== PEDAGOGICAL_MODEL) throw new Error("PEDAGOGICAL_MODEL_MISMATCH");
    validateLessonQualityReview(initialReview.result, phaseB.candidate, phaseB.evidenceRefMap);
    if (initialReview.result.verdict === "pass") return phaseB;
    if (initialReview.result.verdict === "reject") throw new PedagogicalLessonGenerationError();

    const corrected = await provider.correctLessonCandidate({
      ...reviewRequest,
      review: initialReview.result,
    });
    if (corrected.model !== PEDAGOGICAL_MODEL) throw new Error("PEDAGOGICAL_MODEL_MISMATCH");
    const merged = mergeTargetedLessonCorrection(
      phaseB.candidate,
      corrected.result,
      initialReview.result,
      phaseB.blueprint,
      phaseB.evidenceRefMap,
      job.sources.length > 1
    );
    const finalReview = await provider.reviewLessonCandidate({
      ...reviewRequest,
      candidate: merged.candidate,
    });
    if (finalReview.model !== PEDAGOGICAL_MODEL) throw new Error("PEDAGOGICAL_MODEL_MISMATCH");
    validateLessonQualityReview(finalReview.result, merged.candidate, phaseB.evidenceRefMap);
    if (finalReview.result.verdict !== "pass") throw new PedagogicalLessonGenerationError();
    return {
      ...phaseB,
      ...merged,
      provider: finalReview.provider,
      model: finalReview.model,
    };
  } catch (error) {
    if (error instanceof PedagogicalLessonGenerationError) throw error;
    throw new PedagogicalLessonGenerationError(error);
  }
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
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Outline contains an invalid source reference.");
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
        if (!chunk) throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Provider returned an unknown source reference.");
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
  const startedAt = Date.now();
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
    const result = await persistCourseOutlineForJob({
      jobId,
      outline: resolveJobOutline(
        mapProviderOutline(generated.outline as ProviderStructuredCourseOutline, providerMap),
        context
      ),
      provider: generated.provider,
      model: generated.model,
    });
    emitContentPipelineSignal({ event: "outline_generation", outcome: "success", stage: "persist_outline",
      code: "OK", actorId: adminId, jobId, sourceCount: context.sources.length,
      durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    await failCourseImport(jobId, "OUTLINE_GENERATION_FAILED").catch(() => undefined);
    const code = error instanceof ContentPipelineError ? error.code : "AI_PROVIDER_ERROR";
    emitContentPipelineSignal({ event: error instanceof ContentPipelineError && error.code === "INVALID_SOURCE_REFERENCE"
      ? "source_reference" : "outline_generation", outcome: "failure", stage: "generate_outline",
      code, actorId: adminId, jobId, sourceCount: context.sources.length, durationMs: Date.now() - startedAt });
    if (error instanceof ContentPipelineError) throw error;
    throw new ContentPipelineError("AI_PROVIDER_ERROR", "Unable to generate a valid Course outline.");
  }
}

export async function updateCourseOutline(jobIdValue: unknown, body: unknown) {
  const adminId = await requireAdmin();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const current = await getCourseImport(jobId);
  if (!current) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (current.status !== "outline_review") {
    throw new ContentPipelineError("INVALID_STATE", "Course outline cannot be edited in its current state.");
  }
  const context = await getCourseImportGenerationContext(jobId);
  if (!context) throw new ContentPipelineError("NOT_FOUND", "Course import evidence not found.");
  try {
    return await persistCourseOutlineForJob({
      jobId,
      outline: resolveJobOutline(body, context),
      provider: "admin_edit",
      model: null,
    });
  } catch (error) {
    if (error instanceof ContentPipelineError && error.code === "INVALID_SOURCE_REFERENCE") {
      emitContentPipelineSignal({ event: "source_reference", outcome: "rejected", stage: "admin_outline",
        code: error.code, actorId: adminId, jobId, sourceCount: context.sources.length });
    }
    throw error;
  }
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
      throw new ContentPipelineError("INVALID_SOURCE_REFERENCE", "Lesson contains an invalid source citation.");
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
  const startedAt = Date.now();
  const jobId = asPositiveId(jobIdValue, "jobId");
  const job = await getCourseImport(jobId);
  if (!job) throw new ContentPipelineError("NOT_FOUND", "Course import job not found.");
  if (job.outlineStale) {
    emitContentPipelineSignal({ event: "stale_outline", outcome: "rejected", stage: "continue",
      code: "STALE_OUTLINE", actorId: adminId, jobId, sourceCount: job.sources.length,
      durationMs: Date.now() - startedAt });
    throw new ContentPipelineError("STALE_OUTLINE", "The evidence set changed; generate and approve a replacement outline.");
  }
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
    emitContentPipelineSignal({ event: "lesson_generation", outcome: "success", stage: "generate_lessons",
      code: "OK", actorId: adminId, jobId, sourceCount: approvedJob.sources.length,
      durationMs: Date.now() - startedAt });
    return { jobId, status: "content_review" as const };
  } catch (error) {
    await failCourseImport(jobId, "LESSON_GENERATION_FAILED").catch(() => undefined);
    const code = error instanceof ContentPipelineError ? error.code : "AI_PROVIDER_ERROR";
    emitContentPipelineSignal({ event: code === "INVALID_SOURCE_REFERENCE" ? "source_reference" : "lesson_generation",
      outcome: "failure", stage: "generate_lessons", code, actorId: adminId, jobId,
      sourceCount: approvedJob.sources.length, durationMs: Date.now() - startedAt });
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
  const adminId = await requireAdmin();
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
  const publicationRetry = job.status === "ready_to_publish";
  if (job.status === "content_review") {
    await reviewCourseImport(jobId, "ready_to_publish", comment);
    job = { ...job, status: "ready_to_publish" };
  }
  if (job.status !== "ready_to_publish") {
    throw new ContentPipelineError("INVALID_STATE", "Course import is not ready to publish.");
  }
  try {
    const result = await publishCourseImport(jobId, curriculumSlug(job.title));
    emitContentPipelineSignal({ event: "publication", outcome: publicationRetry ? "retry" : "success",
      stage: "publish", code: "OK", actorId: adminId, jobId, sourceCount: job.sources.length });
    return result;
  } catch {
    emitContentPipelineSignal({ event: "publication", outcome: "failure", stage: "publish",
      code: "PUBLICATION_FAILED", actorId: adminId, jobId, sourceCount: job.sources.length });
    throw new ContentPipelineError("PUBLICATION_FAILED", "Course publication failed and may be retried safely.");
  }
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
