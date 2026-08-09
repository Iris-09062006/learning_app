import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "../course-card";
import type { CourseSummary } from "@/features/courses/types";

const baseCourse: CourseSummary = {
  id: 1,
  slug: "python-basic",
  title: "Python Basic",
  description: "Learn Python.",
  level: "beginner",
  language: "python",
  isPublished: true,
  isEnrolled: false,
  completionPercentage: 0,
};

describe("CourseCard", () => {
  it("renders title, language, level and description", () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText("Python Basic")).toBeInTheDocument();
    expect(screen.getByText("PYTHON")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
    expect(screen.getByText("Learn Python.")).toBeInTheDocument();
  });

  it("shows not-enrolled status and detail link", () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText(/Chưa đăng ký/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /xem chi tiết/i });
    expect(link).toHaveAttribute("href", "/courses/1");
  });

  it("shows enrolled status with completion", () => {
    const enrolled: CourseSummary = {
      ...baseCourse,
      isEnrolled: true,
      completionPercentage: 42,
    };
    render(<CourseCard course={enrolled} />);
    expect(screen.getByText(/Đã đăng ký \(42%\)/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /tiếp tục học/i });
    expect(link).toHaveAttribute("href", "/courses/1");
  });

  it("falls back to default description when null", () => {
    const noDesc: CourseSummary = { ...baseCourse, description: null };
    render(<CourseCard course={noDesc} />);
    expect(
      screen.getByText(/Chưa có mô tả cho khóa học này/),
    ).toBeInTheDocument();
  });
});