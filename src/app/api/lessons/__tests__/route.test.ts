import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/lessons/[lessonId]/route";
import { POST } from "@/app/api/lessons/[lessonId]/start/route";
import {
  getLessonById,
  ServiceError,
  startLesson,
} from "@/features/lessons/services/lesson-service";

vi.mock("@/features/lessons/services/lesson-service", () => ({
  ServiceError: class extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  getLessonById: vi.fn(),
  startLesson: vi.fn(),
}));

describe("lesson API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/lessons/:lessonId", () => {
    it("returns 400 for non-numeric or invalid IDs", async () => {
      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "abc" }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid lesson ID.",
        },
      });
    });

    it("returns 200 with lesson data on success", async () => {
      const mockLesson = {
        id: 10,
        chapterId: 2,
        title: "Test Lesson",
        content: "Content",
        order: 1,
        estimatedMinutes: 20,
        status: "unlocked" as const,
        exercises: [],
        previousLesson: null,
        nextLesson: null,
      };
      vi.mocked(getLessonById).mockResolvedValueOnce(mockLesson);

      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: mockLesson,
      });
    });

    it("returns service error status on ServiceError", async () => {
      vi.mocked(getLessonById).mockRejectedValueOnce(
        new ServiceError("COURSE_NOT_ENROLLED", "Enrolled required", 403),
      );

      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: "COURSE_NOT_ENROLLED",
          message: "Enrolled required",
        },
      });
    });

    it("returns 500 on unexpected errors", async () => {
      vi.mocked(getLessonById).mockRejectedValueOnce(new Error("Database crash"));

      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
    });
  });

  describe("POST /api/lessons/:lessonId/start", () => {
    it("returns 400 for invalid IDs", async () => {
      const res = await POST(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "0" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 200 with start payload on success", async () => {
      const mockResult = {
        lessonId: 10,
        status: "inProgress" as const,
        startedAt: "2026-03-08T10:00:00.000Z",
      };
      vi.mocked(startLesson).mockResolvedValueOnce(mockResult);

      const res = await POST(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: mockResult,
      });
    });

    it("returns ServiceError status when start fails with ServiceError", async () => {
      vi.mocked(startLesson).mockRejectedValueOnce(
        new ServiceError("LESSON_LOCKED", "Locked", 403),
      );

      const res = await POST(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(403);
    });

    it("returns 500 on unhandled error", async () => {
      vi.mocked(startLesson).mockRejectedValueOnce(new Error("Fail"));

      const res = await POST(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "10" }),
      });
      expect(res.status).toBe(500);
    });
  });
});
