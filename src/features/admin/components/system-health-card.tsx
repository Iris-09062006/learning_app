"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { HealthResponse } from "@/features/admin/types";

interface SystemHealthCardProps { initialHealth: HealthResponse }

export function SystemHealthCard({ initialHealth }: SystemHealthCardProps) {
  const [health, setHealth] = useState(initialHealth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch("/api/system/health", { cache: "no-store" });
      const body = (await response.json()) as { data?: HealthResponse };
      if (!body.data) { setError("Không thể đọc trạng thái hệ thống."); return; }
      setHealth(body.data);
    } catch { setError("Không thể kết nối tới health endpoint."); }
    finally { setIsLoading(false); }
  }

  const healthy = health.status === "ok";
  return (
    <section aria-labelledby="health-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${healthy ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{healthy ? "Hoạt động bình thường" : "Suy giảm"}</p><h2 id="health-heading" className="mt-3 text-xl font-bold">System health</h2></div><Button variant="outline" isLoading={isLoading} onClick={() => void refresh()}>Kiểm tra lại</Button></div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-slate-500">Ứng dụng</dt><dd className="mt-1 font-semibold">{health.status}</dd></div><div><dt className="text-sm text-slate-500">Database</dt><dd className="mt-1 font-semibold">{health.database}</dd></div><div><dt className="text-sm text-slate-500">Cập nhật</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(health.timestamp))}</dd></div></dl>
      {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}
      <p className="mt-6 text-xs text-slate-500">Basic health check không gọi AI provider và không hiển thị URL, credential hoặc lỗi nội bộ.</p>
    </section>
  );
}
