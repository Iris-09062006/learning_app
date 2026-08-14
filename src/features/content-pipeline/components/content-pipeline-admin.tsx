"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CourseImportDraft,
  CourseImportLessonDraft,
  CourseImportOutlineLesson,
  CourseResearchResult,
  ResearchCandidate,
  CourseSourceRef,
  ReviewCourseDraftBatchResult,
} from "@/features/content-pipeline/types";

interface ApiEnvelope<T> { success: boolean; data: T; message?: string; error?: { message?: string; sourceDocumentId?: number } }
interface PipelineRequestError extends Error { sourceDocumentId?: number }
interface PendingGeneration { sourceDocumentId: number; sourceFilename: string }
type StagedSourceStatus = "pending" | "ingesting" | "extracted" | "failed";
interface StagedSourceAttempt {
  clientKey: string;
  idempotencyKey: string;
  kind: "manual_url" | "discovered" | "file";
  label: string;
  url?: string;
  sourceDocumentId?: number;
  status: StagedSourceStatus;
  error?: string;
  attached?: boolean;
  candidateKey?: string;
  authorityScore?: number;
  relevanceScore?: number;
}
interface PipelineCheckpointV2 {
  version: 2;
  topic: string;
  selectedCandidateKeys: string[];
  candidates?: ResearchCandidate[];
  researchCursor?: string | null;
  researchHasMore?: boolean;
  attempts: StagedSourceAttempt[];
  initializationKey: string;
  jobId: number | null;
  pendingAction: "ingestion" | "initialization" | "outline" | null;
}

const CHECKPOINT_KEY = "learningapp.course-outline-generation";
export const LESSON_GENERATION_REQUEST_TIMEOUT_MS = 60_000;

export async function requestPipelineApi<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
    const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
    if (!response.ok || !payload?.success) {
      if ([502, 503, 504].includes(response.status)) {
        throw new Error("Dịch vụ tạm thời quá tải hoặc hết thời gian chờ. Vui lòng thử lại.");
      }
      const error = new Error(payload?.error?.message ?? payload?.message ?? "Không thể xử lý yêu cầu.") as PipelineRequestError;
      if (Number.isSafeInteger(payload?.error?.sourceDocumentId)) error.sourceDocumentId = payload?.error?.sourceDocumentId;
      throw error;
    }
    return payload.data;
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error("Yêu cầu sinh Lesson mất quá nhiều thời gian. Hệ thống đang kiểm tra trạng thái để bạn có thể tiếp tục an toàn.");
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function decodePipelineCheckpoint(value: string | null): PendingGeneration | PipelineCheckpointV2 | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PendingGeneration | PipelineCheckpointV2;
    if (parsed && "version" in parsed && parsed.version === 2 && Array.isArray(parsed.attempts)
      && typeof parsed.initializationKey === "string") return parsed;
    return "sourceDocumentId" in parsed && Number.isSafeInteger(parsed.sourceDocumentId) && parsed.sourceFilename ? parsed : null;
  } catch { return null; }
}

function readCheckpoint() { return decodePipelineCheckpoint(sessionStorage.getItem(CHECKPOINT_KEY)); }

function storeCheckpoint(value: PendingGeneration | PipelineCheckpointV2 | null) {
  if (value) sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(value));
  else sessionStorage.removeItem(CHECKPOINT_KEY);
}

function outlinePayload(draft: CourseImportDraft) {
  return {
    title: draft.title,
    description: draft.description,
    learningObjectives: draft.learningObjectives,
    lessons: draft.lessons.map(({ clientKey, title, summary, learningObjectives, sourceChunkIndexes, sourceRefs }) =>
      sourceRefs?.length
        ? { clientKey, title, summary, learningObjectives, sourceRefs }
        : { clientKey, title, summary, learningObjectives, sourceChunkIndexes }
    ),
  };
}

function sameSourceRef(left: CourseSourceRef, right: CourseSourceRef) {
  return left.sourceDocumentId === right.sourceDocumentId && left.chunkIndex === right.chunkIndex;
}

function availableOutlineRefs(draft: CourseImportDraft): CourseSourceRef[] {
  const refs = draft.lessons.flatMap((lesson) => lesson.sourceRefs ??
    lesson.sourceChunks?.map(({ sourceDocumentId, chunkIndex }) => ({ sourceDocumentId, chunkIndex })) ?? []);
  return refs.filter((ref, index) => refs.findIndex((item) => sameSourceRef(item, ref)) === index);
}

export function mergeResearchCandidates(
  current: ResearchCandidate[],
  incoming: ResearchCandidate[],
  selectedCandidateKeys: string[],
): ResearchCandidate[] {
  const selected = new Set(selectedCandidateKeys);
  const retained = current.filter((candidate, index, all) =>
    all.findIndex((item) => item.canonicalUrl === candidate.canonicalUrl) === index);
  if (retained.length > 20) {
    const selectedCandidates = retained.filter((candidate) => selected.has(candidate.candidateKey));
    const selectedUrls = new Set(selectedCandidates.map((candidate) => candidate.canonicalUrl));
    return [...selectedCandidates, ...retained.filter((candidate) => !selectedUrls.has(candidate.canonicalUrl))].slice(0, 20);
  }
  const seen = new Set(retained.map((candidate) => candidate.canonicalUrl));
  for (const candidate of incoming) {
    if (retained.length >= 20) break;
    if (!seen.has(candidate.canonicalUrl)) { retained.push(candidate); seen.add(candidate.canonicalUrl); }
  }
  return retained;
}

export function ContentPipelineAdmin() {
  const [imports, setImports] = useState<CourseImportDraft[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedOutlineLessonId, setSelectedOutlineLessonId] = useState<number | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);
  const [sourceAttempts, setSourceAttempts] = useState<StagedSourceAttempt[]>([]);
  const [topic, setTopic] = useState("");
  const [researchCandidates, setResearchCandidates] = useState<ResearchCandidate[]>([]);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<string[]>([]);
  const [researchCursor, setResearchCursor] = useState<string | null>(null);
  const [researchHasMore, setResearchHasMore] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const researchResultsHeading = useRef<HTMLHeadingElement>(null);
  const researchErrorAlert = useRef<HTMLDivElement>(null);
  const focusResearchResults = useRef(false);
  const [initializationKey, setInitializationKey] = useState(() => crypto.randomUUID());
  const [sourceReviewJobId, setSourceReviewJobId] = useState<number | null>(null);
  const [pendingSourceAction, setPendingSourceAction] = useState<PipelineCheckpointV2["pendingAction"]>(null);
  const [checkpointLoaded, setCheckpointLoaded] = useState(false);
  const checkpointHydrated = useRef(false);
  const [published, setPublished] = useState<ReviewCourseDraftBatchResult | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Đang tải dữ liệu...");
  const [error, setError] = useState<string | null>(null);

  const selectedImport = useMemo(
    () => imports.find((item) => item.jobId === selectedJobId) ?? null,
    [imports, selectedJobId]
  );
  const reviewedSourceCount = useMemo(() => {
    const sourceIds = new Set(sourceAttempts.flatMap((attempt) => attempt.sourceDocumentId ? [attempt.sourceDocumentId] : []));
    const reviewedJob = imports.find((item) => item.jobId === sourceReviewJobId) ?? selectedImport;
    const serverOnlyCount = reviewedJob?.sources.filter((source) => !sourceIds.has(source.sourceDocumentId)).length ?? 0;
    const materializedCandidateKeys = new Set(sourceAttempts.flatMap((attempt) => attempt.candidateKey ? [attempt.candidateKey] : []));
    const pendingSelectedCount = selectedCandidateKeys.filter((key) => !materializedCandidateKeys.has(key)).length;
    return sourceAttempts.length + serverOnlyCount + pendingSelectedCount;
  }, [imports, selectedCandidateKeys, selectedImport, sourceAttempts, sourceReviewJobId]);
  const selectedOutlineLesson = selectedImport?.lessons.find((lesson) => lesson.id === selectedOutlineLessonId) ?? null;
  const selectedContent = selectedOutlineLesson?.contentDraft ?? null;
  const refresh = useCallback(async () => {
    const importData = await requestPipelineApi<{ items: CourseImportDraft[] }>("/api/admin/course-drafts");
    setImports(importData.items);
    setSelectedJobId((current) => current && importData.items.some((item) => item.jobId === current)
      ? current : importData.items[0]?.jobId ?? null);
    if (!checkpointHydrated.current) {
      const checkpoint = readCheckpoint();
      if (checkpoint && "version" in checkpoint) {
        setSourceAttempts(checkpoint.attempts); setInitializationKey(checkpoint.initializationKey);
        setSourceReviewJobId(checkpoint.jobId); setPendingSourceAction(checkpoint.pendingAction);
        setTopic(checkpoint.topic); setSelectedCandidateKeys(checkpoint.selectedCandidateKeys);
        setResearchCandidates(checkpoint.candidates ?? []); setResearchCursor(checkpoint.researchCursor ?? null);
        setResearchHasMore(checkpoint.researchHasMore ?? false);
        if (checkpoint.jobId && importData.items.some((item) => item.jobId === checkpoint.jobId)) setSelectedJobId(checkpoint.jobId);
      } else if (checkpoint && importData.items.some((item) => item.sourceDocumentId === checkpoint.sourceDocumentId)) {
        storeCheckpoint(null); setPendingGeneration(null);
      } else setPendingGeneration(checkpoint);
      checkpointHydrated.current = true;
      setCheckpointLoaded(true);
    }
    setMessage(importData.items.length ? "Đã tải hàng chờ Course import." : "Không có Course import đang chờ xử lý.");
  }, []);

  useEffect(() => {
    if (!checkpointLoaded) return;
    if (!sourceAttempts.length && !sourceReviewJobId && !topic && !researchCandidates.length) {
      const current = decodePipelineCheckpoint(sessionStorage.getItem(CHECKPOINT_KEY));
      if (current && "version" in current) storeCheckpoint(null);
      return;
    }
    storeCheckpoint({ version: 2, topic, selectedCandidateKeys, candidates: researchCandidates,
      researchCursor, researchHasMore, attempts: sourceAttempts,
      initializationKey, jobId: sourceReviewJobId, pendingAction: pendingSourceAction });
  }, [sourceAttempts, initializationKey, sourceReviewJobId, pendingSourceAction, checkpointLoaded,
    topic, selectedCandidateKeys, researchCandidates, researchCursor, researchHasMore]);

  useEffect(() => {
    if (focusResearchResults.current && researchCandidates.length && !researchBusy) {
      researchResultsHeading.current?.focus();
      focusResearchResults.current = false;
    }
  }, [researchBusy, researchCandidates.length]);

  useEffect(() => { if (researchError) researchErrorAlert.current?.focus(); }, [researchError]);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu.");
      setMessage("");
    });
  }, [refresh]);

  function updateSelected(updater: (draft: CourseImportDraft) => CourseImportDraft) {
    setImports((current) => current.map((item) => item.jobId === selectedJobId ? updater(item) : item));
  }

  function resetLocalSourceWorkflow() {
    storeCheckpoint(null);
    setPendingGeneration(null);
    setSourceAttempts([]);
    setTopic("");
    setResearchCandidates([]);
    setSelectedCandidateKeys([]);
    setResearchCursor(null);
    setResearchHasMore(false);
    setResearchError(null);
    setInitializationKey(crypto.randomUUID());
    setSourceReviewJobId(null);
    setPendingSourceAction(null);
  }

  function clearResolvedSourceWorkflow(jobId: number) {
    if (sourceReviewJobId !== jobId) return;
    resetLocalSourceWorkflow();
  }

  function startNewWorkflow() {
    resetLocalSourceWorkflow();
    setSelectedJobId(null);
    setSelectedOutlineLessonId(null);
    setPublished(null);
    setError(null);
    setMessage("Đã mở workflow mới. Các Course import đã lưu vẫn còn trong hàng chờ.");
  }

  async function runOutlineGeneration(value: PendingGeneration) {
    await requestPipelineApi(`/api/admin/content-sources/${value.sourceDocumentId}/course-outline`, { method: "POST" });
    storeCheckpoint(null); setPendingGeneration(null); await refresh();
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPublished(null);
    let canRetry = false;
    try {
      const form = event.currentTarget;
      const file = (form.elements.namedItem("source") as HTMLInputElement).files?.[0];
      if (!file) throw new Error("Hãy chọn một tệp PDF hoặc tài liệu được hỗ trợ.");
      const formData = new FormData(); formData.set("file", file);
      setMessage("Đang tải tài liệu...");
      const source = await requestPipelineApi<{ id: number; originalFilename: string }>("/api/admin/content-sources", { method: "POST", body: formData });
      const pending = { sourceDocumentId: source.id, sourceFilename: source.originalFilename };
      setMessage("Đang trích xuất nội dung...");
      await requestPipelineApi(`/api/admin/content-sources/${source.id}/extract`, { method: "POST" });
      storeCheckpoint(pending); setPendingGeneration(pending); canRetry = true;
      setMessage("AI đang tạo Course outline; chưa sinh nội dung Lesson hoặc bài tập...");
      await runOutlineGeneration(pending);
      form.reset(); setMessage("Course outline đã được lưu để Admin review.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý tài liệu.");
      setMessage(canRetry ? "Có thể thử lại bước sinh outline mà không cần tải lại tệp." : "Extraction chưa hoàn tất; hãy kiểm tra tệp.");
    } finally { setBusy(false); }
  }

  async function retryOutline() {
    if (!pendingGeneration) return;
    setBusy(true); setError(null); setMessage("Đang thử sinh lại Course outline...");
    try { await runOutlineGeneration(pendingGeneration); setMessage("Course outline đã được tạo lại."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thử lại."); }
    finally { setBusy(false); }
  }

  function updateAttempt(clientKey: string, changes: Partial<StagedSourceAttempt>) {
    setSourceAttempts((current) => current.map((attempt) => attempt.clientKey === clientKey ? { ...attempt, ...changes } : attempt));
  }

  async function runResearch(append: boolean) {
    setResearchBusy(true); setResearchError(null);
    try {
      const result = await requestPipelineApi<CourseResearchResult>("/api/admin/course-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, ...(append && researchCursor ? { cursor: researchCursor } : {}) }),
      });
      setTopic(result.topic);
      setResearchCandidates((current) => append
        ? mergeResearchCandidates(current, result.results, selectedCandidateKeys)
        : result.results.slice(0, 20));
      if (!append) setSelectedCandidateKeys([]);
      setResearchCursor(result.cursor); setResearchHasMore(result.hasMore);
      setMessage(result.results.length
        ? `Đã tìm thấy ${result.results.length} ứng viên nguồn để Admin review.`
        : "Không tìm thấy ứng viên nguồn phù hợp. Bạn vẫn có thể thêm URL hoặc file.");
      focusResearchResults.current = true;
    } catch (cause) {
      setResearchError(cause instanceof Error ? cause.message : "Không thể nghiên cứu chủ đề lúc này.");
    } finally { setResearchBusy(false); }
  }

  async function researchTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runResearch(false);
  }

  function toggleResearchCandidate(candidateKey: string, checked: boolean) {
    if (checked && reviewedSourceCount >= 8) {
      setResearchError("Mỗi Course chỉ được chọn tối đa 8 nguồn.");
      return;
    }
    setResearchError(null);
    setSelectedCandidateKeys((current) => checked
      ? current.includes(candidateKey) ? current : [...current, candidateKey]
      : current.filter((key) => key !== candidateKey));
  }

  async function ingestSelectedResearchCandidates() {
    const alreadyAttempted = new Set(sourceAttempts.flatMap((attempt) => attempt.candidateKey ? [attempt.candidateKey] : []));
    const selected = researchCandidates.filter((candidate) =>
      selectedCandidateKeys.includes(candidate.candidateKey) && !alreadyAttempted.has(candidate.candidateKey));
    if (!selected.length) return;
    const attempts = selected.map((candidate): StagedSourceAttempt => ({
      clientKey: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      candidateKey: candidate.candidateKey,
      kind: "discovered",
      label: candidate.title,
      url: candidate.url,
      authorityScore: candidate.authorityScore,
      relevanceScore: candidate.relevanceScore,
      status: "ingesting",
    }));
    setSourceAttempts((current) => [...current, ...attempts].slice(0, 8));
    setBusy(true); setError(null); setPendingSourceAction("ingestion");
    try {
      for (const attempt of attempts) {
        try {
          const result = await requestPipelineApi<{ sourceDocumentId: number; status: "extracted"; chunkCount: number }>("/api/admin/content-sources/url", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: attempt.url,
              discovery: "discovered",
              title: attempt.label,
              idempotencyKey: attempt.idempotencyKey,
              authorityScore: attempt.authorityScore,
            }),
          });
          updateAttempt(attempt.clientKey, { sourceDocumentId: result.sourceDocumentId, status: "extracted" });
        } catch (cause) {
          const requestError = cause as PipelineRequestError;
          updateAttempt(attempt.clientKey, {
            sourceDocumentId: requestError.sourceDocumentId,
            status: "failed",
            error: cause instanceof Error ? cause.message : "Không thể ingest nguồn đã chọn.",
          });
        }
      }
      setMessage("Đã ingest xong các ứng viên được chọn. Hãy review kết quả nguồn trước khi khởi tạo Course import.");
    } finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function ingestManualUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPendingSourceAction("ingestion");
    if (reviewedSourceCount >= 8) { setError("Mỗi Course chỉ được tối đa 8 nguồn."); setBusy(false); setPendingSourceAction(null); return; }
    const form = event.currentTarget;
    const url = (form.elements.namedItem("manualUrl") as HTMLInputElement).value.trim();
    const attempt: StagedSourceAttempt = { clientKey: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), kind: "manual_url", label: url, url, status: "ingesting" };
    setSourceAttempts((current) => current.length >= 8 ? current : [...current, attempt]);
    try {
      const result = await requestPipelineApi<{ sourceDocumentId: number; status: "extracted"; chunkCount: number }>("/api/admin/content-sources/url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, discovery: "manual_url", idempotencyKey: attempt.idempotencyKey }),
      });
      updateAttempt(attempt.clientKey, { sourceDocumentId: result.sourceDocumentId, status: "extracted" });
      form.reset(); setMessage(`Nguồn URL đã sẵn sàng (${result.chunkCount} chunks).`);
    } catch (cause) {
      const requestError = cause as PipelineRequestError;
      updateAttempt(attempt.clientKey, { sourceDocumentId: requestError.sourceDocumentId, status: "failed", error: cause instanceof Error ? cause.message : "Không thể ingest URL." });
    } finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function ingestOptionalFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPendingSourceAction("ingestion");
    if (reviewedSourceCount >= 8) { setError("Mỗi Course chỉ được tối đa 8 nguồn."); setBusy(false); setPendingSourceAction(null); return; }
    const form = event.currentTarget;
    const file = (form.elements.namedItem("optionalSource") as HTMLInputElement).files?.[0];
    if (!file) { setError("Hãy chọn một tài liệu nguồn."); setBusy(false); setPendingSourceAction(null); return; }
    const attempt: StagedSourceAttempt = { clientKey: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), kind: "file", label: file.name, status: "ingesting" };
    setSourceAttempts((current) => current.length >= 8 ? current : [...current, attempt]);
    try {
      const formData = new FormData(); formData.set("file", file); formData.set("idempotencyKey", attempt.idempotencyKey);
      const staged = await requestPipelineApi<{ sourceDocumentId?: number; id?: number }>("/api/admin/content-sources", { method: "POST", body: formData });
      const sourceDocumentId = staged.sourceDocumentId ?? staged.id;
      if (!sourceDocumentId) throw new Error("Nguồn staged không hợp lệ.");
      updateAttempt(attempt.clientKey, { sourceDocumentId });
      const result = await requestPipelineApi<{ chunkCount: number }>(`/api/admin/content-sources/${sourceDocumentId}/extract`, { method: "POST" });
      updateAttempt(attempt.clientKey, { sourceDocumentId, status: "extracted" });
      form.reset(); setMessage(`Tài liệu đã sẵn sàng (${result.chunkCount} chunks).`);
    } catch (cause) {
      updateAttempt(attempt.clientKey, { status: "failed", error: cause instanceof Error ? cause.message : "Không thể ingest tài liệu." });
    } finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function retrySourceAttempt(attempt: StagedSourceAttempt) {
    setBusy(true); setError(null); setPendingSourceAction("ingestion"); updateAttempt(attempt.clientKey, { status: "ingesting", error: undefined });
    try {
      if (attempt.sourceDocumentId) {
        await requestPipelineApi(`/api/admin/content-sources/${attempt.sourceDocumentId}/extract`, { method: "POST" });
        updateAttempt(attempt.clientKey, { status: "extracted" });
      } else if ((attempt.kind === "manual_url" || attempt.kind === "discovered") && attempt.url) {
        const result = await requestPipelineApi<{ sourceDocumentId: number }>("/api/admin/content-sources/url", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: attempt.url,
            discovery: attempt.kind,
            idempotencyKey: attempt.idempotencyKey,
            ...(attempt.kind === "discovered" ? { title: attempt.label, authorityScore: attempt.authorityScore } : {}),
          }),
        });
        updateAttempt(attempt.clientKey, { sourceDocumentId: result.sourceDocumentId, status: "extracted" });
      } else throw new Error("Hãy chọn lại file để thử lại nguồn này.");
    } catch (cause) { updateAttempt(attempt.clientKey, { status: "failed", error: cause instanceof Error ? cause.message : "Không thể thử lại." }); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function removeSourceAttempt(attempt: StagedSourceAttempt) {
    setBusy(true); setError(null);
    try {
      if (attempt.sourceDocumentId) await requestPipelineApi(`/api/admin/content-sources/${attempt.sourceDocumentId}`, { method: "DELETE" });
      setSourceAttempts((current) => current.filter((item) => item.clientKey !== attempt.clientKey));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa nguồn staged."); }
    finally { setBusy(false); }
  }

  async function initializeOrAttachSources() {
    const usable = sourceAttempts.filter((attempt) => attempt.status === "extracted" && attempt.sourceDocumentId && !attempt.attached);
    if (!usable.length) return;
    setBusy(true); setError(null); setPendingSourceAction("initialization");
    try {
      let jobId = sourceReviewJobId;
      if (!jobId) {
        const result = await requestPipelineApi<{ jobId: number }>("/api/admin/course-imports", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initializationKey, sources: usable.map((attempt) => ({
            sourceDocumentId: attempt.sourceDocumentId,
            ...(attempt.relevanceScore === undefined ? {} : { relevanceScore: attempt.relevanceScore }),
          })) }),
        });
        jobId = result.jobId; setSourceReviewJobId(jobId);
      } else {
        for (const attempt of usable) {
          await requestPipelineApi(`/api/admin/course-drafts/${jobId}/sources`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
              sourceDocumentId: attempt.sourceDocumentId,
              ...(attempt.relevanceScore === undefined ? {} : { relevanceScore: attempt.relevanceScore }),
            }),
          });
        }
      }
      setSourceAttempts((current) => current.map((attempt) => usable.some((item) => item.clientKey === attempt.clientKey) ? { ...attempt, attached: true } : attempt));
      await refresh(); setSelectedJobId(jobId); setMessage("Các nguồn usable đã được gắn vào một Course import.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể khởi tạo hoặc gắn nguồn."); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function generateReviewedSourceOutline() {
    const jobId = sourceReviewJobId ?? selectedImport?.jobId;
    if (!jobId) return;
    setBusy(true); setError(null); setPendingSourceAction("outline");
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${jobId}/outline`, { method: "POST" });
      await refresh(); setSelectedJobId(jobId); setMessage("Course outline mới đã sẵn sàng để review.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo outline."); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function detachReviewedSource(sourceDocumentId: number) {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/sources/${sourceDocumentId}`, { method: "DELETE" });
      setSourceAttempts((current) => current.map((attempt) => attempt.sourceDocumentId === sourceDocumentId
        ? { ...attempt, attached: false } : attempt));
      await refresh(); setMessage("Nguồn đã được tháo; outline hiện tại cần được tạo lại.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tháo nguồn."); }
    finally { setBusy(false); }
  }

  function editLesson(id: number, changes: Partial<CourseImportOutlineLesson>) {
    updateSelected((draft) => ({ ...draft, lessons: draft.lessons.map((lesson) => lesson.id === id ? { ...lesson, ...changes } : lesson) }));
  }

  function reorderLesson(id: number, direction: -1 | 1) {
    updateSelected((draft) => {
      const lessons = [...draft.lessons]; const index = lessons.findIndex((lesson) => lesson.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= lessons.length) return draft;
      [lessons[index], lessons[target]] = [lessons[target], lessons[index]];
      return { ...draft, lessons: lessons.map((lesson, lessonIndex) => ({ ...lesson, lessonOrder: lessonIndex + 1 })) };
    });
  }

  function addLesson() {
    if (!selectedImport || selectedImport.lessons.length >= 20) return;
    const sourceRefs = selectedImport.lessons[0]?.sourceRefs ??
      selectedImport.lessons[0]?.sourceChunks?.map(({ sourceDocumentId, chunkIndex }) => ({ sourceDocumentId, chunkIndex }));
    if (selectedImport.sources.length > 1 && !sourceRefs?.length) return;
    const sourceChunkIndexes = selectedImport.sources.length === 1
      ? selectedImport.lessons[0]?.sourceChunkIndexes ?? [0]
      : [];
    const temporaryId = -Date.now();
    updateSelected((draft) => ({ ...draft, lessons: [...draft.lessons, {
      id: temporaryId,
      clientKey: `manual-${Date.now()}`,
      lessonOrder: draft.lessons.length + 1,
      title: "Lesson mới",
      summary: "Mô tả Lesson",
      learningObjectives: ["Mục tiêu học tập"],
      sourceChunkIndexes,
      sourceRefs,
      contentDraft: null,
    }] }));
  }

  function removeLesson(id: number) {
    if (!selectedImport || selectedImport.lessons.length <= 2) return;
    updateSelected((draft) => ({ ...draft, lessons: draft.lessons.filter((lesson) => lesson.id !== id)
      .map((lesson, index) => ({ ...lesson, lessonOrder: index + 1 })) }));
  }

  async function saveOutline() {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/outline`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(outlinePayload(selectedImport)),
      });
      await refresh(); setMessage("Đã lưu outline revision mới.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu outline."); }
    finally { setBusy(false); }
  }

  async function regenerateOutline() {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/outline/regenerate`, { method: "POST" });
      await refresh(); setMessage("AI đã tạo outline revision mới.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể regenerate outline."); }
    finally { setBusy(false); }
  }

  async function continueToLessons() {
    if (!selectedImport) return;
    setBusy(true); setError(null); setMessage("Đang sinh nội dung riêng cho từng Lesson...");
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/lessons/generate`, { method: "POST" }, LESSON_GENERATION_REQUEST_TIMEOUT_MS);
      await refresh(); setMessage("Nội dung Lesson đã sẵn sàng để review.");
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : "Không thể sinh nội dung Lesson.";
      try { await refresh(); }
      catch { setMessage("Không thể đồng bộ trạng thái Course import. Hãy làm mới trang trước khi thử lại."); }
      setError(failureMessage);
    }
    finally { setBusy(false); }
  }

  async function saveContent(content: CourseImportLessonDraft) {
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/lesson-drafts/${content.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline: "course_import", title: content.title, summary: content.summary,
          estimatedMinutes: content.estimatedMinutes, sections: content.sections }),
      });
      await refresh(); setMessage("Đã lưu Lesson content revision mới.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu Lesson content."); }
    finally { setBusy(false); }
  }

  async function regenerateLesson(lessonId: number) {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/lessons/${lessonId}/regenerate`, { method: "POST" });
      await refresh(); setMessage("Đã regenerate riêng Lesson được chọn.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể regenerate Lesson."); }
    finally { setBusy(false); }
  }

  async function reviewImport(decision: "published" | "rejected" | "needs_revision") {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      const result = await requestPipelineApi<ReviewCourseDraftBatchResult | { status: string }>(`/api/admin/course-drafts/${selectedImport.jobId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, comment: reviewComment }),
      });
      setPublished(decision === "published" ? result as ReviewCourseDraftBatchResult : null);
      if (decision !== "needs_revision") clearResolvedSourceWorkflow(selectedImport.jobId);
      setSelectedOutlineLessonId(null); setReviewComment(""); await refresh();
      setMessage(decision === "published" ? "Course và toàn bộ Lessons đã được publish nguyên tử."
        : decision === "rejected" ? "Course import đã bị từ chối và quyết định đã persist."
          : "Course draft được giữ ở content review để chỉnh sửa.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể review Course import."); }
    finally { setBusy(false); }
  }

  const canEditOutline = selectedImport?.status === "outline_review";
  const canReviewContent = selectedImport && ["content_review", "ready_to_publish"].includes(selectedImport.status);

  return <div className="space-y-8">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="course-generation-title">
      <h2 id="course-generation-title" className="text-xl font-semibold text-slate-950">PDF → Course outline → Lesson contents</h2>
      <p className="mt-2 text-sm text-slate-600">AI tạo outline trước. Chỉ sau khi Admin bấm Continue mới sinh nội dung Lesson. Pipeline này không tạo bài tập.</p>
      <form className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={submitSource}>
        <label className="flex-1 text-sm font-medium text-slate-800">Tài liệu nguồn
          <input className="mt-2 block w-full rounded-lg border border-slate-300 p-2" name="source" type="file" accept=".pdf,.txt,.md,.docx" disabled={busy} />
        </label>
        <button className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">Tạo Course outline</button>
      </form>
      {pendingGeneration ? <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        Chưa hoàn tất: {pendingGeneration.sourceFilename}. <button className="font-semibold underline" type="button" onClick={retryOutline} disabled={busy}>Thử sinh lại outline</button>
      </div> : null}
    </section>

    <section key={initializationKey} className="rounded-2xl border border-blue-200 bg-blue-50 p-6" aria-labelledby="source-review-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="source-review-title" className="text-xl font-semibold text-slate-950">Nguồn cho Course đa nguồn</h2>
        <button className="rounded border border-blue-600 bg-white px-3 py-1.5 text-sm font-semibold text-blue-800 disabled:opacity-50"
          type="button" onClick={startNewWorkflow} disabled={busy || researchBusy}>Bắt đầu workflow mới</button>
      </div>
      <p className="mt-2 text-sm text-slate-700">Thêm URL công khai và/hoặc tài liệu tùy chọn. Chỉ nguồn trích xuất thành công mới có thể trở thành evidence.</p>
      <form className="mt-5 rounded-lg border border-blue-200 bg-white p-4" onSubmit={researchTopic}>
        <label className="text-sm font-medium text-slate-800" htmlFor="course-research-topic">Chủ đề Course</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id="course-research-topic" className="block min-w-0 flex-1 rounded-lg border border-slate-300 p-2"
            value={topic} onChange={(event) => setTopic(event.target.value)} minLength={3} maxLength={300}
            required disabled={researchBusy} aria-describedby="course-research-help" />
          <button className="rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="submit" disabled={researchBusy}>{researchBusy ? "Đang nghiên cứu…" : "Nghiên cứu"}</button>
        </div>
        <p id="course-research-help" className="mt-2 text-xs text-slate-600">Tìm kiếm ưu tiên tiếng Việt; kết quả chỉ là ứng viên cho đến khi Admin xác nhận ingest.</p>
      </form>
      {researchError ? <div ref={researchErrorAlert} tabIndex={-1} role="alert"
        className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{researchError}
        <button type="button" className="ml-2 font-semibold underline" onClick={() => runResearch(researchCandidates.length > 0 && researchHasMore)} disabled={researchBusy}>Thử lại nghiên cứu</button>
      </div> : null}
      {researchCandidates.length ? <div className="mt-5 rounded-lg border border-blue-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 ref={researchResultsHeading} tabIndex={-1} className="font-semibold text-slate-950">Ứng viên nguồn nghiên cứu</h3>
          <button type="button" className="rounded border border-indigo-500 px-3 py-1.5 text-sm font-semibold text-indigo-800 disabled:opacity-50"
            onClick={() => runResearch(true)} disabled={researchBusy || !researchHasMore}>
            {researchBusy ? "Đang nghiên cứu…" : "Nghiên cứu thêm"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600" aria-live="polite">{researchCandidates.length}/20 ứng viên đang hiển thị · {reviewedSourceCount}/8 nguồn đã chọn</p>
        <ul className="mt-3 space-y-3" aria-label="Ứng viên nguồn nghiên cứu">
          {researchCandidates.map((candidate) => {
            const checked = selectedCandidateKeys.includes(candidate.candidateKey);
            const materialized = sourceAttempts.some((attempt) => attempt.candidateKey === candidate.candidateKey);
            return <li key={candidate.candidateKey} className="rounded-lg border border-slate-200 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4" checked={checked}
                  onChange={(event) => toggleResearchCandidate(candidate.candidateKey, event.target.checked)}
                  disabled={busy || researchBusy || materialized || (!checked && reviewedSourceCount >= 8)} />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-950">{candidate.title}</span>
                  <span className="block text-xs text-slate-600">{candidate.domain}{candidate.language ? ` · ${candidate.language}` : ""} · discovered</span>
                  <span className="mt-1 block text-sm text-slate-700">{candidate.snippet}</span>
                  <span className="mt-1 block text-xs text-indigo-800">Điểm tư vấn: authority {Math.round(candidate.authorityScore * 100)}% · relevance {Math.round(candidate.relevanceScore * 100)}%</span>
                  {materialized ? <span className="mt-1 block text-xs font-semibold text-emerald-700">Đã chuyển sang source review</span> : null}
                </span>
              </label>
            </li>;
          })}
        </ul>
        <button className="mt-4 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button" onClick={ingestSelectedResearchCandidates}
          disabled={busy || researchBusy || !selectedCandidateKeys.some((key) => !sourceAttempts.some((attempt) => attempt.candidateKey === key))}>
          Xác nhận và ingest nguồn đã chọn
        </button>
      </div> : researchBusy ? <p className="mt-3 text-sm text-slate-700" role="status">Đang tìm ứng viên nguồn…</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <form className="rounded-lg border border-blue-200 bg-white p-4" onSubmit={ingestManualUrl}>
          <label className="text-sm font-medium text-slate-800">URL thủ công
            <input className="mt-2 block w-full rounded-lg border border-slate-300 p-2" name="manualUrl" type="url" required disabled={busy || reviewedSourceCount >= 8} />
          </label>
          <button className="mt-3 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={busy || reviewedSourceCount >= 8}>Ingest URL</button>
        </form>
        <form className="rounded-lg border border-blue-200 bg-white p-4" onSubmit={ingestOptionalFile}>
          <label className="text-sm font-medium text-slate-800">Tài liệu tùy chọn
            <input className="mt-2 block w-full rounded-lg border border-slate-300 p-2" name="optionalSource" type="file" accept=".pdf,.txt,.md,.docx" required disabled={busy || reviewedSourceCount >= 8} />
          </label>
          <button className="mt-3 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={busy || reviewedSourceCount >= 8}>Ingest file</button>
        </form>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{reviewedSourceCount}/8 nguồn đã chọn · {sourceAttempts.filter((attempt) => attempt.status === "extracted").length} usable</p>
      {sourceAttempts.length ? <ul className="mt-3 space-y-2" aria-label="Trạng thái nguồn">{sourceAttempts.map((attempt) => <li className="rounded-lg border border-slate-200 bg-white p-3 text-sm" key={attempt.clientKey}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold text-slate-900">{attempt.label}</p><p className="text-slate-600">{attempt.kind === "manual_url" ? "URL thủ công" : attempt.kind === "discovered" ? "Nguồn nghiên cứu" : "File upload"} · {attempt.status}{attempt.attached ? " · attached" : " · staged"}</p>
            {attempt.error ? <p role="alert" className="mt-1 text-red-700">{attempt.error}</p> : null}</div>
          <div className="flex gap-2">{attempt.status === "failed" ? <button className="rounded border px-2 py-1 font-semibold" type="button" onClick={() => retrySourceAttempt(attempt)} disabled={busy}>Retry</button> : null}
            {!attempt.attached ? <button className="rounded border border-red-400 px-2 py-1 font-semibold text-red-700" type="button" onClick={() => removeSourceAttempt(attempt)} disabled={busy || attempt.status === "ingesting"}>Remove</button> : null}</div>
        </div>
      </li>)}</ul> : <p className="mt-3 text-sm text-slate-600">Chưa có nguồn staged.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="button" onClick={initializeOrAttachSources}
          disabled={busy || !sourceAttempts.some((attempt) => attempt.status === "extracted" && !attempt.attached)}> {sourceReviewJobId ? "Attach nguồn usable" : "Khởi tạo Course import"}</button>
        <button className="rounded border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50" type="button" onClick={generateReviewedSourceOutline}
          disabled={busy || !sourceReviewJobId || !sourceAttempts.some((attempt) => attempt.attached)}>Tạo outline từ evidence đã review</button>
      </div>
    </section>

    <div aria-live="polite" className="text-sm text-slate-700">{message}</div>
    {error ? <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
    {published ? <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">Course đã xuất bản. <Link className="font-semibold underline" href={`/courses/${published.courseId}`}>Mở Course</Link></div> : null}

    <section className="grid gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]" aria-labelledby="review-title">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 id="review-title" className="font-semibold text-slate-950">Course import queue</h2>
        {imports.length === 0 ? <p className="mt-3 text-sm text-slate-500">Hàng chờ trống.</p> : <ul className="mt-3 space-y-2">{imports.map((item) => <li key={item.jobId}>
          <button className={`w-full rounded-lg border p-3 text-left text-sm ${selectedJobId === item.jobId ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
            type="button" onClick={() => { setSelectedJobId(item.jobId); setSourceReviewJobId(item.jobId); setSelectedOutlineLessonId(null); }}>
            <span className="block font-semibold text-slate-900">{item.title}</span>
            <span className="text-slate-600">{item.status} · {item.lessons.length} Lessons</span>
          </button>
        </li>)}</ul>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {!selectedImport ? <p className="text-sm text-slate-500">Chọn một Course import.</p> : <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{selectedImport.status} · outline r{selectedImport.outlineRevision}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Nguồn evidence ({selectedImport.sources.length})</p>
            <ul className="mt-2 space-y-1">{selectedImport.sources.map((source) => <li key={source.sourceDocumentId}>
              <span>{source.title}{source.domain ? ` · ${source.domain}` : ""} · {source.ingestionMethod} · {source.status} · {source.chunkCount} chunks</span>
              {source.authorityScore !== null ? <span> · authority {source.authorityScore.toFixed(2)}</span> : null}
              {source.relevanceScore !== null ? <span> · relevance {source.relevanceScore.toFixed(2)}</span> : null}
              {["uploaded", "processing", "outline_review", "failed"].includes(selectedImport.status) && selectedImport.approvedOutlineRevision === null
                ? <button className="ml-2 font-semibold text-red-700 underline disabled:opacity-50" type="button" onClick={() => detachReviewedSource(source.sourceDocumentId)} disabled={busy || selectedImport.sources.length <= 1}>Detach</button> : null}
            </li>)}</ul>
          </div>
          {selectedImport.outlineStale ? <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Evidence đã thay đổi. Hãy tạo outline revision mới trước khi Continue.
            <button className="ml-2 font-semibold underline" type="button" onClick={generateReviewedSourceOutline} disabled={busy}>Tạo outline thay thế</button>
            {!canEditOutline ? <button className="ml-2 rounded border px-2 py-1 font-semibold opacity-60" type="button" disabled>Continue: sinh Lesson contents</button> : null}
          </div> : null}
          <label className="block text-sm font-medium">Course title
            <input className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={selectedImport.title} disabled={!canEditOutline}
              onChange={(event) => updateSelected((draft) => ({ ...draft, title: event.target.value }))} />
          </label>
          <label className="block text-sm font-medium">Description
            <textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={selectedImport.description} disabled={!canEditOutline}
              onChange={(event) => updateSelected((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="block text-sm font-medium">Course learning objectives (mỗi dòng một mục tiêu)
            <textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={selectedImport.learningObjectives.join("\n")} disabled={!canEditOutline}
              onChange={(event) => updateSelected((draft) => ({ ...draft, learningObjectives: event.target.value.split("\n").filter(Boolean) }))} />
          </label>
          <ol className="space-y-3">{selectedImport.lessons.map((lesson, index) => <li className="rounded-lg border border-slate-200 p-3" key={lesson.clientKey}>
            {canEditOutline ? <div className="grid gap-2">
              <label className="text-sm font-medium">Lesson {index + 1} title<input className="mt-1 w-full rounded border p-2" value={lesson.title} onChange={(e) => editLesson(lesson.id, { title: e.target.value })} /></label>
              <label className="text-sm font-medium">Summary<textarea className="mt-1 w-full rounded border p-2" value={lesson.summary} onChange={(e) => editLesson(lesson.id, { summary: e.target.value })} /></label>
              <label className="text-sm font-medium">Learning objectives<textarea className="mt-1 w-full rounded border p-2" value={lesson.learningObjectives.join("\n")} onChange={(e) => editLesson(lesson.id, { learningObjectives: e.target.value.split("\n").filter(Boolean) })} /></label>
              {selectedImport.sources.length > 1 ? <fieldset className="rounded border p-3">
                <legend className="px-1 text-sm font-medium">Nguồn tham chiếu</legend>
                <div className="grid gap-2 sm:grid-cols-2">{availableOutlineRefs(selectedImport).map((ref) => {
                    const source = selectedImport.sources.find((item) => item.sourceDocumentId === ref.sourceDocumentId);
                    const checked = (lesson.sourceRefs ?? []).some((item) => sameSourceRef(item, ref));
                    return <label className="flex items-center gap-2 text-sm" key={`${ref.sourceDocumentId}:${ref.chunkIndex}`}>
                      <input type="checkbox" checked={checked} onChange={(event) => {
                        const current = lesson.sourceRefs ?? [];
                        const next = event.target.checked
                          ? [...current, ref]
                          : current.filter((item) => !sameSourceRef(item, ref));
                        if (next.length) editLesson(lesson.id, { sourceRefs: next, sourceChunkIndexes: [] });
                      }} />
                      {source?.title ?? `Source ${ref.sourceDocumentId}`} · chunk {ref.chunkIndex}
                    </label>;
                  })}</div>
              </fieldset> : <label className="text-sm font-medium">Source chunk indexes<input className="mt-1 w-full rounded border p-2" value={lesson.sourceChunkIndexes.join(",")}
                onChange={(e) => editLesson(lesson.id, { sourceChunkIndexes: e.target.value.split(",").map(Number).filter(Number.isInteger), sourceRefs: undefined })} /></label>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded border px-2 py-1" onClick={() => reorderLesson(lesson.id, -1)} disabled={index === 0}>Di chuyển lên</button>
                <button type="button" className="rounded border px-2 py-1" onClick={() => reorderLesson(lesson.id, 1)} disabled={index === selectedImport.lessons.length - 1}>Di chuyển xuống</button>
                <button type="button" className="rounded border border-red-400 px-2 py-1 text-red-700" onClick={() => removeLesson(lesson.id)} disabled={selectedImport.lessons.length <= 2}>Xóa Lesson</button>
              </div>
            </div> : <button className="w-full text-left" type="button" onClick={() => setSelectedOutlineLessonId(lesson.id)}>
              <span className="font-semibold">{index + 1}. {lesson.title}</span>
              <span className="block text-sm text-slate-600">{lesson.summary} · {lesson.contentDraft ? `content r${lesson.contentDraft.revision}` : "chưa có content"}</span>
            </button>}
          </li>)}</ol>
          {canEditOutline ? <div className="flex flex-wrap gap-3">
            <button className="rounded border px-4 py-2 text-sm font-semibold" type="button" onClick={addLesson} disabled={busy || selectedImport.lessons.length >= 20}>Thêm Lesson</button>
            <button className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={saveOutline} disabled={busy}>Lưu outline</button>
            <button className="rounded border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-800" type="button" onClick={regenerateOutline} disabled={busy}>Regenerate outline</button>
            <button className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={continueToLessons} disabled={busy || selectedImport.outlineStale}>Continue: sinh Lesson contents</button>
          </div> : null}
          {selectedImport.status === "failed" ? <button className="rounded bg-amber-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={selectedImport.approvedOutlineRevision ? continueToLessons : regenerateOutline} disabled={busy}>Thử lại bước bị lỗi</button> : null}
          {selectedImport.status === "generating_content" ? <button className="rounded border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-800" type="button"
            onClick={() => { setError(null); refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không thể làm mới trạng thái.")); }} disabled={busy}>Làm mới trạng thái</button> : null}
          {canReviewContent ? <div className="space-y-3">
            <label className="block text-sm font-medium">Ghi chú review<textarea className="mt-1 w-full rounded border p-2" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} /></label>
            <div className="flex flex-wrap gap-3">
              <button className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => reviewImport("published")} disabled={busy}>Publish Course</button>
              <button className="rounded border border-amber-500 px-4 py-2 text-sm font-semibold" type="button" onClick={() => reviewImport("needs_revision")} disabled={busy}>Cần chỉnh sửa</button>
              <button className="rounded border border-red-500 px-4 py-2 text-sm font-semibold text-red-700" type="button" onClick={() => reviewImport("rejected")} disabled={busy}>Từ chối</button>
            </div>
          </div> : null}
        </div>}
      </div>
    </section>

    {selectedContent && selectedOutlineLesson ? <ContentEditor content={selectedContent} onChange={(content) => editLesson(selectedOutlineLesson.id, { contentDraft: content })}
      onSave={() => saveContent(selectedContent)} onRegenerate={() => regenerateLesson(selectedOutlineLesson.id)} busy={busy} /> : null}

    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
      <h2 className="text-xl font-semibold text-slate-950">Lesson → Exercise là pipeline riêng</h2>
      <p className="mt-2 text-sm text-slate-700">Chọn một Lesson đã publish từ khu vực moderation để tạo và duyệt bài tập.</p>
      <Link className="mt-4 inline-flex rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white" href="/moderation/lessons">Mở danh sách Lesson</Link>
    </section>
  </div>;
}

function ContentEditor({ content, onChange, onSave, onRegenerate, busy }: {
  content: CourseImportLessonDraft;
  onChange: (content: CourseImportLessonDraft) => void;
  onSave: () => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  function updateSection(index: number, field: "heading" | "bodyMarkdown", value: string) {
    onChange({ ...content, sections: content.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [field]: value } : section) });
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="lesson-editor-title">
    <h2 id="lesson-editor-title" className="text-xl font-semibold">Lesson content review</h2>
    <div className="mt-4 grid gap-4">
      <label className="text-sm font-medium">Tiêu đề<input className="mt-1 w-full rounded border p-2" value={content.title} onChange={(e) => onChange({ ...content, title: e.target.value })} /></label>
      <label className="text-sm font-medium">Tóm tắt<textarea className="mt-1 w-full rounded border p-2" value={content.summary} onChange={(e) => onChange({ ...content, summary: e.target.value })} /></label>
      {content.sections.map((section, index) => <fieldset className="rounded border p-4" key={index}>
        <legend>Phần {index + 1}</legend>
        <input aria-label={`Tiêu đề phần ${index + 1}`} className="mb-2 w-full rounded border p-2" value={section.heading} onChange={(e) => updateSection(index, "heading", e.target.value)} />
        <textarea aria-label={`Nội dung phần ${index + 1}`} className="min-h-36 w-full rounded border p-2" value={section.bodyMarkdown} onChange={(e) => updateSection(index, "bodyMarkdown", e.target.value)} />
        <p className="mt-2 text-xs text-slate-500">Nguồn chunk: {section.citationChunkIndexes.join(", ")}</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">{content.citations
          .filter((citation) => citation.sectionIndex === index)
          .map((citation) => <li key={`${citation.documentChunkId ?? citation.chunkIndex}`}>
            {citation.sourceTitle
              ? `${citation.sourceTitle}${citation.sourceDomain || citation.sourceUrl ? ` · ${citation.sourceDomain ?? citation.sourceUrl}` : ""} · chunk ${citation.chunkIndex}: ${citation.quote}`
              : `Chunk ${citation.chunkIndex}: ${citation.quote}`}
          </li>)}</ul>
      </fieldset>)}
      <div className="flex gap-3"><button className="rounded bg-blue-700 px-4 py-2 text-white" type="button" onClick={onSave} disabled={busy}>Lưu Lesson content</button>
        <button className="rounded border border-blue-500 px-4 py-2 text-blue-800" type="button" onClick={onRegenerate} disabled={busy}>Regenerate Lesson này</button></div>
    </div>
  </section>;
}
