import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAiExplanationRecord,
  fetchAiExplanationHistory,
  fetchSubmissionDetailsForAi,
} from "../../repositories/ai-repository";
import { AiServiceError, getAiExplanationHistory, requestAiExplanation } from "../ai-service";
import type { AIProvider } from "../../providers/ai-provider";

vi.mock("../../repositories/ai-repository", () => ({
  createAiExplanationRecord: vi.fn(),
  fetchAiExplanationHistory: vi.fn(),
  fetchSubmissionDetailsForAi: vi.fn(),
}));

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestAiExplanation", () => {
    it("throws NOT_FOUND if submission is null", async () => {
      vi.mocked(fetchSubmissionDetailsForAi).mockResolvedValueOnce(null);

      await expect(
        requestAiExplanation({ submissionId: 1 })
      ).rejects.toThrowError(new AiServiceError("NOT_FOUND", "Submission not found."));
    });

    it("propagates repository UNAUTHENTICATED error", async () => {
      vi.mocked(fetchSubmissionDetailsForAi).mockRejectedValueOnce(
        new Error("UNAUTHENTICATED")
      );

      await expect(
        requestAiExplanation({ submissionId: 1 })
      ).rejects.toThrowError(
        new AiServiceError("UNAUTHENTICATED", "Authentication is required.")
      );
    });

    it("creates explanation record successfully", async () => {
      const mockSubmission = {
        id: 1,
        userId: "user-1",
        exerciseId: 10,
        answer: { opt: 2 },
        isCorrect: true,
        exerciseTitle: "Test",
        exercisePrompt: "Prompt",
        staticExplanation: null,
      };

      vi.mocked(fetchSubmissionDetailsForAi).mockResolvedValueOnce(mockSubmission);

      const mockProvider: AIProvider = {
        generateExplanation: vi.fn().mockResolvedValueOnce({
          explanation: "You did great!",
          provider: "mock",
          model: null,
        }),
      };

      const expectedRecord = {
        id: 100,
        submissionId: 1,
        userQuestion: "Hello",
        response: "You did great!",
        provider: "mock",
        model: null,
        status: "success" as const,
        errorCode: null,
        createdAt: "2026-08-01T00:00:00Z",
      };

      vi.mocked(createAiExplanationRecord).mockResolvedValueOnce(expectedRecord);

      const result = await requestAiExplanation(
        { submissionId: 1, userQuestion: "Hello" },
        mockProvider
      );

      expect(result).toEqual(expectedRecord);
      expect(mockProvider.generateExplanation).toHaveBeenCalledWith({
        submission: mockSubmission,
        question: "Hello",
      });
      expect(createAiExplanationRecord).toHaveBeenCalledWith({
        submission_id: 1,
        user_question: "Hello",
        response: "You did great!",
        provider: "mock",
        model: null,
        status: "success",
        error_code: null,
      });
    });

    it("creates failed record when provider throws AI_RESPONSE_INVALID", async () => {
      const mockSubmission = {
        id: 1,
        userId: "user-1",
        exerciseId: 10,
        answer: { opt: 2 },
        isCorrect: true,
        exerciseTitle: "Test",
        exercisePrompt: "Prompt",
        staticExplanation: null,
      };

      vi.mocked(fetchSubmissionDetailsForAi).mockResolvedValueOnce(mockSubmission);

      const mockProvider: AIProvider = {
        generateExplanation: vi.fn().mockRejectedValueOnce(new Error("AI_RESPONSE_INVALID")),
      };

      await expect(
        requestAiExplanation({ submissionId: 1 }, mockProvider)
      ).rejects.toThrowError(
        new AiServiceError("AI_PROVIDER_ERROR", "Unable to generate an explanation at this time.")
      );

      expect(createAiExplanationRecord).toHaveBeenCalledWith({
        submission_id: 1,
        user_question: null,
        response: null,
        provider: "unknown",
        model: null,
        status: "failed",
        error_code: "AI_RESPONSE_INVALID",
      });
    });
  });

  describe("getAiExplanationHistory", () => {
    it("returns explanation history", async () => {
      const mockHistory = [
        {
          id: 1,
          submissionId: 1,
          userQuestion: null,
          response: "Test response",
          provider: "mock",
          model: null,
          status: "success" as const,
          errorCode: null,
          createdAt: "2026-08-01T00:00:00Z",
        },
      ];
      vi.mocked(fetchAiExplanationHistory).mockResolvedValueOnce(mockHistory);

      const result = await getAiExplanationHistory(1);
      expect(result).toEqual(mockHistory);
    });

    it("propagates repository UNAUTHENTICATED error", async () => {
      vi.mocked(fetchAiExplanationHistory).mockRejectedValueOnce(
        new Error("UNAUTHENTICATED")
      );

      await expect(getAiExplanationHistory(1)).rejects.toThrowError(
        new AiServiceError("UNAUTHENTICATED", "Authentication is required.")
      );
    });
  });
});