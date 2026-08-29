import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExerciseView } from "@/features/exercises/components/exercise-view";
import type { ExerciseReviewSubmission, GetExerciseResponse } from "@/features/exercises/types";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/features/ai/components/ai-explanation-view", () => ({ AiExplanationView: () => null }));

const base: GetExerciseResponse = {
  id: 301, lessonId: 20, title: "Agile values", description: "Choose the best application.",
  type: "multiple_choice", difficulty: "medium", order: 1, isRequired: true,
  options: [{ id: 11, content: "People and interactions", order: 1 }, { id: 12, content: "Rigid process", order: 2 }],
};

function review(answer: Record<string, unknown>): ExerciseReviewSubmission {
  return {
    id: 90,
    exerciseId: 301,
    answer,
    isCorrect: true,
    attemptNumber: 2,
    submittedAt: "2026-08-29T00:00:00.000Z",
    feedback: "Giải thích đã lưu",
  };
}

afterEach(() => vi.restoreAllMocks());

describe("ExerciseView subject-agnostic modalities", () => {
  it("renders a conceptual Exercise without a code block", () => {
    const { container } = render(<ExerciseView exercise={base} />);
    expect(screen.getByText("Trắc nghiệm • medium")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /People and interactions/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay lại bài học" })).toHaveAttribute("href", "/lessons/20");
    expect(container.querySelector("pre")).toBeNull();
  });

  it("submits a short answer with the type-specific payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { submissionId: 9, exerciseId: 302, isCorrect: true, feedback: "Đúng", attemptNumber: 1, lessonProgress: { lessonId: 20, status: "completed", completionPercentage: 100 } },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const shortAnswer: GetExerciseResponse = {
      id: 302, lessonId: 20, title: base.title, description: base.description,
      type: "short_answer", difficulty: "medium", order: 1, isRequired: true,
    };
    render(<ExerciseView exercise={shortAnswer} />);
    fireEvent.change(screen.getByLabelText("Câu trả lời"), { target: { value: "  four values  " } });
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ answer: { answerText: "four values" } });
  });

  it("renders accessible ordering controls", () => {
    render(<ExerciseView exercise={{ ...base, type: "ordering", options: [{ id: 21, content: "First", order: 1 }, { id: 22, content: "Second", order: 2 }] }} />);
    expect(screen.getByRole("button", { name: "Đưa First lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa First xuống" })).toBeEnabled();
  });

  it("renders matching prompts with answer choices from public option metadata", () => {
    render(<ExerciseView exercise={{ ...base, type: "matching", options: [
      { id: 31, content: "Individuals", order: 1, metadata: { answerOptions: ["Interactions", "Documentation"] } },
      { id: 32, content: "Working software", order: 2, metadata: { answerOptions: ["Interactions", "Documentation"] } },
    ] }} />);
    expect(screen.getByLabelText("Individuals")).toHaveDisplayValue("Chọn vế phù hợp");
    expect(screen.getByLabelText("Working software")).toBeInTheDocument();
  });

  it.each(["multiple_choice", "true_false", "scenario", "predict_output"] as const)(
    "restores a persisted selected option for read-only %s review",
    (type) => {
      const exercise: GetExerciseResponse = type === "predict_output"
        ? { ...base, type, codeSnippet: "print(value)" }
        : { ...base, type };
      render(<ExerciseView exercise={exercise} reviewSubmission={review({ selectedOptionId: 11 })} />);

      expect(screen.getByRole("button", { name: /People and interactions/u })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /People and interactions/u })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Nộp bài" })).not.toBeInTheDocument();
      expect(screen.getByTestId("exercise-completed-state")).toHaveTextContent("Hoàn thành");
      expect(screen.getByTestId("exercise-completed-state")).toHaveTextContent("Giải thích đã lưu");
    },
  );

  it("restores a persisted short answer as readable, read-only text", () => {
    const exercise: GetExerciseResponse = { ...base, type: "short_answer" };
    render(<ExerciseView exercise={exercise} reviewSubmission={review({ answerText: "four values" })} />);

    expect(screen.getByLabelText("Câu trả lời")).toHaveValue("four values");
    expect(screen.getByLabelText("Câu trả lời")).toHaveAttribute("readonly");
  });

  it("restores persisted ordering and disables reordering", () => {
    const exercise: GetExerciseResponse = {
      ...base,
      type: "ordering",
      options: [{ id: 21, content: "First", order: 1 }, { id: 22, content: "Second", order: 2 }],
    };
    render(<ExerciseView exercise={exercise} reviewSubmission={review({ orderedOptionIds: [22, 21] })} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Second");
    expect(items[1]).toHaveTextContent("First");
    expect(screen.getByRole("button", { name: "Đưa Second xuống" })).toBeDisabled();
  });

  it("restores persisted matches in disabled, readable controls", () => {
    const exercise: GetExerciseResponse = { ...base, type: "matching", options: [
      { id: 31, content: "Individuals", order: 1, metadata: { answerOptions: ["Interactions", "Documentation"] } },
      { id: 32, content: "Working software", order: 2, metadata: { answerOptions: ["Interactions", "Documentation"] } },
    ] };
    render(<ExerciseView exercise={exercise} reviewSubmission={review({ matches: [
      { optionId: 31, answer: "Interactions" },
      { optionId: 32, answer: "Documentation" },
    ] })} />);

    expect(screen.getByLabelText("Individuals")).toHaveDisplayValue("Interactions");
    expect(screen.getByLabelText("Individuals")).toBeDisabled();
    expect(screen.getByLabelText("Working software")).toHaveDisplayValue("Documentation");
  });
});
