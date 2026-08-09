import {
  fetchUserCourseProgress,
  fetchUserLessonProgress,
} from "../repositories/progress-repository";
import type {
  CourseProgressResponse,
  LessonProgressResponse,
} from "../types";

export class ProgressError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "UNAUTHENTICATED"
      | "NOT_ENROLLED"
      | "NOT_PUBLISHED",
    message: string
  ) {
    super(message);
    this.name = "ProgressError";
  }
}

export async function getCourseProgress(
  courseId: number
): Promise<CourseProgressResponse> {
  const result = await fetchUserCourseProgress(courseId);

  if (!result.courseExists) {
    throw new ProgressError("NOT_FOUND", "Course not found");
  }

  if (!result.isAuthenticated) {
    throw new ProgressError("UNAUTHENTICATED", "Authentication required");
  }

  if (!result.isPublished) {
    throw new ProgressError("NOT_PUBLISHED", "Course is not published");
  }

  if (!result.isEnrolled) {
    throw new ProgressError("NOT_ENROLLED", "Not enrolled in this course");
  }

  if (!result.progress) {
    throw new ProgressError("NOT_FOUND", "Progress not found");
  }

  return result.progress;
}

export async function getLessonProgress(
  lessonId: number
): Promise<LessonProgressResponse> {
  const result = await fetchUserLessonProgress(lessonId);

  if (!result.lessonExists) {
    throw new ProgressError("NOT_FOUND", "Lesson not found");
  }

  if (!result.isAuthenticated) {
    throw new ProgressError("UNAUTHENTICATED", "Authentication required");
  }

  if (!result.isPublished) {
    throw new ProgressError("NOT_PUBLISHED", "Lesson is not published");
  }

  if (!result.isEnrolled) {
    throw new ProgressError("NOT_ENROLLED", "Not enrolled in this course");
  }

  if (!result.progress) {
    throw new ProgressError("NOT_FOUND", "Progress not found");
  }

  return result.progress;
}