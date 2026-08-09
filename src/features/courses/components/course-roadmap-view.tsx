"use client";

import React from "react";
import Link from "next/link";

import type { RoadmapResponse } from "@/features/courses/types";

interface CourseRoadmapViewProps {
  roadmap: RoadmapResponse;
}

export const CourseRoadmapView: React.FC<CourseRoadmapViewProps> = ({
  roadmap,
}) => {
  return (
    <div data-testid="course-roadmap-view" className="space-y-8">
      {/* Header section with progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Lộ trình học: {roadmap.course.title}
        </h1>
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>Tiến độ hoàn thành</span>
            <span>{roadmap.completionPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              data-testid="progress-bar-fill"
              className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
              style={{ width: `${roadmap.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chapters & Lessons */}
      <div className="space-y-6">
        {roadmap.chapters.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chưa có bài học nào được xuất bản.
          </p>
        ) : (
          roadmap.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Chương {chapter.order}: {chapter.title}
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {chapter.lessons.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
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
                        className={`flex items-center justify-between gap-4 p-6 transition-colors ${
                          isLocked
                            ? "bg-slate-50 opacity-60 dark:bg-slate-900/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                              {isCompleted && (
                                <svg
                                  data-testid="icon-completed"
                                  className="h-6 w-6 text-green-500 dark:text-green-400"
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
                                  className="h-6 w-6 text-indigo-500 dark:text-indigo-400"
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
                                  className="h-6 w-6 text-slate-300 dark:text-slate-600"
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
                                  className="h-5 w-5 text-slate-400 dark:text-slate-500"
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
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`font-medium ${
                                    isLocked
                                      ? "text-slate-500 dark:text-slate-400"
                                      : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  Bài {lesson.order}: {lesson.title}
                                </h3>
                                {isCompleted && (
                                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:bg-green-950 dark:text-green-400">
                                    Hoàn thành
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                    Đang học
                                  </span>
                                )}
                              </div>
                              {lesson.estimatedMinutes && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Thời gian ước tính: {lesson.estimatedMinutes}{" "}
                                  phút
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isLocked && (
                          <Link
                            href={`/courses/${roadmap.course.id}/lessons/${lesson.id}`}
                            className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
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