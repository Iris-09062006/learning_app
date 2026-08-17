"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { LessonMarkdown } from "@/features/lessons/components/lesson-markdown";
import type { LessonResponse } from "@/features/lessons/types";
import type { ProgressStatus } from "@/features/courses/types";

interface LessonContentViewProps {
  lesson: LessonResponse;
}

const statusDetails: Record<Exclude<ProgressStatus, "locked">, { label: string; classes: string }> = {
  unlocked: { label: "Sẵn sàng", classes: "bg-warning-soft text-warning" },
  inProgress: { label: "Đang học", classes: "bg-info-soft text-info" },
  completed: { label: "Hoàn thành", classes: "bg-success-soft text-success" },
};

function formatExerciseType(type: string): string {
  return type === "fix_the_bug" ? "Sửa lỗi" : "Đoán kết quả";
}

function formatDifficulty(difficulty: string): string {
  if (difficulty === "easy") return "Dễ";
  if (difficulty === "hard") return "Khó";
  return "Trung bình";
}

export const LessonContentView: React.FC<LessonContentViewProps> = ({ lesson }) => {
  const router = useRouter();
  const [status, setStatus] = useState<ProgressStatus>(lesson.status);
  const [isStarting, setIsStarting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [advanceErrorMessage, setAdvanceErrorMessage] = useState<string | null>(null);
  const [shouldFocusContent, setShouldFocusContent] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const isContentVisible = status === "inProgress" || status === "completed";
  const visibleStatus = status === "locked" ? statusDetails.unlocked : statusDetails[status];

  useEffect(() => {
    if (!shouldFocusContent || !isContentVisible) return;
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    setShouldFocusContent(false);
  }, [isContentVisible, shouldFocusContent]);

  async function handleStartLesson(): Promise<void> {
    if (isStarting) return;

    if (isContentVisible) {
      contentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/lessons/${lesson.id}/start`, { method: "POST" });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { status?: ProgressStatus };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không thể bắt đầu bài học.");
      }

      setStatus(payload.data?.status === "completed" ? "completed" : "inProgress");
      setShouldFocusContent(true);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể bắt đầu bài học.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleNextLesson(): Promise<void> {
    if (!lesson.nextLesson || isAdvancing) return;

    setIsAdvancing(true);
    setAdvanceErrorMessage(null);

    try {
      const response = await fetch(`/api/lessons/${lesson.nextLesson.id}/start`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không thể mở bài học tiếp theo.");
      }

      router.push(`/lessons/${lesson.nextLesson.id}`);
    } catch (error: unknown) {
      setAdvanceErrorMessage(
        error instanceof Error ? error.message : "Không thể mở bài học tiếp theo.",
      );
      setIsAdvancing(false);
    }
  }

  return (
    <div data-testid="lesson-content-view" className="space-y-8 pb-16 lg:pb-0">
      <nav aria-label="Điều hướng bài học">
        <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-primary">
          <span aria-hidden="true">←</span>
          Quay lại khóa học
        </Link>
      </nav>

      <header className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-container">Bài {lesson.order}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${visibleStatus.classes}`}>{visibleStatus.label}</span>
              {lesson.estimatedMinutes !== null && <span className="text-sm text-text-muted">Khoảng {lesson.estimatedMinutes} phút</span>}
            </div>
            <h1 className="mt-4 max-w-3xl break-words text-2xl font-bold tracking-tight text-text-primary sm:text-[2rem] sm:leading-10">{lesson.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
              {isContentVisible ? "Tiếp tục từ nội dung bên dưới và hoàn thành các bài tập để củng cố kiến thức." : "Bắt đầu khi bạn đã sẵn sàng. Nội dung bài học sẽ mở ngay tại đây."}
            </p>
          </div>

          <div className="flex min-w-48 flex-col items-stretch gap-2 lg:items-end">
            <Button
              type="button"
              onClick={handleStartLesson}
              isLoading={isStarting}
              size="lg"
              className="gap-2 font-bold dark:bg-primary-container dark:text-on-primary-container dark:hover:bg-primary-fixed-dim dark:hover:text-on-primary-container dark:active:bg-primary-soft dark:active:text-on-primary-container"
              aria-describedby={errorMessage ? "lesson-start-error" : undefined}
            >
              <span aria-hidden="true">
                {isContentVisible ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    shapeRendering="crispEdges"
                    className="size-4"
                  >
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </span>
              {isStarting ? "Đang mở bài học..." : isContentVisible ? (status === "completed" ? "Ôn lại nội dung" : "Tiếp tục học") : "Bắt đầu bài học"}
            </Button>
            <p className="text-center text-xs text-text-muted lg:text-right">Tiến độ được lưu tự động</p>
          </div>
        </div>

        {errorMessage && <p id="lesson-start-error" role="alert" className="mt-5 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{errorMessage}</p>}
        <p className="sr-only" aria-live="polite">{isStarting ? "Đang mở bài học" : isContentVisible ? "Nội dung bài học đã sẵn sàng" : ""}</p>
      </header>

      {!isContentVisible ? (
        <section aria-labelledby="lesson-preview-title" className="rounded-xl border border-dashed border-primary bg-primary-soft px-6 py-10 text-center sm:px-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-surface text-2xl shadow-sm" aria-hidden="true">📖</div>
          <h2 id="lesson-preview-title" className="mt-5 text-xl font-bold text-text-primary">Nội dung đang chờ bạn</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">Nhấn “Bắt đầu bài học” để ghi nhận tiến độ và mở toàn bộ nội dung.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <div className="min-w-0 space-y-8">
            <article ref={contentRef} tabIndex={-1} aria-labelledby="lesson-body-title" className="scroll-mt-20 rounded-xl border border-border bg-surface p-6 shadow-sm outline-none sm:p-8">
              <div className="mb-8 flex items-center gap-4 border-b border-border pb-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-lg" aria-hidden="true">✦</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Nội dung chính</p>
                  <h2 id="lesson-body-title" className="mt-2 text-xl font-semibold leading-7 text-text-primary">Bài học</h2>
                </div>
              </div>
              {lesson.content?.trim() ? <LessonMarkdown content={lesson.content} /> : <div className="rounded-xl bg-surface-subtle px-5 py-8 text-center text-sm text-text-secondary">Nội dung bài học đang được cập nhật.</div>}
            </article>

            <section aria-labelledby="lesson-exercises-title" className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Luyện tập</p>
                  <h2 id="lesson-exercises-title" className="mt-2 text-xl font-semibold leading-7 text-text-primary">Bài tập của bài học</h2>
                </div>
                {lesson.exercises.length > 0 && <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-text-secondary">{lesson.exercises.length} bài</span>}
              </div>

              {lesson.exercises.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border-strong bg-surface-subtle px-5 py-8 text-center text-sm text-text-secondary">Chưa có bài tập cho bài học này. Bạn có thể xem lại nội dung phía trên.</div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {lesson.exercises.map((exercise) => (
                    <article key={exercise.id} className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 transition hover:border-primary hover:bg-primary-soft sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary">{exercise.order}</span>
                        <div>
                          <h3 className="text-base font-semibold leading-6 text-text-primary">{exercise.title}</h3>
                          <p className="mt-1 text-sm text-text-secondary">{formatExerciseType(exercise.type)} · {formatDifficulty(exercise.difficulty)}</p>
                        </div>
                      </div>
                      <Link href={`/exercises/${exercise.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-surface px-4 py-2 text-sm font-bold text-primary transition group-hover:bg-primary group-hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Làm bài <span aria-hidden="true" className="ml-2">→</span></Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {isContentVisible && lesson.nextLesson ? (
              <nav aria-label="Bài tiếp theo" className="relative rounded-xl border border-border bg-surface p-5">
                <span aria-hidden="true" className="absolute inset-y-5 left-0 w-1 rounded-r-md bg-primary" />
                <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Bài tiếp theo</p>
                    <p className="mt-1 break-words font-bold text-text-primary">{lesson.nextLesson.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">Bạn có thể tiếp tục ngay; bài hiện tại vẫn giữ đúng tiến độ đã đạt.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleNextLesson}
                    size="md"
                    disabled={isAdvancing}
                    aria-describedby={advanceErrorMessage ? "lesson-next-error" : undefined}
                    className="mt-3 shrink-0 gap-2 sm:mt-0"
                  >
                    {isAdvancing ? "Đang mở..." : "Tiếp theo"} <span aria-hidden="true">→</span>
                  </Button>
                </div>
                {advanceErrorMessage ? (
                  <p id="lesson-next-error" role="alert" className="mt-3 text-sm font-medium text-danger">
                    {advanceErrorMessage}
                  </p>
                ) : null}
              </nav>
            ) : null}
          </div>

          <aside aria-label="Thông tin bài học" className="min-w-0 space-y-4 lg:sticky lg:top-6">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Tổng quan</p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Trạng thái</dt><dd className="font-semibold text-text-primary">{visibleStatus.label}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Thời lượng</dt><dd className="font-semibold text-text-primary">{lesson.estimatedMinutes ?? "—"}{lesson.estimatedMinutes !== null ? " phút" : ""}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Bài tập</dt><dd className="font-semibold text-text-primary">{lesson.exercises.length}</dd></div>
              </dl>
            </div>
            <Link href="/courses" className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Xem lộ trình khác</Link>
          </aside>
        </div>
      )}
    </div>
  );
};
