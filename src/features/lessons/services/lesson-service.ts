import {
  ServiceError,
} from "@/features/courses/services/course-service";
import {
  fetchLessonDetail,
  startLessonProgress,
} from "@/features/lessons/repositories/lesson-repository";
import type {
  LessonResponse,
  StartLessonResponse,
} from "@/features/lessons/types";

export { ServiceError };

export async function getLessonById(lessonId: number): Promise<LessonResponse> {
  if (!Number.isFinite(lessonId) || lessonId < 1) {
    throw new ServiceError("INVALID_ID", "Invalid lesson ID.", 400);
  }

  const result = await fetchLessonDetail(lessonId);

  if (!result.lessonExists || !result.isPublished) {
    throw new ServiceError("NOT_FOUND", "Lesson not found or not published.", 404);
  }

  if (!result.isAuthenticated) {
    throw new ServiceError("UNAUTHENTICATED", "Authentication required.", 401);
  }

  if (!result.isEnrolled) {
    throw new ServiceError(
      "COURSE_NOT_ENROLLED",
      "You must be enrolled in the course to view this lesson.",
      403,
    );
  }

  const lesson = result.lesson;
  if (!lesson) {
    throw new ServiceError("NOT_FOUND", "Lesson not found or not published.", 404);
  }

  if (lesson.status === "locked") {
    throw new ServiceError(
      "LESSON_LOCKED",
      "This lesson is locked. Complete previous lessons to unlock it.",
      403,
    );
  }

  return {
    id: lesson.id,
    chapterId: lesson.chapterId,
    title: lesson.title,
    content: lesson.content,
    order: lesson.order,
    estimatedMinutes: lesson.estimatedMinutes,
    status: lesson.status,
    exercises: lesson.exercises,
    previousLesson: lesson.previousLesson,
    nextLesson: lesson.nextLesson,
  };
}

export async function startLesson(
  lessonId: number,
): Promise<StartLessonResponse> {
  if (!Number.isFinite(lessonId) || lessonId < 1) {
    throw new ServiceError("INVALID_ID", "Invalid lesson ID.", 400);
  }

  const result = await fetchLessonDetail(lessonId);

  if (!result.lessonExists || !result.isPublished) {
    throw new ServiceError("NOT_FOUND", "Lesson not found or not published.", 404);
  }

  if (!result.isAuthenticated) {
    throw new ServiceError("UNAUTHENTICATED", "Authentication required.", 401);
  }

  if (!result.isEnrolled) {
    throw new ServiceError(
      "COURSE_NOT_ENROLLED",
      "You must be enrolled in the course to start this lesson.",
      403,
    );
  }

  if (!result.lesson) {
    throw new ServiceError("NOT_FOUND", "Lesson not found or not published.", 404);
  }

  try {
    return await startLessonProgress(lessonId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : undefined;

    if (message === "UNAUTHENTICATED") {
      throw new ServiceError("UNAUTHENTICATED", "Authentication required.", 401);
    }

    if (message === "LESSON_LOCKED") {
      throw new ServiceError("LESSON_LOCKED", "Cannot start a locked lesson.", 403);
    }

    if (message === "LESSON_NOT_FOUND") {
      throw new ServiceError("NOT_FOUND", "Lesson not found or not published.", 404);
    }

    if (message === "ACTIVE_LEARNER_REQUIRED") {
      throw new ServiceError("FORBIDDEN", "An active learner profile is required.", 403);
    }

    if (message === "COURSE_NOT_ENROLLED") {
      throw new ServiceError(
        "COURSE_NOT_ENROLLED",
        "You must be enrolled in the course to start this lesson.",
        403,
      );
    }

    throw error;
  }
}
