import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CourseDetailView } from "../course-detail-view";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));
import type { CourseDetail } from "@/features/courses/types";

const baseDetail: CourseDetail = {
  id: 1,
  slug: "co-so-du-lieu",
  title: "Cơ sở dữ liệu",
  description: "Tìm hiểu mô hình dữ liệu và truy vấn.",
  level: "beginner",
  // This legacy default must not become a subject badge for unrelated courses.
  language: "python",
  isPublished: true,
  chapterCount: 2,
  lessonCount: 5,
  isEnrolled: false,
  chapters: [
    { id: 10, title: "Intro", description: "Hello", chapterOrder: 1, isPublished: true, lessonCount: 2 },
    { id: 11, title: "Data Types", description: null, chapterOrder: 2, isPublished: true, lessonCount: 3 },
  ],
};

describe("CourseDetailView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  it("renders course headers and basic stats", () => {
    render(<CourseDetailView course={baseDetail} />);
    expect(screen.getByText("Cơ sở dữ liệu")).toBeInTheDocument();
    expect(screen.queryByText("PYTHON")).not.toBeInTheDocument();
    expect(screen.getByText("Cấp độ beginner")).toBeInTheDocument();
    expect(screen.getByText("Tìm hiểu mô hình dữ liệu và truy vấn.")).toBeInTheDocument();
    expect(screen.getByText(/2 chương/)).toBeInTheDocument();
    expect(screen.getByText(/5 bài học/)).toBeInTheDocument();
  });

  it("preserves legitimate Python course identity from persisted data", () => {
    render(
      <CourseDetailView
        course={{
          ...baseDetail,
          title: "Python cho người mới bắt đầu",
          description: "Học Python qua bài học và bài tập.",
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Python cho người mới bắt đầu" })).toBeInTheDocument();
    expect(screen.getByText("Học Python qua bài học và bài tập.")).toBeInTheDocument();
  });

  it("renders start-learning action when enrolled", () => {
    const enrolled = { ...baseDetail, isEnrolled: true };
    render(<CourseDetailView course={enrolled} />);

    const button = screen.getByRole("button", { name: "Bắt đầu học" });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/courses/1/roadmap");
  });

  it("renders enroll button when not enrolled and triggers API call on click", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          enrollmentId: 1,
          courseId: 1,
          enrolledAt: "2026-03-08",
          firstLessonId: 10,
        },
      }),
    } as Response);

    render(<CourseDetailView course={baseDetail} />);
    const button = screen.getByRole("button", { name: "Đăng ký khóa học" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/courses/1/enroll", {
        method: "POST",
      });
      expect(
        screen.getByRole("button", { name: "Bắt đầu học" })
      ).toBeInTheDocument();
    });

  });

  it("shows error message when enrollment fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vui lòng đăng nhập để đăng ký khóa học.",
        },
      }),
    } as Response);

    render(<CourseDetailView course={baseDetail} />);
    const button = screen.getByRole("button", { name: "Đăng ký khóa học" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Vui lòng đăng nhập để đăng ký khóa học.")
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveClass(
      "border-danger",
      "bg-danger-soft",
    );
    expect(fetchSpy).toHaveBeenCalledWith("/api/courses/1/enroll", {
      method: "POST",
    });
  });

  it("renders chapter lists", () => {
    render(<CourseDetailView course={baseDetail} />);
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Data Types")).toBeInTheDocument();
    expect(screen.getByText(/2 bài học/)).toBeInTheDocument();
    expect(screen.getByText(/3 bài học/)).toBeInTheDocument();
  });

  it("wraps long detail and chapter copy without changing its content", () => {
    const title = "KhóaHọcKhôngCóĐiểmNgắt".repeat(8);
    const chapterTitle = "ChươngTiếngViệtKhôngCóĐiểmNgắt".repeat(8);
    render(
      <CourseDetailView
        course={{
          ...baseDetail,
          title,
          description: title,
          chapters: [{ ...baseDetail.chapters[0], title: chapterTitle, description: chapterTitle }],
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass("break-words");
    expect(screen.getByRole("heading", { level: 3, name: chapterTitle })).toHaveClass("break-words");
    expect(screen.getByTestId("course-detail-view")).toHaveClass("min-w-0");
    expect(screen.getByTestId("course-chapter-row").firstElementChild).toHaveClass("min-w-0", "flex-1");
  });

  it("renders empty state for chapters", () => {
    render(<CourseDetailView course={{ ...baseDetail, chapters: [] }} />);
    const emptyState = screen
      .getByText("Nội dung bài học đang được cập nhật.")
      .closest("[data-state]");
    expect(emptyState).toHaveAttribute("data-state", "empty");
    expect(emptyState).toHaveClass("border-border", "bg-surface");
  });

  it("adopts shared surface/border tokens and the indigo brand accent", () => {
    render(<CourseDetailView course={baseDetail} />);

    // Header summary card → shared card tokens.
    expect(screen.getByTestId("course-detail-header")).toHaveClass(
      "bg-surface",
      "border-border",
      "rounded-3xl",
    );

    expect(screen.queryByText("PYTHON")).not.toBeInTheDocument();

    const firstChapterRow = screen.getAllByTestId("course-chapter-row")[0];
    expect(firstChapterRow).toHaveClass(
      "bg-surface",
      "border-border",
      "rounded-2xl",
    );
    expect(within(firstChapterRow).getByText("1")).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );

    // Headings and stats use text tokens; CTA is the shared primary Button.
    expect(
      screen.getByRole("heading", { level: 1, name: "Cơ sở dữ liệu" })
    ).toHaveClass("text-text-primary");
    expect(
      screen.getByRole("button", { name: "Đăng ký khóa học" })
    ).toHaveClass("bg-primary", "text-on-primary");
  });

  it("does not reintroduce legacy palette utilities or slash-opacity tokens", () => {
    const { container } = render(<CourseDetailView course={baseDetail} />);

    const legacyPalette =
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|white)-\d+/;
    const offenders: string[] = [];
    container
      .querySelectorAll<HTMLElement>("h1, h2, h3, p, span, div, button, svg")
      .forEach((element) => {
        const className = element.className;
        if (
          typeof className === "string" &&
          legacyPalette.test(className)
        ) {
          offenders.push(className);
        }
      });

    expect(offenders).toEqual([]);
  });
});
