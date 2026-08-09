import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserManagementView } from "@/features/admin/components/user-management-view";
import { AdminServiceError, listAdminUsers } from "@/features/admin/services/admin-service";

export const metadata: Metadata = { title: "Quản lý người dùng | LearningApp" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  try {
    const users = await listAdminUsers({ page: 1, pageSize: 20 });
    return <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Administration</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Quản lý người dùng</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Tìm kiếm, phân quyền và quản lý trạng thái tài khoản.</p></div><Link href="/admin/system" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Xem system health</Link></header><UserManagementView initialData={users} /></div></main>;
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AdminServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
