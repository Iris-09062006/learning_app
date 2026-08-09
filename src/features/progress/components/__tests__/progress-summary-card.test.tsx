import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressSummaryCard } from "../progress-summary-card";
import type { CourseProgressResponse } from "@/features/progress/types";

const progress: CourseProgressResponse = {
  courseId: 1,
  completedLessons: 3,
  totalLessons: 5,
  completionPercentage: 60,
  lastAccessedLessonId: 7,
};

describe("ProgressSummaryCard", () => {
  it("renders completion metrics and accessible progress values", () => {
    render(<ProgressSummaryCard progress={progress} />);

    expect(screen.getByRole("heading", { name: "Course Progress" })).toBeInTheDocument();
    expect(screen.getByText("3 of 5 lessons completed")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "60");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    expect(progressBar).toHaveStyle({ width: "60%" });
  });

  it("renders a resume link for the last accessed lesson", () => {
    render(<ProgressSummaryCard progress={progress} />);

    expect(screen.getByRole("link", { name: /resume learning/i })).toHaveAttribute(
      "href",
      "/lessons/7",
    );
  });

  it("omits the resume link when there is no last accessed lesson", () => {
    render(
      <ProgressSummaryCard
        progress={{
          ...progress,
          lastAccessedLessonId: null,
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: /resume learning/i })).not.toBeInTheDocument();
  });
});