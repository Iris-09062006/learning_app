import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LessonContentView } from "@/features/lessons/components/lesson-content-view";
import type { LessonResponse } from "@/features/lessons/types";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

const mockLesson: LessonResponse = {
  id: 10,
  chapterId: 2,
  title: "Introduction to Variables",
  content: "This is a detailed markdown content for variables.",
  order: 1,
  estimatedMinutes: 15,
  status: "unlocked",
  exercises: [
    {
      id: 101,
      title: "Variable Declaration Exercise",
      type: "fix_the_bug",
      difficulty: "easy",
      order: 1,
      isPublished: true,
    },
    {
      id: 102,
      title: "Multiple Choice Quiz",
      type: "predict_output",
      difficulty: "medium",
      order: 2,
      isPublished: true,
    },
  ],
};

describe("LessonContentView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders lesson details correctly", () => {
    render(<LessonContentView lesson={mockLesson} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Introduction to Variables");
    expect(screen.getByText(/~\s*15\s*phút/)).toBeInTheDocument();
    expect(screen.getByText("This is a detailed markdown content for variables.")).toBeInTheDocument();
    expect(screen.getByText(/Variable Declaration Exercise/)).toBeInTheDocument();
    expect(screen.getByText(/Multiple Choice Quiz/)).toBeInTheDocument();
  });

  it("starts the lesson after the user clicks the start button", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { lessonId: 10, status: "inProgress" } }), {
        status: 200,
      }),
    );

    render(<LessonContentView lesson={mockLesson} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu bài học" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/lessons/10/start", { method: "POST" });
    });
  });

  it("does not trigger start API if status is already inProgress or completed", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<LessonContentView lesson={{ ...mockLesson, status: "inProgress" }} />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders empty state when lesson content or exercises are null/empty", () => {
    render(
      <LessonContentView
        lesson={{
          ...mockLesson,
          content: null,
          estimatedMinutes: null,
          exercises: [],
        }}
      />,
    );

    expect(screen.getByText("Nội dung bài học đang được cập nhật.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có bài tập cho bài học này.")).toBeInTheDocument();
  });
});