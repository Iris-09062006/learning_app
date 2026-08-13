import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LessonContentView } from "@/features/lessons/components/lesson-content-view";
import type { LessonResponse } from "@/features/lessons/types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const mockLesson: LessonResponse = {
  id: 10,
  chapterId: 2,
  title: "Nhập môn biến Python",
  content: [
    "## Biến là gì?",
    "",
    "Biến giúp lưu **dữ liệu** và dùng `print()` để hiển thị.",
    "",
    "- Tên biến rõ nghĩa",
    "- Không bắt đầu bằng số",
    "",
    "```python",
    "message = 'Xin chào'",
    "print(message)",
    "```",
    "",
    "Đọc thêm tại [Python](https://python.org).",
  ].join("\n"),
  order: 1,
  estimatedMinutes: 15,
  status: "unlocked",
  exercises: [
    {
      id: 101,
      title: "Khai báo biến",
      type: "fix_the_bug",
      difficulty: "easy",
      order: 1,
      isPublished: true,
    },
    {
      id: 102,
      title: "Đoán kết quả",
      type: "predict_output",
      difficulty: "medium",
      order: 2,
      isPublished: true,
    },
  ],
  nextLesson: null,
};

describe("LessonContentView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("keeps an unlocked lesson behind a clear start state", () => {
    render(<LessonContentView lesson={mockLesson} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nhập môn biến Python");
    expect(screen.getByRole("button", { name: /Bắt đầu bài học/ })).toBeInTheDocument();
    expect(screen.getByText("Nội dung đang chờ bạn")).toBeInTheDocument();
    expect(screen.queryByTestId("lesson-markdown")).not.toBeInTheDocument();
  });

  it("reveals and focuses content immediately after start succeeds", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: { lessonId: 10, status: "inProgress" } }),
        { status: 200 },
      ),
    );

    render(<LessonContentView lesson={mockLesson} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu bài học/ }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/lessons/10/start", { method: "POST" });
      expect(screen.getByTestId("lesson-markdown")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Đang học")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Tiếp tục học/ })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Bài học" })).toHaveFocus();
  });

  it("renders in-progress Markdown as structured, safe learning content", () => {
    const { container } = render(
      <LessonContentView lesson={{ ...mockLesson, status: "inProgress" }} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Biến là gì?" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Tên biến rõ nghĩa");
    expect(screen.getByText("print()", { selector: "code" })).toBeInTheDocument();
    expect(container.querySelector("pre code")).toHaveTextContent("message = 'Xin chào'");
    expect(container.querySelector("pre code")).toHaveTextContent("print(message)");
    expect(screen.getByRole("link", { name: "Python" })).toHaveAttribute("href", "https://python.org");
    expect(screen.getAllByRole("link", { name: /Làm bài/ })).toHaveLength(2);
    for (const adminOnlyLabel of ["Authority score", "Relevance score", "Source provenance",
      "Citation chunk", "sourceDocumentId"]) {
      expect(screen.queryByText(adminOnlyLabel, { exact: false })).not.toBeInTheDocument();
    }
  });

  it("shows an accessible API error without revealing content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: { message: "Không thể mở bài học." } }),
        { status: 500 },
      ),
    );

    render(<LessonContentView lesson={mockLesson} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu bài học/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể mở bài học.");
    expect(screen.queryByTestId("lesson-markdown")).not.toBeInTheDocument();
  });

  it("shows content and review action immediately for a completed lesson", () => {
    render(<LessonContentView lesson={{ ...mockLesson, status: "completed" }} />);

    expect(screen.getByTestId("lesson-markdown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ôn lại nội dung/ })).toBeInTheDocument();
  });

  it("renders polished empty states for missing content and exercises", () => {
    render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", content: null, estimatedMinutes: null, exercises: [] }}
      />,
    );

    expect(screen.getByText("Nội dung bài học đang được cập nhật.")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có bài tập cho bài học này/)).toBeInTheDocument();
  });

  it("starts and navigates to the immediate next lesson", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: { lessonId: 11, status: "inProgress" } }),
        { status: 200 },
      ),
    );

    render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", nextLesson: { id: 11, title: "Hàm Python" } }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Bài tiếp theo" });
    expect(nav).toHaveTextContent("Hàm Python");
    fireEvent.click(screen.getByRole("button", { name: /Tiếp theo/ }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/lessons/11/start", { method: "POST" });
      expect(pushMock).toHaveBeenCalledWith("/lessons/11");
    });
  });

  it("announces a next-lesson error and stays on the current lesson", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: { message: "Không thể mở bài tiếp theo." } }),
        { status: 403 },
      ),
    );

    render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", nextLesson: { id: 11, title: "Hàm Python" } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tiếp theo/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể mở bài tiếp theo.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("hides the next-lesson link when there is no next lesson", () => {
    render(<LessonContentView lesson={{ ...mockLesson, status: "inProgress", nextLesson: null }} />);
    expect(screen.queryByRole("navigation", { name: "Bài tiếp theo" })).not.toBeInTheDocument();
  });
});
