import { describe, expect, it } from "vitest";
import {
  ExerciseValidationError,
  validateGeneratedExerciseContent,
  validateGeneratedExerciseDraft,
} from "./exercise-draft";

const content = {
  title: "Dự đoán kết quả",
  description: "Chương trình in gì?",
  codeSnippet: "x = 1\nprint(x)",
  options: ["1", "2"],
  correctAnswer: "1",
  explanation: "x được gán giá trị 1.",
};

describe("generated Exercise draft validation", () => {
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
      title: "Khác",
      description: content.description,
      exerciseType: "predict_output",
      difficulty: "easy",
      content,
    })).toThrow("EXERCISE_DRAFT_INVALID");
  });
});
