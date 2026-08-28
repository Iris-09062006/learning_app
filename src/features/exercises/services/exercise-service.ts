import {
  fetchExerciseForSubmission,
  fetchExerciseSolutionAdmin,
  submitExerciseRpc,
} from "@/features/exercises/repositories/exercise-repository";
import type { Json } from "@/generated/database.types";
import type {
  SubmitExerciseRequest,
  SubmitExerciseResponse,
  LessonProgress,
} from "@/features/exercises/types";

export async function submitExercise(
  exerciseId: number,
  request: SubmitExerciseRequest,
): Promise<SubmitExerciseResponse> {
  const exercise = await fetchExerciseForSubmission(exerciseId);

  if (!exercise) {
    throw new Error("Exercise not found");
  }

  if (!exercise.isPublished) {
    throw new Error("Exercise is not published");
  }

  const solutionData = await fetchExerciseSolutionAdmin(exerciseId);
  if (!solutionData) {
    throw new Error("Solution not found");
  }

  if (!request.answer || typeof request.answer !== "object" || Array.isArray(request.answer)) {
    throw new Error("Invalid answer format");
  }
  const answer = request.answer as unknown as Record<string, unknown>;
  let answerPayload: Json;
  if (["multiple_choice", "true_false", "scenario", "predict_output", "fix_the_bug"].includes(exercise.type)) {
    if (typeof answer.selectedOptionId !== "number" || !Number.isInteger(answer.selectedOptionId) || answer.selectedOptionId <= 0) {
      throw new Error("Invalid answer format: selectedOptionId is required");
    }
    answerPayload = { selectedOptionId: answer.selectedOptionId };
  } else if (exercise.type === "short_answer") {
    if (typeof answer.answerText !== "string" || !answer.answerText.trim() || answer.answerText.trim().length > 1000) {
      throw new Error("Invalid answer format: answerText is required");
    }
    answerPayload = { answerText: answer.answerText.trim() };
  } else if (exercise.type === "ordering") {
    if (!Array.isArray(answer.orderedOptionIds) || answer.orderedOptionIds.length < 2 ||
        answer.orderedOptionIds.some((id) => typeof id !== "number" || !Number.isInteger(id) || id <= 0) ||
        new Set(answer.orderedOptionIds).size !== answer.orderedOptionIds.length) {
      throw new Error("Invalid answer format: orderedOptionIds are required");
    }
    answerPayload = { orderedOptionIds: answer.orderedOptionIds };
  } else if (exercise.type === "matching") {
    if (!Array.isArray(answer.matches) || answer.matches.length < 2 || answer.matches.some((match) => {
      if (!match || typeof match !== "object" || Array.isArray(match)) return true;
      const entry = match as Record<string, unknown>;
      return typeof entry.optionId !== "number" || !Number.isInteger(entry.optionId) || entry.optionId <= 0 ||
        typeof entry.answer !== "string" || !entry.answer.trim() || entry.answer.trim().length > 500;
    })) {
      throw new Error("Invalid answer format: matches are required");
    }
    answerPayload = { matches: answer.matches as Json[] };
  } else {
    throw new Error(`Unsupported exercise type: ${exercise.type}`);
  }

  const {
    submissionId,
    isCorrect,
    lessonCompleted,
    nextLessonUnlockedId,
    attemptNumber,
  } = await submitExerciseRpc(exerciseId, answerPayload);

  let nextLesson = undefined;
  if (nextLessonUnlockedId) {
    nextLesson = {
      id: nextLessonUnlockedId,
      status: "unlocked" as const,
    };
  }

  const lessonProgress: LessonProgress = {
    lessonId: exercise.lessonId,
    status: lessonCompleted ? "completed" : "in_progress",
    completionPercentage: lessonCompleted ? 100 : 0, // Simplified percentage for now
  };

  return {
    submissionId,
    exerciseId,
    isCorrect,
    feedback: solutionData.explanation ?? "",
    attemptNumber,
    lessonProgress,
    nextLesson,
  };
}

