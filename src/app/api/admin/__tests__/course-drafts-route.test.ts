import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getCourseDraftQueue: vi.fn(),
  submitCourseImportReview: vi.fn(),
}));

vi.mock("@/features/content-pipeline/services/content-pipeline-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/content-pipeline/services/content-pipeline-service")>();
  return { ...actual, ...serviceMocks };
});

import { GET } from "../course-drafts/route";
import { POST } from "../course-drafts/[id]/reviews/route";

describe("Admin Course draft routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the unresolved Course batch queue without caching", async () => {
    serviceMocks.getCourseDraftQueue.mockResolvedValue([{
      jobId: 61,
      sourceDocumentId: 9,
      sourceFilename: "anchor.pdf",
      sources: [
        { sourceDocumentId: 9, sourceOrder: 0, sourceType: "file", title: "anchor.pdf" },
        { sourceDocumentId: 10, sourceOrder: 1, sourceType: "web_page", title: "Reference" },
      ],
      lessons: [{
        sourceChunkIndexes: [0, 0],
        sourceChunks: [
          { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, chunkIndex: 0 },
          { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, chunkIndex: 0 },
        ],
      }],
    }]);
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      data: { items: [{
        sourceDocumentId: 9,
        sourceFilename: "anchor.pdf",
        sources: [
          { sourceDocumentId: 9, sourceOrder: 0 },
          { sourceDocumentId: 10, sourceOrder: 1 },
        ],
      }] },
    });
    expect(payload.data.items[0].lessons[0].sourceChunks).toEqual([
      { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, chunkIndex: 0 },
      { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, chunkIndex: 0 },
    ]);
  });

  it("submits one persisted decision for the Course import job", async () => {
    serviceMocks.submitCourseImportReview.mockResolvedValue({
      sourceDocumentId: 9,
      courseId: 31,
      status: "published",
      lessonIds: [51, 52],
    });
    const response = await POST(
      new Request("http://localhost/api/admin/course-drafts/9/reviews", {
        method: "POST",
        body: JSON.stringify({ decision: "published" }),
      }),
      { params: Promise.resolve({ id: "9" }) }
    );
    expect(response.status).toBe(201);
    expect(serviceMocks.submitCourseImportReview).toHaveBeenCalledWith("9", { decision: "published" });
  });
});
