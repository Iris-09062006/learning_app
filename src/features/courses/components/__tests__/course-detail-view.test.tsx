import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  slug: "python-basic",
  title: "Python Basic",
  description: "Learn Python from scratch.",
  level: "beginner",
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
    expect(screen.getByText("Python Basic")).toBeInTheDocument();
    expect(screen.getByText("PYTHON")).toBeInTheDocument();
    expect(screen.getByText("Cấp độ: beginner")).toBeInTheDocument();
    expect(screen.getByText("Learn Python from scratch.")).toBeInTheDocument();
    expect(screen.getByText(/2 chương/)).toBeInTheDocument();
    expect(screen.getByText(/5 bài học/)).toBeInTheDocument();
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

  it("renders empty state for chapters", () => {
    render(<CourseDetailView course={{ ...baseDetail, chapters: [] }} />);
    expect(
      screen.getByText("Nội dung bài học đang được cập nhật.")
    ).toBeInTheDocument();
  });
});