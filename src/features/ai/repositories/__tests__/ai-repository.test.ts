import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAiExplanationRecord,
  createGeneratedExerciseRecord,
  fetchAiExplanationBySubmissionId,
  fetchAiExplanationHistory,
  fetchSubmissionDetailsForAi,
} from "../ai-repository";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

function createBuilder(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.single.mockResolvedValue(result);
  builder.maybeSingle.mockResolvedValue(result);
  builder.insert.mockReturnValue(builder);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve);

  return builder;
}

describe("ai repository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("fetchSubmissionDetailsForAi", () => {
    it("throws UNAUTHENTICATED if user is not logged in", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(fetchSubmissionDetailsForAi(1)).rejects.toThrow("UNAUTHENTICATED");
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("throws FORBIDDEN if user is not the owner of the submission", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const submission = createBuilder({ data: { user_id: "user-2" }, error: null });
      mockFrom.mockReturnValueOnce(submission);

      await expect(fetchSubmissionDetailsForAi(1)).rejects.toThrow("FORBIDDEN");
    });

    it("returns null if submission does not exist", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const submission = createBuilder({ data: null, error: { message: "Not found" } });
      mockFrom.mockReturnValueOnce(submission);

      const result = await fetchSubmissionDetailsForAi(1);
      expect(result).toBeNull();
    });

    it("returns aggregated submission details", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const submission = createBuilder({
        data: {
          id: 1,
          user_id: "user-1",
          exercise_id: 10,
          answer: { opt: 2 },
          is_correct: true,
        },
        error: null,
      });
      const exercise = createBuilder({
        data: { title: "Test Exercise", description: "Prompt" },
        error: null,
      });
      const solution = createBuilder({
        data: { static_explanation: "Because X" },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(submission)
        .mockReturnValueOnce(exercise)
        .mockReturnValueOnce(solution);

      const result = await fetchSubmissionDetailsForAi(1);

      expect(result).toEqual({
        id: 1,
        userId: "user-1",
        exerciseId: 10,
        answer: { opt: 2 },
        isCorrect: true,
        exerciseTitle: "Test Exercise",
        exercisePrompt: "Prompt",
        staticExplanation: "Because X",
      });
    });
  });

  describe("fetchAiExplanationHistory", () => {
    it("returns explanation history for authorized owner", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const submission = createBuilder({ data: { user_id: "user-1" }, error: null });
      const explanations = createBuilder({
        data: [
          {
            id: 1,
            submission_id: 1,
            user_question: "Why?",
            response: "Because",
            provider: "mock",
            model: null,
            status: "success",
            error_code: null,
            created_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValueOnce(submission).mockReturnValueOnce(explanations);

      const result = await fetchAiExplanationHistory(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        submissionId: 1,
        userQuestion: "Why?",
        response: "Because",
        provider: "mock",
        model: null,
        status: "success",
        errorCode: null,
        createdAt: "2026-08-01T00:00:00Z",
      });
    });
  });

  describe("createAiExplanationRecord", () => {
    it("inserts a new explanation and returns mapped record", async () => {
      const inserted = createBuilder({
        data: {
          id: 2,
          submission_id: 1,
          user_question: null,
          response: "It is correct",
          provider: "rest",
          model: "gpt-4o",
          status: "success",
          error_code: null,
          created_at: "2026-08-01T00:00:00Z",
        },
        error: null,
      });
      mockFrom.mockReturnValueOnce(inserted);

      const result = await createAiExplanationRecord({
        submission_id: 1,
        user_question: null,
        response: "It is correct",
        provider: "rest",
        model: "gpt-4o",
        status: "success",
        error_code: null,
      });

      expect(result.id).toBe(2);
      expect(result.provider).toBe("rest");
    });
  });

  describe("createGeneratedExerciseRecord", () => {
    const payload = {
      lesson_id: 51,
      exercise_type: "predict_output" as const,
      difficulty: "easy" as const,
      content: {
        type: "predict_output" as const,
        title: "SECRET_TITLE",
        description: "SECRET_DESCRIPTION",
        codeSnippet: "SECRET_CODE",
        options: ["SECRET_OPTION_A", "SECRET_OPTION_B"],
        correctAnswer: "SECRET_OPTION_A",
        explanation: "SECRET_EXPLANATION",
      },
      provider: "openai-compatible",
      model: "test-model",
    };

    const expectedDiagnosticContext = {
      stage: "exercise_persistence",
      supabaseProjectHost: "project.supabase.co",
      rpcName: "create_generated_exercise_draft",
      exerciseType: "predict_output",
      difficulty: "easy",
      rpcArgumentPresence: {
        p_lesson_id: "yes",
        p_exercise_type: "yes",
        p_difficulty: "yes",
        p_content: "yes",
        p_provider: "yes",
        p_model: "yes",
      },
    };

    it("logs persistence start and success without Exercise content", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      mockRpc.mockResolvedValue({ data: { id: 88 }, error: null });

      await createGeneratedExerciseRecord(payload);

      expect(infoSpy).toHaveBeenNthCalledWith(1, "[exercise-generation-diagnostic]", {
        ...expectedDiagnosticContext,
        event: "exercise_persistence_started",
      });
      expect(infoSpy).toHaveBeenNthCalledWith(2, "[exercise-generation-diagnostic]", {
        ...expectedDiagnosticContext,
        event: "exercise_persistence_success",
      });
      expect(JSON.stringify(infoSpy.mock.calls)).not.toMatch(/SECRET_/);
    });

    it("logs only safe Supabase metadata on persistence failure", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/path?key=SECRET_URL_VALUE");
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "safe message", details: "safe details", hint: "safe hint", status: 400 },
      });

      await expect(createGeneratedExerciseRecord(payload)).rejects.toThrow("DATABASE_ERROR");

      expect(errorSpy).toHaveBeenCalledWith("[exercise-generation-diagnostic]", {
        ...expectedDiagnosticContext,
        event: "exercise_persistence_failure",
        dbErrorCode: "P0001",
        dbErrorMessage: "safe message",
        dbErrorDetails: "safe details",
        dbErrorHint: "safe hint",
        httpStatus: 400,
      });
      expect(JSON.stringify([...infoSpy.mock.calls, ...errorSpy.mock.calls])).not.toMatch(/SECRET_(TITLE|DESCRIPTION|CODE|OPTION|EXPLANATION|URL)/);
    });
  });

  describe("fetchAiExplanationBySubmissionId", () => {
    it("returns null if not found", async () => {
      const notFound = createBuilder({ data: null, error: { message: "Not found" } });
      mockFrom.mockReturnValueOnce(notFound);

      const result = await fetchAiExplanationBySubmissionId(1);
      expect(result).toBeNull();
    });
  });
});
