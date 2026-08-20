import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LearningRecommendation } from "@/features/ai/types";
import { LearningRecommendationCard } from "../learning-recommendation-card";

const recommendation: LearningRecommendation = {
  type: "NEXT_LESSON",
  title: "Tiếp tục học",
  description: "Bài học tiếp theo: Functions",
  targetUrl: "/lessons/20",
  lessonId: 20,
  exerciseId: null,
  reason: "Đây là bài học tiếp theo trong lộ trình của bạn.",
};

describe("LearningRecommendationCard", () => {
  it("renders semantic recommendation content and an accessible action link", () => {
    render(<LearningRecommendationCard recommendation={recommendation} />);

    expect(screen.getByTestId("learning-recommendation-card")).toBeInTheDocument();
    expect(screen.getByText("Gợi ý học tập")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tiếp tục học" })).toBeInTheDocument();
    expect(screen.getByText("Bài học tiếp theo: Functions")).toBeInTheDocument();
    expect(screen.getByText("Đây là bài học tiếp theo trong lộ trình của bạn.")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Học ngay" })).toHaveAttribute(
      "href",
      "/lessons/20",
    );
  });

  it("renders a clear no-recommendation state without an action link", () => {
    render(<LearningRecommendationCard recommendation={null} />);

    expect(screen.getByTestId("no-recommendation-state")).toBeInTheDocument();
    expect(screen.getByText("Chưa có gợi ý học tập nào vào lúc này.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("uses review-specific action text and destination", () => {
    render(
      <LearningRecommendationCard
        recommendation={{
          ...recommendation,
          type: "REVIEW_LESSON",
          targetUrl: "/lessons/20",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Xem lại bài học" })).toHaveAttribute(
      "href",
      "/lessons/20",
    );
  });

  it("maps every recommendation type to semantic status tokens", () => {
    const cases: Array<[LearningRecommendation["type"], string, string]> = [
      ["NEXT_LESSON", "bg-info-soft", "text-info"],
      ["RETRY_EXERCISE", "bg-danger-soft", "text-danger"],
      ["REVIEW_LESSON", "bg-warning-soft", "text-warning"],
      ["COURSE_COMPLETED", "bg-success-soft", "text-success"],
    ];

    for (const [type, bgClass, textClass] of cases) {
      const { unmount } = render(
        <LearningRecommendationCard recommendation={{ ...recommendation, type }} />,
      );
      const badge = screen.getByText("Gợi ý học tập");
      expect(badge.className).toContain(bgClass);
      expect(badge.className).toContain(textClass);
      unmount();
    }
  });

  it("uses the primary keyword CTA instead of the legacy blue action link", () => {
    render(<LearningRecommendationCard recommendation={recommendation} />);

    const link = screen.getByRole("link", { name: "Học ngay" });
    expect(link).toHaveClass("bg-primary", "text-on-primary");
    expect(link.className).not.toMatch(/blue-\d+/);
  });

  it("adopts shared semantic tokens without legacy palette or slash-opacity utilities", () => {
    const { container } = render(<LearningRecommendationCard recommendation={recommendation} />);

    const legacyPalette = /^(bg|text|border|shadow|ring|outline)-(slate|indigo|emerald|blue|amber|orange|red|white|gray)-\d+/;
    const slashOpacity = /^(bg|text|border)-(primary|danger|surface-subtle|warning|info|success|ai)(-[a-z-]+)?\/\d+/;

    const offenders: string[] = [];
    container.querySelectorAll<HTMLElement>("[class]").forEach((element) => {
      const className = element.className;
      if (typeof className !== "string") return;
      for (const raw of className.split(/\s+/)) {
        const token = raw.replace(/^(dark:)?(hover:)?(focus-visible:)?/, "");
        if (legacyPalette.test(token) || slashOpacity.test(token)) offenders.push(raw);
      }
    });

    expect(offenders).toEqual([]);
  });
});