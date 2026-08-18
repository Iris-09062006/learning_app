"use client";

import React from "react";
import Link from "next/link";
import type { LearningRecommendation } from "@/features/ai/types";

interface LearningRecommendationCardProps {
  recommendation: LearningRecommendation | null;
  className?: string;
}

export function LearningRecommendationCard({
  recommendation,
  className = "",
}: LearningRecommendationCardProps) {
  if (!recommendation) {
    return (
      <div
        className={`rounded-xl border border-dashed border-border bg-surface-subtle p-5 text-text-secondary ${className}`}
        data-testid="no-recommendation-state"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-base shadow-sm">
            🔍
          </span>
          <p className="text-sm">Chưa có gợi ý học tập nào vào lúc này.</p>
        </div>
      </div>
    );
  }

  const getBadgeStyle = (type: LearningRecommendation["type"]) => {
    switch (type) {
      case "REVIEW_LESSON":
        return "bg-warning-soft text-warning";
      case "COURSE_COMPLETED":
        return "bg-success-soft text-success";
      case "RETRY_EXERCISE":
        return "bg-danger-soft text-danger";
      case "NEXT_LESSON":
      default:
        return "bg-info-soft text-info";
    }
  };

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      data-testid="learning-recommendation-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(
            recommendation.type
          )}`}
        >
          Gợi ý học tập
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-text-primary">
        {recommendation.title}
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
        {recommendation.description}
      </p>

      <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2">
        <p className="text-xs italic leading-relaxed text-text-muted">
          {recommendation.reason}
        </p>
      </div>

      <div className="mt-5">
        <Link
          href={recommendation.targetUrl}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          data-testid="recommendation-action-link"
        >
          {recommendation.type === "REVIEW_LESSON"
            ? "Xem lại bài học"
            : recommendation.type === "COURSE_COMPLETED"
            ? "Xem lại tổng quan"
            : "Học ngay"}
        </Link>
      </div>
    </div>
  );
}