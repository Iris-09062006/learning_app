import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
  GeneratedExerciseDraft,
  MatchingPair,
} from "@/features/ai/types";

export const EXERCISE_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "ordering",
  "matching",
  "scenario",
  "predict_output",
  "fix_the_bug",
] as const satisfies readonly DbExerciseType[];

const TYPES = new Set<string>(EXERCISE_TYPES);
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
  | "INVALID_EXPECTED_ANSWER"
  | "INVALID_ORDER_ITEMS"
  | "INVALID_CORRECT_ORDER"
  | "INVALID_MATCHING_PAIRS"
  | "INVALID_MATCHING_PAIR"
  | "INVALID_SCENARIO"
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

function fail(
  code: ExerciseValidationCode,
  path: string,
  record: Record<string, unknown>,
  optionCount?: number
): never {
  throw new ExerciseValidationError(code, path, {
    topLevelKeys: Object.keys(record),
    ...(optionCount === undefined ? {} : { optionCount }),
  });
}

function assertExactKeys(record: Record<string, unknown>, allowed: readonly string[]): void {
  const keys = Object.keys(record);
  const allowedSet = new Set(allowed);
  const unexpected = keys.find((key) => !allowedSet.has(key));
  if (unexpected || keys.length !== allowed.length || allowed.some((key) => !(key in record))) {
    fail("UNEXPECTED_EXERCISE_FIELD", unexpected ?? "$", record);
  }
}

function validateCommon(record: Record<string, unknown>): void {
  if (typeof record.title !== "string" || !record.title.trim() || record.title.trim().length > 150) {
    fail("INVALID_TITLE", "title", record);
  }
  if (typeof record.description !== "string" || !record.description.trim() || record.description.trim().length > 2000) {
    fail("INVALID_DESCRIPTION", "description", record);
  }
  if (typeof record.explanation !== "string" || !record.explanation.trim() || record.explanation.trim().length > 5000) {
    fail("INVALID_EXPLANATION", "explanation", record);
  }
}

function validateStringList(
  value: unknown,
  record: Record<string, unknown>,
  path: string,
  code: "INVALID_OPTIONS" | "INVALID_ORDER_ITEMS",
  min = 2,
  max = 8
): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(code, path, record, Array.isArray(value) ? value.length : undefined);
  }
  const normalized = value.map((item, index) => {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 500) {
      fail("INVALID_OPTION", `${path}[${index}]`, record, value.length);
    }
    return item.trim();
  });
  const duplicateIndex = normalized.findIndex((item, index) => normalized.indexOf(item) !== index);
  if (duplicateIndex !== -1) {
    fail("DUPLICATE_OPTION", `${path}[${duplicateIndex}]`, record, normalized.length);
  }
  return normalized;
}

function validateChoiceFields(record: Record<string, unknown>): { options: string[]; correctAnswer: string } {
  const options = validateStringList(record.options, record, "options", "INVALID_OPTIONS", 2, 6);
  if (typeof record.correctAnswer !== "string" || !record.correctAnswer.trim() || record.correctAnswer.trim().length > 500) {
    fail("INVALID_CORRECT_ANSWER", "correctAnswer", record, options.length);
  }
  const correctAnswer = record.correctAnswer.trim();
  if (!options.includes(correctAnswer)) {
    fail("ANSWER_NOT_IN_OPTIONS", "correctAnswer", record, options.length);
  }
  return { options, correctAnswer };
}

export function validateGeneratedExerciseContent(value: unknown): GeneratedExerciseContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExerciseValidationError("INVALID_EXERCISE_ROOT", "$", {});
  }
  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string" || !TYPES.has(record.type)) {
    fail("INVALID_QUESTION_TYPE", "type", record);
  }
  const type = record.type as DbExerciseType;
  const commonKeys = ["type", "title", "description", "explanation"];
  validateCommon(record);
  const common = {
    title: (record.title as string).trim(),
    description: (record.description as string).trim(),
    explanation: (record.explanation as string).trim(),
  };

  if (type === "multiple_choice") {
    assertExactKeys(record, [...commonKeys, "options", "correctAnswer"]);
    const choice = validateChoiceFields(record);
    return { type, ...common, ...choice };
  }
  if (type === "true_false") {
    assertExactKeys(record, [...commonKeys, "correctAnswer"]);
    if (typeof record.correctAnswer !== "boolean") fail("INVALID_CORRECT_ANSWER", "correctAnswer", record);
    return { type, ...common, correctAnswer: record.correctAnswer };
  }
  if (type === "short_answer") {
    assertExactKeys(record, [...commonKeys, "expectedAnswer"]);
    if (typeof record.expectedAnswer !== "string" || !record.expectedAnswer.trim() || record.expectedAnswer.trim().length > 1000) {
      fail("INVALID_EXPECTED_ANSWER", "expectedAnswer", record);
    }
    return { type, ...common, expectedAnswer: record.expectedAnswer.trim() };
  }
  if (type === "ordering") {
    assertExactKeys(record, [...commonKeys, "items", "correctOrder"]);
    const items = validateStringList(record.items, record, "items", "INVALID_ORDER_ITEMS");
    const correctOrder = validateStringList(record.correctOrder, record, "correctOrder", "INVALID_ORDER_ITEMS");
    if (items.length !== correctOrder.length || items.some((item) => !correctOrder.includes(item)) ||
        items.every((item, index) => item === correctOrder[index])) {
      fail("INVALID_CORRECT_ORDER", "correctOrder", record, correctOrder.length);
    }
    return { type, ...common, items, correctOrder };
  }
  if (type === "matching") {
    assertExactKeys(record, [...commonKeys, "pairs"]);
    if (!Array.isArray(record.pairs) || record.pairs.length < 2 || record.pairs.length > 8) {
      fail("INVALID_MATCHING_PAIRS", "pairs", record, Array.isArray(record.pairs) ? record.pairs.length : undefined);
    }
    const rawPairs = record.pairs;
    const pairs: MatchingPair[] = rawPairs.map((pair, index) => {
      if (!pair || typeof pair !== "object" || Array.isArray(pair)) fail("INVALID_MATCHING_PAIR", `pairs[${index}]`, record, rawPairs.length);
      const pairRecord = pair as Record<string, unknown>;
      assertExactKeys(pairRecord, ["prompt", "answer"]);
      if (typeof pairRecord.prompt !== "string" || !pairRecord.prompt.trim() || pairRecord.prompt.trim().length > 500 ||
          typeof pairRecord.answer !== "string" || !pairRecord.answer.trim() || pairRecord.answer.trim().length > 500) {
        fail("INVALID_MATCHING_PAIR", `pairs[${index}]`, record, rawPairs.length);
      }
      return { prompt: pairRecord.prompt.trim(), answer: pairRecord.answer.trim() };
    });
    if (new Set(pairs.map((pair) => pair.prompt)).size !== pairs.length || new Set(pairs.map((pair) => pair.answer)).size !== pairs.length) {
      fail("DUPLICATE_OPTION", "pairs", record, pairs.length);
    }
    return { type, ...common, pairs };
  }
  if (type === "scenario") {
    assertExactKeys(record, [...commonKeys, "scenario", "options", "correctAnswer"]);
    if (typeof record.scenario !== "string" || !record.scenario.trim() || record.scenario.trim().length > 4000) {
      fail("INVALID_SCENARIO", "scenario", record);
    }
    const choice = validateChoiceFields(record);
    return { type, ...common, scenario: record.scenario.trim(), ...choice };
  }

  assertExactKeys(record, [...commonKeys, "codeSnippet", "options", "correctAnswer"]);
  if (typeof record.codeSnippet !== "string" || !record.codeSnippet.trim() || record.codeSnippet.length > 10_000) {
    fail("INVALID_CODE_SNIPPET", "codeSnippet", record);
  }
  const choice = validateChoiceFields(record);
  return { type: type as "predict_output" | "fix_the_bug", ...common, codeSnippet: record.codeSnippet.trim(), ...choice };
}

export function validateGeneratedExerciseDraft(value: unknown): GeneratedExerciseDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExerciseValidationError("INVALID_EXERCISE_ROOT", "$", {});
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(record, ["title", "description", "exerciseType", "difficulty", "content"]);
  if (typeof record.exerciseType !== "string" || !TYPES.has(record.exerciseType)) {
    fail("INVALID_QUESTION_TYPE", "exerciseType", record);
  }
  if (typeof record.difficulty !== "string" || !DIFFICULTIES.has(record.difficulty as DbDifficultyLevel)) {
    fail("INVALID_DIFFICULTY", "difficulty", record);
  }
  const content = validateGeneratedExerciseContent(record.content);
  if (record.title !== content.title || record.description !== content.description || record.exerciseType !== content.type) {
    fail("INVALID_EXERCISE_CONTENT", "content", record);
  }
  return {
    title: content.title,
    description: content.description,
    exerciseType: content.type,
    difficulty: record.difficulty as DbDifficultyLevel,
    content,
  };
}

