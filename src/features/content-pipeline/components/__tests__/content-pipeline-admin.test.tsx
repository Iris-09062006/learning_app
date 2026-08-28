import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CourseImportDraft, ResearchCandidate } from "../../types";
import {
  ContentPipelineAdmin,
  decodePipelineCheckpoint,
  LESSON_GENERATION_REQUEST_TIMEOUT_MS,
  mergeResearchCandidates,
  requestPipelineApi,
} from "../content-pipeline-admin";

describe("pipeline checkpoint recovery", () => {
  it("decodes the legacy v1 checkpoint", () => {
    expect(decodePipelineCheckpoint(JSON.stringify({ sourceDocumentId: 9, sourceFilename: "legacy.pdf" })))
      .toEqual({ sourceDocumentId: 9, sourceFilename: "legacy.pdf" });
  });

  it("decodes checkpoint v2 with stable workflow and per-source keys", () => {
    const checkpoint = { version: 2, topic: "", selectedCandidateKeys: [], initializationKey: "33333333-3333-4333-8333-333333333333", jobId: 31,
      pendingAction: "outline", attempts: [{ clientKey: "a", idempotencyKey: "22222222-2222-4222-8222-222222222222", kind: "manual_url", label: "Example", url: "https://example.com", sourceDocumentId: 21, status: "extracted", attached: true }] };
    expect(decodePipelineCheckpoint(JSON.stringify(checkpoint))).toEqual(checkpoint);
  });
});

const contentDraft = {
  id: 81,
  outlineLessonId: 71,
  revision: 1,
  title: "Biến Python",
  summary: "Kiến thức nền tảng về biến.",
  estimatedMinutes: 12,
  sections: [{ heading: "Khái niệm", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }],
  status: "ready" as const,
  provider: "9router",
  model: "model",
  citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Nguồn" }],
};

function importItem(status: CourseImportDraft["status"] = "outline_review"): CourseImportDraft {
  return {
    jobId: 61,
    sourceDocumentId: 9,
    sourceFilename: "python.pdf",
    sources: [{
      sourceDocumentId: 9,
      sourceOrder: 0,
      sourceType: "file",
      ingestionMethod: "uploaded",
      title: "python.pdf",
      filename: "python.pdf",
      sourceUrl: null,
      canonicalUrl: null,
      domain: null,
      authorityScore: null,
      relevanceScore: null,
      status: "ready_for_review",
      errorCode: null,
      chunkCount: 2,
    }],
    outlineStale: false,
    status,
    errorCode: null,
    outlineRevision: 1,
    approvedOutlineRevision: status === "outline_review" ? null : 1,
    title: "Python nền tảng",
    description: "Khóa học nhập môn.",
    learningObjectives: ["Hiểu Python"],
    lessons: [
      { id: 71, clientKey: "lesson-1", lessonOrder: 1, title: "Biến Python", summary: "Biến", learningObjectives: ["Khai báo biến"], sourceChunkIndexes: [0], contentDraft: status === "outline_review" ? null : contentDraft },
      { id: 72, clientKey: "lesson-2", lessonOrder: 2, title: "Hàm Python", summary: "Hàm", learningObjectives: ["Định nghĩa hàm"], sourceChunkIndexes: [1], contentDraft: status === "outline_review" ? null : { ...contentDraft, id: 82, outlineLessonId: 72, title: "Hàm Python" } },
    ],
    publishedCourseId: null,
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
  };
}

function multiImportItem(status: CourseImportDraft["status"] = "outline_review"): CourseImportDraft {
  const item = importItem(status);
  const secondSource = {
    ...item.sources[0], sourceDocumentId: 10, sourceOrder: 1, sourceType: "web_page" as const,
    ingestionMethod: "manual_url" as const, title: "Python docs", filename: "python-docs.md",
    sourceUrl: "https://docs.python.org/3/", canonicalUrl: "https://docs.python.org/3/",
    domain: "docs.python.org", chunkCount: 1,
  };
  return {
    ...item,
    sources: [item.sources[0], secondSource],
    lessons: item.lessons.map((lesson, index) => ({
      ...lesson,
      sourceChunkIndexes: [],
      sourceRefs: [{ sourceDocumentId: index === 0 ? 9 : 10, chunkIndex: 0 }],
      sourceChunks: [{
        documentChunkId: index === 0 ? 101 : 202,
        sourceDocumentId: index === 0 ? 9 : 10,
        sourceOrder: index,
        chunkIndex: 0,
      }],
      contentDraft: lesson.contentDraft ? {
        ...lesson.contentDraft,
        citations: [{
          sectionIndex: 0,
          chunkIndex: 0,
          quote: index === 0 ? "Nguồn PDF" : "Nguồn web",
          documentChunkId: index === 0 ? 101 : 202,
          sourceDocumentId: index === 0 ? 9 : 10,
          sourceTitle: index === 0 ? "python.pdf" : "Python docs",
          sourceDomain: index === 0 ? null : "docs.python.org",
          sourceUrl: index === 0 ? null : "https://docs.python.org/3/",
        }],
      } : null,
    })),
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function researchCandidate(index: number, overrides: Partial<ResearchCandidate> = {}): ResearchCandidate {
  return {
    candidateKey: `candidate-${index}`,
    url: `https://source${index}.example/guide`,
    canonicalUrl: `https://source${index}.example/guide`,
    title: `Research Source ${index}`,
    domain: `source${index}.example`,
    snippet: `Useful research source ${index}`,
    language: index % 2 ? "en" : "vi",
    discovery: "discovered",
    authorityScore: 0.7,
    relevanceScore: 0.8,
    ...overrides,
  };
}

describe("content pipeline Admin", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); sessionStorage.clear(); });

  it("allows the Lesson request to outlive the server scheduling window", () => {
    expect(LESSON_GENERATION_REQUEST_TIMEOUT_MS).toBe(300_000);
  });

  it("does not expose JSON parser errors for an HTML gateway timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>timeout</html>", { status: 504 }));
    await expect(requestPipelineApi("/api/admin/course-drafts")).rejects.toThrow(
      "Dịch vụ tạm thời quá tải hoặc hết thời gian chờ. Vui lòng thử lại."
    );
  });

  it("aborts a non-settling Lesson-generation request with a recoverable message", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    const request = requestPipelineApi("/api/admin/course-drafts/61/lessons/generate", { method: "POST" }, 50);
    const rejection = expect(request).rejects.toThrow("Yêu cầu sinh Lesson mất quá nhiều thời gian");
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });

  it("merges Research More deterministically without duplicates or displacing selected candidates", () => {
    const current = Array.from({ length: 20 }, (_, index) => researchCandidate(index));
    const incoming = [researchCandidate(0), ...Array.from({ length: 10 }, (_, index) => researchCandidate(20 + index))];
    const merged = mergeResearchCandidates(current, incoming, ["candidate-19"]);
    expect(merged).toHaveLength(20);
    expect(merged.filter((candidate) => candidate.candidateKey === "candidate-0")).toHaveLength(1);
    expect(merged.some((candidate) => candidate.candidateKey === "candidate-19")).toBe(true);
  });

  it("researches, selects/unselects, caps selection at eight, and ingests only explicitly selected candidates", async () => {
    const ingestBodies: Array<Record<string, unknown>> = [];
    let extractInFlight = 0;
    let maxExtractInFlight = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-research") return json({ success: true, data: {
        topic: "Python async", queries: ["Python async hướng dẫn học tập tiếng Việt"],
        results: Array.from({ length: 9 }, (_, index) => researchCandidate(index)), cursor: null, hasMore: false,
      } });
      if (url === "/api/admin/content-sources/url") {
        extractInFlight += 1;
        maxExtractInFlight = Math.max(maxExtractInFlight, extractInFlight);
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        ingestBodies.push(body);
        await Promise.resolve();
        extractInFlight -= 1;
        return json({ success: true, data: { sourceDocumentId: ingestBodies.length, status: "extracted", chunkCount: 1 } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    fireEvent.change(await screen.findByLabelText("Chủ đề Course"), { target: { value: "Python async" } });
    fireEvent.click(screen.getByRole("button", { name: "Nghiên cứu" }));
    const heading = await screen.findByRole("heading", { name: "Ứng viên nguồn nghiên cứu" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveClass("focus-visible:ring-focus-ring");
    expect(ingestBodies).toHaveLength(0);

    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes.slice(0, 8)) fireEvent.click(checkbox);
    expect(screen.getAllByText(/8\/8 nguồn đã chọn/u).length).toBeGreaterThan(0);
    expect(checkboxes[8]).toBeDisabled();
    fireEvent.click(checkboxes[0]);
    expect(ingestBodies).toHaveLength(0);
    expect(checkboxes[8]).toBeEnabled();
    fireEvent.click(checkboxes[8]);
    expect(ingestBodies).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận và ingest nguồn đã chọn" }));
    await waitFor(() => expect(ingestBodies).toHaveLength(8));
    expect(ingestBodies.every((body) => body.discovery === "discovered" && typeof body.idempotencyKey === "string")).toBe(true);
    expect(ingestBodies.some((body) => body.url === researchCandidate(0).url)).toBe(false);
    expect(ingestBodies.some((body) => body.url === researchCandidate(8).url)).toBe(true);
    expect(maxExtractInFlight).toBe(1);
  });

  it("appends unique Research More results while preserving selection and the 20-candidate cap", async () => {
    let round = 0;
    let extractCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-research") {
        round += 1;
        return round === 1
          ? json({ success: true, data: { topic: "Python", queries: ["Python"], results: Array.from({ length: 15 }, (_, index) => researchCandidate(index)), cursor: "opaque", hasMore: true } })
          : json({ success: true, data: { topic: "Python", queries: ["Python"], results: Array.from({ length: 15 }, (_, index) => researchCandidate(10 + index)), cursor: null, hasMore: false } });
      }
      if (url === "/api/admin/content-sources/url") {
        extractCalls += 1;
        throw new Error("Extract must not run before confirmation.");
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    fireEvent.change(await screen.findByLabelText("Chủ đề Course"), { target: { value: "Python" } });
    fireEvent.click(screen.getByRole("button", { name: "Nghiên cứu" }));
    const selected = await screen.findByRole("checkbox", { name: /Research Source 14/u });
    fireEvent.click(selected);
    fireEvent.click(screen.getByRole("button", { name: "Nghiên cứu thêm" }));
    await waitFor(() => expect(screen.getByText(/20\/20 ứng viên đang hiển thị/u)).toBeInTheDocument());
    expect(selected).toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(20);
    expect(screen.getAllByText("Research Source 10")).toHaveLength(1);
    expect(extractCalls).toBe(0);
  });

  it("makes exactly one URL-ingestion call when one candidate is explicitly confirmed", async () => {
    const extractBodies: Array<Record<string, unknown>> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-research") return json({ success: true, data: {
        topic: "Python", queries: ["Python"], results: [researchCandidate(0), researchCandidate(1)], cursor: null, hasMore: false,
      } });
      if (url === "/api/admin/content-sources/url") {
        extractBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return json({ success: true, data: { sourceDocumentId: 21, status: "extracted", chunkCount: 1 } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    const topicInput = document.getElementById("course-research-topic") as HTMLInputElement;
    fireEvent.change(topicInput, { target: { value: "Python" } });
    fireEvent.click(topicInput.closest("form")!.querySelector("button[type='submit']")!);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Research Source 1/u }));
    expect(extractBodies).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button").find((button) =>
      /ingest/u.test(button.textContent ?? "") && !/URL|file/u.test(button.textContent ?? ""))!);
    await waitFor(() => expect(extractBodies).toEqual([expect.objectContaining({
      url: researchCandidate(1).url,
      discovery: "discovered",
    })]));
    expect(extractBodies.some((body) => body.url === researchCandidate(0).url)).toBe(false);
  });

  it("preserves topic, candidates, selection, and manual URL/file fallbacks after provider failure", async () => {
    let researchCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-research") {
        researchCalls += 1;
        return researchCalls === 1
          ? json({ success: true, data: { topic: "Python", queries: ["Python"], results: [researchCandidate(1)], cursor: "opaque", hasMore: true } })
          : json({ success: false, error: { code: "SEARCH_PROVIDER_TIMEOUT", message: "provider timeout" } }, 503);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    const topicInput = await screen.findByLabelText("Chủ đề Course");
    fireEvent.change(topicInput, { target: { value: "Python" } });
    fireEvent.click(screen.getByRole("button", { name: "Nghiên cứu" }));
    const candidate = await screen.findByRole("checkbox", { name: /Research Source 1/u });
    fireEvent.click(candidate);
    const manualUrl = screen.getByLabelText("URL thủ công");
    const optionalFile = screen.getByLabelText("Tài liệu tùy chọn");
    fireEvent.change(manualUrl, { target: { value: "https://manual.example/guide" } });
    fireEvent.change(optionalFile, { target: { files: [new File(["guide"], "guide.md", { type: "text/markdown" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Nghiên cứu thêm" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(alert).toHaveClass("focus-visible:ring-focus-ring");
    expect(within(alert).getByRole("button", { name: "Thử lại nghiên cứu" })).toBeEnabled();
    expect(topicInput).toHaveValue("Python");
    expect(candidate).toBeChecked();
    expect(screen.getByText("Research Source 1")).toBeInTheDocument();
    expect(manualUrl).toHaveValue("https://manual.example/guide");
    expect(optionalFile).toHaveProperty("files.length", 1);
    expect(screen.getByRole("button", { name: "Ingest URL" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ingest file" })).toBeEnabled();
  });

  it("renders an editable outline before any Lesson content editor", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [importItem()] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    expect(await screen.findByDisplayValue("Python nền tảng")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hàm Python")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue: sinh Lesson contents" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lesson content review" })).not.toBeInTheDocument();
  });

  it("uploads, extracts, and generates only an outline", async () => {
    const calls: string[] = [];
    let generated = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input); calls.push(url);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: generated ? [importItem()] : [] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/content-sources") return json({ success: true, data: { id: 9, originalFilename: "python.pdf" } }, 201);
      if (url === "/api/admin/content-sources/9/extract") return json({ success: true, data: {} });
      if (url === "/api/admin/content-sources/9/course-outline") { generated = true; return json({ success: true, data: { jobId: 61 } }, 201); }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    await screen.findByText("Không có Course import đang chờ xử lý.");
    fireEvent.change(screen.getByLabelText("Tài liệu nguồn"), { target: { files: [new File(["pdf"], "python.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo Course outline" }));
    expect(await screen.findByText("Course outline đã được lưu để Admin review.")).toBeInTheDocument();
    expect(calls).toContain("/api/admin/content-sources/9/course-outline");
    expect(calls.some((url) => url.endsWith("/generate"))).toBe(false);
    expect(calls.some((url) => url.includes("/api/ai/exercises"))).toBe(false);
    expect(calls.some((url) => url === "/api/admin/course-research")).toBe(false);
    expect(calls.some((url) => url === "/api/admin/content-sources/url")).toBe(false);
  });

  it("preserves a successful URL when another fails and initializes only usable evidence", async () => {
    let initializedBody: unknown;
    const removedSources: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/content-sources/url") {
        const body = JSON.parse(String(init?.body)) as { url: string };
        return body.url.includes("good")
          ? json({ success: true, data: { sourceDocumentId: 21, status: "extracted", chunkCount: 2 } }, 201)
          : json({ success: false, error: { message: "Trang không đọc được.", sourceDocumentId: 22 } }, 422);
      }
      if (url === "/api/admin/content-sources/22" && init?.method === "DELETE") {
        removedSources.push(url);
        return json({ success: true, data: { sourceDocumentId: 22, removed: true } });
      }
      if (url === "/api/admin/course-imports") {
        initializedBody = JSON.parse(String(init?.body));
        return json({ success: true, data: { jobId: 31, sourceDocumentIds: [21] } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    const input = await screen.findByLabelText("URL thủ công");
    fireEvent.change(input, { target: { value: "https://good.example/article" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingest URL" }));
    expect(await screen.findByText(/Nguồn URL đã sẵn sàng/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "https://bad.example/article" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingest URL" }));
    expect(await screen.findByText("Trang không đọc được.")).toBeInTheDocument();
    expect(screen.getByText("https://good.example/article")).toBeInTheDocument();
    const failedSource = screen.getByText("https://bad.example/article").closest("li");
    expect(failedSource).not.toBeNull();
    fireEvent.click(within(failedSource!).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(removedSources).toEqual(["/api/admin/content-sources/22"]));
    fireEvent.click(screen.getByRole("button", { name: "Khởi tạo Course import" }));
    await waitFor(() => expect(initializedBody).toBeDefined());
    expect(initializedBody).toMatchObject({ sources: [{ sourceDocumentId: 21 }] });
  });

  it("generates Lesson contents only after Continue", async () => {
    let continued = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [importItem(continued ? "content_review" : "outline_review")] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-drafts/61/lessons/generate") { continued = true; return json({ success: true, data: { status: "content_review" } }, 201); }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue: sinh Lesson contents" }));
    expect(await screen.findByText("Nội dung Lesson đã sẵn sàng để review.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Course" })).toBeInTheDocument();
  });

  it("refreshes a failed Lesson-generation job and retries the failed step", async () => {
    let generationAttempts = 0;
    const failedImport = {
      ...importItem("failed"),
      errorCode: "LESSON_GENERATION_FAILED",
      approvedOutlineRevision: 1,
      lessons: importItem("outline_review").lessons,
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") {
        const item = generationAttempts === 0
          ? importItem("outline_review")
          : generationAttempts === 1 ? failedImport : importItem("content_review");
        return json({ success: true, data: { items: [item] } });
      }
      if (url === "/api/admin/course-drafts/61/lessons/generate") {
        generationAttempts += 1;
        return generationAttempts === 1
          ? json({ success: false, error: { message: "Unable to generate all Lesson contents." } }, 502)
          : json({ success: true, data: { status: "content_review" } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue: sinh Lesson contents" }));
    expect(await screen.findByRole("button", { name: "Thử lại bước bị lỗi" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Dịch vụ tạm thời quá tải hoặc hết thời gian chờ");

    fireEvent.click(screen.getByRole("button", { name: "Thử lại bước bị lỗi" }));
    expect(await screen.findByText("Nội dung Lesson đã sẵn sàng để review.")).toBeInTheDocument();
    expect(generationAttempts).toBe(2);
  });

  it("starts a new local workflow without removing persisted Course imports", async () => {
    sessionStorage.setItem("learningapp.course-outline-generation", JSON.stringify({
      version: 2,
      topic: "Python async",
      selectedCandidateKeys: [],
      candidates: [],
      initializationKey: "33333333-3333-4333-8333-333333333333",
      jobId: 61,
      pendingAction: null,
      attempts: [],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input) === "/api/admin/course-drafts") {
        return json({ success: true, data: { items: [importItem("failed")] } });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });

    render(<ContentPipelineAdmin />);
    expect(await screen.findByDisplayValue("Python async")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu workflow mới" }));

    expect(screen.getByLabelText("Chủ đề Course")).toHaveValue("");
    expect(
      screen.getByText("Chọn một Course import.").closest("[data-state]"),
    ).toHaveAttribute("data-state", "empty");
    expect(screen.getByText("Đã mở workflow mới. Các Course import đã lưu vẫn còn trong hàng chờ.")).toBeInTheDocument();
    expect(sessionStorage.getItem("learningapp.course-outline-generation")).toBeNull();
    expect(screen.getByRole("button", { name: /Python nền tảng/ })).toBeInTheDocument();
  });

  it("publishes atomically and removes the resolved item after refresh", async () => {
    let resolved = false;
    sessionStorage.setItem("learningapp.course-outline-generation", JSON.stringify({
      version: 2,
      topic: "Python async",
      selectedCandidateKeys: ["candidate-1"],
      candidates: [researchCandidate(1)],
      researchCursor: "next-page",
      researchHasMore: true,
      initializationKey: "33333333-3333-4333-8333-333333333333",
      jobId: 61,
      pendingAction: null,
      attempts: [{
        clientKey: "source-1",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        kind: "discovered",
        label: "Attached Python source",
        url: "https://source1.example/guide",
        sourceDocumentId: 9,
        status: "extracted",
        attached: true,
        candidateKey: "candidate-1",
      }],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: resolved ? [] : [importItem("content_review")] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-drafts/61/reviews") { resolved = true; return json({ success: true, data: { sourceDocumentId: 9, courseId: 31, status: "published", lessonIds: [51, 52] } }, 201); }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    expect(await screen.findByText("Attached Python source")).toBeInTheDocument();
    expect(screen.getByLabelText("Chủ đề Course")).toHaveValue("Python async");
    fireEvent.click(await screen.findByRole("button", { name: "Publish Course" }));
    expect(
      (await screen.findByText("Hàng chờ trống.")).closest("[data-state]"),
    ).toHaveAttribute("data-state", "empty");
    expect(screen.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
    await waitFor(() => {
      expect(screen.queryByText("Attached Python source")).not.toBeInTheDocument();
      expect(screen.queryByText("Research Source 1")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Chủ đề Course")).toHaveValue("");
      expect(sessionStorage.getItem("learningapp.course-outline-generation")).toBeNull();
    });
  });

  it("keeps the source workflow recoverable when publication fails", async () => {
    sessionStorage.setItem("learningapp.course-outline-generation", JSON.stringify({
      version: 2,
      topic: "Python errors",
      selectedCandidateKeys: [],
      candidates: [],
      researchCursor: null,
      researchHasMore: false,
      initializationKey: "33333333-3333-4333-8333-333333333333",
      jobId: 61,
      pendingAction: null,
      attempts: [{
        clientKey: "source-1",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        kind: "manual_url",
        label: "Recoverable Python source",
        url: "https://example.com/python",
        sourceDocumentId: 9,
        status: "extracted",
        attached: true,
      }],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [importItem("content_review")] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-drafts/61/reviews") {
        return json({ success: false, error: { message: "Không thể publish Course." } }, 500);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    expect(await screen.findByText("Recoverable Python source")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish Course" }));

    expect(await screen.findByText("Không thể publish Course.")).toBeInTheDocument();
    expect(screen.getByText("Recoverable Python source")).toBeInTheDocument();
    expect(screen.getByLabelText("Chủ đề Course")).toHaveValue("Python errors");
    expect(decodePipelineCheckpoint(sessionStorage.getItem("learningapp.course-outline-generation")))
      .toMatchObject({ jobId: 61, topic: "Python errors" });
  });

  it("moves exercise generation out of the Course/PDF pipeline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    expect(await screen.findByRole("link", { name: "Mở danh sách Lesson" })).toHaveAttribute("href", "/moderation/lessons");
    expect(screen.queryByLabelText("Lesson")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalledWith("/api/ai/exercises/generate", expect.anything());
  });

  it("edits multi-source refs with controlled selectors and copies refs to a new Lesson", async () => {
    let savedBody: unknown;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [multiImportItem()] } });
      if (url === "/api/admin/course-drafts/61/outline" && init?.method === "PATCH") {
        savedBody = JSON.parse(String(init.body));
        return json({ success: true, data: { outlineRevision: 2 } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    const firstLessonTitle = await screen.findByDisplayValue("Biến Python");
    const firstLesson = firstLessonTitle.closest("li");
    expect(firstLesson).not.toBeNull();
    const webRef = within(firstLesson!).getByLabelText("Python docs · chunk 0");
    webRef.focus();
    expect(webRef).toHaveFocus();
    fireEvent.click(webRef);
    expect(webRef).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Thêm Lesson" }));
    expect(screen.getByRole("textbox", { name: "Lesson 3 title" })).toHaveValue("Lesson mới");
    fireEvent.click(screen.getByRole("button", { name: "Lưu outline" }));
    await waitFor(() => expect(savedBody).toBeDefined());
    expect(savedBody).toMatchObject({ lessons: [
      expect.objectContaining({ sourceRefs: [
        { sourceDocumentId: 9, chunkIndex: 0 },
        { sourceDocumentId: 10, chunkIndex: 0 },
      ] }),
      expect.objectContaining({ sourceRefs: [{ sourceDocumentId: 10, chunkIndex: 0 }] }),
      expect.objectContaining({ sourceRefs: [
        { sourceDocumentId: 9, chunkIndex: 0 },
        { sourceDocumentId: 10, chunkIndex: 0 },
      ] }),
    ] });
    expect(JSON.stringify(savedBody)).not.toContain("sourceChunkIndexes");
  });

  it("reconciles a renamed Course from uncached server truth without a browser reload", async () => {
    let serverTitle = "Python nền tảng";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") {
        return json({ success: true, data: { items: [{ ...importItem(), title: serverTitle }] } });
      }
      if (url === "/api/admin/course-drafts/61/outline" && init?.method === "PATCH") {
        serverTitle = (JSON.parse(String(init.body)) as { title: string }).title;
        return json({ success: true, data: { jobId: 61, outlineRevision: 2 } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    const title = await screen.findByRole("textbox", { name: "Course title" });
    fireEvent.change(title, { target: { value: "Tên Course mới" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu outline" }));

    expect(await screen.findByText("Đã lưu outline revision mới.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Course title" })).toHaveValue("Tên Course mới");
    expect(screen.getByRole("button", { name: /Tên Course mới/ })).toBeInTheDocument();
    expect(fetchSpy.mock.calls.filter(([input]) => String(input) === "/api/admin/course-drafts"))
      .toEqual(expect.arrayContaining([
        ["/api/admin/course-drafts", { cache: "no-store" }],
      ]));
  });

  it("preserves edited Course metadata when saving fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") {
        return json({ success: true, data: { items: [importItem()] } });
      }
      if (url === "/api/admin/course-drafts/61/outline" && init?.method === "PATCH") {
        return json({ success: false, error: { message: "Không thể lưu tên Course." } }, 500);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    const title = await screen.findByRole("textbox", { name: "Course title" });
    fireEvent.change(title, { target: { value: "Tên cần thử lại" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu outline" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu tên Course.");
    expect(title).toHaveValue("Tên cần thử lại");
    expect(screen.getByRole("button", { name: "Lưu outline" })).toBeEnabled();
  });

  it("reloads canonical Lesson content immediately after a successful save", async () => {
    let lessonTitle = "Biến Python";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") {
        const item = importItem("content_review");
        item.lessons[0] = {
          ...item.lessons[0],
          contentDraft: item.lessons[0].contentDraft
            ? { ...item.lessons[0].contentDraft, title: lessonTitle }
            : null,
        };
        return json({ success: true, data: { items: [item] } });
      }
      if (url === "/api/admin/lesson-drafts/81" && init?.method === "PATCH") {
        lessonTitle = `${(JSON.parse(String(init.body)) as { title: string }).title.trim()} (server)`;
        return json({ success: true, data: { status: "content_review" } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    fireEvent.click((await screen.findAllByRole("button", { name: /Biến Python/ }))[0]);
    const title = screen.getByRole("textbox", { name: "Tiêu đề" });
    fireEvent.change(title, { target: { value: "Biến và kiểu dữ liệu" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu Lesson content" }));

    expect(await screen.findByText("Đã lưu Lesson content revision mới.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tiêu đề" }))
      .toHaveValue("Biến và kiểu dữ liệu (server)");
  });

  it("resets completed multi-source creation state and keeps the new import selected", async () => {
    let generated = false;
    sessionStorage.setItem("learningapp.course-outline-generation", JSON.stringify({
      version: 2,
      topic: "TypeScript nâng cao",
      selectedCandidateKeys: [],
      candidates: [],
      researchCursor: null,
      researchHasMore: false,
      initializationKey: "33333333-3333-4333-8333-333333333333",
      jobId: 61,
      pendingAction: null,
      attempts: [{
        clientKey: "source-1",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        kind: "manual_url",
        label: "TypeScript handbook",
        url: "https://example.com/typescript",
        sourceDocumentId: 9,
        status: "extracted",
        attached: true,
      }],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") {
        return json({ success: true, data: { items: [{
          ...importItem(generated ? "outline_review" : "processing"),
          title: generated ? "TypeScript nâng cao" : "Course import đang chuẩn bị",
        }] } });
      }
      if (url === "/api/admin/course-drafts/61/outline" && init?.method === "POST") {
        generated = true;
        return json({ success: true, data: { jobId: 61, outlineRevision: 1 } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ContentPipelineAdmin />);
    expect(await screen.findByDisplayValue("TypeScript nâng cao")).toBeInTheDocument();
    expect(screen.getByText("TypeScript handbook")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tạo outline từ evidence đã review" }));

    expect(await screen.findByText("Course outline mới đã sẵn sàng để review. Workflow tạo mới đã được đặt lại.")).toBeInTheDocument();
    expect(screen.getByLabelText("Chủ đề Course")).toHaveValue("");
    expect(screen.queryByText("TypeScript handbook")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Course title" })).toHaveValue("TypeScript nâng cao");
    expect(sessionStorage.getItem("learningapp.course-outline-generation")).toBeNull();
  });

  it("shows Admin citation provenance and disables Continue for stale evidence", async () => {
    const stale = { ...multiImportItem("outline_review"), outlineStale: true };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ success: true, data: { items: [stale] } }));
    render(<ContentPipelineAdmin />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Evidence đã thay đổi");
    expect(screen.getByRole("button", { name: "Continue: sinh Lesson contents" })).toBeDisabled();

    const contentItem = multiImportItem("content_review");
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ success: true, data: { items: [contentItem] } }));
    render(<ContentPipelineAdmin />);
    fireEvent.click((await screen.findAllByRole("button", { name: /Biến Python/ }))[0]);
    expect(await screen.findByText(/python\.pdf.*chunk 0: Nguồn PDF/u)).toBeInTheDocument();
  });

  it("renders with the shared Stitch tokens and no legacy or dark-hardcoded palette", async () => {
    const containers: HTMLElement[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [importItem()] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });
    const first = render(<ContentPipelineAdmin />);
    containers.push(first.container);

    expect(await screen.findByDisplayValue("Python nền tảng")).toBeInTheDocument();

    const courseCard = screen.getByRole("heading", { name: "PDF → Course outline → Lesson contents" }).closest("section") as HTMLElement | null;
    expect(courseCard).not.toBeNull();
    expect(courseCard!).toHaveClass("rounded-xl", "border-border", "bg-surface", "shadow-sm");

    expect(screen.getByRole("button", { name: "Continue: sinh Lesson contents" })).toHaveClass("bg-primary", "text-on-primary", "rounded-xl");
    expect(screen.getByText("outline_review · outline r1")).toHaveClass("bg-primary-soft", "text-primary");

    for (const field of [
      screen.getByLabelText("Course title"),
      screen.getByLabelText("Description"),
      screen.getByLabelText("Course learning objectives (mỗi dòng một mục tiêu)"),
    ]) {
      expect(field).toHaveClass("border-border", "bg-surface", "rounded-xl");
    }

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: [importItem("content_review")] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });
    const second = render(<ContentPipelineAdmin />);
    containers.push(second.container);

    expect(await screen.findByRole("button", { name: "Publish Course" })).toHaveClass("bg-primary", "text-on-primary", "rounded-xl");

    for (const container of containers) {
      for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
        const className = element.getAttribute("class") ?? "";
        for (const legacy of ["slate-", "indigo-", "violet-", "emerald-", "amber-", "blue-", "red-", "dark:"]) {
          expect(className).not.toContain(legacy);
        }
        expect(className).not.toMatch(/\/\d+$/u);
      }
    }
  });
});
