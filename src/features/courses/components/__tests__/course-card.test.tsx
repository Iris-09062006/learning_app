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

  it("adopts shared surface/border tokens and the orange language tag", () => {
    render(<CourseCard course={baseCourse} />);

    expect(screen.getByTestId("course-card")).toHaveClass(
      "bg-surface",
      "border-border",
      "rounded-xl",
    );

    // A-bucket indigo swap: the language tag is now a primary-soft/orange chip.
    expect(screen.getByText("PYTHON")).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );
    expect(screen.getByRole("link", { name: /xem chi tiết/i })).toHaveClass(
      "text-primary",
    );
    expect(screen.getByRole("heading", { name: "Python Basic" })).toHaveClass(
      "text-text-primary",
    );
  });

  it("marks enrolled status with the semantic success token", () => {
    render(
      <CourseCard
        course={{ ...baseCourse, isEnrolled: true, completionPercentage: 42 }}
      />,
    );
    expect(screen.getByText(/Đã đăng ký/)).toHaveClass("text-success");
    expect(screen.getByRole("link", { name: /tiếp tục học/i })).toHaveClass(
      "text-primary",
    );
  });

  it("does not reintroduce legacy palette utilities or slash-opacity tokens", () => {
    const { container } = render(<CourseCard course={baseCourse} />);

    const legacyPalette =
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|white)-\d+/;
    const slashOpacityToken =
      /(^|\s)(bg|text|border|hover:border|hover:bg)-(primary|danger|surface-subtle|warning|info|success)(-\S*)?\/\d+/;

    const offenders: string[] = [];
    container
      .querySelectorAll<HTMLElement>("div, span, p, a, h3")
      .forEach((element) => {
        const className = element.className;
        if (
          typeof className === "string" &&
          (legacyPalette.test(className) || slashOpacityToken.test(className))
        ) {
          offenders.push(className);
        }
      });

    expect(offenders).toEqual([]);
  });
});