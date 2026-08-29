import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExerciseReviewSubmission, submitExercise } from "../exercise-service";
import * as repository from "../../repositories/exercise-repository";

vi.mock("../../repositories/exercise-repository", () => ({
  fetchExerciseForSubmission: vi.fn(),
  fetchLatestCorrectSubmission: vi.fn(),
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

    it.each([
      ["short_answer" as const, { answerText: "Agile values" }, { answerText: "Agile values" }],
      ["ordering" as const, { orderedOptionIds: [2, 1] }, { orderedOptionIds: [2, 1] }],
      ["matching" as const, { matches: [{ optionId: 1, answer: "A" }, { optionId: 2, answer: "B" }] }, { matches: [{ optionId: 1, answer: "A" }, { optionId: 2, answer: "B" }] }],
    ])("validates and forwards a %s answer to the authoritative RPC", async (type, answer, expected) => {
      vi.mocked(repository.fetchExerciseForSubmission).mockResolvedValue({
        id: 7, lessonId: 10, type, isRequired: true, isPublished: true, courseId: 100,
      });
      vi.mocked(repository.fetchExerciseSolutionAdmin).mockResolvedValue({ solution: {}, explanation: "Feedback" });
      vi.mocked(repository.submitExerciseRpc).mockResolvedValue({
        submissionId: 1, isCorrect: true, score: 100, lessonCompleted: false, nextLessonUnlockedId: null, attemptNumber: 1,
      });
      await submitExercise(7, { answer });
      expect(repository.submitExerciseRpc).toHaveBeenCalledWith(7, expected);
    });
  });

  describe("getExerciseReviewSubmission", () => {
    it("returns the latest learner-owned correct answer with static feedback", async () => {
      vi.mocked(repository.fetchLatestCorrectSubmission).mockResolvedValue({
        id: 18,
        exerciseId: 7,
        answer: { selectedOptionId: 22 },
        isCorrect: true,
        attemptNumber: 4,
        submittedAt: "2026-08-29T01:00:00.000Z",
      });
      vi.mocked(repository.fetchExerciseSolutionAdmin).mockResolvedValue({
        solution: { correctOptionId: 22 },
        explanation: "Persisted feedback",
      });

      await expect(getExerciseReviewSubmission(7)).resolves.toEqual({
        id: 18,
        exerciseId: 7,
        answer: { selectedOptionId: 22 },
        isCorrect: true,
        attemptNumber: 4,
        submittedAt: "2026-08-29T01:00:00.000Z",
        feedback: "Persisted feedback",
      });
    });

    it("does not read privileged solution data without an owned successful submission", async () => {
      vi.mocked(repository.fetchLatestCorrectSubmission).mockResolvedValue(null);

      await expect(getExerciseReviewSubmission(7)).resolves.toBeNull();
      expect(repository.fetchExerciseSolutionAdmin).not.toHaveBeenCalled();
    });
  });
});
