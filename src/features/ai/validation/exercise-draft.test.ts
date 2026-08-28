import { describe, expect, it } from "vitest";
import {
  ExerciseValidationError,
  validateGeneratedExerciseContent,
  validateGeneratedExerciseDraft,
} from "./exercise-draft";

const content = {
  type: "predict_output" as const,
  title: "Dá»± Ä‘oÃ¡n káº¿t quáº£",
  description: "ChÆ°Æ¡ng trÃ¬nh in gÃ¬?",
  codeSnippet: "x = 1\nprint(x)",
  options: ["1", "2"],
  correctAnswer: "1",
  explanation: "x Ä‘Æ°á»£c gÃ¡n giÃ¡ trá»‹ 1.",
};

describe("generated Exercise draft validation", () => {
  it.each([
    [{ type: "multiple_choice", title: "Q", description: "D", options: ["A", "B"], correctAnswer: "A", explanation: "E" }],
    [{ type: "true_false", title: "Q", description: "D", correctAnswer: true, explanation: "E" }],
    [{ type: "short_answer", title: "Q", description: "D", expectedAnswer: "Answer", explanation: "E" }],
    [{ type: "ordering", title: "Q", description: "D", items: ["B", "A"], correctOrder: ["A", "B"], explanation: "E" }],
    [{ type: "matching", title: "Q", description: "D", pairs: [{ prompt: "A", answer: "1" }, { prompt: "B", answer: "2" }], explanation: "E" }],
    [{ type: "scenario", title: "Q", description: "D", scenario: "A workplace decision", options: ["A", "B"], correctAnswer: "A", explanation: "E" }],
    [content],
    [{ ...content, type: "fix_the_bug" }],
  ])("accepts a precise payload for every supported modality", (candidate) => {
    expect(validateGeneratedExerciseContent(candidate).type).toBe(candidate.type);
  });

  it("rejects coding fields on a non-code modality", () => {
    expect(() => validateGeneratedExerciseContent({
      type: "short_answer", title: "Q", description: "D", expectedAnswer: "A", explanation: "E", codeSnippet: "print('fake')",
    })).toThrow("EXERCISE_DRAFT_INVALID");
  });
  it("normalizes a complete strict content payload", () => {
    expect(validateGeneratedExerciseContent({ ...content, title: ` ${content.title} ` })).toEqual(content);
  });

  it("rejects unknown fields, duplicate options, and an answer outside the options", () => {
    expect(() => validateGeneratedExerciseContent({ ...content, leakedSolution: true })).toThrow("EXERCISE_DRAFT_INVALID");
    expect(() => validateGeneratedExerciseContent({ ...content, options: ["1", "1"] })).toThrow("EXERCISE_DRAFT_INVALID");
    expect(() => validateGeneratedExerciseContent({ ...content, correctAnswer: "3" })).toThrow("EXERCISE_DRAFT_INVALID");
  });

  it.each([
    [{ ...content, unexpected: true }, "UNEXPECTED_EXERCISE_FIELD", "unexpected"],
    [{ ...content, options: ["1"] }, "INVALID_OPTIONS", "options"],
    [{ ...content, options: ["1", " "] }, "INVALID_OPTION", "options[1]"],
    [{ ...content, options: ["1", "1"] }, "DUPLICATE_OPTION", "options[1]"],
    [{ ...content, correctAnswer: "" }, "INVALID_CORRECT_ANSWER", "correctAnswer"],
    [{ ...content, correctAnswer: "3" }, "ANSWER_NOT_IN_OPTIONS", "correctAnswer"],
  ])("reports precise validation metadata for invalid content", (invalid, validationCode, fieldPath) => {
    expect.assertions(3);
    try {
      validateGeneratedExerciseContent(invalid);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ExerciseValidationError);
      expect(error).toMatchObject({ validationCode, fieldPath });
      expect(error).toHaveProperty("message", "EXERCISE_DRAFT_INVALID");
    }
  });

  it("requires the editable wrapper and content title/description to agree", () => {
    expect(() => validateGeneratedExerciseDraft({
      title: "KhÃ¡c",
      description: content.description,
      exerciseType: "predict_output",
      difficulty: "easy",
      content,
    })).toThrow("EXERCISE_DRAFT_INVALID");
  });
});

