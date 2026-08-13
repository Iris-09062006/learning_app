import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  generateCourseOutline: vi.fn(),
  generateCourseOutlineForJob: vi.fn(),
  updateCourseOutline: vi.fn(),
  regenerateCourseOutline: vi.fn(),
  generateCourseLessonContents: vi.fn(),
  regenerateCourseLessonContent: vi.fn(),
}));

vi.mock("@/features/content-pipeline/services/content-pipeline-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/content-pipeline/services/content-pipeline-service")>();
  return { ...actual, ...serviceMocks };
});

import { POST as generateOutline } from "../content-sources/[id]/course-outline/route";
import { PATCH as editOutline, POST as generateJobOutline } from "../course-drafts/[id]/outline/route";
import { POST as regenerateOutline } from "../course-drafts/[id]/outline/regenerate/route";
import { POST as generateLessons } from "../course-drafts/[id]/lessons/generate/route";
import { POST as regenerateLesson } from "../course-drafts/[id]/lessons/[lessonId]/regenerate/route";
import { ContentPipelineError } from "@/features/content-pipeline/services/content-pipeline-service";

describe("two-stage PDF-to-Course routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates outline without accepting a combined Course body", async () => {
    serviceMocks.generateCourseOutline.mockResolvedValue({ jobId: 61, status: "outline_review" });
    const response = await generateOutline(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "9" }) });
    expect(response.status).toBe(201);
    expect(serviceMocks.generateCourseOutline).toHaveBeenCalledWith("9");
  });

  it("persists an Admin-edited outline revision", async () => {
    const outline = { title: "Python", description: "Nhập môn", learningObjectives: ["Hiểu Python"], lessons: [] };
    await editOutline(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(outline) }), { params: Promise.resolve({ id: "61" }) });
    expect(serviceMocks.updateCourseOutline).toHaveBeenCalledWith("61", outline);
  });

  it("generates a job-wide outline with the immutable revision envelope and no-store", async () => {
    serviceMocks.generateCourseOutlineForJob.mockResolvedValue({
      jobId: 61,
      sourceDocumentId: 9,
      sourceDocumentIds: [9, 10],
      outlineRevision: 2,
      status: "outline_review",
    });
    const response = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "61" }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(serviceMocks.generateCourseOutlineForJob).toHaveBeenCalledWith("61");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { jobId: 61, sourceDocumentIds: [9, 10], outlineRevision: 2 },
    });
  });

  it("maps job-wide outline validation and authorization failures through the shared envelope", async () => {
    serviceMocks.generateCourseOutlineForJob.mockRejectedValueOnce(
      new ContentPipelineError("FORBIDDEN", "Active Admin role required.")
    );
    const forbidden = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "61" }),
    });
    expect(forbidden.status).toBe(403);
    serviceMocks.generateCourseOutlineForJob.mockRejectedValueOnce(
      new ContentPipelineError("VALIDATION_ERROR", "jobId must be a positive integer.")
    );
    const invalid = await generateJobOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "bad" }),
    });
    expect(invalid.status).toBe(400);
  });

  it("keeps outline and Lesson regeneration as distinct actions", async () => {
    await regenerateOutline(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61" }) });
    await generateLessons(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61" }) });
    await regenerateLesson(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "61", lessonId: "71" }) });
    expect(serviceMocks.regenerateCourseOutline).toHaveBeenCalledWith("61");
    expect(serviceMocks.generateCourseLessonContents).toHaveBeenCalledWith("61");
    expect(serviceMocks.regenerateCourseLessonContent).toHaveBeenCalledWith("61", "71");
  });

  it("maps AI capacity exhaustion to HTTP 429", async () => {
    serviceMocks.generateCourseOutline.mockRejectedValue(
      new ContentPipelineError("RATE_LIMITED", "Retry later")
    );
    const response = await generateOutline(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "9" }),
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
  });
});
