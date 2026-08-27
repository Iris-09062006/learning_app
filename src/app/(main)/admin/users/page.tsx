import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { createProductTitle } from "@/config/product";
import { UserManagementView } from "@/features/admin/components/user-management-view";
import { AdminServiceError, listAdminUsers } from "@/features/admin/services/admin-service";

export const metadata: Metadata = { title: createProductTitle("Quản lý người dùng") };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  try {
    const users = await listAdminUsers({ page: 1, pageSize: 20 });
    return (
      <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
        <PageContainer className="pb-16 lg:pb-0">
          <PageHeader
            eyebrow="Administration"
            title="Quản lý người dùng"
            description="Tìm kiếm, phân quyền và quản lý trạng thái tài khoản."
            actions={
              <Link
                href="/admin/system"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Xem system health
              </Link>
            }
          />
          <UserManagementView initialData={users} />
        </PageContainer>
      </main>
    );
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AdminServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
