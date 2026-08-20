"use client";

import React from "react";
import Link from "next/link";

import { StatePanel } from "@/components/ui/state-panel";
import type { RoadmapResponse } from "@/features/courses/types";

interface CourseRoadmapViewProps {
  roadmap: RoadmapResponse;
}

export const CourseRoadmapView: React.FC<CourseRoadmapViewProps> = ({
  roadmap,
}) => {
  return (
    <div data-testid="course-roadmap-view" className="min-w-0 space-y-8">
      {/* Header section with progress */}
      <div data-testid="roadmap-header-card" className="rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="break-words text-3xl font-bold tracking-tight text-text-primary">
          Lộ trình học: {roadmap.course.title}
        </h1>
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm font-medium text-text-secondary">
            <span>Tiến độ hoàn thành</span>
            <span>{roadmap.completionPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              data-testid="progress-bar-fill"
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${roadmap.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chapters & Lessons */}
      <div className="space-y-6">
        {roadmap.chapters.length === 0 ? (
          <StatePanel variant="empty" className="shadow-none">
            Chưa có bài học nào được xuất bản.
          </StatePanel>
        ) : (
          roadmap.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="rounded-xl border border-border bg-surface"
            >
              <div className="border-b border-border bg-surface-subtle px-6 py-4">
                <h2 className="break-words text-lg font-bold text-text-primary">
                  Chương {chapter.order}: {chapter.title}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {chapter.lessons.length === 0 ? (
                  <p
                    role="status"
                    className="m-4 rounded-lg border border-dashed border-border bg-surface-subtle px-4 py-5 text-center text-sm text-text-muted"
                  >
                    Chương này chưa có bài học.
                  </p>
                ) : (
                  chapter.lessons.map((lesson) => {
                    const isLocked = lesson.status === "locked";
                    const isCompleted = lesson.status === "completed";
                    const isInProgress = lesson.status === "inProgress";

                    return (
                      <div
                        key={lesson.id}
                        data-testid={`lesson-${lesson.id}-status`}
                        data-status={lesson.status}
                        className={`flex items-center justify-between gap-4 p-6 transition-colors ${
                          isLocked
                            ? "bg-surface-subtle"
                            : "hover:bg-surface-subtle"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
                              {isCompleted && (
                                <svg
                                  data-testid="icon-completed"
                                  className="h-6 w-6 text-success"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                              {isInProgress && (
                                <svg
                                  data-testid="icon-in-progress"
                                  className="h-6 w-6 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                              {lesson.status === "unlocked" && (
                                <svg
                                  data-testid="icon-unlocked"
                                  className="h-6 w-6 text-text-muted"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <circle cx="12" cy="12" r="9" />
                                </svg>
                              )}
                              {isLocked && (
                                <svg
                                  data-testid="icon-locked"
                                  className="h-6 w-6 text-text-muted"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`break-words font-medium ${
                                    isLocked
                                      ? "text-text-muted"
                                      : "text-text-primary"
                                  }`}
                                >
                                  Bài {lesson.order}: {lesson.title}
                                </h3>
                                {isCompleted && (
                                  <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                                    Hoàn thành
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="inline-flex items-center rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info">
                                    Đang học
                                  </span>
                                )}
                              </div>
                              {lesson.estimatedMinutes && (
                                <p className="mt-1 text-xs text-text-muted">
                                  Thời gian ước tính: {lesson.estimatedMinutes}{" "}
                                  phút
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isLocked && (
                          <Link
                            href={`/lessons/${lesson.id}`}
                            className="inline-flex shrink-0 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                          >
                            {isCompleted ? "Xem lại" : "Học tiếp"}
                          </Link>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
