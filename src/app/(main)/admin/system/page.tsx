import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createProductTitle } from "@/config/product";
import { SystemHealthCard } from "@/features/admin/components/system-health-card";
import {
  AdminServiceError,
  assertAdminAccess,
  getSystemHealth,
} from "@/features/admin/services/admin-service";

export const metadata: Metadata = { title: createProductTitle("System health") };
export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  try {
    const [, health] = await Promise.all([assertAdminAccess(), getSystemHealth()]);
    return <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><Link href="/admin/users" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">&larr; Quản lý người dùng</Link><header className="my-8"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Operations</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Trạng thái hệ thống</h1></header><SystemHealthCard initialHealth={health} /></div></main>;
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AdminServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
