import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import { ModerationRepository } from "../moderation-repository";

describe("ModerationRepository", () => {
  let repository: ModerationRepository;
  const mockClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ModerationRepository();
  });

  describe("getQueueItemById", () => {
    it("should fetch queue item successfully", async () => {
      const mockData = {
        id: 1,
        lesson_id: 1,
        exercise_type: "predict_output",
        difficulty: "easy",
        title: "Test",
        description: "Description",
        content: { title: "Test", description: "Description", codeSnippet: "print(1)", options: ["1", "2"], correctAnswer: "1", explanation: "Because" },
        status: "pending",
        provider: "openai",
        model: "gpt-4",
        requested_by: "user-1",
        published_exercise_id: null,
        published_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: { title: "Test Lesson" },
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      };
      const reviewOrder = vi.fn().mockResolvedValue({
        data: [{ id: 3, generated_exercise_id: 1, reviewer_id: "user-1", status: "approved", comment: "Good", reviewed_at: "2026-08-10T00:00:00Z" }],
        error: null,
      });
      mockClient.from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectMock) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: reviewOrder }) }) });

      const result = await repository.getQueueItemById(
        mockClient as unknown as SupabaseClient<Database>,
        1
      );
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.lessonTitle).toBe("Test Lesson");
      expect(result?.reviews).toHaveLength(1);
    });

    it("should return null when not found", async () => {
      const selectMock = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectMock),
      });

      const result = await repository.getQueueItemById(
        mockClient as unknown as SupabaseClient<Database>,
        1
      );
      expect(result).toBeNull();
    });
  });

  describe("listQueueItems", () => {
    it("should list queue items with default parameters", async () => {
      const mockData = [
        {
          id: 1,
          lesson_id: 1,
          exercise_type: "quiz",
          difficulty: "beginner",
          title: "Test",
          content: { type: "quiz", questions: [] },
          status: "pending",
          provider: "openai",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lessons: { title: "Test Lesson" },
        },
      ];

      const rangeMock = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
        count: 1,
      });

      const orderMock = { range: rangeMock };
      
      const queryMock = {
        order: vi.fn().mockReturnValue(orderMock),
      };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue(queryMock),
      });

      const result = await repository.listQueueItems(
        mockClient as unknown as SupabaseClient<Database>,
        {}
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(rangeMock).toHaveBeenCalledWith(0, 19); // default limit 20 (0-19)
    });

    it("should apply filters correctly", async () => {
      const rangeMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const orderMock = { range: rangeMock };
      const eqLessonIdMock = { order: vi.fn().mockReturnValue(orderMock) };
      const eqStatusMock = { eq: vi.fn().mockReturnValue(eqLessonIdMock) };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(eqStatusMock),
        }),
      });

      await repository.listQueueItems(
        mockClient as unknown as SupabaseClient<Database>,
        {
          status: "pending",
          lessonId: 1,
          limit: 10,
          offset: 10,
        }
      );

      expect(rangeMock).toHaveBeenCalledWith(10, 19);
    });
  });

  describe("createReview", () => {
    it("should review and edit exercise atomically through RPC", async () => {
      const mockInput = {
        generatedExerciseId: 1,
        status: "approved" as const,
        feedback: "Good job",
        editedDraft: {
          title: "Updated Title",
          description: "Updated description",
          exerciseType: "predict_output" as const,
          difficulty: "easy" as const,
          content: { type: "predict_output" as const, title: "Updated Title", description: "Updated description", codeSnippet: "print(1)", options: ["1", "2"], correctAnswer: "1", explanation: "Because" },
        },
      };
      mockClient.rpc.mockResolvedValue({
        data: { id: 1, generatedExerciseId: 1, reviewerId: "user-1", status: "approved", feedback: "Good job", createdAt: "2026-08-10T00:00:00Z" },
        error: null,
      });

      const result = await repository.createReview(
        mockClient as unknown as SupabaseClient<Database>,
        "user-1",
        mockInput
      );
      expect(result.id).toBe(1);
      expect(result.status).toBe("approved");
      expect(mockClient.rpc).toHaveBeenCalledWith("review_generated_exercise_draft", {
        p_generated_exercise_id: 1,
        p_decision: "approved",
        p_comment: "Good job",
        p_edited_draft: mockInput.editedDraft,
      });
    });
  });

  describe("publishExercise", () => {
    it("should call RPC to publish", async () => {
      mockClient.rpc.mockResolvedValue({
        data: {
          generatedExerciseId: 1,
          publishedExerciseId: 2,
          status: "published",
          publishedAt: new Date().toISOString(),
        },
        error: null,
      });

      const result = await repository.publishExercise(
        mockClient as unknown as SupabaseClient<Database>,
        1
      );
      expect(result.generatedExerciseId).toBe(1);
      expect(result.publishedExerciseId).toBe(2);
      expect(result.status).toBe("published");
      expect(mockClient.rpc).toHaveBeenCalledWith("publish_generated_exercise", {
        p_generated_exercise_id: 1,
      });
    });

    it("should throw error on RPC failure", async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      await expect(
        repository.publishExercise(
          mockClient as unknown as SupabaseClient<Database>,
          1
        )
      ).rejects.toThrow("Failed to publish generated exercise");
    });
  });
});
