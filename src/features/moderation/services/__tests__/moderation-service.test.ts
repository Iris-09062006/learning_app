import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import { ModerationService } from "../moderation-service";
import type { ModerationRepository } from "../../repositories/moderation-repository";

describe("ModerationService", () => {
  let service: ModerationService;
  const mockClient = {} as unknown as SupabaseClient<Database>;
  const mockListQueueItems = vi.fn();
  const mockGetQueueItemById = vi.fn();
  const mockCreateReview = vi.fn();
  const mockPublishExercise = vi.fn();

  beforeEach(() => {
    mockListQueueItems.mockReset();
    mockGetQueueItemById.mockReset();
    mockCreateReview.mockReset();
    mockPublishExercise.mockReset();

    const mockRepository: Partial<ModerationRepository> = {
      listQueueItems: mockListQueueItems,
      getQueueItemById: mockGetQueueItemById,
      createReview: mockCreateReview,
      publishExercise: mockPublishExercise,
    };
    service = new ModerationService(mockRepository as ModerationRepository);
  });

  describe("listQueueItems", () => {
    it("should clamp limit and offset correctly", async () => {
      mockListQueueItems.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await service.listQueueItems(mockClient, {
        limit: 150,
        offset: -5,
      });
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(mockListQueueItems).toHaveBeenCalledWith(mockClient, {
        limit: 100,
        offset: 0,
      });
    });
  });

  describe("getQueueItemDetails", () => {
    it("should return item details if found", async () => {
      const mockItem = { id: 1, title: "Test Item" };
      mockGetQueueItemById.mockResolvedValue(mockItem);

      const item = await service.getQueueItemDetails(mockClient, 1);
      expect(item).toEqual(mockItem);
    });

    it("should throw error if item not found", async () => {
      mockGetQueueItemById.mockResolvedValue(null);

      await expect(service.getQueueItemDetails(mockClient, 999)).rejects.toThrow(
        "Generated exercise with ID 999 not found"
      );
    });
  });

  describe("submitReview", () => {
    it("should validate required fields", async () => {
      await expect(
        service.submitReview(mockClient, "user-1", {
          generatedExerciseId: 0,
          status: "approved",
        })
      ).rejects.toThrow("generatedExerciseId is required");
    });

    it("should throw error if exercise is published", async () => {
      mockGetQueueItemById.mockResolvedValue({
        id: 1,
        status: "published",
      });

      await expect(
        service.submitReview(mockClient, "user-1", {
          generatedExerciseId: 1,
          status: "approved",
        })
      ).rejects.toThrow("Cannot review a published exercise");
    });

    it("should submit review successfully", async () => {
      mockGetQueueItemById.mockResolvedValue({
        id: 1,
        status: "pending",
      });
      mockCreateReview.mockResolvedValue({
        id: 10,
        status: "approved",
      });

      const result = await service.submitReview(mockClient, "user-1", {
        generatedExerciseId: 1,
        status: "approved",
      });

      expect(result.id).toBe(10);
    });
  });

  describe("publishExercise", () => {
    it("should throw error if exercise is not approved", async () => {
      mockGetQueueItemById.mockResolvedValue({
        id: 1,
        status: "pending",
      });

      await expect(service.publishExercise(mockClient, 1)).rejects.toThrow(
        "Only approved exercises can be published"
      );
    });

    it("should publish exercise if approved", async () => {
      mockGetQueueItemById.mockResolvedValue({
        id: 1,
        status: "approved",
      });
      mockPublishExercise.mockResolvedValue({
        generatedExerciseId: 1,
        publishedExerciseId: 5,
        status: "published",
        publishedAt: new Date().toISOString(),
      });

      const result = await service.publishExercise(mockClient, 1);
      expect(result.publishedExerciseId).toBe(5);
    });
  });
});