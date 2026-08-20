import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
    dot: "bg-warning",
    badge: "bg-warning-soft text-warning",
  },
  approved: {
    label: "Đã duyệt",
    dot: "bg-success",
    badge: "bg-success-soft text-success",
  },
  rejected: {
    label: "Từ chối",
    dot: "bg-danger",
    badge: "bg-danger-soft text-danger",
  },
  needs_revision: {
    label: "Cần chỉnh sửa",
    dot: "bg-info",
    badge: "bg-info-soft text-info",
  },
  published: {
    label: "Đã xuất bản",
    dot: "bg-primary",
    badge: "bg-primary-soft text-primary",
  },
};

const defaultStatusConfig = {
  label: "Khác",
  dot: "bg-text-muted",
  badge: "bg-surface-subtle text-text-secondary",
};

export function ModerationQueueItemCard({
  item,
}: ModerationQueueItemCardProps) {
  const status = statusConfig[item.status] ?? defaultStatusConfig;

  const difficultyColors: Record<string, string> = {
    beginner: "bg-success-soft text-success",
    intermediate: "bg-warning-soft text-warning",
    advanced: "bg-danger-soft text-danger",
  };

  const difficultyClass =
    difficultyColors[item.difficulty as string] ??
    "bg-surface-container text-text-secondary";

  const difficultyLabel: Record<string, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex min-w-0 items-start justify-between gap-4">
        <h3
          className="min-w-0 flex-1 truncate text-lg font-bold text-text-primary"
          title={item.title}
        >
          {item.title}
        </h3>
        <Badge className={`shrink-0 gap-1.5 font-semibold ${status.badge}`}>
          <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </Badge>
      </div>

      <p className="mb-4 line-clamp-2 break-words text-sm text-text-secondary">
        {item.description || "Chưa có mô tả."}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-medium text-text-secondary">
          {item.exerciseType}
        </span>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${difficultyClass}`}
        >
          {difficultyLabel[item.difficulty as string] ?? item.difficulty}
        </span>
        {item.lessonTitle && (
          <span className="max-w-[200px] truncate rounded-md bg-info-soft px-2.5 py-1 text-xs font-medium text-info">
            {item.lessonTitle}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
        <span>Tạo {formatRelativeTime(item.createdAt)}</span>
        <Link
          href={`/moderation/${item.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Xem & duyệt
          <svg
            aria-hidden="true"
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
