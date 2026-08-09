"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import type { CourseDetail } from "@/features/courses/types";

interface CourseDetailViewProps {
  course: CourseDetail;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({ course }) => {
  const router = useRouter();
  const [isEnrolled, setIsEnrolled] = useState(course.isEnrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEnrollment(): Promise<void> {
    if (isEnrolling) return;

    if (isEnrolled) {
      router.push(`/courses/${course.id}/roadmap`);
      return;
    }

    setIsEnrolling(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/courses/${course.id}/enroll`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { firstLessonId: number | null };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không thể đăng ký khóa học.");
      }

      setIsEnrolled(true);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể đăng ký khóa học."
      );
    } finally {
      setIsEnrolling(false);
    }
  }

  return (
    <div data-testid="course-detail-view" className="space-y-8">
      {/* Header section */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="rounded bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {course.language.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500 capitalize dark:text-slate-400">
            Cấp độ: {course.level}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
          {course.title}
        </h1>

        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
          {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span>{course.chapterCount} chương</span>
            <span>&bull;</span>
            <span>{course.lessonCount} bài học</span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleEnrollment}
              disabled={isEnrolling}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnrolled && !isEnrolling && (
                <svg
                  aria-hidden="true"
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 4v16" />
                  <path d="M6 4h9a3 3 0 0 1 0 6H6" />
                  <path d="M6 10h10a3 3 0 0 1 0 6H6" />
                </svg>
              )}
              {isEnrolling
                ? "Đang đăng ký..."
                : isEnrolled
                  ? "Bắt đầu học"
                  : "Đăng ký khóa học"}
            </button>
            {errorMessage && (
              <p role="alert" className="max-w-xs text-right text-xs text-red-600">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chapters summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Nội dung khóa học
        </h2>

        {course.chapters.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nội dung bài học đang được cập nhật.
          </p>
        ) : (
          <div className="space-y-3">
            {course.chapters.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                  >
                    {ch.chapterOrder}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {ch.title}
                    </h3>
                    {ch.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {ch.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {ch.lessonCount} bài học
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};