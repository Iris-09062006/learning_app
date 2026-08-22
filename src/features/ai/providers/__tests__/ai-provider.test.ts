import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAIProvider,
  MockAIProvider,
  OpenAIApiProvider,
} from "../ai-provider";
import type { SubmissionDetailsForAi } from "@/features/ai/types";

const mockSubmission: SubmissionDetailsForAi = {
  id: 1,
  userId: "user-1",
  exerciseId: 10,
  answer: { option: "A" },
  isCorrect: true,
  exerciseTitle: "Phép cộng cơ bản",
  exercisePrompt: "1 + 1 bằng bao nhiêu?",
  staticExplanation: "1 + 1 = 2",
};

describe("ai provider", () => {
  it("keeps both mock exercise types valid", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateExercise!({
      lessonTitle: "Hàm",
      lessonContent: "return",
      lessonLearningObjectives: ["Sửa hàm"],
      courseTitle: "Python cơ bản",
      courseDescription: null,
      exerciseType: "fix_the_bug",
      difficulty: "easy",
      learningObjective: "Sửa hàm",
      topicHint: null,
    });
    expect(result.content.options).toContain(result.content.correctAnswer);
  });

  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("createAIProvider", () => {
    it("returns MockAIProvider when AI_API_KEY is not set", () => {
      delete process.env.AI_API_KEY;
      const provider = createAIProvider();
      expect(provider).toBeInstanceOf(MockAIProvider);
    });

    it("returns OpenAIApiProvider when AI_API_KEY is set", () => {
      process.env.AI_API_KEY = "test-key";
      const provider = createAIProvider();
      expect(provider).toBeInstanceOf(OpenAIApiProvider);
    });
  });

  describe("MockAIProvider", () => {
    it("generates structured mock response", async () => {
      const provider = new MockAIProvider();
      const result = await provider.generateExplanation({
        submission: mockSubmission,
        question: "Vì sao đúng?",
      });

      expect(result.provider).toBe("mock");
      expect(result.explanation).toContain("Bài làm của bạn là chính xác.");
      expect(result.explanation).toContain("1 + 1 = 2");
      expect(result.explanation).toContain("Câu hỏi của bạn: Vì sao đúng?");
    });
  });

  describe("OpenAIApiProvider", () => {
    it("throws AI_PROVIDER_NOT_CONFIGURED if apiKey is empty", async () => {
      const provider = new OpenAIApiProvider("");
      await expect(
        provider.generateExplanation({
          submission: mockSubmission,
          question: null,
        })
      ).rejects.toThrow("AI_PROVIDER_NOT_CONFIGURED");
    });

    it("calls OpenAI endpoint and returns formatted explanation", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Giải thích từ OpenAI",
              },
            },
          ],
          model: "gpt-4o-mini",
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      const result = await provider.generateExplanation({
        submission: mockSubmission,
        question: null,
      });

      expect(result).toEqual({
        explanation: "Giải thích từ OpenAI",
        provider: "openai-compatible",
        model: "gpt-4o-mini",
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );
    });

    it("throws AI_PROVIDER_REQUEST_FAILED when HTTP fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      await expect(
        provider.generateExplanation({
          submission: mockSubmission,
          question: null,
        })
      ).rejects.toThrow("AI_PROVIDER_REQUEST_FAILED");
    });

    it("throws AI_RESPONSE_INVALID when message content is empty", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "" } }],
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      await expect(
        provider.generateExplanation({
          submission: mockSubmission,
          question: null,
        })
      ).rejects.toThrow("AI_RESPONSE_INVALID");
    });

    it("throws AI_RESPONSE_INVALID when generating exercise returns invalid JSON", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "không phải json" } }],
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      await expect(
        provider.generateExercise!({
          lessonTitle: "Biến",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          exerciseType: "predict_output",
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toThrow("AI_RESPONSE_INVALID");
    });

    it("aborts exercise generation after the provider timeout", async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, "fetch").mockImplementationOnce((_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
      );
      const provider = new OpenAIApiProvider("test-key");
      const pending = expect(provider.generateExercise!({
        lessonTitle: "Biến",
        lessonContent: "x = 1",
        lessonLearningObjectives: ["Hiểu biến"],
        courseTitle: "Python cơ bản",
        courseDescription: null,
        exerciseType: "predict_output",
        difficulty: "easy",
        learningObjective: "Hiểu biến",
        topicHint: null,
      })).rejects.toThrow("aborted");

      await vi.advanceTimersByTimeAsync(180_000);
      await pending;
      vi.useRealTimers();
    });

    it("throws AI_RESPONSE_INVALID when generating exercise is missing fields", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"title": "Test"}' } }],
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      await expect(
        provider.generateExercise!({
          lessonTitle: "Biến",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          exerciseType: "predict_output",
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toThrow("AI_RESPONSE_INVALID");
    });

    it("throws AI_RESPONSE_INVALID when correctAnswer is not in options", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Test",
                  description: "Desc",
                  codeSnippet: "",
                  options: ["A", "B", "C"],
                  correctAnswer: "D",
                  explanation: "Exp",
                }),
              },
            },
          ],
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      await expect(
        provider.generateExercise!({
          lessonTitle: "Biến",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          exerciseType: "predict_output",
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toThrow("AI_RESPONSE_INVALID");
    });

    it("generates exercise successfully", async () => {
      const mockResult = {
        title: "Khai báo biến let",
        description: "Từ khóa nào dùng để khai báo biến có thể thay đổi?",
        codeSnippet: "",
        options: ["let", "const", "var"],
        correctAnswer: "let",
        explanation: "Từ khóa let cho phép gán lại giá trị.",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResult),
              },
            },
          ],
          model: "gpt-4o-mini",
        }),
      } as Response);

      const provider = new OpenAIApiProvider("test-key");
      const result = await provider.generateExercise!({
        lessonTitle: "Biến",
        lessonContent: "Nội dung biến",
        lessonLearningObjectives: ["Hiểu biến"],
        courseTitle: "Python cơ bản",
        courseDescription: null,
        exerciseType: "predict_output",
        difficulty: "easy",
        learningObjective: "Hiểu khai báo let",
        topicHint: null,
      });

      expect(result.content).toEqual(mockResult);
      expect(result.provider).toBe("openai-compatible");
      const request = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)) as {
        response_format: unknown;
      };
      expect(JSON.stringify(request.response_format)).not.toMatch(
        /minLength|maxLength|minItems|maxItems|uniqueItems|minimum|maximum/
      );
    });
  });
});
