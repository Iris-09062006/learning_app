"use client";

import { useEffect, useState } from "react";

import { LearningRecommendationCard } from "@/features/ai/components/learning-recommendation-card";
import type { CourseRecommendationResult } from "@/features/ai/types";

interface CourseLearningRecommendationProps {
  courseId: number;
}

type RecommendationState =
  | { status: "loading" }
  | { status: "ready"; data: CourseRecommendationResult }
  | { status: "unavailable" };

export function CourseLearningRecommendation({
  courseId,
}: CourseLearningRecommendationProps) {
  const [state, setState] = useState<RecommendationState>({
    status: "loading",
  });

  useEffect(() => {
    let isActive = true;

    async function loadRecommendation() {
      try {
        const response = await fetch(
          `/api/courses/${courseId}/recommendations`,
          { method: "GET" }
        );

        if (!response.ok) {
          if (isActive) {
            setState({ status: "unavailable" });
          }
          return;
        }

        const data: CourseRecommendationResult =
          (await response.json()) as CourseRecommendationResult;

        if (isActive) {
          setState({ status: "ready", data });
        }
      } catch {
        if (isActive) {
          setState({ status: "unavailable" });
        }
      }
    }

    void loadRecommendation();

    return () => {
      isActive = false;
    };
  }, [courseId]);

  if (state.status === "loading") {
    return (
      <div
        className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
        aria-label="Đang tải gợi ý học tập"
        role="status"
      />
    );
  }

  if (state.status === "unavailable") {
    return null;
  }

  return <LearningRecommendationCard recommendation={state.data.recommendation} />;
}