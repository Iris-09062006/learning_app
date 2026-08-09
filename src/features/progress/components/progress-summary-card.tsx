import React from "react";
import Link from "next/link";
import type { CourseProgressResponse } from "@/features/progress/types";

interface ProgressSummaryCardProps {
  progress: CourseProgressResponse;
}

export function ProgressSummaryCard({ progress }: ProgressSummaryCardProps) {
  const { completedLessons, totalLessons, completionPercentage, lastAccessedLessonId } = progress;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
          Course Progress
        </h3>
        <span className="text-sm font-bold tabular-nums text-primary">
          {completionPercentage}%
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {completedLessons} of {totalLessons} lessons completed
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500 ease-in-out"
          style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completionPercentage}% completed`}
        />
      </div>
      {lastAccessedLessonId && (
        <div className="mt-4 border-t pt-4">
          <Link
            href={`/lessons/${lastAccessedLessonId}`}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Resume Learning
            <svg
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}