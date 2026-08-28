"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatePanel } from "@/components/ui/state-panel";
import { Textarea } from "@/components/ui/textarea";

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
export const LESSON_GENERATION_REQUEST_TIMEOUT_MS = 300_000;

export async function requestPipelineApi<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
    const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
    if (!response.ok || !payload?.success) {
      if ([502, 503, 504].includes(response.status)) {
        throw new Error("Dá»‹ch vá»¥ táº¡m thá»i quÃ¡ táº£i hoáº·c háº¿t thá»i gian chá». Vui lÃ²ng thá»­ láº¡i.");
      }
      const error = new Error(payload?.error?.message ?? payload?.message ?? "KhÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u.") as PipelineRequestError;
      if (Number.isSafeInteger(payload?.error?.sourceDocumentId)) error.sourceDocumentId = payload?.error?.sourceDocumentId;
      throw error;
    }
    return payload.data;
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error("YÃªu cáº§u sinh Lesson máº¥t quÃ¡ nhiá»u thá»i gian. Há»‡ thá»‘ng Ä‘ang kiá»ƒm tra tráº¡ng thÃ¡i Ä‘á»ƒ báº¡n cÃ³ thá»ƒ tiáº¿p tá»¥c an toÃ n.");
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
  const refreshSequence = useRef(0);
  const [published, setPublished] = useState<ReviewCourseDraftBatchResult | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Äang táº£i dá»¯ liá»‡u...");
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
  const refresh = useCallback(async (preferredJobId?: number) => {
    const sequence = ++refreshSequence.current;
    const importData = await requestPipelineApi<{ items: CourseImportDraft[] }>(
      "/api/admin/course-drafts",
      { cache: "no-store" },
    );
    if (sequence !== refreshSequence.current) return;
    setImports(importData.items);
    setSelectedJobId((current) => {
      if (preferredJobId && importData.items.some((item) => item.jobId === preferredJobId)) {
        return preferredJobId;
      }
      return current && importData.items.some((item) => item.jobId === current)
        ? current : importData.items[0]?.jobId ?? null;
    });
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
    setMessage(importData.items.length ? "ÄÃ£ táº£i hÃ ng chá» Course import." : "KhÃ´ng cÃ³ Course import Ä‘ang chá» xá»­ lÃ½.");
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
      setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u.");
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
    setMessage("ÄÃ£ má»Ÿ workflow má»›i. CÃ¡c Course import Ä‘Ã£ lÆ°u váº«n cÃ²n trong hÃ ng chá».");
  }

  async function runOutlineGeneration(value: PendingGeneration) {
    const result = await requestPipelineApi<{ jobId: number }>(`/api/admin/content-sources/${value.sourceDocumentId}/course-outline`, { method: "POST" });
    storeCheckpoint(null); setPendingGeneration(null); await refresh(result.jobId);
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPublished(null);
    let canRetry = false;
    try {
      const form = event.currentTarget;
      const file = (form.elements.namedItem("source") as HTMLInputElement).files?.[0];
      if (!file) throw new Error("HÃ£y chá»n má»™t tá»‡p PDF hoáº·c tÃ i liá»‡u Ä‘Æ°á»£c há»— trá»£.");
      const formData = new FormData(); formData.set("file", file);
      setMessage("Äang táº£i tÃ i liá»‡u...");
      const source = await requestPipelineApi<{ id: number; originalFilename: string }>("/api/admin/content-sources", { method: "POST", body: formData });
      const pending = { sourceDocumentId: source.id, sourceFilename: source.originalFilename };
      setMessage("Äang trÃ­ch xuáº¥t ná»™i dung...");
      await requestPipelineApi(`/api/admin/content-sources/${source.id}/extract`, { method: "POST" });
      storeCheckpoint(pending); setPendingGeneration(pending); canRetry = true;
      setMessage("AI Ä‘ang táº¡o Course outline; chÆ°a sinh ná»™i dung Lesson hoáº·c bÃ i táº­p...");
      await runOutlineGeneration(pending);
      form.reset(); setMessage("Course outline Ä‘Ã£ Ä‘Æ°á»£c lÆ°u Ä‘á»ƒ Admin review.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ xá»­ lÃ½ tÃ i liá»‡u.");
      setMessage(canRetry ? "CÃ³ thá»ƒ thá»­ láº¡i bÆ°á»›c sinh outline mÃ  khÃ´ng cáº§n táº£i láº¡i tá»‡p." : "Extraction chÆ°a hoÃ n táº¥t; hÃ£y kiá»ƒm tra tá»‡p.");
    } finally { setBusy(false); }
  }

  async function retryOutline() {
    if (!pendingGeneration) return;
    setBusy(true); setError(null); setMessage("Äang thá»­ sinh láº¡i Course outline...");
    try { await runOutlineGeneration(pendingGeneration); setMessage("Course outline Ä‘Ã£ Ä‘Æ°á»£c táº¡o láº¡i."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ thá»­ láº¡i."); }
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
        ? `ÄÃ£ tÃ¬m tháº¥y ${result.results.length} á»©ng viÃªn nguá»“n Ä‘á»ƒ Admin review.`
        : "KhÃ´ng tÃ¬m tháº¥y á»©ng viÃªn nguá»“n phÃ¹ há»£p. Báº¡n váº«n cÃ³ thá»ƒ thÃªm URL hoáº·c file.");
      focusResearchResults.current = true;
    } catch (cause) {
      setResearchError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ nghiÃªn cá»©u chá»§ Ä‘á» lÃºc nÃ y.");
    } finally { setResearchBusy(false); }
  }

  async function researchTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runResearch(false);
  }

  function toggleResearchCandidate(candidateKey: string, checked: boolean) {
    if (checked && reviewedSourceCount >= 8) {
      setResearchError("Má»—i Course chá»‰ Ä‘Æ°á»£c chá»n tá»‘i Ä‘a 8 nguá»“n.");
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
            error: cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ ingest nguá»“n Ä‘Ã£ chá»n.",
          });
        }
      }
      setMessage("ÄÃ£ ingest xong cÃ¡c á»©ng viÃªn Ä‘Æ°á»£c chá»n. HÃ£y review káº¿t quáº£ nguá»“n trÆ°á»›c khi khá»Ÿi táº¡o Course import.");
    } finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function ingestManualUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPendingSourceAction("ingestion");
    if (reviewedSourceCount >= 8) { setError("Má»—i Course chá»‰ Ä‘Æ°á»£c tá»‘i Ä‘a 8 nguá»“n."); setBusy(false); setPendingSourceAction(null); return; }
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
      form.reset(); setMessage(`Nguá»“n URL Ä‘Ã£ sáºµn sÃ ng (${result.chunkCount} chunks).`);
    } catch (cause) {
      const requestError = cause as PipelineRequestError;
      updateAttempt(attempt.clientKey, { sourceDocumentId: requestError.sourceDocumentId, status: "failed", error: cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ ingest URL." });
    } finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function ingestOptionalFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setPendingSourceAction("ingestion");
    if (reviewedSourceCount >= 8) { setError("Má»—i Course chá»‰ Ä‘Æ°á»£c tá»‘i Ä‘a 8 nguá»“n."); setBusy(false); setPendingSourceAction(null); return; }
    const form = event.currentTarget;
    const file = (form.elements.namedItem("optionalSource") as HTMLInputElement).files?.[0];
    if (!file) { setError("HÃ£y chá»n má»™t tÃ i liá»‡u nguá»“n."); setBusy(false); setPendingSourceAction(null); return; }
    const attempt: StagedSourceAttempt = { clientKey: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), kind: "file", label: file.name, status: "ingesting" };
    setSourceAttempts((current) => current.length >= 8 ? current : [...current, attempt]);
    try {
      const formData = new FormData(); formData.set("file", file); formData.set("idempotencyKey", attempt.idempotencyKey);
      const staged = await requestPipelineApi<{ sourceDocumentId?: number; id?: number }>("/api/admin/content-sources", { method: "POST", body: formData });
      const sourceDocumentId = staged.sourceDocumentId ?? staged.id;
      if (!sourceDocumentId) throw new Error("Nguá»“n staged khÃ´ng há»£p lá»‡.");
      updateAttempt(attempt.clientKey, { sourceDocumentId });
      const result = await requestPipelineApi<{ chunkCount: number }>(`/api/admin/content-sources/${sourceDocumentId}/extract`, { method: "POST" });
      updateAttempt(attempt.clientKey, { sourceDocumentId, status: "extracted" });
      form.reset(); setMessage(`TÃ i liá»‡u Ä‘Ã£ sáºµn sÃ ng (${result.chunkCount} chunks).`);
    } catch (cause) {
      updateAttempt(attempt.clientKey, { status: "failed", error: cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ ingest tÃ i liá»‡u." });
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
      } else throw new Error("HÃ£y chá»n láº¡i file Ä‘á»ƒ thá»­ láº¡i nguá»“n nÃ y.");
    } catch (cause) { updateAttempt(attempt.clientKey, { status: "failed", error: cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ thá»­ láº¡i." }); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function removeSourceAttempt(attempt: StagedSourceAttempt) {
    setBusy(true); setError(null);
    try {
      if (attempt.sourceDocumentId) await requestPipelineApi(`/api/admin/content-sources/${attempt.sourceDocumentId}`, { method: "DELETE" });
      setSourceAttempts((current) => current.filter((item) => item.clientKey !== attempt.clientKey));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ xÃ³a nguá»“n staged."); }
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
      await refresh(jobId); setMessage("CÃ¡c nguá»“n usable Ä‘Ã£ Ä‘Æ°á»£c gáº¯n vÃ o má»™t Course import.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ khá»Ÿi táº¡o hoáº·c gáº¯n nguá»“n."); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function generateReviewedSourceOutline() {
    const jobId = sourceReviewJobId ?? selectedImport?.jobId;
    if (!jobId) return;
    setBusy(true); setError(null); setPendingSourceAction("outline");
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${jobId}/outline`, { method: "POST" });
      await refresh(jobId);
      resetLocalSourceWorkflow();
      setMessage("Course outline má»›i Ä‘Ã£ sáºµn sÃ ng Ä‘á»ƒ review. Workflow táº¡o má»›i Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t láº¡i.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ táº¡o outline."); }
    finally { setBusy(false); setPendingSourceAction(null); }
  }

  async function detachReviewedSource(sourceDocumentId: number) {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/sources/${sourceDocumentId}`, { method: "DELETE" });
      setSourceAttempts((current) => current.map((attempt) => attempt.sourceDocumentId === sourceDocumentId
        ? { ...attempt, attached: false } : attempt));
      await refresh(); setMessage("Nguá»“n Ä‘Ã£ Ä‘Æ°á»£c thÃ¡o; outline hiá»‡n táº¡i cáº§n Ä‘Æ°á»£c táº¡o láº¡i.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ thÃ¡o nguá»“n."); }
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
      title: "Lesson má»›i",
      summary: "MÃ´ táº£ Lesson",
      learningObjectives: ["Má»¥c tiÃªu há»c táº­p"],
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
      await refresh(); setMessage("ÄÃ£ lÆ°u outline revision má»›i.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ lÆ°u outline."); }
    finally { setBusy(false); }
  }

  async function regenerateOutline() {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/outline/regenerate`, { method: "POST" });
      await refresh(); setMessage("AI Ä‘Ã£ táº¡o outline revision má»›i.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ regenerate outline."); }
    finally { setBusy(false); }
  }

  async function continueToLessons() {
    if (!selectedImport) return;
    setBusy(true); setError(null); setMessage("Äang sinh ná»™i dung riÃªng cho tá»«ng Lesson...");
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/lessons/generate`, { method: "POST" }, LESSON_GENERATION_REQUEST_TIMEOUT_MS);
      await refresh(); setMessage("Ná»™i dung Lesson Ä‘Ã£ sáºµn sÃ ng Ä‘á»ƒ review.");
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ sinh ná»™i dung Lesson.";
      try { await refresh(); }
      catch { setMessage("KhÃ´ng thá»ƒ Ä‘á»“ng bá»™ tráº¡ng thÃ¡i Course import. HÃ£y lÃ m má»›i trang trÆ°á»›c khi thá»­ láº¡i."); }
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
      await refresh(); setMessage("ÄÃ£ lÆ°u Lesson content revision má»›i.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ lÆ°u Lesson content."); }
    finally { setBusy(false); }
  }

  async function regenerateLesson(lessonId: number) {
    if (!selectedImport) return;
    setBusy(true); setError(null);
    try {
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/lessons/${lessonId}/regenerate`, { method: "POST" });
      await refresh(); setMessage("ÄÃ£ regenerate riÃªng Lesson Ä‘Æ°á»£c chá»n.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ regenerate Lesson."); }
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
      setMessage(decision === "published" ? "Course vÃ  toÃ n bá»™ Lessons Ä‘Ã£ Ä‘Æ°á»£c publish nguyÃªn tá»­."
        : decision === "rejected" ? "Course import Ä‘Ã£ bá»‹ tá»« chá»‘i vÃ  quyáº¿t Ä‘á»‹nh Ä‘Ã£ persist."
          : "Course draft Ä‘Æ°á»£c giá»¯ á»Ÿ content review Ä‘á»ƒ chá»‰nh sá»­a.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ review Course import."); }
    finally { setBusy(false); }
  }

  const canEditOutline = selectedImport?.status === "outline_review";
  const canReviewContent = selectedImport && ["content_review", "ready_to_publish"].includes(selectedImport.status);

  return <div className="space-y-8">
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm" aria-labelledby="course-generation-title">
      <h2 id="course-generation-title" className="text-xl font-semibold text-text-primary">PDF â†’ Course outline â†’ Lesson contents</h2>
      <p className="mt-2 text-sm text-text-secondary">AI táº¡o outline trÆ°á»›c. Chá»‰ sau khi Admin báº¥m Continue má»›i sinh ná»™i dung Lesson. Pipeline nÃ y khÃ´ng táº¡o bÃ i táº­p.</p>
      <form className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={submitSource}>
        <div className="min-w-0 flex-1">
          <Input label="TÃ i liá»‡u nguá»“n" name="source" type="file" accept=".pdf,.txt,.md,.docx" disabled={busy} />
        </div>
        <Button type="submit" disabled={busy}>Táº¡o Course outline</Button>
      </form>
      {pendingGeneration ? <div className="mt-4 rounded-lg border border-warning bg-warning-soft p-3 text-sm text-warning">
        ChÆ°a hoÃ n táº¥t: {pendingGeneration.sourceFilename}. <Button variant="ghost" size="sm" type="button" className="px-0 font-semibold underline" onClick={retryOutline} disabled={busy}>Thá»­ sinh láº¡i outline</Button>
      </div> : null}
    </section>

    <section key={initializationKey} className="rounded-xl border border-border bg-surface p-6 shadow-sm" aria-labelledby="source-review-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="source-review-title" className="text-xl font-semibold text-text-primary">Nguá»“n cho Course Ä‘a nguá»“n</h2>
        <Button variant="outline" type="button" onClick={startNewWorkflow} disabled={busy || researchBusy}>Báº¯t Ä‘áº§u workflow má»›i</Button>
      </div>
      <p className="mt-2 text-sm text-text-secondary">ThÃªm URL cÃ´ng khai vÃ /hoáº·c tÃ i liá»‡u tÃ¹y chá»n. Chá»‰ nguá»“n trÃ­ch xuáº¥t thÃ nh cÃ´ng má»›i cÃ³ thá»ƒ trá»Ÿ thÃ nh evidence.</p>
      <form className="mt-5 rounded-lg border border-border bg-surface p-4" onSubmit={researchTopic}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input id="course-research-topic" label="Chá»§ Ä‘á» Course" value={topic} onChange={(event) => setTopic(event.target.value)}
              minLength={3} maxLength={300} required disabled={researchBusy} aria-describedby="course-research-help" />
          </div>
          <Button type="submit" disabled={researchBusy}>{researchBusy ? "Äang nghiÃªn cá»©uâ€¦" : "NghiÃªn cá»©u"}</Button>
        </div>
        <p id="course-research-help" className="mt-2 text-xs text-text-muted">TÃ¬m kiáº¿m Æ°u tiÃªn tiáº¿ng Viá»‡t; káº¿t quáº£ chá»‰ lÃ  á»©ng viÃªn cho Ä‘áº¿n khi Admin xÃ¡c nháº­n ingest.</p>
      </form>
      {researchError ? <div ref={researchErrorAlert} tabIndex={-1} role="alert"
        className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{researchError}
        <Button variant="ghost" size="sm" type="button" className="ml-2 px-0 font-semibold underline" onClick={() => runResearch(researchCandidates.length > 0 && researchHasMore)} disabled={researchBusy}>Thá»­ láº¡i nghiÃªn cá»©u</Button>
      </div> : null}
      {researchCandidates.length ? <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 ref={researchResultsHeading} tabIndex={-1} className="rounded-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">á»¨ng viÃªn nguá»“n nghiÃªn cá»©u</h3>
          <Button variant="outline" size="sm" type="button" onClick={() => runResearch(true)} disabled={researchBusy || !researchHasMore}>
            {researchBusy ? "Äang nghiÃªn cá»©uâ€¦" : "NghiÃªn cá»©u thÃªm"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-text-muted" aria-live="polite">{researchCandidates.length}/20 á»©ng viÃªn Ä‘ang hiá»ƒn thá»‹ Â· {reviewedSourceCount}/8 nguá»“n Ä‘Ã£ chá»n</p>
        <ul className="mt-3 space-y-3" aria-label="á»¨ng viÃªn nguá»“n nghiÃªn cá»©u">
          {researchCandidates.map((candidate) => {
            const checked = selectedCandidateKeys.includes(candidate.candidateKey);
            const materialized = sourceAttempts.some((attempt) => attempt.candidateKey === candidate.candidateKey);
            return <li key={candidate.candidateKey} className="rounded-lg border border-border bg-surface p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4 accent-primary" checked={checked}
                  onChange={(event) => toggleResearchCandidate(candidate.candidateKey, event.target.checked)}
                  disabled={busy || researchBusy || materialized || (!checked && reviewedSourceCount >= 8)} />
                <span className="min-w-0">
                  <span className="block font-semibold text-text-primary">{candidate.title}</span>
                  <span className="block text-xs text-text-muted">{candidate.domain}{candidate.language ? ` Â· ${candidate.language}` : ""} Â· discovered</span>
                  <span className="mt-1 block text-sm text-text-secondary">{candidate.snippet}</span>
                  <span className="mt-1 block text-xs text-info">Äiá»ƒm tÆ° váº¥n: authority {Math.round(candidate.authorityScore * 100)}% Â· relevance {Math.round(candidate.relevanceScore * 100)}%</span>
                  {materialized ? <span className="mt-1 block text-xs font-semibold text-success">ÄÃ£ chuyá»ƒn sang source review</span> : null}
                </span>
              </label>
            </li>;
          })}
        </ul>
        <Button className="mt-4" type="button" onClick={ingestSelectedResearchCandidates}
          disabled={busy || researchBusy || !selectedCandidateKeys.some((key) => !sourceAttempts.some((attempt) => attempt.candidateKey === key))}>
          XÃ¡c nháº­n vÃ  ingest nguá»“n Ä‘Ã£ chá»n
        </Button>
      </div> : researchBusy ? <StatePanel variant="loading" className="mt-3 p-5 shadow-none">Äang tÃ¬m á»©ng viÃªn nguá»“nâ€¦</StatePanel> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <form className="rounded-lg border border-border bg-surface p-4" onSubmit={ingestManualUrl}>
          <Input label="URL thá»§ cÃ´ng" name="manualUrl" type="url" required disabled={busy || reviewedSourceCount >= 8} />
          <Button className="mt-3" type="submit" disabled={busy || reviewedSourceCount >= 8}>Ingest URL</Button>
        </form>
        <form className="rounded-lg border border-border bg-surface p-4" onSubmit={ingestOptionalFile}>
          <Input label="TÃ i liá»‡u tÃ¹y chá»n" name="optionalSource" type="file" accept=".pdf,.txt,.md,.docx" required disabled={busy || reviewedSourceCount >= 8} />
          <Button className="mt-3" type="submit" disabled={busy || reviewedSourceCount >= 8}>Ingest file</Button>
        </form>
      </div>
      <p className="mt-3 text-sm font-medium text-text-secondary">{reviewedSourceCount}/8 nguá»“n Ä‘Ã£ chá»n Â· {sourceAttempts.filter((attempt) => attempt.status === "extracted").length} usable</p>
      {sourceAttempts.length ? <ul className="mt-3 space-y-2" aria-label="Tráº¡ng thÃ¡i nguá»“n">{sourceAttempts.map((attempt) => <li className="rounded-lg border border-border bg-surface p-3 text-sm" key={attempt.clientKey}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold text-text-primary">{attempt.label}</p><p className="text-text-muted">{attempt.kind === "manual_url" ? "URL thá»§ cÃ´ng" : attempt.kind === "discovered" ? "Nguá»“n nghiÃªn cá»©u" : "File upload"} Â· {attempt.status}{attempt.attached ? " Â· attached" : " Â· staged"}</p>
            {attempt.error ? <p role="alert" className="mt-1 text-danger">{attempt.error}</p> : null}</div>
          <div className="flex gap-2">{attempt.status === "failed" ? <Button variant="outline" size="sm" type="button" onClick={() => retrySourceAttempt(attempt)} disabled={busy}>Retry</Button> : null}
            {!attempt.attached ? <Button variant="outline" size="sm" type="button" className="border-danger text-danger" onClick={() => removeSourceAttempt(attempt)} disabled={busy || attempt.status === "ingesting"}>Remove</Button> : null}</div>
        </div>
      </li>)}</ul> : <StatePanel variant="empty" className="mt-3 p-5 shadow-none">ChÆ°a cÃ³ nguá»“n staged.</StatePanel>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={initializeOrAttachSources}
          disabled={busy || !sourceAttempts.some((attempt) => attempt.status === "extracted" && !attempt.attached)}> {sourceReviewJobId ? "Attach nguá»“n usable" : "Khá»Ÿi táº¡o Course import"}</Button>
        <Button variant="outline" type="button" onClick={generateReviewedSourceOutline}
          disabled={busy || !sourceReviewJobId || !sourceAttempts.some((attempt) => attempt.attached)}>Táº¡o outline tá»« evidence Ä‘Ã£ review</Button>
      </div>
    </section>

    <div aria-live="polite" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">{message}</div>
    {error ? <div role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger">{error}</div> : null}
    {published ? <div className="rounded-lg border border-success bg-success-soft p-4 text-sm text-success">Course Ä‘Ã£ xuáº¥t báº£n. <Link className="font-semibold underline" href={`/courses/${published.courseId}`}>Má»Ÿ Course</Link></div> : null}

    <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]" aria-labelledby="review-title">
      <div className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h2 id="review-title" className="font-semibold text-text-primary">Course import queue</h2>
        {imports.length === 0 ? <StatePanel variant="empty" className="mt-3 p-5 shadow-none">HÃ ng chá» trá»‘ng.</StatePanel> : <ul className="mt-3 space-y-2">{imports.map((item) => <li key={item.jobId}>
          <Button variant="outline" type="button" className={`h-auto min-w-0 w-full flex-col items-start py-2 ${selectedJobId === item.jobId ? "border-primary bg-primary-soft text-text-primary" : "border-border bg-surface text-text-primary"}`}
            onClick={() => { setSelectedJobId(item.jobId); setSourceReviewJobId(item.jobId); setSelectedOutlineLessonId(null); }}>
            <span className="block max-w-full break-words font-semibold">{item.title}</span>
            <span className="block text-text-muted">{item.status} Â· {item.lessons.length} Lessons</span>
          </Button>
        </li>)}</ul>}
      </div>

      <div className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm">
        {!selectedImport ? <StatePanel variant="empty" className="p-5 shadow-none">Chá»n má»™t Course import.</StatePanel> : <div className="space-y-5">
          <Badge className="bg-primary-soft text-primary">{selectedImport.status} Â· outline r{selectedImport.outlineRevision}</Badge>
          <div className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
            <p className="font-semibold text-text-primary">Nguá»“n evidence ({selectedImport.sources.length})</p>
            <ul className="mt-2 space-y-1">{selectedImport.sources.map((source) => <li key={source.sourceDocumentId}>
              <span className="break-words text-text-secondary">{source.title}{source.domain ? ` Â· ${source.domain}` : ""} Â· {source.ingestionMethod} Â· {source.status} Â· {source.chunkCount} chunks</span>
              {source.authorityScore !== null ? <span className="text-text-muted"> Â· authority {source.authorityScore.toFixed(2)}</span> : null}
              {source.relevanceScore !== null ? <span className="text-text-muted"> Â· relevance {source.relevanceScore.toFixed(2)}</span> : null}
              {["uploaded", "processing", "outline_review", "failed"].includes(selectedImport.status) && selectedImport.approvedOutlineRevision === null
                ? <Button variant="ghost" size="sm" type="button" className="ml-2 px-0 font-semibold text-danger underline" onClick={() => detachReviewedSource(source.sourceDocumentId)} disabled={busy || selectedImport.sources.length <= 1}>Detach</Button> : null}
            </li>)}</ul>
          </div>
          {selectedImport.outlineStale ? <div role="alert" className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-warning">
            Evidence Ä‘Ã£ thay Ä‘á»•i. HÃ£y táº¡o outline revision má»›i trÆ°á»›c khi Continue.
            <Button variant="ghost" size="sm" type="button" className="ml-2 px-0 font-semibold text-warning underline" onClick={generateReviewedSourceOutline} disabled={busy}>Táº¡o outline thay tháº¿</Button>
            {!canEditOutline ? <Button variant="outline" size="sm" type="button" className="ml-2" disabled>Continue: sinh Lesson contents</Button> : null}
          </div> : null}
          <Input label="Course title" value={selectedImport.title} disabled={!canEditOutline}
            onChange={(event) => updateSelected((draft) => ({ ...draft, title: event.target.value }))} />
          <Textarea label="Description" value={selectedImport.description} disabled={!canEditOutline}
            onChange={(event) => updateSelected((draft) => ({ ...draft, description: event.target.value }))} />
          <Textarea label="Course learning objectives (má»—i dÃ²ng má»™t má»¥c tiÃªu)" value={selectedImport.learningObjectives.join("\n")} disabled={!canEditOutline}
            onChange={(event) => updateSelected((draft) => ({ ...draft, learningObjectives: event.target.value.split("\n").filter(Boolean) }))} />
          <ol className="min-w-0 space-y-3">{selectedImport.lessons.map((lesson, index) => <li className="min-w-0 rounded-lg border border-border bg-surface p-3" key={lesson.clientKey}>
            {canEditOutline ? <div className="grid gap-2">
              <Input label={`Lesson ${index + 1} title`} value={lesson.title} onChange={(e) => editLesson(lesson.id, { title: e.target.value })} />
              <Textarea label="Summary" value={lesson.summary} onChange={(e) => editLesson(lesson.id, { summary: e.target.value })} />
              <Textarea label="Learning objectives" value={lesson.learningObjectives.join("\n")} onChange={(e) => editLesson(lesson.id, { learningObjectives: e.target.value.split("\n").filter(Boolean) })} />
              {selectedImport.sources.length > 1 ? <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium text-text-primary">Nguá»“n tham chiáº¿u</legend>
                <div className="grid gap-2 sm:grid-cols-2">{availableOutlineRefs(selectedImport).map((ref) => {
                    const source = selectedImport.sources.find((item) => item.sourceDocumentId === ref.sourceDocumentId);
                    const checked = (lesson.sourceRefs ?? []).some((item) => sameSourceRef(item, ref));
                    return <label className="flex items-center gap-2 text-sm" key={`${ref.sourceDocumentId}:${ref.chunkIndex}`}>
                      <input type="checkbox" className="accent-primary" checked={checked} onChange={(event) => {
                        const current = lesson.sourceRefs ?? [];
                        const next = event.target.checked
                          ? [...current, ref]
                          : current.filter((item) => !sameSourceRef(item, ref));
                        if (next.length) editLesson(lesson.id, { sourceRefs: next, sourceChunkIndexes: [] });
                      }} />
                      {source?.title ?? `Source ${ref.sourceDocumentId}`} Â· chunk {ref.chunkIndex}
                    </label>;
                  })}</div>
              </fieldset> : <Input label="Source chunk indexes" value={lesson.sourceChunkIndexes.join(",")}
                onChange={(e) => editLesson(lesson.id, { sourceChunkIndexes: e.target.value.split(",").map(Number).filter(Number.isInteger), sourceRefs: undefined })} />}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => reorderLesson(lesson.id, -1)} disabled={index === 0}>Di chuyá»ƒn lÃªn</Button>
                <Button variant="outline" size="sm" type="button" onClick={() => reorderLesson(lesson.id, 1)} disabled={index === selectedImport.lessons.length - 1}>Di chuyá»ƒn xuá»‘ng</Button>
                <Button variant="outline" size="sm" type="button" className="border-danger text-danger" onClick={() => removeLesson(lesson.id)} disabled={selectedImport.lessons.length <= 2}>XÃ³a Lesson</Button>
              </div>
            </div> : <Button variant="ghost" type="button" className="h-auto min-w-0 w-full flex-col items-start py-2" onClick={() => setSelectedOutlineLessonId(lesson.id)}>
              <span className="block max-w-full break-words font-semibold">{index + 1}. {lesson.title}</span>
              <span className="block max-w-full break-words text-sm text-text-muted">{lesson.summary} Â· {lesson.contentDraft ? `content r${lesson.contentDraft.revision}` : "chÆ°a cÃ³ content"}</span>
            </Button>}
          </li>)}</ol>
          {canEditOutline ? <div className="flex flex-wrap gap-3">
            <Button variant="outline" type="button" onClick={addLesson} disabled={busy || selectedImport.lessons.length >= 20}>ThÃªm Lesson</Button>
            <Button type="button" onClick={saveOutline} disabled={busy}>LÆ°u outline</Button>
            <Button variant="outline" type="button" onClick={regenerateOutline} disabled={busy}>Regenerate outline</Button>
            <Button type="button" onClick={continueToLessons} disabled={busy || selectedImport.outlineStale}>Continue: sinh Lesson contents</Button>
          </div> : null}
          {selectedImport.status === "failed" ? <Button type="button" onClick={selectedImport.approvedOutlineRevision ? continueToLessons : regenerateOutline} disabled={busy}>Thá»­ láº¡i bÆ°á»›c bá»‹ lá»—i</Button> : null}
          {selectedImport.status === "generating_content" ? <Button variant="outline" type="button"
            onClick={() => { setError(null); refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ lÃ m má»›i tráº¡ng thÃ¡i.")); }} disabled={busy}>LÃ m má»›i tráº¡ng thÃ¡i</Button> : null}
          {canReviewContent ? <div className="space-y-3">
            <Textarea label="Ghi chÃº review" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => reviewImport("published")} disabled={busy}>Publish Course</Button>
              <Button variant="outline" type="button" className="border-warning text-warning" onClick={() => reviewImport("needs_revision")} disabled={busy}>Cáº§n chá»‰nh sá»­a</Button>
              <Button variant="outline" type="button" className="border-danger text-danger" onClick={() => reviewImport("rejected")} disabled={busy}>Tá»« chá»‘i</Button>
            </div>
          </div> : null}
        </div>}
      </div>
    </section>

    {selectedContent && selectedOutlineLesson ? <ContentEditor content={selectedContent} onChange={(content) => editLesson(selectedOutlineLesson.id, { contentDraft: content })}
      onSave={() => saveContent(selectedContent)} onRegenerate={() => regenerateLesson(selectedOutlineLesson.id)} busy={busy} /> : null}

    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-text-primary">Lesson â†’ Exercise lÃ  pipeline riÃªng</h2>
      <p className="mt-2 text-sm text-text-secondary">Chá»n má»™t Lesson Ä‘Ã£ publish tá»« khu vá»±c moderation Ä‘á»ƒ táº¡o vÃ  duyá»‡t bÃ i táº­p.</p>
      <Link className="mt-4 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" href="/moderation/lessons">Má»Ÿ danh sÃ¡ch Lesson</Link>
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
  return <section className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm" aria-labelledby="lesson-editor-title">
    <h2 id="lesson-editor-title" className="text-xl font-semibold text-text-primary">Lesson content review</h2>
    <div className="mt-4 grid gap-4">
      <Input label="TiÃªu Ä‘á»" value={content.title} onChange={(e) => onChange({ ...content, title: e.target.value })} />
      <Textarea label="TÃ³m táº¯t" value={content.summary} onChange={(e) => onChange({ ...content, summary: e.target.value })} />
      {content.sections.map((section, index) => <fieldset className="rounded-lg border border-border p-4" key={index}>
        <legend className="px-1 text-sm font-medium text-text-primary">Pháº§n {index + 1}</legend>
        <Input aria-label={`TiÃªu Ä‘á» pháº§n ${index + 1}`} className="mb-2" value={section.heading} onChange={(e) => updateSection(index, "heading", e.target.value)} />
        <Textarea aria-label={`Ná»™i dung pháº§n ${index + 1}`} className="min-h-36" value={section.bodyMarkdown} onChange={(e) => updateSection(index, "bodyMarkdown", e.target.value)} />
        <p className="mt-2 text-xs text-text-muted">Nguá»“n chunk: {section.citationChunkIndexes.join(", ")}</p>
        <ul className="mt-2 space-y-1 break-words text-xs text-text-secondary">{content.citations
          .filter((citation) => citation.sectionIndex === index)
          .map((citation) => <li key={`${citation.documentChunkId ?? citation.chunkIndex}`}>
            {citation.sourceTitle
              ? `${citation.sourceTitle}${citation.sourceDomain || citation.sourceUrl ? ` Â· ${citation.sourceDomain ?? citation.sourceUrl}` : ""} Â· chunk ${citation.chunkIndex}: ${citation.quote}`
              : `Chunk ${citation.chunkIndex}: ${citation.quote}`}
          </li>)}</ul>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><Button type="button" onClick={onSave} disabled={busy}>LÆ°u Lesson content</Button>
        <Button variant="outline" type="button" onClick={onRegenerate} disabled={busy}>Regenerate Lesson nÃ y</Button></div>
    </div>
  </section>;
}

