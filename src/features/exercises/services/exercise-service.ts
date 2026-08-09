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

  if (
    exercise.type === "predict_output" ||
    exercise.type === "fix_the_bug"
  ) {
    if (
      !("selectedOptionId" in request.answer) ||
      typeof request.answer.selectedOptionId !== "number"
    ) {
      throw new Error("Invalid answer format: selectedOptionId is required");
    }
  } else {
    throw new Error(`Unsupported exercise type: ${exercise.type}`);
  }

  const answerPayload: { [key: string]: number } = {
    selectedOptionId: request.answer.selectedOptionId,
  };

  const {
    submissionId,
    isCorrect,
    lessonCompleted,
    nextLessonUnlockedId,
    attemptNumber,
  } = await submitExerciseRpc(exerciseId, answerPayload as unknown as Json);

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
