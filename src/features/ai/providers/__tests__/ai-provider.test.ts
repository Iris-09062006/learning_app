import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAIProvider,
  ExerciseProviderDiagnosticError,
  MockAIProvider,
  OpenAIApiProvider,
} from "../ai-provider";
import type { ExerciseGenerationProviderRequest } from "../ai-provider";
import type { SubmissionDetailsForAi } from "@/features/ai/types";
import { ExerciseValidationError } from "@/features/ai/validation/exercise-draft";

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

const exerciseRequest: ExerciseGenerationProviderRequest = {
  lessonTitle: "SECRET_LESSON_TITLE",
  lessonSummary: "SECRET_LESSON_SUMMARY",
  lessonContent: "SECRET_LESSON_CONTENT",
  lessonLearningObjectives: ["SECRET_EVIDENCE"],
  courseTitle: "Python",
  courseDescription: null,
  difficulty: "easy",
  learningObjective: "SECRET_OBJECTIVE",
  topicHint: null,
};

describe("ai provider", () => {
  it("allows a coding modality only when the Lesson requires code", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateExercise!({
      lessonTitle: "Hàm",
      lessonSummary: "Viết và sửa hàm Python",
      lessonContent: "return",
      lessonLearningObjectives: ["Sửa hàm"],
      courseTitle: "Python cơ bản",
      courseDescription: null,
      difficulty: "easy",
      learningObjective: "Sửa hàm",
      topicHint: null,
    });
    expect(result.content.type).toBe("predict_output");
    expect("options" in result.content && result.content.options).toContain("correctAnswer" in result.content ? result.content.correctAnswer : "");
  });

  it.each([
    ["Agile Manifesto", "Values and principles for teams", ["Apply Agile values"], "scenario", false],
    ["Professional Ethics", "Choose an ethical response at work", ["Evaluate professional conduct"], "scenario", false],
    ["Python loops", "Use Python for loops", ["Reason about loop output"], "predict_output", true],
    ["Database normalization", "Explain normal forms and dependencies", ["Apply normalization theory"], "multiple_choice", false],
  ] as const)("selects a subject-appropriate modality for %s", async (lessonTitle, lessonSummary, objectives, expectedType, expectsCode) => {
    const provider = new MockAIProvider();
    const result = await provider.generateExercise!({
      lessonTitle,
      lessonSummary,
      lessonContent: lessonSummary,
      lessonLearningObjectives: [...objectives],
      courseTitle: "Course",
      courseDescription: null,
      difficulty: "medium",
      learningObjective: objectives[0],
      topicHint: null,
    });
    expect(result.content.type).toBe(expectedType);
    expect("codeSnippet" in result.content).toBe(expectsCode);
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
          lessonSummary: "Biến Python",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toMatchObject({
        diagnosticCode: "INVALID_EXERCISE_JSON",
        fieldPath: "$",
      } satisfies Partial<ExerciseProviderDiagnosticError>);
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
        lessonSummary: "Biến Python",
        lessonContent: "x = 1",
        lessonLearningObjectives: ["Hiểu biến"],
        courseTitle: "Python cơ bản",
        courseDescription: null,
        difficulty: "easy",
        learningObjective: "Hiểu biến",
        topicHint: null,
      })).rejects.toMatchObject({ diagnosticCode: "PROVIDER_TIMEOUT" });

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
          lessonSummary: "Biến Python",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toMatchObject({
        validationCode: "INVALID_QUESTION_TYPE",
        fieldPath: "type",
      } satisfies Partial<ExerciseValidationError>);
    });

    it("throws AI_RESPONSE_INVALID when correctAnswer is not in options", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: "predict_output",
                  title: "Test",
                  description: "Desc",
                  codeSnippet: "print('A')",
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
          lessonSummary: "Biến Python",
          lessonContent: "Nội dung biến",
          lessonLearningObjectives: ["Hiểu biến"],
          courseTitle: "Python cơ bản",
          courseDescription: null,
          difficulty: "easy",
          learningObjective: "Hiểu biến",
          topicHint: null,
        })
      ).rejects.toMatchObject({
        validationCode: "ANSWER_NOT_IN_OPTIONS",
        fieldPath: "correctAnswer",
      } satisfies Partial<ExerciseValidationError>);
    });

    it.each([
      ["invalid root", [], "INVALID_PROVIDER_JSON_ENVELOPE", "$"],
      ["missing choices", {}, "MISSING_CHOICES", "choices"],
      ["missing message", { choices: [{}] }, "MISSING_MESSAGE", "choices[0].message"],
      ["missing content", { choices: [{ message: {} }] }, "MISSING_CONTENT", "choices[0].message.content"],
      ["non-string content", { choices: [{ message: { content: 42 } }] }, "CONTENT_NOT_STRING", "choices[0].message.content"],
    ])("distinguishes an envelope with %s", async (_label, envelope, diagnosticCode, fieldPath) => {
      vi.spyOn(console, "info").mockImplementation(() => undefined);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => envelope,
      } as Response);

      const provider = new OpenAIApiProvider("SECRET_API_KEY", "https://router.example/v1", "test-model");
      await expect(provider.generateExercise!(exerciseRequest)).rejects.toMatchObject({
        diagnosticCode,
        fieldPath,
      });
    });

    it("logs safe provider failure metadata without request or secret content", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("SECRET_TRANSPORT_DETAIL"));

      const provider = new OpenAIApiProvider("SECRET_API_KEY", "https://router.example/v1", "test-model");
      await expect(provider.generateExercise!(exerciseRequest)).rejects.toMatchObject({
        diagnosticCode: "PROVIDER_REQUEST_FAILED",
      });

      expect(errorSpy).toHaveBeenCalledWith("[exercise-generation-provider-failure]", expect.objectContaining({
        stage: "exercise_generation",
        upstreamStatus: null,
        providerHost: "router.example",
        timeout: false,
        errorCode: "PROVIDER_REQUEST_FAILED",
      }));
      expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(
        /SECRET_API_KEY|SECRET_TRANSPORT_DETAIL|SECRET_LESSON|SECRET_EVIDENCE|SECRET_OBJECTIVE/
      );
    });

    it("logs only safe response shape metadata for successful provider HTTP", async () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const generatedContent = {
        type: "predict_output",
        title: "SECRET_GENERATED_TITLE",
        description: "SECRET_GENERATED_DESCRIPTION",
        codeSnippet: "SECRET_GENERATED_CODE",
        options: ["SECRET_OPTION_A", "SECRET_OPTION_B"],
        correctAnswer: "SECRET_OPTION_A",
        explanation: "SECRET_GENERATED_EXPLANATION",
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(generatedContent) } }],
          model: "selected-model",
        }),
      } as Response);

      const provider = new OpenAIApiProvider("SECRET_API_KEY", "https://router.example/v1", "request-model");
      await provider.generateExercise!(exerciseRequest);

      expect(infoSpy).toHaveBeenCalledWith("[exercise-generation-provider-response]", {
        stage: "exercise_generation",
        httpStatus: 200,
        httpContentType: "application/json",
        providerModel: "selected-model",
        choiceCount: 1,
        contentType: "string",
        contentLength: JSON.stringify(generatedContent).length,
      });
      expect(JSON.stringify(infoSpy.mock.calls)).not.toMatch(
        /SECRET_API_KEY|SECRET_LESSON|SECRET_EVIDENCE|SECRET_OBJECTIVE|SECRET_GENERATED/
      );
    });

    it("generates exercise successfully", async () => {
      const mockResult = {
        type: "multiple_choice",
        title: "Khai báo biến let",
        description: "Từ khóa nào dùng để khai báo biến có thể thay đổi?",
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
        lessonSummary: "Biến JavaScript",
        lessonContent: "Nội dung biến",
        lessonLearningObjectives: ["Hiểu biến"],
        courseTitle: "Python cơ bản",
        courseDescription: null,
        difficulty: "easy",
        learningObjective: "Hiểu khai báo let",
        topicHint: null,
      });

      expect(result.content).toEqual(mockResult);
      expect(result.provider).toBe("openai-compatible");
      const request = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)) as {
        model: string;
        stream: boolean;
        response_format: unknown;
        messages: Array<{ role: string; content: string }>;
      };
      expect(request.stream).toBe(false);
      expect(request.model).toBe("gpt-4o-mini");
      expect(request.response_format).toEqual({
        type: "json_schema",
        json_schema: expect.objectContaining({
          name: "lesson_exercise_draft",
          strict: true,
          schema: expect.objectContaining({
            oneOf: expect.any(Array),
          }),
        }),
      });
      expect(request.messages[0].content).toContain("Choose the Exercise format based on what the learner is supposed to understand or do.");
      expect(request.messages[0].content).toContain("Do not generate a programming/code Exercise unless the Lesson itself requires programming or code reasoning.");
      expect(request.messages[0].content).toContain("không bọc danh sách, khái niệm");
      expect(request.messages[1].content).toContain("Tóm tắt bài học: Biến JavaScript");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer test-key",
          },
        })
      );
      expect(JSON.stringify(request.response_format)).not.toMatch(
        /minLength|maxLength|minItems|maxItems|uniqueItems|minimum|maximum/
      );
    });
  });
});
