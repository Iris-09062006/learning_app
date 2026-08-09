import type { ProgressStatus } from "@/features/courses/types";
import type { Database } from "@/generated/database.types";

export type ExerciseType = Database["public"]["Enums"]["exercise_type"];
export type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

export interface LessonExerciseSummary {
  id: number;
  title: string;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  order: number;
  isPublished: boolean;
}

export interface LessonDetail {
  id: number;
  chapterId: number;
  courseId: number; // For enrollment check
  title: string;
  content: string | null;
  order: number;
  estimatedMinutes: number | null;
  status: ProgressStatus;
  isPublished: boolean;
  exercises: LessonExerciseSummary[];
}

export type LessonResponse = Omit<LessonDetail, "isPublished" | "courseId">;

export interface StartLessonResponse {
  lessonId: number;
  status: ProgressStatus;
  startedAt: string | null;
}