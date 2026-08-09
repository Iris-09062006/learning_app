"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUserListResult } from "@/features/admin/types";
import type { UserRole } from "@/features/auth/auth.types";

interface UserManagementViewProps { initialData: AdminUserListResult }

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export function UserManagementView({ initialData }: UserManagementViewProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function loadUsers(page = 1, clearMessage = true) {
    setIsLoading(true);
    if (clearMessage) setMessage(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(data.pageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    if (isActive) params.set("isActive", isActive);
    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const body = (await response.json()) as ApiResponse<AdminUserListResult>;
      if (!response.ok || !body.success || !body.data) {
        setMessage({ kind: "error", text: body.error?.message ?? "Không thể tải danh sách người dùng." });
        return;
      }
      setData(body.data);
    } catch {
      setMessage({ kind: "error", text: "Không thể kết nối tới máy chủ." });
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadUsers(1);
  }

  async function mutateUser(userId: string, kind: "role" | "status", value: UserRole | boolean) {
    setMutatingId(userId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/${kind}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "role" ? { role: value } : { isActive: value }),
      });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.success) {
        setMessage({ kind: "error", text: body.error?.message ?? "Không thể cập nhật người dùng." });
        return;
      }
      setMessage({ kind: "success", text: "Đã cập nhật người dùng và ghi audit log." });
      await loadUsers(data.page, false);
    } catch {
      setMessage({ kind: "error", text: "Không thể kết nối tới máy chủ." });
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleFilter} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="user-search" className="mb-2 block text-sm font-semibold">Tìm kiếm</label>
          <Input id="user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email hoặc username" />
        </div>
        <div>
          <label htmlFor="role-filter" className="mb-2 block text-sm font-semibold">Vai trò</label>
          <select id="role-filter" value={role} onChange={(event) => setRole(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">Tất cả</option><option value="learner">Learner</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="mb-2 block text-sm font-semibold">Trạng thái</label>
          <select id="status-filter" value={isActive} onChange={(event) => setIsActive(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">Tất cả</option><option value="true">Đang hoạt động</option><option value="false">Đã vô hiệu hóa</option>
          </select>
        </div>
        <div className="flex items-end"><Button type="submit" isLoading={isLoading} className="w-full">Áp dụng bộ lọc</Button></div>
      </form>

      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>{message.text}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
          <caption className="sr-only">Danh sách người dùng hệ thống</caption>
          <thead className="bg-slate-50 dark:bg-slate-950"><tr><th scope="col" className="px-4 py-3">Người dùng</th><th scope="col" className="px-4 py-3">Vai trò</th><th scope="col" className="px-4 py-3">Trạng thái</th><th scope="col" className="px-4 py-3">Ngày tạo</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4"><p className="font-semibold text-slate-900 dark:text-white">{user.username}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                <td className="px-4 py-4">
                  <label htmlFor={`role-${user.id}`} className="sr-only">Vai trò của {user.username}</label>
                  <select id={`role-${user.id}`} value={user.role} disabled={mutatingId === user.id} onChange={(event) => void mutateUser(user.id, "role", event.target.value as UserRole)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-950">
                    <option value="learner">Learner</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-4"><Button size="sm" variant={user.isActive ? "danger" : "secondary"} isLoading={mutatingId === user.id} onClick={() => void mutateUser(user.id, "status", !user.isActive)}>{user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}</Button></td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{new Intl.DateTimeFormat("vi-VN").format(new Date(user.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 ? <p className="p-8 text-center text-slate-500">Không tìm thấy người dùng phù hợp.</p> : null}
      </div>

      <nav aria-label="Phân trang người dùng" className="flex items-center justify-between gap-4">
        <Button variant="outline" disabled={data.page <= 1 || isLoading} onClick={() => void loadUsers(data.page - 1)}>Trang trước</Button>
        <span className="text-sm text-slate-600 dark:text-slate-300">Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.total} người dùng</span>
        <Button variant="outline" disabled={data.page >= data.totalPages || isLoading} onClick={() => void loadUsers(data.page + 1)}>Trang sau</Button>
      </nav>
    </div>
  );
}
