"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ModerationQueueItem } from "../types";
import { ModerationReviewForm } from "./moderation-review-form";

interface ModerationDetailViewProps {
  id: number;
}

const statusBadge: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_revision: "border-amber-200 bg-amber-50 text-amber-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  published: "border-indigo-200 bg-indigo-50 text-indigo-800",
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
          throw new Error("Generated exercise not found");
        }
        throw new Error("Failed to fetch exercise details");
      }
      const data: ModerationQueueItem = await res.json();
      setItem(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred");
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
        throw new Error(data.error || "Failed to publish exercise");
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
        setPublishError("Failed to publish exercise");
      }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
        >
          &larr; Back to Moderation Queue
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-0.5">{error || "Item not found"}</p>
        </div>
      </div>
    );
  }

  const badgeClass = statusBadge[item.status] ?? statusBadge.pending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/moderation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
        >
          &larr; Back to Queue
        </Link>

        {item.status === "approved" && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {publishing ? "Publishing..." : "Publish to Production"}
          </button>
        )}
      </div>

      {publishError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {publishError}
        </div>
      )}

      {publishSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {publishSuccess}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {item.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ID: #{item.id} | Lesson: {item.lessonTitle ?? `#${item.lessonId}`}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${badgeClass}`}
          >
            {item.status.replace("_", " ")}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {item.description}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 border-y border-slate-200 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Type
            </span>
            <span className="mt-1 block font-medium capitalize text-slate-900 dark:text-white">
              {item.exerciseType.replace("_", " ")}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Difficulty
            </span>
            <span className="mt-1 block font-medium capitalize text-slate-900 dark:text-white">
              {item.difficulty}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              AI Provider
            </span>
            <span className="mt-1 block font-medium capitalize text-slate-900 dark:text-white">
              {item.provider} ({item.model || "N/A"})
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Created At
            </span>
            <span className="mt-1 block font-medium text-slate-900 dark:text-white">
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Exercise Payload (JSON)
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {JSON.stringify(item.content).length.toLocaleString()} bytes
            </span>
          </div>
          <pre className="max-h-96 overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:bg-slate-950 dark:text-slate-200">
            {JSON.stringify(item.content, null, 2)}
          </pre>
        </div>
      </div>

      {item.reviews && item.reviews.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch sử kiểm duyệt</h2>
          <ol className="mt-4 space-y-3">
            {item.reviews.map((review) => (
              <li key={review.id} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex justify-between gap-3">
                  <strong>{review.status.replace("_", " ")}</strong>
                  <time>{new Date(review.createdAt).toLocaleString()}</time>
                </div>
                {review.feedback && <p className="mt-1 text-slate-600 dark:text-slate-300">{review.feedback}</p>}
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
