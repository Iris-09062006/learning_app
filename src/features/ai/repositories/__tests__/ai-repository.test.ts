import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAiExplanationRecord,
  fetchAiExplanationBySubmissionId,
  fetchAiExplanationHistory,
  fetchSubmissionDetailsForAi,
} from "../ai-repository";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
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

  describe("fetchAiExplanationBySubmissionId", () => {
    it("returns null if not found", async () => {
      const notFound = createBuilder({ data: null, error: { message: "Not found" } });
      mockFrom.mockReturnValueOnce(notFound);

      const result = await fetchAiExplanationBySubmissionId(1);
      expect(result).toBeNull();
    });
  });
});