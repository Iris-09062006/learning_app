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
});