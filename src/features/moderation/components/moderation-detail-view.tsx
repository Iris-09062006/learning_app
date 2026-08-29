"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ModerationQueueItem } from "../types";
import type { GeneratedExerciseContent } from "@/features/ai/types";
import { ModerationReviewForm } from "./moderation-review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";

interface ModerationDetailViewProps {
  id: number;
}

const statusConfig: Record<string, { badge: string; dot: string }> = {
  pending: {
    badge: "bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  under_review: {
    badge: "bg-info-soft text-info",
    dot: "bg-info",
  },
  approved: {
    badge: "bg-success-soft text-success",
    dot: "bg-success",
  },
  needs_revision: {
    badge: "bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  rejected: {
    badge: "bg-danger-soft text-danger",
    dot: "bg-danger",
  },
  published: {
    badge: "bg-primary-soft text-primary",
    dot: "bg-primary",
  },
};

const defaultStatusConfig = {
  badge: "bg-surface-subtle text-text-secondary",
  dot: "bg-text-muted",
};

function ExerciseDraftPreview({ content }: { content: GeneratedExerciseContent }) {
  const choiceOptions = "options" in content ? content.options : [];
  return (
    <section aria-labelledby="exercise-preview-heading" className="mt-4 rounded-xl border border-border bg-surface-subtle p-4">
      <h2 id="exercise-preview-heading" className="text-sm font-semibold text-text-primary">Nội dung theo định dạng</h2>
      {content.type === "scenario" && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-text-primary">{content.scenario}</p>}
      {(content.type === "predict_output" || content.type === "fix_the_bug") && (
        <pre aria-label="Code của bài tập" tabIndex={0} className="mt-3 max-w-full overflow-x-auto rounded-lg bg-code-background p-4 font-mono text-sm text-code-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"><code>{content.codeSnippet}</code></pre>
      )}
      {choiceOptions.length > 0 && (
        <ol className="mt-3 space-y-2">
          {choiceOptions.map((option) => <li key={option} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary">{option}</li>)}
        </ol>
      )}
      {content.type === "true_false" && <p className="mt-3 text-sm text-text-secondary">Đáp án mong đợi: <strong>{content.correctAnswer ? "Đúng" : "Sai"}</strong></p>}
      {content.type === "short_answer" && <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">Đáp án mong đợi: <strong>{content.expectedAnswer}</strong></p>}
      {content.type === "ordering" && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text-primary">{content.correctOrder.map((item) => <li key={item}>{item}</li>)}</ol>
      )}
      {content.type === "matching" && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{content.pairs.map((pair) => <div key={pair.prompt} className="rounded-lg border border-border bg-surface p-3"><dt className="font-medium text-text-primary">{pair.prompt}</dt><dd className="mt-1 text-text-secondary">{pair.answer}</dd></div>)}</dl>
      )}
      {"correctAnswer" in content && typeof content.correctAnswer === "string" && <p className="mt-3 text-sm text-text-secondary">Đáp án đúng: <strong>{content.correctAnswer}</strong></p>}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary"><strong>Giải thích:</strong> {content.explanation}</p>
    </section>
  );
}

export function ModerationDetailView({ id }: ModerationDetailViewProps) {
  const [item, setItem] = useState<ModerationQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/moderation/generated-exercises/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Bài tập không tồn tại");
        }
        throw new Error("Không thể tải chi tiết bài tập");
      }
      const data: ModerationQueueItem = await res.json();
      setItem(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch(`/api/moderation/generated-exercises/${id}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xuất bản bài tập");
      }

      const result = await res.json();
      setPublishSuccess(
        `Exercise successfully published! Created exercise #${result.publishedExerciseId}`
      );
      await fetchDetail();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPublishError(err.message);
      } else {
        setPublishError("Không thể xuất bản bài tập");
      }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main aria-busy="true" className="space-y-6">
        <span className="sr-only" role="status">Đang tải chi tiết kiểm duyệt…</span>
        <div className="h-5 w-40 animate-pulse rounded bg-surface-container" />
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-surface-container" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-container" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-container" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container" />
            <div className="h-48 w-full animate-pulse rounded-lg bg-surface-container" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="space-y-4">
        <Link
          href="/moderation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          &larr; Quay lại hàng đợi kiểm duyệt
        </Link>
        <StatePanel variant="error" title="Lỗi">
          {error || "Bài tập không tồn tại"}
        </StatePanel>
      </main>
    );
  }

  const status = statusConfig[item.status] ?? defaultStatusConfig;

  return (
    <main className="min-w-0 space-y-6 pb-16 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/moderation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          &larr; Quay lại hàng đợi kiểm duyệt
        </Link>

        {item.status === "approved" && (
          <Button
            onClick={handlePublish}
            isLoading={publishing}
            disabled={publishing}
          >
            {publishing ? "Publishing..." : "Publish to Production"}
          </Button>
        )}
      </div>

      {publishError && (
        <div
          role="alert"
          className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {publishError}
        </div>
      )}

      {publishSuccess && (
        <div
          role="alert"
          className="rounded-xl border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {publishSuccess}
        </div>
      )}

      <div className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-text-primary">
              {item.title}
            </h1>
            <p className="mt-1 break-words text-sm text-text-muted">
              ID: #{item.id} | Bài học: {item.lessonTitle ?? `#${item.lessonId}`}
            </p>
          </div>
          <Badge className={`shrink-0 gap-1.5 font-semibold ${status.badge}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
            {item.status.replace("_", " ")}
          </Badge>
        </div>

        <p className="mt-4 break-words text-sm leading-relaxed text-text-secondary">
          {item.description}
        </p>

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 border-y border-border py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Loại
            </span>
            <span className="mt-1 block break-words font-medium capitalize text-text-primary">
              {item.exerciseType.replace("_", " ")}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Độ khó
            </span>
            <span className="mt-1 block break-words font-medium capitalize text-text-primary">
              {item.difficulty}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Nhà cung cấp AI
            </span>
            <span className="mt-1 block break-words font-medium capitalize text-text-primary">
              {item.provider} ({item.model || "N/A"})
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Ngày tạo
            </span>
            <span className="mt-1 block font-medium text-text-primary">
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <ExerciseDraftPreview content={item.content} />

        <details className="mt-4">
          <summary className="mb-2 flex cursor-pointer items-center justify-between text-sm font-semibold text-text-primary">
            <span>Payload bài tập (JSON)</span>
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {JSON.stringify(item.content).length.toLocaleString()} bytes
            </span>
          </summary>
          <pre
            aria-label="Payload bài tập dạng JSON"
            tabIndex={0}
            className="max-h-96 max-w-full overflow-x-auto rounded-lg bg-code-background p-4 font-mono text-xs leading-relaxed text-code-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {JSON.stringify(item.content, null, 2)}
          </pre>
        </details>
      </div>

      {item.reviews && item.reviews.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Lịch sử kiểm duyệt</h2>
          <ol className="mt-4 space-y-3">
            {item.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <strong className="capitalize text-text-primary">
                    {review.status.replace("_", " ")}
                  </strong>
                  <time className="text-text-muted">
                    {new Date(review.createdAt).toLocaleString()}
                  </time>
                </div>
                {review.feedback && (
                  <p className="mt-1 break-words text-text-secondary">{review.feedback}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {item.status !== "published" && (
        <ModerationReviewForm
          exerciseId={item.id}
          initialTitle={item.title}
          initialDescription={item.description}
          initialExerciseType={item.exerciseType}
          initialDifficulty={item.difficulty}
          initialContent={item.content}
          onSuccess={fetchDetail}
        />
      )}
    </main>
  );
}
