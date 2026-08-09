import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressStatus } from "@/features/courses/types";

import {
  getCourseProgress,
  getLessonProgress,
  ProgressError,
} from "../progress-service";
import {
  fetchUserCourseProgress,
  fetchUserLessonProgress,
} from "../../repositories/progress-repository";

vi.mock("../../repositories/progress-repository", () => ({
  fetchUserCourseProgress: vi.fn(),
  fetchUserLessonProgress: vi.fn(),
}));

describe("progress service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCourseProgress", () => {
    it("returns the course progress on success", async () => {
      const progress = {
        courseId: 1,
        completedLessons: 2,
        totalLessons: 4,
        completionPercentage: 50,
        lastAccessedLessonId: 3,
      };
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        progress,
      });

      await expect(getCourseProgress(1)).resolves.toEqual(progress);
    });

    it("throws NOT_FOUND when the course does not exist", async () => {
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: false,
        isPublished: false,
        isAuthenticated: true,
        isEnrolled: false,
        progress: null,
      });

      await expect(getCourseProgress(1)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Course not found",
      });
    });

    it("throws UNAUTHENTICATED when no user is authenticated", async () => {
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: true,
        isPublished: true,
        isAuthenticated: false,
        isEnrolled: false,
        progress: null,
      });

      await expect(getCourseProgress(1)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    });

    it("throws NOT_PUBLISHED when the course is not published", async () => {
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: true,
        isPublished: false,
        isAuthenticated: true,
        isEnrolled: true,
        progress: null,
      });

      await expect(getCourseProgress(1)).rejects.toMatchObject({
        code: "NOT_PUBLISHED",
        message: "Course is not published",
      });
    });

    it("throws NOT_ENROLLED when the user is not enrolled", async () => {
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: false,
        progress: null,
      });

      await expect(getCourseProgress(1)).rejects.toMatchObject({
        code: "NOT_ENROLLED",
        message: "Not enrolled in this course",
      });
    });

    it("throws NOT_FOUND when progress data is missing", async () => {
      vi.mocked(fetchUserCourseProgress).mockResolvedValue({
        courseExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        progress: null,
      });

      await expect(getCourseProgress(1)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Progress not found",
      });
    });
  });

  describe("getLessonProgress", () => {
    it("returns the lesson progress on success", async () => {
      const progress = {
        lessonId: 2,
        status: "inProgress" as ProgressStatus,
        startedAt: "2026-08-01T00:00:00.000Z",
        completedAt: null,
        lastAccessedAt: "2026-08-02T00:00:00.000Z",
      };
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        progress,
      });

      await expect(getLessonProgress(2)).resolves.toEqual(progress);
    });

    it("throws NOT_FOUND when the lesson does not exist", async () => {
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: false,
        isPublished: false,
        isAuthenticated: true,
        isEnrolled: false,
        progress: null,
      });

      await expect(getLessonProgress(2)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Lesson not found",
      });
    });

    it("throws UNAUTHENTICATED when no user is authenticated", async () => {
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: false,
        isEnrolled: false,
        progress: null,
      });

      await expect(getLessonProgress(2)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    });

    it("throws NOT_PUBLISHED when the lesson is not published", async () => {
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: true,
        isPublished: false,
        isAuthenticated: true,
        isEnrolled: true,
        progress: null,
      });

      await expect(getLessonProgress(2)).rejects.toMatchObject({
        code: "NOT_PUBLISHED",
        message: "Lesson is not published",
      });
    });

    it("throws NOT_ENROLLED when the user is not enrolled", async () => {
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: false,
        progress: null,
      });

      await expect(getLessonProgress(2)).rejects.toMatchObject({
        code: "NOT_ENROLLED",
        message: "Not enrolled in this course",
      });
    });

    it("throws NOT_FOUND when progress data is missing", async () => {
      vi.mocked(fetchUserLessonProgress).mockResolvedValue({
        lessonExists: true,
        isPublished: true,
        isAuthenticated: true,
        isEnrolled: true,
        progress: null,
      });

      await expect(getLessonProgress(2)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Progress not found",
      });
    });
  });

  it("exposes ProgressError with a code and message", () => {
    const error = new ProgressError("NOT_ENROLLED", "Not enrolled");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("NOT_ENROLLED");
    expect(error.message).toBe("Not enrolled");
    expect(error.name).toBe("ProgressError");
  });
});