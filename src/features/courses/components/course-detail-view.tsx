"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
      <div
        data-testid="course-detail-header"
        className="rounded-xl border border-border bg-surface p-8 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {course.language.toUpperCase()}
          </span>
          <span className="text-xs capitalize text-text-muted">
            Cấp độ: {course.level}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
          {course.title}
        </h1>

        <p className="mt-4 text-base text-text-secondary">
          {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <span>{course.chapterCount} chương</span>
            <span>&bull;</span>
            <span>{course.lessonCount} bài học</span>
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
              <p role="alert" className="max-w-xs text-right text-xs text-danger">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chapters summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">
          Nội dung khóa học
        </h2>

        {course.chapters.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nội dung bài học đang được cập nhật.
          </p>
        ) : (
          <div className="space-y-3">
            {course.chapters.map((ch) => (
              <div
                key={ch.id}
                data-testid="course-chapter-row"
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-sm font-bold text-primary"
                  >
                    {ch.chapterOrder}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {ch.title}
                    </h3>
                    {ch.description && (
                      <p className="mt-1 text-xs text-text-muted">
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