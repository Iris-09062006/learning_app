import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExerciseView } from "@/features/exercises/components/exercise-view";
import type { GetExerciseResponse } from "@/features/exercises/types";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/features/ai/components/ai-explanation-view", () => ({ AiExplanationView: () => null }));

const base: GetExerciseResponse = {
  id: 301, lessonId: 20, title: "Agile values", description: "Choose the best application.",
  type: "multiple_choice", difficulty: "medium", order: 1, isRequired: true,
  options: [{ id: 11, content: "People and interactions", order: 1 }, { id: 12, content: "Rigid process", order: 2 }],
};

afterEach(() => vi.restoreAllMocks());

describe("ExerciseView subject-agnostic modalities", () => {
  it("renders a conceptual Exercise without a code block", () => {
    const { container } = render(<ExerciseView exercise={base} />);
    expect(screen.getByText("Trắc nghiệm • medium")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /People and interactions/u })).toBeInTheDocument();
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
});
