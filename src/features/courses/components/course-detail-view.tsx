"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
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
    <div data-testid="course-detail-view" className="min-w-0 space-y-10">
      {/* Header section */}
      <div
        data-testid="course-detail-header"
        className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_70px_-45px_rgba(99,102,241,0.45)] sm:p-8"
      >
        <div aria-hidden="true" className="absolute -right-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs capitalize text-text-secondary">Cấp độ {course.level}</span>
        </div>

        <h1 className="relative mt-5 max-w-3xl break-words text-3xl font-semibold tracking-[-0.03em] text-text-primary [text-wrap:balance] sm:text-4xl">
          {course.title}
        </h1>

        <p className="relative mt-4 max-w-2xl break-words text-base leading-7 text-text-secondary">
          {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
        </p>

        <div className="relative mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="rounded-lg bg-surface-subtle px-3 py-2">{course.chapterCount} chương</span>
            <span className="rounded-lg bg-surface-subtle px-3 py-2">{course.lessonCount} bài học</span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button
              type="button"
              onClick={handleEnrollment}
              isLoading={isEnrolling}
              size="lg"
              className="gap-2 font-bold"
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
            </Button>
            {errorMessage && (
              <p
                role="alert"
                className="max-w-xs rounded-lg border border-danger bg-danger-soft px-3 py-2 text-left text-xs text-danger"
              >
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chapters summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          Nội dung khóa học
        </h2>

        {course.chapters.length === 0 ? (
          <StatePanel variant="empty" className="shadow-none">
            Nội dung bài học đang được cập nhật.
          </StatePanel>
        ) : (
          <div className="space-y-3">
            {course.chapters.map((ch) => (
              <div
                key={ch.id}
                data-testid="course-chapter-row"
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/30 sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-semibold text-primary"
                  >
                    {ch.chapterOrder}
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-text-primary">
                      {ch.title}
                    </h3>
                    {ch.description && (
                      <p className="mt-1 break-words text-xs text-text-muted">
                        {ch.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-text-muted">
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
