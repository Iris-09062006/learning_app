"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ModerationQueueItem } from "../types";
import { ModerationReviewForm } from "./moderation-review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      fetchDetail(); // Refresh data
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
      <div className="space-y-6">
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
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link
          href="/moderation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          &larr; Quay lại hàng đợi kiểm duyệt
        </Link>
        <div
          role="alert"
          className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <p className="font-semibold">Lỗi</p>
          <p className="mt-0.5">{error || "Bài tập không tồn tại"}</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[item.status] ?? defaultStatusConfig;

  return (
    <div className="space-y-6">
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

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {item.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              ID: #{item.id} | Bài học: {item.lessonTitle ?? `#${item.lessonId}`}
            </p>
          </div>
          <Badge className={`shrink-0 gap-1.5 font-semibold ${status.badge}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
            {item.status.replace("_", " ")}
          </Badge>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          {item.description}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 border-y border-border py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Loại
            </span>
            <span className="mt-1 block font-medium capitalize text-text-primary">
              {item.exerciseType.replace("_", " ")}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Độ khó
            </span>
            <span className="mt-1 block font-medium capitalize text-text-primary">
              {item.difficulty}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Nhà cung cấp AI
            </span>
            <span className="mt-1 block font-medium capitalize text-text-primary">
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

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              Payload bài tập (JSON)
            </h3>
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {JSON.stringify(item.content).length.toLocaleString()} bytes
            </span>
          </div>
          <pre className="max-h-96 overflow-x-auto rounded-lg bg-code-background p-4 font-mono text-xs leading-relaxed text-code-text">
            {JSON.stringify(item.content, null, 2)}
          </pre>
        </div>
      </div>

      {item.reviews && item.reviews.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Lịch sử kiểm duyệt</h2>
          <ol className="mt-4 space-y-3">
            {item.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <strong className="capitalize text-text-primary">
                    {review.status.replace("_", " ")}
                  </strong>
                  <time className="text-text-muted">
                    {new Date(review.createdAt).toLocaleString()}
                  </time>
                </div>
                {review.feedback && (
                  <p className="mt-1 text-text-secondary">{review.feedback}</p>
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
    </div>
  );
}
