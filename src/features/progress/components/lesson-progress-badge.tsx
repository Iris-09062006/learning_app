"use client";

import React from "react";

import type { ProgressStatus } from "@/features/courses/types";

interface LessonProgressBadgeProps {
  status: ProgressStatus;
}

const STATUS_LABELS: Record<ProgressStatus, string> = {
  locked: "Đã khóa",
  unlocked: "Đã mở",
  inProgress: "Đang học",
  completed: "Hoàn thành",
};

export const LessonProgressBadge: React.FC<LessonProgressBadgeProps> = ({
  status,
}) => {
  const dotClass =
    status === "completed"
      ? "bg-green-500 dark:bg-green-400"
      : status === "inProgress"
        ? "bg-indigo-500 dark:bg-indigo-400"
        : status === "unlocked"
          ? "bg-slate-400 dark:bg-slate-500"
          : "bg-slate-300 dark:bg-slate-600";

  return (
    <span
      data-testid="lesson-progress-badge"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "completed"
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : status === "inProgress"
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
            : status === "unlocked"
              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-1.5 shrink-0 rounded-full ${dotClass}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
};
