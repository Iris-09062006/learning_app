import type { Database } from "@/generated/database.types";

export type AiResponseStatus = Database["public"]["Enums"]["ai_response_status"];

export interface AiExplanationRecord {
  id: number;
  submissionId: number;
  userQuestion: string | null;
  response: string | null;
  provider: string;
  model: string | null;
  status: AiResponseStatus;
  errorCode: string | null;
  createdAt: string;
}

export interface RequestAiExplanationInput {
  submissionId: number;
  userQuestion?: string;
}

export interface RequestAiExplanationResponse {
  explanation: AiExplanationRecord;
}

export interface SubmissionDetailsForAi {
  id: number;
  userId: string;
  exerciseId: number;
  answer: unknown;
  isCorrect: boolean;
  exerciseTitle: string;
  exercisePrompt: string;
  staticExplanation: string | null;
}

export type RecommendationType = "NEXT_LESSON" | "RETRY_EXERCISE" | "REVIEW_LESSON" | "COURSE_COMPLETED";

export interface LearningRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  targetUrl: string;
  lessonId: number | null;
  exerciseId: number | null;
  reason: string;
}

export interface CourseRecommendationResult {
  courseId: number;
  courseTitle: string;
  recommendation: LearningRecommendation | null;
}

export type DbExerciseType = Database["public"]["Enums"]["exercise_type"];
export type DbDifficultyLevel = Database["public"]["Enums"]["difficulty_level"];
export type DbGeneratedExerciseStatus = Database["public"]["Enums"]["generated_exercise_status"];

export interface GenerateExerciseInput {
  lessonId: number;
  exerciseType: DbExerciseType;
  difficulty: DbDifficultyLevel;
  learningObjective: string;
  topicHint?: string;
}

export interface GeneratedExerciseContent {
  title: string;
  description: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GeneratedExerciseRecord {
  id: number;
  lessonId: number;
  exerciseType: DbExerciseType;
  difficulty: DbDifficultyLevel;
  title: string;
  description: string | null;
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

export interface GenerateExerciseResponse {
  generatedExercise: GeneratedExerciseRecord;
}
