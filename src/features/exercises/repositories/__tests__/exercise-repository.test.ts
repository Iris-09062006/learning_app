import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  fetchExerciseForSubmission,
  submitExerciseRpc,
} from "../exercise-repository";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

const mockQueryBuilder = {
  select: mockSelect,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(),
}));

mockSelect.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);

vi.mock("@/lib/supabase/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/server")>();

  return {
    ...actual,
    createServerSupabaseClient: vi.fn(),
  };
});

describe("exercise repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(mockQueryBuilder);
    mockEq.mockReturnValue(mockQueryBuilder);
    mockFrom.mockReturnValue(mockQueryBuilder);
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      rpc: mockRpc,
    } as never);
  });

  describe("fetchExerciseForSubmission", () => {
    it("returns null when the exercise does not exist", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(fetchExerciseForSubmission(1)).resolves.toBeNull();
    });

    it("maps exercise metadata and its course id", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: 1,
          lesson_id: 10,
          exercise_type: "predict_output",
          is_required: true,
          is_published: true,
          lessons: { chapters: { course_id: 100 } },
        },
        error: null,
      });

      await expect(fetchExerciseForSubmission(1)).resolves.toEqual({
        id: 1,
        lessonId: 10,
        type: "predict_output",
        isRequired: true,
        isPublished: true,
        courseId: 100,
      });
    });

    it("returns null when the exercise has no associated course", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: 1,
          lesson_id: 10,
          exercise_type: "predict_output",
          is_required: true,
          is_published: true,
          lessons: { chapters: null },
        },
        error: null,
      });

      await expect(fetchExerciseForSubmission(1)).resolves.toBeNull();
    });
  });

  describe("submitExerciseRpc", () => {
    it("throws UNAUTHENTICATED before invoking the RPC", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      await expect(
        submitExerciseRpc(1, { selectedOptionId: 101 }),
      ).rejects.toThrow("UNAUTHENTICATED");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("submits the answer atomically and returns the attempt number", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });
      mockRpc.mockResolvedValueOnce({
        data: {
          submission_id: 88,
          is_correct: true,
          score: 100,
          lesson_completed: true,
          next_lesson_unlocked_id: 12,
        },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { attempt_number: 2 },
        error: null,
      });

      await expect(
        submitExerciseRpc(1, { selectedOptionId: 101 }),
      ).resolves.toEqual({
        submissionId: 88,
        isCorrect: true,
        score: 100,
        lessonCompleted: true,
        nextLessonUnlockedId: 12,
        attemptNumber: 2,
      });
      expect(mockRpc).toHaveBeenCalledWith("submit_exercise", {
        p_exercise_id: 1,
        p_answer: { selectedOptionId: 101 },
      });
      expect(mockFrom).toHaveBeenCalledWith("submissions");
    });

    it("surfaces an RPC error", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "RPC error" },
      });

      await expect(
        submitExerciseRpc(1, { selectedOptionId: 101 }),
      ).rejects.toThrow("Failed to submit exercise: RPC error");
    });
  });
});