"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type {
  CourseImportDraft,
  CourseImportLessonDraft,
  CourseImportOutlineLesson,
  CourseSourceRef,
  ReviewCourseDraftBatchResult,
} from "@/features/content-pipeline/types";

interface ApiEnvelope<T> { success: boolean; data: T; message?: string; error?: { message?: string } }
interface PendingGeneration { sourceDocumentId: number; sourceFilename: string }

const CHECKPOINT_KEY = "learningapp.course-outline-generation";

export async function requestPipelineApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    if ([502, 503, 504].includes(response.status)) {
      throw new Error("Dịch vụ tạm thời quá tải hoặc hết thời gian chờ. Vui lòng thử lại.");
    }
    throw new Error(payload?.error?.message ?? payload?.message ?? "Không thể xử lý yêu cầu.");
  }
  return payload.data;
}

function readCheckpoint(): PendingGeneration | null {
  try {
    const value = sessionStorage.getItem(CHECKPOINT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as PendingGeneration;
    return Number.isSafeInteger(parsed.sourceDocumentId) && parsed.sourceFilename ? parsed : null;
  } catch { return null; }
}

function storeCheckpoint(value: PendingGeneration | null) {
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

export function ContentPipelineAdmin() {
  const [imports, setImports] = useState<CourseImportDraft[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedOutlineLessonId, setSelectedOutlineLessonId] = useState<number | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);
  const [published, setPublished] = useState<ReviewCourseDraftBatchResult | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Đang tải dữ liệu...");
  const [error, setError] = useState<string | null>(null);

  const selectedImport = useMemo(
    () => imports.find((item) => item.jobId === selectedJobId) ?? null,
    [imports, selectedJobId]
  );
  const selectedOutlineLesson = selectedImport?.lessons.find((lesson) => lesson.id === selectedOutlineLessonId) ?? null;
  const selectedContent = selectedOutlineLesson?.contentDraft ?? null;
  const refresh = useCallback(async () => {
    const importData = await requestPipelineApi<{ items: CourseImportDraft[] }>("/api/admin/course-drafts");
    setImports(importData.items);
    setSelectedJobId((current) => current && importData.items.some((item) => item.jobId === current)
      ? current : importData.items[0]?.jobId ?? null);
    const checkpoint = readCheckpoint();
    if (checkpoint && importData.items.some((item) => item.sourceDocumentId === checkpoint.sourceDocumentId)) {
      storeCheckpoint(null); setPendingGeneration(null);
    } else setPendingGeneration(checkpoint);
    setMessage(importData.items.length ? "Đã tải hàng chờ Course import." : "Không có Course import đang chờ xử lý.");
  }, []);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu.");
      setMessage("");
    });
  }, [refresh]);

  function updateSelected(updater: (draft: CourseImportDraft) => CourseImportDraft) {
    setImports((current) => current.map((item) => item.jobId === selectedJobId ? updater(item) : item));
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
      await requestPipelineApi(`/api/admin/course-drafts/${selectedImport.jobId}/lessons/generate`, { method: "POST" });
      await refresh(); setMessage("Nội dung Lesson đã sẵn sàng để review.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể sinh nội dung Lesson."); }
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

    <div aria-live="polite" className="text-sm text-slate-700">{message}</div>
    {error ? <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
    {published ? <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">Course đã xuất bản. <Link className="font-semibold underline" href={`/courses/${published.courseId}`}>Mở Course</Link></div> : null}

    <section className="grid gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]" aria-labelledby="review-title">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 id="review-title" className="font-semibold text-slate-950">Course import queue</h2>
        {imports.length === 0 ? <p className="mt-3 text-sm text-slate-500">Hàng chờ trống.</p> : <ul className="mt-3 space-y-2">{imports.map((item) => <li key={item.jobId}>
          <button className={`w-full rounded-lg border p-3 text-left text-sm ${selectedJobId === item.jobId ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
            type="button" onClick={() => { setSelectedJobId(item.jobId); setSelectedOutlineLessonId(null); }}>
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
              {source.title}{source.domain ? ` · ${source.domain}` : ""} · {source.chunkCount} chunks
            </li>)}</ul>
          </div>
          {selectedImport.outlineStale ? <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Evidence đã thay đổi. Hãy tạo outline revision mới trước khi Continue.
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
