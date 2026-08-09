import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitExercise } from "../exercise-service";
import * as repository from "../../repositories/exercise-repository";

vi.mock("../../repositories/exercise-repository", () => ({
  fetchExerciseForSubmission: vi.fn(),
  fetchExerciseSolutionAdmin: vi.fn(),
  submitExerciseRpc: vi.fn(),
}));

describe("exercise-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitExercise", () => {
    it("throws error if exercise not found", async () => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue(null);

      await expect(
        submitExercise(1, { answer: { selectedOptionId: 10 } })
      ).rejects.toThrow("Exercise not found");
    });

    it("throws error if exercise is not published", async () => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue({
        id: 1,
        lessonId: 10,
        type: "predict_output",
        isRequired: true,
        isPublished: false,
        courseId: 100,
      });

      await expect(
        submitExercise(1, { answer: { selectedOptionId: 10 } })
      ).rejects.toThrow("Exercise is not published");
    });

    it("throws error if solution is not found", async () => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue({
        id: 1,
        lessonId: 10,
        type: "predict_output",
        isRequired: true,
        isPublished: true,
        courseId: 100,
      });
      vi.mocked(repository.fetchExerciseSolutionAdmin).mockResolvedValue(null);

      await expect(
        submitExercise(1, { answer: { selectedOptionId: 10 } })
      ).rejects.toThrow("Solution not found");
    });

    it("throws error for invalid answer format", async () => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue({
        id: 1,
        lessonId: 10,
        type: "predict_output",
        isRequired: true,
        isPublished: true,
        courseId: 100,
      });
      vi.mocked(repository.fetchExerciseSolutionAdmin).mockResolvedValue({
        solution: { correctOptionId: 10 },
        explanation: "Good job",
      });

      await expect(
        submitExercise(1, { answer: {} as unknown as { selectedOptionId: number } })
      ).rejects.toThrow("Invalid answer format: selectedOptionId is required");
    });

    it("calls submitExerciseRpc and formats response properly when correct", async () => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue({
        id: 1,
        lessonId: 10,
        type: "predict_output",
        isRequired: true,
        isPublished: true,
        courseId: 100,
      });
      vi.mocked(repository.fetchExerciseSolutionAdmin).mockResolvedValue({
        solution: { correctOptionId: 10 },
        explanation: "Correct answer details",
      });
      vi.mocked(repository.submitExerciseRpc).mockResolvedValue({
        submissionId: 99,
        isCorrect: true,
        score: 100,
        lessonCompleted: true,
        nextLessonUnlockedId: 11,
        attemptNumber: 1,
      });

      const result = await submitExercise(1, { answer: { selectedOptionId: 10 } });

      expect(repository.submitExerciseRpc).toHaveBeenCalledWith(1, {
        selectedOptionId: 10,
      });
      expect(result).toEqual({
        submissionId: 99,
        exerciseId: 1,
        isCorrect: true,
        feedback: "Correct answer details",
        attemptNumber: 1,
        lessonProgress: {
          lessonId: 10,
          status: "completed",
          completionPercentage: 100,
        },
        nextLesson: {
          id: 11,
          status: "unlocked",
        },
      });
    });
  });
});