"use client";

import { useState, useEffect, useCallback } from "react";
import type { ModerationQueueItem, ModerationQueueResult } from "../types";
import { ModerationQueueItemCard } from "./moderation-queue-item-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";

const statusOptions = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "needs_revision", label: "Cần chỉnh sửa" },
  { value: "rejected", label: "Từ chối" },
  { value: "published", label: "Đã xuất bản" },
  { value: "all", label: "Tất cả trạng thái" },
];

export function ModerationQueueView() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== "all") {
        queryParams.set("status", statusFilter);
      }
      queryParams.set("page", page.toString());
      queryParams.set("limit", limit.toString());

      const res = await fetch(
        `/api/moderation/generated-exercises?${queryParams.toString()}`
      );

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Bạn không có quyền truy cập. Cần quyền người duyệt.");
        }
        throw new Error("Không thể tải danh sách kiểm duyệt");
      }

      const data: ModerationQueueResult = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi không xác định");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Hàng đợi kiểm duyệt bài tập"
        description="Rà soát bài tập do AI tạo trước khi xuất bản"
        actions={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/moderation/lessons"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Tạo Exercise
            </Link>
            <div className="flex items-center gap-2">
              <label
                htmlFor="status-filter"
                className="text-sm font-medium text-text-primary"
              >
                Trạng thái:
              </label>
              <div className="w-44">
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        }
      />

      {loading ? (
        <StatePanel variant="loading" className="py-16">
          Đang tải danh sách...
        </StatePanel>
      ) : error ? (
        <StatePanel variant="error" title="Lỗi tải danh sách">
          {error}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel variant="empty" role="status" className="py-16">
          Không có bài tập nào khớp với bộ lọc hiện tại.
        </StatePanel>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <ModerationQueueItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span className="text-sm text-text-secondary">
            Trang {page} / {totalPages} ({total} mục)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
