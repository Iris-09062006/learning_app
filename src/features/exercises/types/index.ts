import type { Database } from "@/generated/database.types";

export type ExerciseType = Database["public"]["Enums"]["exercise_type"];
export type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];
export type ProgressStatus = Database["public"]["Enums"]["progress_status"];

export interface ExerciseOption {
  id: number;
  content: string;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface GetExerciseResponse {
  id: number;
  lessonId: number;
  title: string;
  description: string | null;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  codeSnippet: string | null;
  order: number;
  isRequired: boolean;
  options: ExerciseOption[];
}

export interface PredictOutputAnswer {
  selectedOptionId: number;
}

export interface FixTheBugAnswer {
  selectedOptionId: number;
}

export interface SubmitExerciseRequest {
  answer: PredictOutputAnswer | FixTheBugAnswer;
}

export interface LessonProgress {
  lessonId: number;
  status: ProgressStatus;
  completionPercentage: number;
}

export interface SubmitExerciseResponse {
  submissionId: number;
  exerciseId: number;
  isCorrect: boolean;
  feedback: string;
  attemptNumber: number;
  lessonProgress: LessonProgress;
  nextLesson?: {
    id: number;
    status: ProgressStatus;
  };
}

export interface SubmissionSummary {
  id: number;
  exerciseId?: number;
  answer?: Record<string, unknown>;
  isCorrect: boolean;
  attemptNumber?: number;
  submittedAt: string;
}

export interface GetLearnerSubmissionsResponse {
  submissions: SubmissionSummary[];
}