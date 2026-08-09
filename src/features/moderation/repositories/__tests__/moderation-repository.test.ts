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
        exercise_type: "quiz",
        difficulty: "beginner",
        title: "Test",
        content: { type: "quiz", questions: [] },
        status: "pending",
        provider: "openai",
        model: "gpt-4",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: { title: "Test Lesson" },
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      };
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectMock),
      });

      const result = await repository.getQueueItemById(
        mockClient as unknown as SupabaseClient<Database>,
        1
      );
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.lessonTitle).toBe("Test Lesson");
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
    it("should insert review and update exercise", async () => {
      const mockInput = {
        generatedExerciseId: 1,
        status: "approved" as const,
        feedback: "Good job",
        editedTitle: "Updated Title",
      };

      const insertMock = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              generated_exercise_id: 1,
              reviewer_id: "user-1",
              status: "approved",
              comment: "Good job",
              reviewed_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      };

      const updateMock = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockClient.from.mockImplementation((table) => {
        if (table === "exercise_reviews") {
          return { insert: vi.fn().mockReturnValue(insertMock) };
        }
        if (table === "generated_exercises") {
          return { update: vi.fn().mockReturnValue(updateMock) };
        }
        return {};
      });

      const result = await repository.createReview(
        mockClient as unknown as SupabaseClient<Database>,
        "user-1",
        mockInput
      );
      expect(result.id).toBe(1);
      expect(result.status).toBe("approved");
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