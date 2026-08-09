import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardView } from "../dashboard-view";

const data = {
  profile: {
    id: "user-1", email: "learner@example.com", username: "Learner", role: "learner" as const,
    createdAt: "2026-01-01T00:00:00Z",
    learningMetrics: { enrolledCourses: 1, activeCourses: 1, completedCourses: 0, completedLessons: 2, totalLessons: 4 },
  },
  courses: [{
    id: 1, title: "Python Basics", description: "Start here", status: "active" as const,
    enrolledAt: "2026-01-02T00:00:00Z", completedLessons: 2, totalLessons: 4,
    completionPercentage: 50, resumeLessonId: 7, resumeUrl: "/lessons/7",
  }],
  recommendation: null,
};

describe("DashboardView", () => {
  it("renders progress, recommendation state, and trusted resume links", () => {
    render(<DashboardView data={data} />);
    expect(screen.getByRole("heading", { name: /Chào mừng trở lại, Learner/ })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tiến độ Python Basics" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("link", { name: "Tiếp tục học" })).toHaveAttribute("href", "/lessons/7");
    expect(screen.getByText("Chưa có gợi ý học tập nào vào lúc này.")).toBeInTheDocument();
  });

  it("renders an actionable empty enrollment state", () => {
    render(<DashboardView data={{ ...data, courses: [], profile: { ...data.profile, learningMetrics: { enrolledCourses: 0, activeCourses: 0, completedCourses: 0, completedLessons: 0, totalLessons: 0 } } }} />);
    expect(screen.getByText("Bạn chưa đăng ký khóa học nào.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khám phá khóa học" })).toHaveAttribute("href", "/courses");
  });
});
