import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "../course-card";
import type { CourseSummary } from "@/features/courses/types";

const baseCourse: CourseSummary = {
  id: 1,
  slug: "nhap-mon-ky-thuat-phan-mem",
  title: "Nhập môn Kỹ thuật Phần mềm",
  description: "Hiểu quy trình xây dựng phần mềm.",
  level: "beginner",
  // This legacy default must not become a subject badge for unrelated courses.
  language: "python",
  isPublished: true,
  isEnrolled: false,
  completionPercentage: 0,
};

describe("CourseCard", () => {
  it("renders real course data without treating legacy language as its subject", () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText("Nhập môn Kỹ thuật Phần mềm")).toBeInTheDocument();
    expect(screen.queryByText("PYTHON")).not.toBeInTheDocument();
    expect(screen.getByText("Cấp độ beginner")).toBeInTheDocument();
    expect(screen.getByText("Hiểu quy trình xây dựng phần mềm.")).toBeInTheDocument();
  });

  it("preserves legitimate Python course content from persisted data", () => {
    render(
      <CourseCard
        course={{
          ...baseCourse,
          slug: "python-cho-nguoi-moi-bat-dau",
          title: "Python cho người mới bắt đầu",
          description: "Học cú pháp Python qua từng bài học.",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Python cho người mới bắt đầu" })).toBeInTheDocument();
    expect(screen.getByText("Học cú pháp Python qua từng bài học.")).toBeInTheDocument();
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
    expect(screen.getByText("Đã đăng ký")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
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

  it("adopts shared surface/border tokens without a subject tag", () => {
    render(<CourseCard course={baseCourse} />);

    expect(screen.getByTestId("course-card")).toHaveClass(
      "bg-surface",
      "border-border",
      "rounded-2xl",
    );

    expect(screen.queryByText("PYTHON")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /xem chi tiết/i })).toHaveClass(
      "text-primary",
    );
    expect(screen.getByRole("heading", { name: "Nhập môn Kỹ thuật Phần mềm" })).toHaveClass(
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

  it("clamps long catalog titles while preserving the full title", () => {
    const title = "KhóaHọcKhôngCóĐiểmNgắt".repeat(8);
    render(<CourseCard course={{ ...baseCourse, title }} />);

    const heading = screen.getByRole("heading", { name: title });
    expect(heading).toHaveClass("line-clamp-2", "break-words");
    expect(heading).toHaveAttribute("title", title);
    expect(screen.getByTestId("course-card")).toHaveClass("min-w-0");
  });

  it("does not reintroduce legacy palette utilities or slash-opacity tokens", () => {
    const { container } = render(<CourseCard course={baseCourse} />);

    const legacyPalette =
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|white)-\d+/;
    const offenders: string[] = [];
    container
      .querySelectorAll<HTMLElement>("div, span, p, a, h3")
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
