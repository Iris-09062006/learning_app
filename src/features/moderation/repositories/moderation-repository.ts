import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import type { GeneratedExerciseContent } from "@/features/ai/types";
import type {
  ExerciseReviewRecord,
  ModerationQueueFilter,
  ModerationQueueItem,
  PublishResult,
  SubmitReviewInput,
} from "../types";

type GeneratedExerciseUpdate =
  Database["public"]["Tables"]["generated_exercises"]["Update"];

export class ModerationRepository {
  async getQueueItemById(
    client: SupabaseClient<Database>,
    id: number
  ): Promise<ModerationQueueItem | null> {
    const { data, error } = await client
      .from("generated_exercises")
      .select("*, lessons(title)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapToQueueItem(data);
  }

  async listQueueItems(
    client: SupabaseClient<Database>,
    filter: ModerationQueueFilter = {}
  ): Promise<{ items: ModerationQueueItem[]; total: number }> {
    const limit = filter.limit ?? 20;
    const offset = filter.offset ?? 0;

    let query = client
      .from("generated_exercises")
      .select("*, lessons(title)", { count: "exact" });

    if (filter.status) {
      query = query.eq("status", filter.status);
    }

    if (filter.lessonId) {
      query = query.eq("lesson_id", filter.lessonId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { items: [], total: 0 };
    }

    return {
      items: data.map((item) => this.mapToQueueItem(item)),
      total: count ?? data.length,
    };
  }

  async createReview(
    client: SupabaseClient<Database>,
    reviewerId: string,
    input: SubmitReviewInput
  ): Promise<ExerciseReviewRecord> {
    const editedSnapshot = this.createEditedSnapshot(input);

    const { data: reviewData, error: reviewError } = await client
      .from("exercise_reviews")
      .insert({
        generated_exercise_id: input.generatedExerciseId,
        reviewer_id: reviewerId,
        status: input.status,
        comment: input.feedback ?? null,
        edited_snapshot: editedSnapshot as unknown as Database["public"]["Tables"]["exercise_reviews"]["Insert"]["edited_snapshot"],
      })
      .select("*")
      .single();

    if (reviewError || !reviewData) {
      throw new Error(`Failed to create exercise review: ${reviewError?.message}`);
    }

    const updates: GeneratedExerciseUpdate = {
      status: input.status,
      updated_at: new Date().toISOString(),
    };

    if (input.editedContent) {
      updates.content =
        input.editedContent as unknown as GeneratedExerciseUpdate["content"];
    }

    if (input.editedTitle !== undefined) {
      updates.title = input.editedTitle;
    }

    if (input.editedDescription !== undefined) {
      updates.description = input.editedDescription;
    }

    const { error: updateError } = await client
      .from("generated_exercises")
      .update(updates)
      .eq("id", input.generatedExerciseId);

    if (updateError) {
      throw new Error(`Failed to update generated exercise: ${updateError.message}`);
    }

    return {
      id: reviewData.id,
      generatedExerciseId: reviewData.generated_exercise_id,
      reviewerId: reviewData.reviewer_id,
      status: reviewData.status,
      feedback: reviewData.comment,
      createdAt: reviewData.reviewed_at,
    };
  }

  async publishExercise(
    client: SupabaseClient<Database>,
    generatedExerciseId: number
  ): Promise<PublishResult> {
    const { data, error } = await client.rpc(
      "publish_generated_exercise" as never,
      { p_generated_exercise_id: generatedExerciseId } as never
    );

    if (error || !data || typeof data !== "object") {
      throw new Error(`Failed to publish generated exercise: ${error?.message}`);
    }

    const result = data as {
      generatedExerciseId?: number;
      publishedExerciseId?: number;
      status?: string;
      publishedAt?: string;
    };

    if (
      typeof result.generatedExerciseId !== "number" ||
      typeof result.publishedExerciseId !== "number" ||
      result.status !== "published" ||
      typeof result.publishedAt !== "string"
    ) {
      throw new Error("Failed to publish generated exercise: invalid RPC response");
    }

    return {
      generatedExerciseId: result.generatedExerciseId,
      publishedExerciseId: result.publishedExerciseId,
      status: "published",
      publishedAt: result.publishedAt,
    };
  }

  private createEditedSnapshot(input: SubmitReviewInput): Record<string, unknown> | null {
    const snapshot: Record<string, unknown> = {};

    if (input.editedContent) {
      snapshot.content = input.editedContent;
    }

    if (input.editedTitle !== undefined) {
      snapshot.title = input.editedTitle;
    }

    if (input.editedDescription !== undefined) {
      snapshot.description = input.editedDescription;
    }

    return Object.keys(snapshot).length > 0 ? snapshot : null;
  }

  private mapToQueueItem(
    raw: Database["public"]["Tables"]["generated_exercises"]["Row"] & {
      lessons?: { title: string } | null;
    }
  ): ModerationQueueItem {
    return {
      id: raw.id,
      lessonId: raw.lesson_id,
      lessonTitle: raw.lessons?.title,
      exerciseType: raw.exercise_type,
      difficulty: raw.difficulty,
      title: raw.title,
      description: raw.description ?? "",
      content: raw.content as unknown as GeneratedExerciseContent,
      status: raw.status,
      provider: raw.provider,
      model: raw.model,
      requestedBy: raw.requested_by,
      publishedExerciseId: raw.published_exercise_id,
      publishedAt: raw.published_at,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}