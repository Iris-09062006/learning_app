import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CourseImportDraft } from "../../types";
import { ContentPipelineAdmin, requestPipelineApi } from "../content-pipeline-admin";

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("content pipeline Admin", () => {
  afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

  it("does not expose JSON parser errors for an HTML gateway timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>timeout</html>", { status: 504 }));
    await expect(requestPipelineApi("/api/admin/course-drafts")).rejects.toThrow(
      "Dịch vụ tạm thời quá tải hoặc hết thời gian chờ. Vui lòng thử lại."
    );
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

  it("publishes atomically and removes the resolved item after refresh", async () => {
    let resolved = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/admin/course-drafts") return json({ success: true, data: { items: resolved ? [] : [importItem("content_review")] } });
      if (url === "/api/admin/content-targets") return json({ success: true, data: { items: [] } });
      if (url === "/api/admin/course-drafts/61/reviews") { resolved = true; return json({ success: true, data: { sourceDocumentId: 9, courseId: 31, status: "published", lessonIds: [51, 52] } }, 201); }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<ContentPipelineAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: "Publish Course" }));
    expect(await screen.findByText("Hàng chờ trống.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
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
});
