import type {
  DbDifficultyLevel,
  DbExerciseType,
  DbGeneratedExerciseStatus,
  GeneratedExerciseContent,
} from "@/features/ai/types";

export type ReviewStatus = "approved" | "rejected" | "needs_revision";

export interface ModerationQueueItem {
  id: number;
  lessonId: number;
  lessonTitle?: string;
  exerciseType: DbExerciseType;
  difficulty: DbDifficultyLevel;
  title: string;
  description: string;
  content: GeneratedExerciseContent;
  status: DbGeneratedExerciseStatus;
  provider: string;
  model: string | null;
  requestedBy: string | null;
  publishedExerciseId: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueFilter {
  status?: DbGeneratedExerciseStatus;
  lessonId?: number;
  limit?: number;
  offset?: number;
}

export interface ModerationQueueResult {
  items: ModerationQueueItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitReviewInput {
  generatedExerciseId: number;
  status: ReviewStatus;
  feedback?: string;
  editedContent?: GeneratedExerciseContent;
  editedTitle?: string;
  editedDescription?: string;
}

export interface ExerciseReviewRecord {
  id: number;
  generatedExerciseId: number;
  reviewerId: string;
  status: ReviewStatus;
  feedback: string | null;
  createdAt: string;
}

export interface PublishResult {
  generatedExerciseId: number;
  publishedExerciseId: number;
  status: "published";
  publishedAt: string;
}