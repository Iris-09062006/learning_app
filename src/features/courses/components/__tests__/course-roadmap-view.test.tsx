import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CourseRoadmapView } from "../course-roadmap-view";
import type { RoadmapResponse } from "@/features/courses/types";

vi.mock("next/link", () => ({
  default: function Link({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} data-testid="lesson-link" data-href={href}>
        {children}
      </a>
    );
  },
}));

const baseRoadmap: RoadmapResponse = {
  course: { id: 1, title: "Python Cơ Bản" },
  completionPercentage: 50,
  chapters: [
    {
      id: 10,
      title: "Giới thiệu",
      order: 1,
      lessons: [
        {
          id: 100,
          title: "Bài học đầu tiên",
          order: 1,
          status: "completed",
          estimatedMinutes: 10,
        },
        {
          id: 101,
          title: "Bài học thứ hai",
          order: 2,
          status: "inProgress",
          estimatedMinutes: 15,
        },
        {
          id: 102,
          title: "Bài học khóa",
          order: 3,
          status: "locked",
          estimatedMinutes: null,
        },
      ],
    },
    {
      id: 11,
      title: "Chương trình nâng cao",
      order: 2,
      lessons: [
        {
          id: 200,
          title: "Bài học mở khóa",
          order: 1,
          status: "unlocked",
          estimatedMinutes: 20,
        },
      ],
    },
  ],
};

describe("CourseRoadmapView", () => {
  it("renders course title and completion percentage", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(screen.getByText("Lộ trình học: Python Cơ Bản")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    const fill = screen.getByTestId("progress-bar-fill");
    expect(fill).toHaveStyle({ width: "50%" });
  });

  it("renders chapter titles in order", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(screen.getByText("Chương 1: Giới thiệu")).toBeInTheDocument();
    expect(
      screen.getByText("Chương 2: Chương trình nâng cao")
    ).toBeInTheDocument();
  });

  it("renders status icons for each lesson", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(screen.getByTestId("icon-completed")).toBeInTheDocument();
    expect(screen.getByTestId("icon-in-progress")).toBeInTheDocument();
    expect(screen.getByTestId("icon-unlocked")).toBeInTheDocument();
    expect(screen.getByTestId("icon-locked")).toBeInTheDocument();
  });

  it("renders correct lesson labels", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(screen.getByText("Bài 1: Bài học đầu tiên")).toBeInTheDocument();
    expect(screen.getByText("Bài 2: Bài học thứ hai")).toBeInTheDocument();
    expect(screen.getByText("Bài 3: Bài học khóa")).toBeInTheDocument();
    expect(screen.getByText("Bài 1: Bài học mở khóa")).toBeInTheDocument();
  });

  it("renders estimated minutes when available", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(
      screen.getByText("Thời gian ước tính: 10 phút")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Thời gian ước tính: 15 phút")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Thời gian ước tính: 20 phút")
    ).toBeInTheDocument();
  });

  it("renders lesson links for unlocked, in-progress, and completed lessons", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    const links = screen.getAllByTestId("lesson-link");
    // 3 accessible lessons: 2 in chapter 1 (completed, inProgress) + 1 in chapter 2 (unlocked)
    expect(links).toHaveLength(3);
  });

  it("does not render links for locked lessons", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    expect(screen.getByText("Bài 3: Bài học khóa")).toBeInTheDocument();
    const links = screen.getAllByTestId("lesson-link");
    const lockedLesson = screen.getByText("Bài 3: Bài học khóa");
    expect(lockedLesson).toBeInTheDocument();
    // The locked lesson should not have a link
    expect(links).toHaveLength(3);
  });

  it("renders correct button labels based on status", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    const links = screen.getAllByTestId("lesson-link");
    expect(links[0]).toHaveTextContent("Xem lại"); // completed
    expect(links[1]).toHaveTextContent("Học tiếp"); // inProgress + unlocked
    expect(links[2]).toHaveTextContent("Học tiếp"); // unlocked
  });

  it("renders link with correct lesson URL", () => {
    render(<CourseRoadmapView roadmap={baseRoadmap} />);
    const links = screen.getAllByTestId("lesson-link");
    expect(links[0]).toHaveAttribute("data-href", "/courses/1/lessons/100");
    expect(links[1]).toHaveAttribute("data-href", "/courses/1/lessons/101");
    expect(links[2]).toHaveAttribute("data-href", "/courses/1/lessons/200");
  });

  it("renders empty state message when no chapters", () => {
    const emptyRoadmap: RoadmapResponse = {
      ...baseRoadmap,
      chapters: [],
    };
    render(<CourseRoadmapView roadmap={emptyRoadmap} />);
    expect(
      screen.getByText("Chưa có bài học nào được xuất bản.")
    ).toBeInTheDocument();
  });

  it("renders empty lesson message when chapter has no lessons", () => {
    const roadmapNoLessons: RoadmapResponse = {
      ...baseRoadmap,
      chapters: [
        {
          id: 10,
          title: "Chương trống",
          order: 1,
          lessons: [],
        },
      ],
    };
    render(<CourseRoadmapView roadmap={roadmapNoLessons} />);
    expect(
      screen.getByText("Chương này chưa có bài học.")
    ).toBeInTheDocument();
  });
});