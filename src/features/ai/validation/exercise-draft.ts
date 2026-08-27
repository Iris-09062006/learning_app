import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
  GeneratedExerciseDraft,
} from "@/features/ai/types";

const TYPES = new Set<DbExerciseType>(["predict_output", "fix_the_bug"]);
const DIFFICULTIES = new Set<DbDifficultyLevel>(["easy", "medium", "hard"]);

export type ExerciseValidationCode =
  | "INVALID_EXERCISE_ROOT"
  | "UNEXPECTED_EXERCISE_FIELD"
  | "INVALID_TITLE"
  | "INVALID_DESCRIPTION"
  | "INVALID_CODE_SNIPPET"
  | "INVALID_OPTIONS"
  | "INVALID_OPTION"
  | "DUPLICATE_OPTION"
  | "INVALID_CORRECT_ANSWER"
  | "ANSWER_NOT_IN_OPTIONS"
  | "INVALID_EXPLANATION"
  | "INVALID_QUESTION_TYPE"
  | "INVALID_DIFFICULTY"
  | "INVALID_EXERCISE_CONTENT";

export interface ExerciseValidationMetadata {
  topLevelKeys?: string[];
  optionCount?: number;
}

export class ExerciseValidationError extends Error {
  constructor(
    public readonly validationCode: ExerciseValidationCode,
    public readonly fieldPath: string,
    public readonly metadata: ExerciseValidationMetadata = {}
  ) {
    super("EXERCISE_DRAFT_INVALID");
    this.name = "ExerciseValidationError";
  }
}

function unexpectedKey(record: Record<string, unknown>, allowed: readonly string[]): string | null {
  const keys = new Set(allowed);
  return Object.keys(record).find((key) => !keys.has(key)) ?? null;
}

export function validateGeneratedExerciseContent(value: unknown): GeneratedExerciseContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExerciseValidationError("INVALID_EXERCISE_ROOT", "$", {});
  }
  const record = value as Record<string, unknown>;
  const topLevelKeys = Object.keys(record);
  const allowed = ["title", "description", "codeSnippet", "options", "correctAnswer", "explanation"];
  const extraKey = unexpectedKey(record, allowed);
  if (extraKey) {
    throw new ExerciseValidationError("UNEXPECTED_EXERCISE_FIELD", extraKey, { topLevelKeys });
  }
  if (typeof record.title !== "string" || !record.title.trim() || record.title.trim().length > 150) {
    throw new ExerciseValidationError("INVALID_TITLE", "title", { topLevelKeys });
  }
  if (typeof record.description !== "string" || !record.description.trim() || record.description.trim().length > 2000) {
    throw new ExerciseValidationError("INVALID_DESCRIPTION", "description", { topLevelKeys });
  }
  if (typeof record.codeSnippet !== "string" || record.codeSnippet.length > 10_000) {
    throw new ExerciseValidationError("INVALID_CODE_SNIPPET", "codeSnippet", { topLevelKeys });
  }
  if (!Array.isArray(record.options) || record.options.length < 2 || record.options.length > 6) {
    throw new ExerciseValidationError("INVALID_OPTIONS", "options", {
      topLevelKeys,
      optionCount: Array.isArray(record.options) ? record.options.length : undefined,
    });
  }
  for (const [index, option] of record.options.entries()) {
    if (typeof option !== "string" || !option.trim() || option.trim().length > 500) {
      throw new ExerciseValidationError("INVALID_OPTION", `options[${index}]`, {
        topLevelKeys,
        optionCount: record.options.length,
      });
    }
  }
  if (typeof record.correctAnswer !== "string" || !record.correctAnswer.trim()) {
    throw new ExerciseValidationError("INVALID_CORRECT_ANSWER", "correctAnswer", {
      topLevelKeys,
      optionCount: record.options.length,
    });
  }
  if (typeof record.explanation !== "string" || !record.explanation.trim() || record.explanation.trim().length > 5000) {
    throw new ExerciseValidationError("INVALID_EXPLANATION", "explanation", {
      topLevelKeys,
      optionCount: record.options.length,
    });
  }
  const options = record.options.map((option) => String(option).trim());
  const duplicateIndex = options.findIndex((option, index) => options.indexOf(option) !== index);
  if (duplicateIndex !== -1) {
    throw new ExerciseValidationError("DUPLICATE_OPTION", `options[${duplicateIndex}]`, {
      topLevelKeys,
      optionCount: options.length,
    });
  }
  if (!options.includes(record.correctAnswer.trim())) {
    throw new ExerciseValidationError("ANSWER_NOT_IN_OPTIONS", "correctAnswer", {
      topLevelKeys,
      optionCount: options.length,
    });
  }
  return {
    title: record.title.trim(),
    description: record.description.trim(),
    codeSnippet: record.codeSnippet.trim(),
    options,
    correctAnswer: record.correctAnswer.trim(),
    explanation: record.explanation.trim(),
  };
}

export function validateGeneratedExerciseDraft(value: unknown): GeneratedExerciseDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExerciseValidationError("INVALID_EXERCISE_ROOT", "$", {});
  }
  const record = value as Record<string, unknown>;
  const topLevelKeys = Object.keys(record);
  const allowed = ["title", "description", "exerciseType", "difficulty", "content"];
  const extraKey = unexpectedKey(record, allowed);
  if (extraKey) {
    throw new ExerciseValidationError("UNEXPECTED_EXERCISE_FIELD", extraKey, { topLevelKeys });
  }
  if (typeof record.exerciseType !== "string" || !TYPES.has(record.exerciseType as DbExerciseType)) {
    throw new ExerciseValidationError("INVALID_QUESTION_TYPE", "exerciseType", { topLevelKeys });
  }
  if (typeof record.difficulty !== "string" || !DIFFICULTIES.has(record.difficulty as DbDifficultyLevel)) {
    throw new ExerciseValidationError("INVALID_DIFFICULTY", "difficulty", { topLevelKeys });
  }
  const content = validateGeneratedExerciseContent(record.content);
  if (record.title !== content.title || record.description !== content.description) {
    throw new ExerciseValidationError("INVALID_EXERCISE_CONTENT", "content", { topLevelKeys });
  }
  return {
    title: content.title,
    description: content.description,
    exerciseType: record.exerciseType as DbExerciseType,
    difficulty: record.difficulty as DbDifficultyLevel,
    content,
  };
}
