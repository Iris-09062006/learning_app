"use client";

import { useState } from "react";
import type { ReviewStatus, SubmitReviewInput } from "../types";
import type { GeneratedExerciseContent } from "@/features/ai/types";

interface ModerationReviewFormProps {
  exerciseId: number;
  initialTitle: string;
  initialDescription: string;
  initialContent: GeneratedExerciseContent;
  onSuccess: () => void;
}

const decisionOptions: { value: ReviewStatus; label: string; badge: string }[] = [
  {
    value: "approved",
    label: "Duyệt",
    badge: "text-emerald-800 border-emerald-200 bg-emerald-50",
  },
  {
    value: "needs_revision",
    label: "Cần chỉnh sửa",
    badge: "text-amber-800 border-amber-200 bg-amber-50",
  },
  {
    value: "rejected",
    label: "Từ chối",
    badge: "text-red-800 border-red-200 bg-red-50",
  },
];

export function ModerationReviewForm({
  exerciseId,
  initialTitle,
  initialDescription,
  initialContent,
  onSuccess,
}: ModerationReviewFormProps) {
  const [status, setStatus] = useState<ReviewStatus>("approved");
  const [feedback, setFeedback] = useState("");

  // Optional edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialTitle);
  const [editedDescription, setEditedDescription] = useState(initialDescription);
  const [contentJson, setContentJson] = useState(
    JSON.stringify(initialContent, null, 2)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedContent: GeneratedExerciseContent | undefined = undefined;

      if (isEditing) {
        try {
          parsedContent = JSON.parse(contentJson);
        } catch {
          throw new Error("Định dạng JSON của nội dung bài tập không hợp lệ");
        }
      }

      const payload: SubmitReviewInput = {
        generatedExerciseId: exerciseId,
        status,
        feedback: feedback.trim() ? feedback.trim() : undefined,
        ...(isEditing && {
          editedTitle: editedTitle.trim() || undefined,
          editedDescription: editedDescription.trim() || undefined,
          editedContent: parsedContent,
        }),
      };

      const res = await fetch(
        `/api/moderation/generated-exercises/${exerciseId}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể gửi đánh giá");
      }

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi không xác định");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Gửi đánh giá kiểm duyệt
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Đưa ra quyết định cho bài tập này trước khi xuất bản
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Quyết định đánh giá
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {decisionOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${
                status === option.value
                  ? "border-slate-900 bg-slate-50 dark:border-indigo-500 dark:bg-slate-800"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
                className="h-4 w-4 text-slate-900 focus:ring-indigo-500 dark:text-indigo-500"
              />
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${option.badge}`}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="feedback"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Phản hồi / Lý do <span className="text-slate-400">(tùy chọn)</span>
        </label>
        <textarea
          id="feedback"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Nhập ghi chú hoặc hướng dẫn cho quyết định của bạn..."
          className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Chỉnh sửa bài tập <span className="text-slate-400">(tùy chọn)</span>
            </span>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Thay đổi tiêu đề, mô tả hoặc cấu trúc nội dung trước khi duyệt.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa nội dung"}
          </button>
        </div>

        {isEditing && (
          <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div>
              <label
                htmlFor="editedTitle"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tiêu đề
              </label>
              <input
                id="editedTitle"
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="editedDescription"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Mô tả
              </label>
              <textarea
                id="editedDescription"
                rows={2}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="contentJson"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Nội dung bài tập (JSON)
              </label>
              <textarea
                id="contentJson"
                rows={8}
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {loading ? "Đang gửi..." : "Gửi đánh giá"}
        </button>
      </div>
    </form>
  );
}