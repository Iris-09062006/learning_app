import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import { ModerationRepository } from "../repositories/moderation-repository";
import type {
  ExerciseReviewRecord,
  ModerationQueueFilter,
  ModerationQueueItem,
  ModerationQueueResult,
  PublishResult,
  SubmitReviewInput,
} from "../types";

export class ModerationService {
  constructor(
    private readonly repository: ModerationRepository = new ModerationRepository()
  ) {}

  async listQueueItems(
    client: SupabaseClient<Database>,
    filter: ModerationQueueFilter = {}
  ): Promise<ModerationQueueResult> {
    const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);

    const { items, total } = await this.repository.listQueueItems(client, {
      ...filter,
      limit,
      offset,
    });

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  async getQueueItemDetails(
    client: SupabaseClient<Database>,
    id: number
  ): Promise<ModerationQueueItem> {
    const item = await this.repository.getQueueItemById(client, id);
    if (!item) {
      throw new Error(`Generated exercise with ID ${id} not found`);
    }
    return item;
  }

  async submitReview(
    client: SupabaseClient<Database>,
    reviewerId: string,
    input: SubmitReviewInput
  ): Promise<ExerciseReviewRecord> {
    if (!input.generatedExerciseId) {
      throw new Error("generatedExerciseId is required");
    }

    if (!input.status) {
      throw new Error("Review status is required");
    }

    const item = await this.repository.getQueueItemById(
      client,
      input.generatedExerciseId
    );

    if (!item) {
      throw new Error(
        `Generated exercise with ID ${input.generatedExerciseId} not found`
      );
    }

    if (item.status === "published") {
      throw new Error("Cannot review a published exercise");
    }

    return this.repository.createReview(client, reviewerId, input);
  }

  async publishExercise(
    client: SupabaseClient<Database>,
    generatedExerciseId: number
  ): Promise<PublishResult> {
    if (!generatedExerciseId) {
      throw new Error("generatedExerciseId is required");
    }

    const item = await this.repository.getQueueItemById(
      client,
      generatedExerciseId
    );

    if (!item) {
      throw new Error(`Generated exercise with ID ${generatedExerciseId} not found`);
    }

    if (item.status !== "approved") {
      throw new Error("Only approved exercises can be published");
    }

    return this.repository.publishExercise(client, generatedExerciseId);
  }
}