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
  difficulty: DbDifficultyLevel;
  learningObjective: string;
  topicHint?: string;
}

interface GeneratedExerciseBase {
  type: DbExerciseType;
  title: string;
  description: string;
  explanation: string;
}

export interface MultipleChoiceExerciseContent extends GeneratedExerciseBase {
  type: "multiple_choice";
  options: string[];
  correctAnswer: string;
}

export interface TrueFalseExerciseContent extends GeneratedExerciseBase {
  type: "true_false";
  correctAnswer: boolean;
}

export interface ShortAnswerExerciseContent extends GeneratedExerciseBase {
  type: "short_answer";
  expectedAnswer: string;
}

export interface OrderingExerciseContent extends GeneratedExerciseBase {
  type: "ordering";
  items: string[];
  correctOrder: string[];
}

export interface MatchingPair {
  prompt: string;
  answer: string;
}

export interface MatchingExerciseContent extends GeneratedExerciseBase {
  type: "matching";
  pairs: MatchingPair[];
}

export interface ScenarioExerciseContent extends GeneratedExerciseBase {
  type: "scenario";
  scenario: string;
  options: string[];
  correctAnswer: string;
}

export interface CodingExerciseContent extends GeneratedExerciseBase {
  type: "predict_output" | "fix_the_bug";
  codeSnippet: string;
  options: string[];
  correctAnswer: string;
}

export type GeneratedExerciseContent =
  | MultipleChoiceExerciseContent
  | TrueFalseExerciseContent
  | ShortAnswerExerciseContent
  | OrderingExerciseContent
  | MatchingExerciseContent
  | ScenarioExerciseContent
  | CodingExerciseContent;

export interface GeneratedExerciseDraft {
  title: string;
  description: string;
  exerciseType: DbExerciseType;
  difficulty: DbDifficultyLevel;
  content: GeneratedExerciseContent;
}

export interface ExerciseGenerationContext {
  lessonId: number;
  lessonTitle: string;
  lessonSummary?: string;
  lessonContent: string;
  learningObjectives: string[];
  courseTitle: string;
  courseDescription: string | null;
}

export interface ExerciseLessonTarget {
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
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
