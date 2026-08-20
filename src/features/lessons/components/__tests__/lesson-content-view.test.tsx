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

    // Header metadata stays data-driven (order, status label, duration) with no
    // fabricated Stitch content.
    expect(screen.getByText("Bài 1")).toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
    expect(screen.getByText("Khoảng 15 phút")).toBeInTheDocument();
    expect(screen.getByText("Tiến độ được lưu tự động")).toBeInTheDocument();
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
    const article = screen.getByRole("article", { name: "Bài học" });
    expect(article).toHaveFocus();
    expect(article).toHaveClass("focus-visible:ring-focus-ring");
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

  it("keeps data-driven status chips on the approved semantic token families", () => {
    const { unmount } = render(<LessonContentView lesson={mockLesson} />);
    const unlockedChip = screen.getByText("Sẵn sàng");
    expect(unlockedChip.className).toContain("bg-warning-soft");
    expect(unlockedChip.className).toContain("text-warning");
    unmount();

    render(<LessonContentView lesson={{ ...mockLesson, status: "inProgress" }} />);
    const infoChips = screen.getAllByText("Đang học");
    expect(infoChips.length).toBeGreaterThanOrEqual(1);
    expect(infoChips[0].className).toContain("bg-info-soft");
    expect(infoChips[0].className).toContain("text-info");
    unmount();

    render(<LessonContentView lesson={{ ...mockLesson, status: "completed" }} />);
    const successChips = screen.getAllByText("Hoàn thành");
    expect(successChips[0].className).toContain("bg-success-soft");
    expect(successChips[0].className).toContain("text-success");
  });

  it("renders the next-lesson card with token surfaces, primary accent, and shared Button", () => {
    render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", nextLesson: { id: 11, title: "Hàm Python" } }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Bài tiếp theo" });
    expect(nav).toHaveTextContent("Bài tiếp theo");
    expect(nav).toHaveTextContent("Hàm Python");
    expect(nav.className).toContain("rounded-xl");
    expect(nav.className).toContain("border-border");
    expect(nav.className).toContain("bg-surface");

    // Stitch left accent bar (primary) carries the next-lesson affordance.
    const accentBar = Array.from(nav.querySelectorAll("span")).find((span) =>
      span.className.includes("bg-primary") && span.className.includes("left-0"),
    );
    expect(accentBar).toBeDefined();

    // The advance action is the shared Button: primary surface + focus ring token.
    const nextButton = screen.getByRole("button", { name: /Tiếp theo/ });
    expect(nextButton.className).toContain("bg-primary");
    expect(nextButton.className).toContain("focus-visible:ring-focus-ring");
  });

  it("keeps the aside overview data-driven with token surface classes", () => {
    render(<LessonContentView lesson={{ ...mockLesson, status: "inProgress" }} />);

    const aside = screen.getByRole("complementary", { name: "Thông tin bài học" });
    expect(aside).toHaveTextContent("Tổng quan");
    expect(aside).toHaveTextContent("Trạng thái");
    expect(aside).toHaveTextContent("Đang học");
    expect(aside).toHaveTextContent("Thời lượng");
    expect(aside).toHaveTextContent("15 phút");
    expect(aside).toHaveTextContent("Bài tập");
    expect(aside).toHaveTextContent("2");

    const card = aside.querySelector(":scope > div:first-child") as HTMLElement;
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("border-border");
    expect(card.className).toContain("bg-surface");

    const roadmapLink = screen.getByRole("link", { name: "Xem lộ trình khác" });
    expect(roadmapLink).toHaveAttribute("href", "/courses");
    expect(roadmapLink.className).toContain("hover:text-primary");
  });

  it("does not fabricate a previous-lesson navigation", () => {
    render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", nextLesson: { id: 11, title: "Hàm Python" } }}
      />,
    );
    expect(screen.queryByRole("navigation", { name: /Bài trước/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Bài trước/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Bài trước/)).not.toBeInTheDocument();
  });

  it("hardens the responsive grid so ultra-long content cannot stretch the page", () => {
    const { container } = render(
      <LessonContentView
        lesson={{
          ...mockLesson,
          status: "inProgress",
          title: "Bài học với tiêu đề thật sự rất dài để kiểm tra khả năng xuống dòng an toàn trong vùng chứa",
          content: ["## Đề mục", "", "```python", "x".repeat(400), "```", "", "> Ghi chú quan trọng."].join("\n"),
        }}
      />,
    );

    // Content column is a min-w-0 grid item so ultra-long unbreakable content
    // (fenced code lines) cannot blow out the grid track width.
    const article = screen.getByRole("article", { name: "Bài học" });
    const contentColumn = article.parentElement as HTMLElement;
    expect(contentColumn).toHaveClass("min-w-0");
    expect(contentColumn).toHaveClass("space-y-8");

    // Base track is an explicit single column (minmax(0,1fr) semantics); the lg
    // track keeps an explicit zero-minimum first column. Both contain items.
    const grid = contentColumn.parentElement as HTMLElement;
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid.className).toContain("lg:grid-cols-[minmax(0,1fr)_15rem]");

    // Mobile stacking order: content column first, aside below it (DOM order is
    // the visual order under the single-column base grid).
    const aside = screen.getByRole("complementary", { name: "Thông tin bài học" });
    expect(grid.children[0]).toBe(contentColumn);
    expect(grid.children[1]).toBe(aside);

    // Header title column is also a min-w-0 grid item (long-title resilience).
    const heading = screen.getByRole("heading", { level: 1 });
    expect((heading.parentElement as HTMLElement).className).toContain("min-w-0");
    expect(heading).toHaveClass("break-words");

    // The fenced code block keeps internal horizontal scrolling instead of
    // widening the page: overflow-hidden wrapper + overflow-x-auto pre.
    const pre = container.querySelector("pre") as HTMLElement;
    expect(pre).toHaveClass("overflow-x-auto");
    expect((pre.parentElement as HTMLElement).className).toContain("overflow-hidden");
  });

  it("emits no slash-opacity utilities on any lesson control surface", () => {
    const { container } = render(
      <LessonContentView
        lesson={{ ...mockLesson, status: "inProgress", nextLesson: { id: 11, title: "Hàm Python" } }}
      />,
    );

    const slashOpacityToken = /(^|\s)(bg|text|border|hover:border|hover:bg)-(primary|danger|surface-subtle|warning|info|success)(-\S*)?\/\d+/;
    const offenders: string[] = [];
    container.querySelectorAll<HTMLElement>("div, section, nav, span, p, a, button").forEach((element) => {
      const className = element.className;
      if (typeof className === "string" && slashOpacityToken.test(className)) {
        offenders.push(className);
      }
    });
    expect(offenders).toEqual([]);
  });
});
