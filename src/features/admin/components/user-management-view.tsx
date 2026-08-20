"use client";

import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";
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
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

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
    const target = data.items.find((user) => user.id === userId);
    if (
      kind === "status"
      && value === false
      && target
      && !window.confirm(
        target.role === "learner"
          ? `Đuổi học viên ${target.username}? Tài khoản sẽ bị vô hiệu hóa và không thể đăng nhập.`
          : `Vô hiệu hóa tài khoản ${target.username}?`,
      )
    ) return;
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
      setMessage({
        kind: "success",
        text: kind === "status" && value === false && target?.role === "learner"
          ? "Đã đuổi học viên, vô hiệu hóa tài khoản và ghi audit log."
          : "Đã cập nhật người dùng và ghi audit log.",
      });
      await loadUsers(data.page, false);
    } catch {
      setMessage({ kind: "error", text: "Không thể kết nối tới máy chủ." });
    } finally {
      setMutatingId(null);
    }
  }

  async function requestRecovery(userId: string) {
    setRecoveringId(userId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/recover`, { method: "POST" });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.success) {
        setMessage({ kind: "error", text: body.error?.message ?? "Không thể gửi email recovery." });
        return;
      }
      setMessage({ kind: "success", text: "Đã gửi email recovery và ghi audit log." });
    } catch {
      setMessage({ kind: "error", text: "Không thể kết nối tới máy chủ." });
    } finally {
      setRecoveringId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <form onSubmit={handleFilter} className="grid min-w-0 gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="relative">
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Email hoặc username"
              aria-label="Tìm kiếm"
              className="bg-surface-container-low pl-10"
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
              />
            </svg>
          </div>
        </div>
        <div>
          <Select
            id="role-filter"
            label="Vai trò"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="learner">Learner</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div>
          <Select
            id="status-filter"
            label="Trạng thái"
            value={isActive}
            onChange={(event) => setIsActive(event.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã vô hiệu hóa</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={isLoading} className="w-full">Áp dụng bộ lọc</Button>
        </div>
      </form>

      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" : "rounded-lg border border-success bg-success-soft px-3 py-2 text-sm text-success"}>{message.text}</p> : null}

      <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[48rem] table-fixed divide-y divide-border text-left text-sm">
          <caption className="sr-only">Danh sách người dùng hệ thống</caption>
          <thead className="bg-surface-container-low">
            <tr>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Người dùng</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Vai trò</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Trạng thái</th>
              <th scope="col" className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary sm:table-cell">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4"><p className="break-all font-semibold text-text-primary">{user.username}</p><p className="break-all text-xs text-text-muted">{user.email}</p></td>
                <td className="px-4 py-4">
                  <div className="w-full max-w-40">
                    <label htmlFor={`role-${user.id}`} className="sr-only">Vai trò của {user.username}</label>
                    <Select
                      id={`role-${user.id}`}
                      value={user.role}
                      disabled={mutatingId === user.id}
                      onChange={(event) => void mutateUser(user.id, "role", event.target.value as UserRole)}
                      className="bg-surface-container-low"
                    >
                      <option value="learner">Learner</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={user.isActive ? "success" : "error"}>{user.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}</Badge>
                    <Button size="sm" variant={user.isActive ? "danger" : "secondary"} isLoading={mutatingId === user.id} onClick={() => void mutateUser(user.id, "status", !user.isActive)}>{user.isActive ? (user.role === "learner" ? "Đuổi học viên" : "Vô hiệu hóa") : "Kích hoạt"}</Button>
                    <Button size="sm" variant="outline" isLoading={recoveringId === user.id} onClick={() => void requestRecovery(user.id)}>Gửi recovery</Button>
                  </div>
                </td>
                <td className="hidden px-4 py-4 text-text-secondary sm:table-cell">{new Intl.DateTimeFormat("vi-VN").format(new Date(user.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 ? <StatePanel variant="empty" className="m-4 shadow-none">Không tìm thấy người dùng phù hợp.</StatePanel> : null}
      </div>

      <nav aria-label="Phân trang người dùng" className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" disabled={data.page <= 1 || isLoading} onClick={() => void loadUsers(data.page - 1)}>Trang trước</Button>
        <span className="text-sm text-text-secondary">Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.total} người dùng</span>
        <Button variant="outline" disabled={data.page >= data.totalPages || isLoading} onClick={() => void loadUsers(data.page + 1)}>Trang sau</Button>
      </nav>
    </div>
  );
}
