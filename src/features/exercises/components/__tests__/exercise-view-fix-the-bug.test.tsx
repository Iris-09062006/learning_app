import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExerciseView } from "@/features/exercises/components/exercise-view";
import type { GetExerciseResponse } from "@/features/exercises/types";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/features/ai/components/ai-explanation-view", () => ({
  AiExplanationView: () => null,
}));

const fixTheBugExercise: GetExerciseResponse = {
  id: 201,
  lessonId: 10,
  title: "Sửa lỗi hàm cộng",
  description: "Kéo đoạn code đúng vào vị trí trống để sửa hàm.",
  type: "fix_the_bug",
  difficulty: "easy",
  codeSnippet: "function add(a, b) { <trống> }",
  order: 1,
  isRequired: true,
  options: [
    { id: 1, content: "return a + b;", order: 1 },
    { id: 2, content: "return a * b;", order: 2 },
  ],
};

describe("ExerciseView (fix_the_bug)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("renders the drag-and-drop component for fix_the_bug exercises", () => {
    render(<ExerciseView exercise={fixTheBugExercise} />);

    expect(screen.getByTestId("fix-the-bug-drag-drop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mảnh code: return a + b;" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mảnh code: return a * b;" })).toBeInTheDocument();
  });

  it("keeps long titles, descriptions, and code inside the exercise surface", () => {
    const longText = "NộiDungTiếngViệtKhôngCóĐiểmNgắt".repeat(8);
    const { container } = render(
      <ExerciseView
        exercise={{
          ...fixTheBugExercise,
          title: longText,
          description: longText,
          codeSnippet: `value = ${"identifier".repeat(80)}`,
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: longText })).toHaveClass("break-words");
    expect(screen.getByText(longText, { selector: "p" })).toHaveClass("break-words");
    expect(container.querySelector("pre")).toHaveClass("max-w-full", "overflow-x-auto");
    expect(screen.getByTestId("exercise-view")).toHaveClass("min-w-0");
  });

  it("submits the selected option id only in the payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            submissionId: 500,
            exerciseId: 201,
            isCorrect: true,
            feedback: "Bạn đã làm rất tốt!",
            attemptNumber: 1,
            lessonProgress: { lessonId: 10, status: "completed", completionPercentage: 100 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<ExerciseView exercise={fixTheBugExercise} />);

    fireEvent.click(screen.getByRole("button", { name: "Mảnh code: return a + b;" }));
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/exercises/201/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: { selectedOptionId: 1 } }),
      });
    });

    expect(await screen.findByText("Bạn đã làm rất tốt!")).toBeInTheDocument();
    expect(screen.getByText("Hoàn thành")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nộp/u })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Quay lại bài học" })).toHaveLength(2);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("disables the submit button until an option is selected", () => {
    render(<ExerciseView exercise={fixTheBugExercise} />);

    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Mảnh code: return a * b;" }));

    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeEnabled();
  });

  it("supports retry after an incorrect answer", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              submissionId: 501,
              exerciseId: 201,
              isCorrect: false,
              feedback: "Chưa đúng, thử lại nhé.",
              attemptNumber: 1,
              lessonProgress: { lessonId: 10, status: "inProgress", completionPercentage: 50 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              submissionId: 502,
              exerciseId: 201,
              isCorrect: true,
              feedback: "Đúng rồi!",
              attemptNumber: 2,
              lessonProgress: { lessonId: 10, status: "completed", completionPercentage: 100 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    render(<ExerciseView exercise={fixTheBugExercise} />);

    fireEvent.click(screen.getByRole("button", { name: "Mảnh code: return a * b;" }));
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    expect(await screen.findByText("Chưa đúng, thử lại nhé.")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Nộp lại" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText("Đúng rồi!")).toBeInTheDocument();
  });

  it("restores the persisted coding choice and makes review read-only", () => {
    render(
      <ExerciseView
        exercise={fixTheBugExercise}
        reviewSubmission={{
          id: 700,
          exerciseId: 201,
          answer: { selectedOptionId: 1 },
          isCorrect: true,
          attemptNumber: 2,
          submittedAt: "2026-08-29T00:00:00.000Z",
          feedback: "Đáp án đã được lưu.",
        }}
      />,
    );

    expect(screen.getByTestId("fix-the-bug-drag-drop")).toHaveAttribute("data-readonly", "true");
    expect(screen.getByText("return a + b;")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gỡ bỏ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nộp/u })).not.toBeInTheDocument();
    expect(screen.getByText("Đáp án đã được lưu.")).toBeInTheDocument();
  });
it("uses Stitch design tokens and no legacy palette classes", () => {
    const { container } = render(<ExerciseView exercise={fixTheBugExercise} />);

    // Badge → orange container pill.
    expect(screen.getByText("Bài tập 1")).toHaveClass(
      "bg-primary-container",
      "text-on-primary-container",
      "rounded-full"
    );

    // Submit action → shared primary Button.
    expect(screen.getByRole("button", { name: "Nộp bài" })).toHaveClass(
      "bg-primary",
      "text-on-primary"
    );

    // No legacy palette utilities (slate/indigo/emerald/rose/white) remain.
    expect(container.innerHTML).not.toMatch(
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|rose|white)-\d+/
    );
  });
});
