import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseList } from "../course-list";
import type { CourseSummary } from "@/features/courses/types";

const makeCourse = (id: number): CourseSummary => ({
  id,
  slug: `course-${id}`,
  title: `Course ${id}`,
  description: "Desc",
  level: "beginner",
  language: "python",
  isPublished: true,
  isEnrolled: false,
  completionPercentage: 0,
});

describe("CourseList", () => {
  it("renders empty state when no courses", () => {
    render(<CourseList courses={[]} />);
    expect(screen.getByTestId("course-list-empty")).toHaveAttribute(
      "data-state",
      "empty",
    );
    expect(screen.getByTestId("course-list-empty")).toHaveClass(
      "border-border",
      "bg-surface",
    );
    expect(screen.queryByTestId("course-list")).not.toBeInTheDocument();
  });

  it("renders a search-specific empty state", () => {
    render(<CourseList courses={[]} search="django" />);

    expect(
      screen.getByText("Không tìm thấy khóa học phù hợp với “django”.")
    ).toBeInTheDocument();
  });

  it("renders a card for each course", () => {
    render(<CourseList courses={[makeCourse(1), makeCourse(2)]} />);
    expect(screen.getByTestId("course-list")).toBeInTheDocument();
    expect(screen.getAllByTestId("course-card")).toHaveLength(2);
    expect(screen.getByText("Course 1")).toBeInTheDocument();
    expect(screen.getByText("Course 2")).toBeInTheDocument();
  });
});
