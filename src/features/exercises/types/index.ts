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

interface ExerciseBaseResponse {
  id: number;
  lessonId: number;
  title: string;
  description: string | null;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  order: number;
  isRequired: boolean;
}

interface ChoiceExerciseResponse extends ExerciseBaseResponse {
  type: "multiple_choice" | "true_false" | "scenario";
  options: ExerciseOption[];
}

interface CodingExerciseResponse extends ExerciseBaseResponse {
  type: "predict_output" | "fix_the_bug";
  codeSnippet: string | null;
  options: ExerciseOption[];
}

interface ShortAnswerExerciseResponse extends ExerciseBaseResponse {
  type: "short_answer";
}

interface OrderingExerciseResponse extends ExerciseBaseResponse {
  type: "ordering";
  options: ExerciseOption[];
}

interface MatchingExerciseResponse extends ExerciseBaseResponse {
  type: "matching";
  options: ExerciseOption[];
}

export type GetExerciseResponse =
  | ChoiceExerciseResponse
  | CodingExerciseResponse
  | ShortAnswerExerciseResponse
  | OrderingExerciseResponse
  | MatchingExerciseResponse;

export interface PredictOutputAnswer {
  selectedOptionId: number;
}

export interface FixTheBugAnswer {
  selectedOptionId: number;
}

export interface ShortAnswerAnswer {
  answerText: string;
}

export interface OrderingAnswer {
  orderedOptionIds: number[];
}

export interface MatchingAnswer {
  matches: Array<{ optionId: number; answer: string }>;
}

export interface SubmitExerciseRequest {
  answer: PredictOutputAnswer | FixTheBugAnswer | ShortAnswerAnswer | OrderingAnswer | MatchingAnswer;
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
