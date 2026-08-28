import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createGeneratedExerciseRecord: vi.fn(),
  fetchLessonContextForGeneration: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("../../repositories/ai-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../repositories/ai-repository")>();
  return {
    ...actual,
    createGeneratedExerciseRecord: mocks.createGeneratedExerciseRecord,
    fetchLessonContextForGeneration: mocks.fetchLessonContextForGeneration,
  };
});

import {
  ExerciseProviderDiagnosticError,
  type AIProvider,
} from "../../providers/ai-provider";
import { AiServiceError, generateExercise } from "../ai-service";

function serverClient(profile: { role: string; is_active: boolean } | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }),
      }),
    }),
  };
}

describe("Lesson-scoped AI exercise generation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 19, retryAfterSeconds: 0 });
  });

  it("rejects an inactive or non-privileged actor before reading Lesson context or calling AI", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(serverClient({ role: "learner", is_active: true }));
    const provider: AIProvider = {
      generateExplanation: vi.fn(),
      generateExercise: vi.fn(),
    };

    await expect(generateExercise({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiểu phép gán",
    }, provider)).rejects.toEqual(expect.objectContaining({ code: "FORBIDDEN" }) satisfies Partial<AiServiceError>);
    expect(mocks.fetchLessonContextForGeneration).not.toHaveBeenCalled();
    expect(provider.generateExercise).not.toHaveBeenCalled();
  });

  it("uses only the selected Lesson context and persists its lesson_id", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.createServerSupabaseClient.mockResolvedValue(serverClient({ role: "admin", is_active: true }));
    mocks.fetchLessonContextForGeneration.mockResolvedValue({
      lessonId: 51,
      lessonTitle: "Biến",
      lessonContent: "x = 1",
      learningObjectives: ["Hiểu phép gán"],
      courseTitle: "Python cơ bản",
      courseDescription: "Nhập môn Python",
    });
    mocks.createGeneratedExerciseRecord.mockResolvedValue({ id: 88, lessonId: 51 });
    const provider: AIProvider = {
      generateExplanation: vi.fn(),
      generateExercise: vi.fn().mockResolvedValue({
        content: {
          type: "predict_output",
          title: "Dự đoán",
          description: "Kết quả là gì?",
          codeSnippet: "x = 1\nprint(x)",
          options: ["1", "2"],
          correctAnswer: "1",
          explanation: "x nhận 1",
        },
        provider: "mock",
        model: null,
      }),
    };

    await generateExercise({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiểu phép gán",
    }, provider);

    expect(provider.generateExercise).toHaveBeenCalledWith(expect.objectContaining({
      lessonTitle: "Biến",
      lessonContent: "x = 1",
      lessonLearningObjectives: ["Hiểu phép gán"],
      courseTitle: "Python cơ bản",
      courseDescription: "Nhập môn Python",
    }));
    expect(mocks.createGeneratedExerciseRecord).toHaveBeenCalledWith(expect.objectContaining({
      lesson_id: 51,
    }));
    expect(infoSpy).toHaveBeenCalledWith("[exercise-generation-diagnostic]", {
      stage: "exercise_generation",
      event: "exercise_parse_complete",
    });
  });

  it("logs a precise safe field failure and preserves the public provider error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createServerSupabaseClient.mockResolvedValue(serverClient({ role: "admin", is_active: true }));
    mocks.fetchLessonContextForGeneration.mockResolvedValue({
      lessonId: 51,
      lessonTitle: "SECRET_LESSON",
      lessonContent: "SECRET_CONTENT",
      learningObjectives: ["SECRET_EVIDENCE"],
      courseTitle: "Python",
      courseDescription: null,
    });
    const provider: AIProvider = {
      generateExplanation: vi.fn(),
      generateExercise: vi.fn().mockResolvedValue({
        content: {
          type: "predict_output",
          title: "SECRET_QUESTION",
          description: "Description",
          codeSnippet: "print('safe')",
          options: ["SECRET_ANSWER_A", "SECRET_ANSWER_B"],
          correctAnswer: "SECRET_UNKNOWN_ANSWER",
          explanation: "SECRET_EXPLANATION",
        },
        provider: "mock",
        model: null,
      }),
    };

    await expect(generateExercise({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "SECRET_OBJECTIVE",
    }, provider)).rejects.toEqual(expect.objectContaining({
      code: "AI_PROVIDER_ERROR",
      message: "Invalid response from AI provider.",
    }) satisfies Partial<AiServiceError>);

    expect(errorSpy).toHaveBeenCalledWith("[exercise-generation-validation-failure]", expect.objectContaining({
      stage: "exercise_generation",
      validationCode: "ANSWER_NOT_IN_OPTIONS",
      fieldPath: "correctAnswer",
      optionCount: 2,
    }));
    expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(
      /SECRET_LESSON|SECRET_CONTENT|SECRET_EVIDENCE|SECRET_QUESTION|SECRET_ANSWER|SECRET_EXPLANATION|SECRET_OBJECTIVE/
    );
    expect(mocks.createGeneratedExerciseRecord).not.toHaveBeenCalled();
  });

  it("preserves the provider-failure message for transport diagnostics", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(serverClient({ role: "admin", is_active: true }));
    mocks.fetchLessonContextForGeneration.mockResolvedValue({
      lessonId: 51,
      lessonTitle: "Variables",
      lessonContent: "x = 1",
      learningObjectives: ["Understand assignment"],
      courseTitle: "Python",
      courseDescription: null,
    });
    const provider: AIProvider = {
      generateExplanation: vi.fn(),
      generateExercise: vi.fn().mockRejectedValue(
        new ExerciseProviderDiagnosticError("PROVIDER_TIMEOUT", "$http")
      ),
    };

    await expect(generateExercise({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Understand assignment",
    }, provider)).rejects.toEqual(expect.objectContaining({
      code: "AI_PROVIDER_ERROR",
      message: "Unable to generate exercise at this time.",
    }) satisfies Partial<AiServiceError>);
  });

  it("rate-limits an active privileged actor before reading Lesson context", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(serverClient({ role: "admin", is_active: true }));
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 42 });
    const provider: AIProvider = { generateExplanation: vi.fn(), generateExercise: vi.fn() };

    await expect(generateExercise({
      lessonId: 51,
      difficulty: "easy",
      learningObjective: "Hiểu phép gán",
    }, provider)).rejects.toEqual(expect.objectContaining({ code: "RATE_LIMITED" }) satisfies Partial<AiServiceError>);
    expect(mocks.fetchLessonContextForGeneration).not.toHaveBeenCalled();
    expect(provider.generateExercise).not.toHaveBeenCalled();
  });
});
