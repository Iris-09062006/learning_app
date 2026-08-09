import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchLessonDetail,
  startLessonProgress,
} from "@/features/lessons/repositories/lesson-repository";
import {
  getLessonById,
  startLesson,
} from "@/features/lessons/services/lesson-service";

vi.mock("@/features/lessons/repositories/lesson-repository", () => ({
  fetchLessonDetail: vi.fn(),
  startLessonProgress: vi.fn(),
}));

describe("lesson service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLessonById", () => {
    it("rejects invalid lesson IDs", async () => {
      await expect(getLessonById(0)).rejects.toMatchObject({
        code: "INVALID_ID",
        statusCode: 400,
      });
      expect(fetchLessonDetail).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND for missing or unpublished lessons", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: false,
        isPublished: false,
        isAuthenticated: false,
        isEnrolled: false,
        lesson: null,
      });

      await expect(getLessonById(10)).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("returns UNAUTHENTICATED when not signed in", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: false,
        isEnrolled: false,
        lesson: null,
      });

      await expect(getLessonById(10)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        statusCode: 401,
      });
    });

    it("returns COURSE_NOT_ENROLLED when enrolled checks fail", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: false,
        lesson: null,
      });

      await expect(getLessonById(10)).rejects.toMatchObject({
        code: "COURSE_NOT_ENROLLED",
        statusCode: 403,
      });
    });

    it("returns LESSON_LOCKED when status is locked", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        lesson: {
          id: 10,
          chapterId: 2,
          courseId: 1,
          title: "Locked Lesson",
          content: null,
          order: 2,
          estimatedMinutes: null,
          status: "locked",
          isPublished: true,
          exercises: [],
        },
      });

      await expect(getLessonById(10)).rejects.toMatchObject({
        code: "LESSON_LOCKED",
        statusCode: 403,
      });
    });

    it("returns lesson details for valid access", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        lesson: {
          id: 10,
          chapterId: 2,
          courseId: 1,
          title: "Unlocked Lesson",
          content: "Content",
          order: 1,
          estimatedMinutes: 30,
          status: "unlocked",
          isPublished: true,
          exercises: [],
        },
      });

      const res = await getLessonById(10);
      expect(res).toEqual({
        id: 10,
        chapterId: 2,
        title: "Unlocked Lesson",
        content: "Content",
        order: 1,
        estimatedMinutes: 30,
        status: "unlocked",
        exercises: [],
      });
    });
  });

  describe("startLesson", () => {
    it("rejects invalid lesson IDs", async () => {
      await expect(startLesson(0)).rejects.toMatchObject({
        code: "INVALID_ID",
        statusCode: 400,
      });
    });

    it("enforces fetch checks before starting (e.g. locks)", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        lesson: {
          id: 10,
          chapterId: 2,
          courseId: 1,
          title: "Locked",
          content: null,
          order: 2,
          estimatedMinutes: null,
          status: "locked",
          isPublished: true,
          exercises: [],
        },
      });

      await expect(startLesson(10)).rejects.toMatchObject({
        code: "LESSON_LOCKED",
        statusCode: 403,
      });
      expect(startLessonProgress).not.toHaveBeenCalled();
    });

    it("starts lesson and returns payload", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        lesson: {
          id: 10,
          chapterId: 2,
          courseId: 1,
          title: "Unlocked",
          content: "C",
          order: 1,
          estimatedMinutes: 10,
          status: "unlocked",
          isPublished: true,
          exercises: [],
        },
      });
      vi.mocked(startLessonProgress).mockResolvedValueOnce({
        lessonId: 10,
        status: "inProgress",
        startedAt: "2026-03-08T10:00:00.000Z",
      });

      const res = await startLesson(10);
      expect(res).toEqual({
        lessonId: 10,
        status: "inProgress",
        startedAt: "2026-03-08T10:00:00.000Z",
      });
    });

    it("re-throws mapped errors from repository if any fallback happens", async () => {
      vi.mocked(fetchLessonDetail).mockResolvedValueOnce({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        lesson: {
          id: 10,
          chapterId: 2,
          courseId: 1,
          title: "Unlocked",
          content: "C",
          order: 1,
          estimatedMinutes: 10,
          status: "unlocked",
          isPublished: true,
          exercises: [],
        },
      });
      vi.mocked(startLessonProgress).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

      await expect(startLesson(10)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        statusCode: 401,
      });
    });
  });
});