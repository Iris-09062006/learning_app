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
          nextLesson: null,
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
          nextLesson: null,
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
        nextLesson: null,
      });
      const serialized = JSON.stringify(res);
      for (const forbidden of ["authorityScore", "relevanceScore", "sourceUrl", "canonicalUrl",
        "sourceDocumentId", "sourceBody", "citation", "provenance"]) {
        expect(serialized).not.toContain(forbidden);
      }
    });
  });

  describe("startLesson", () => {
    it("rejects invalid lesson IDs", async () => {
      await expect(startLesson(0)).rejects.toMatchObject({
        code: "INVALID_ID",
        statusCode: 400,
      });
    });

    it("lets the authoritative RPC start an immediate next lesson that is currently locked", async () => {
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
          nextLesson: null,
        },
      });

      vi.mocked(startLessonProgress).mockResolvedValueOnce({
        lessonId: 10,
        status: "inProgress",
        startedAt: "2026-08-11T00:00:00.000Z",
      });

      await expect(startLesson(10)).resolves.toMatchObject({
        lessonId: 10,
        status: "inProgress",
      });
      expect(startLessonProgress).toHaveBeenCalledWith(10);
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
          nextLesson: null,
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
          nextLesson: null,
        },
      });
      vi.mocked(startLessonProgress).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

      await expect(startLesson(10)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        statusCode: 401,
      });
    });

    it.each([
      ["LESSON_NOT_FOUND", "NOT_FOUND", 404],
      ["ACTIVE_LEARNER_REQUIRED", "FORBIDDEN", 403],
      ["COURSE_NOT_ENROLLED", "COURSE_NOT_ENROLLED", 403],
      ["LESSON_LOCKED", "LESSON_LOCKED", 403],
    ])(
      "maps authoritative RPC rejection %s to %s",
      async (repositoryMessage, serviceCode, statusCode) => {
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
            nextLesson: null,

          },
        });
        vi.mocked(startLessonProgress).mockRejectedValueOnce(new Error(repositoryMessage));

        await expect(startLesson(10)).rejects.toMatchObject({
          code: serviceCode,
          statusCode,
        });
      },
    );
  });
});
