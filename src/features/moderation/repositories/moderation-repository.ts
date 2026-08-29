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

    const { data: reviews, error: reviewsError } = await client
      .from("exercise_reviews")
      .select("*")
      .eq("generated_exercise_id", id)
      .order("reviewed_at", { ascending: false });

    if (reviewsError) {
      throw new Error(`Failed to load exercise review history: ${reviewsError.message}`);
    }

    return {
      ...this.mapToQueueItem(data),
      reviews: (reviews ?? []).map((review) => ({
        id: review.id,
        generatedExerciseId: review.generated_exercise_id,
        reviewerId: review.reviewer_id,
        status: review.status,
        feedback: review.comment,
        createdAt: review.reviewed_at,
      })),
    };
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
    _reviewerId: string,
    input: SubmitReviewInput
  ): Promise<ExerciseReviewRecord> {
    const { data: reviewData, error: reviewError } = await client.rpc(
      "review_generated_exercise_draft",
      {
        p_generated_exercise_id: input.generatedExerciseId,
        p_decision: input.status,
        p_comment: input.feedback ?? null,
        p_edited_draft: input.editedDraft as unknown as Database["public"]["Functions"]["review_generated_exercise_draft"]["Args"]["p_edited_draft"],
      }
    );

    if (reviewError || !reviewData || typeof reviewData !== "object" || Array.isArray(reviewData)) {
      throw new Error(`Failed to review generated exercise: ${reviewError?.message ?? "invalid RPC response"}`);
    }

    const result = reviewData as Record<string, unknown>;
    if (typeof result.id !== "number" || typeof result.generatedExerciseId !== "number" ||
      typeof result.reviewerId !== "string" || typeof result.createdAt !== "string" ||
      !["approved", "rejected", "needs_revision"].includes(String(result.status))) {
      throw new Error("Failed to review generated exercise: invalid RPC response");
    }

    return {
      id: result.id,
      generatedExerciseId: result.generatedExerciseId,
      reviewerId: result.reviewerId,
      status: result.status as ExerciseReviewRecord["status"],
      feedback: typeof result.feedback === "string" ? result.feedback : null,
      createdAt: result.createdAt,
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

  private mapToQueueItem(
    raw: Database["public"]["Tables"]["generated_exercises"]["Row"] & {
      lessons?: { title: string } | null;
    }
  ): ModerationQueueItem {
    const storedContent = raw.content as unknown as Record<string, unknown>;
    const content = (typeof storedContent.type === "string"
      ? storedContent
      : { type: raw.exercise_type, ...storedContent }) as unknown as GeneratedExerciseContent;
    return {
      id: raw.id,
      lessonId: raw.lesson_id,
      lessonTitle: raw.lessons?.title,
      exerciseType: raw.exercise_type,
      difficulty: raw.difficulty,
      title: raw.title,
      description: raw.description ?? "",
      content,
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
