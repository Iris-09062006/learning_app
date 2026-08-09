import Link from "next/link";
import type { ModerationQueueItem } from "../types";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "vừa xong";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

interface ModerationQueueItemCardProps {
  item: ModerationQueueItem;
}

const statusConfig: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  pending: {
    label: "Chờ duyệt",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-400/20",
  },
  approved: {
    label: "Đã duyệt",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-400/20",
  },
  rejected: {
    label: "Từ chối",
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400 dark:ring-red-400/20",
  },
  needs_revision: {
    label: "Cần chỉnh sửa",
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-400 dark:ring-sky-400/20",
  },
  published: {
    label: "Đã xuất bản",
    dot: "bg-violet-500",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-400/20",
  },
};

const defaultStatusConfig = {
  label: "Khác",
  dot: "bg-slate-400",
  badge:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20",
};

export function ModerationQueueItemCard({
  item,
}: ModerationQueueItemCardProps) {
  const status = statusConfig[item.status] ?? defaultStatusConfig;

  const difficultyColors: Record<string, string> = {
    beginner:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    intermediate:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    advanced: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  };

  const difficultyClass =
    difficultyColors[item.difficulty as string] ??
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  const difficultyLabel: Record<string, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3
          className="truncate text-lg font-bold text-slate-900 dark:text-white"
          title={item.title}
        >
          {item.title}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}
        >
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {item.description || "Chưa có mô tả."}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {item.exerciseType}
        </span>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${difficultyClass}`}
        >
          {difficultyLabel[item.difficulty as string] ?? item.difficulty}
        </span>
        {item.lessonTitle && (
          <span className="max-w-[200px] truncate rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-400">
            {item.lessonTitle}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>Tạo {formatRelativeTime(item.createdAt)}</span>
        <Link
          href={`/moderation/${item.id}`}
          className="inline-flex items-center gap-1 font-medium text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Xem & duyệt
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}