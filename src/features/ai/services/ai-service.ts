import "server-only";

import {
  createAIProvider,
  type AIProvider,
} from "@/features/ai/providers/ai-provider";
import {
  createAiExplanationRecord,
  fetchAiExplanationHistory,
  fetchSubmissionDetailsForAi,
  fetchCourseRecommendationData,
  createGeneratedExerciseRecord,
  fetchLessonContextForGeneration,
} from "@/features/ai/repositories/ai-repository";
import type {
  AiExplanationRecord,
  RequestAiExplanationInput,
  CourseRecommendationResult,
  GenerateExerciseInput,
  GenerateExerciseResponse,
} from "@/features/ai/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AiServiceError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "AI_PROVIDER_ERROR"
      | "DATABASE_ERROR",
    message: string
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

function asAiServiceError(error: unknown): AiServiceError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "UNAUTHENTICATED") {
    return new AiServiceError("UNAUTHENTICATED", "Authentication is required.");
  }

  if (error.message === "FORBIDDEN") {
    return new AiServiceError("FORBIDDEN", "You cannot access this submission.");
  }

  return null;
}

export async function requestAiExplanation(
  input: RequestAiExplanationInput,
  provider: AIProvider = createAIProvider()
): Promise<AiExplanationRecord> {
  let submission;

  try {
    submission = await fetchSubmissionDetailsForAi(input.submissionId);
  } catch (error: unknown) {
    const serviceError = asAiServiceError(error);

    if (serviceError) {
      throw serviceError;
    }

    throw new AiServiceError(
      "DATABASE_ERROR",
      "Unable to load the submission for AI explanation."
    );
  }

  if (!submission) {
    throw new AiServiceError("NOT_FOUND", "Submission not found.");
  }

  const question = input.userQuestion?.trim() || null;

  try {
    const generated = await provider.generateExplanation({ submission, question });

    return await createAiExplanationRecord({
      submission_id: submission.id,
      user_question: question,
      response: generated.explanation,
      provider: generated.provider,
      model: generated.model,
      status: "success",
      error_code: null,
    });
  } catch (error: unknown) {
    if (error instanceof AiServiceError) {
      throw error;
    }

    try {
      await createAiExplanationRecord({
        submission_id: submission.id,
        user_question: question,
        response: null,
        provider: "unknown",
        model: null,
        status: "failed",
        error_code:
          error instanceof Error && error.message === "AI_RESPONSE_INVALID"
            ? "AI_RESPONSE_INVALID"
            : "AI_PROVIDER_ERROR",
      });
    } catch (recordError: unknown) {
      console.error("[AI explanation failure persistence]", recordError);
    }

    console.error("[AI explanation provider]", error);
    throw new AiServiceError(
      "AI_PROVIDER_ERROR",
      "Unable to generate an explanation at this time."
    );
  }
}

export async function getAiExplanationHistory(
  submissionId: number
): Promise<AiExplanationRecord[]> {
  try {
    return await fetchAiExplanationHistory(submissionId);
  } catch (error: unknown) {
    const serviceError = asAiServiceError(error);

    if (serviceError) {
      throw serviceError;
    }

    if (error instanceof Error && error.message === "DATABASE_ERROR") {
      throw new AiServiceError(
        "DATABASE_ERROR",
        "Unable to load AI explanation history."
      );
    }

    throw new AiServiceError("FORBIDDEN", "You cannot access this submission.");
  }
}

export async function getCourseRecommendation(
  courseId: number
): Promise<CourseRecommendationResult> {
  let data;
  try {
    data = await fetchCourseRecommendationData(courseId);
  } catch {
    throw new AiServiceError("DATABASE_ERROR", "Unable to load course recommendation data.");
  }

  if (!data.isAuthenticated) {
    throw new AiServiceError("UNAUTHENTICATED", "Authentication is required.");
  }

  if (!data.courseExists) {
    throw new AiServiceError("NOT_FOUND", "Course not found.");
  }

  if (!data.isEnrolled) {
    throw new AiServiceError("FORBIDDEN", "You are not enrolled in this course.");
  }

  const result: CourseRecommendationResult = {
    courseId,
    courseTitle: data.courseTitle || "",
    recommendation: null,
  };

  if (!data.orderedLessons || data.orderedLessons.length === 0) {
    return result;
  }

  const currentLessonIndex = data.orderedLessons.findIndex((l) => !l.isCompleted);

  if (currentLessonIndex === -1) {
    result.recommendation = {
      type: "COURSE_COMPLETED",
      title: "Khóa học hoàn tất",
      description: "Chúc mừng bạn đã hoàn thành tất cả bài học trong khóa học này.",
      targetUrl: `/courses/${courseId}`,
      lessonId: null,
      exerciseId: null,
      reason: "Bạn đã hoàn thành 100% khóa học.",
    };
    return result;
  }

  const currentLesson = data.orderedLessons[currentLessonIndex];

  let needsReview = false;
  let stuckExercise = null;

  for (const ex of currentLesson.exercises) {
    if (ex.latestSubmission?.consecutiveIncorrect && ex.latestSubmission.consecutiveIncorrect >= 3) {
      needsReview = true;
      stuckExercise = ex;
      break;
    }
  }

  if (needsReview && stuckExercise) {
    result.recommendation = {
      type: "REVIEW_LESSON",
      title: "Ôn tập bài học",
      description: "Có vẻ bạn đang gặp khó khăn. Hãy xem lại nội dung bài học nhé.",
      targetUrl: `/lessons/${currentLesson.id}`,
      lessonId: currentLesson.id,
      exerciseId: stuckExercise.id,
      reason: "Gợi ý ôn tập dựa trên kết quả làm bài gần đây.",
    };
    return result;
  }

  result.recommendation = {
    type: "NEXT_LESSON",
    title: "Tiếp tục học",
    description: `Bài học tiếp theo: ${currentLesson.title}`,
    targetUrl: `/lessons/${currentLesson.id}`,
    lessonId: currentLesson.id,
    exerciseId: null,
    reason: "Đây là bài học tiếp theo trong lộ trình của bạn.",
  };

  return result;
}

export async function generateExercise(
  input: GenerateExerciseInput,
  provider: AIProvider = createAIProvider()
): Promise<GenerateExerciseResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new AiServiceError("UNAUTHENTICATED", "Authentication is required.");
  }

  let lessonContext;
  try {
    lessonContext = await fetchLessonContextForGeneration(input.lessonId);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      throw new AiServiceError("NOT_FOUND", "Lesson not found.");
    }
    throw new AiServiceError("DATABASE_ERROR", "Unable to load the lesson.");
  }

  if (!provider.generateExercise) {
    throw new AiServiceError("AI_PROVIDER_ERROR", "Provider does not support exercise generation.");
  }

  try {
    const generated = await provider.generateExercise({
      lessonTitle: lessonContext.title,
      lessonContent: lessonContext.content ?? "",
      exerciseType: input.exerciseType,
      difficulty: input.difficulty,
      learningObjective: input.learningObjective,
      topicHint: input.topicHint ?? null,
    });

    const record = await createGeneratedExerciseRecord({
      lesson_id: input.lessonId,
      requested_by: authData.user.id,
      title: generated.content.title,
      description: generated.content.description,
      exercise_type: input.exerciseType,
      difficulty: input.difficulty,
      content: generated.content,
      status: "pending",
      provider: generated.provider,
      model: generated.model,
    });

    return { generatedExercise: record };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      throw new AiServiceError("FORBIDDEN", "Moderator or Admin role required.");
    }
    if (error instanceof Error && error.message === "AI_RESPONSE_INVALID") {
      throw new AiServiceError("AI_PROVIDER_ERROR", "Invalid response from AI provider.");
    }
    throw new AiServiceError("AI_PROVIDER_ERROR", "Unable to generate exercise at this time.");
  }
}