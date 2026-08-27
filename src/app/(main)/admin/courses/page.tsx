import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createProductTitle } from "@/config/product";
import { CourseManagementView } from "@/features/admin/components/course-management-view";
import { AdminServiceError, listAdminCourses } from "@/features/admin/services/admin-service";

export const metadata: Metadata = { title: createProductTitle("Quản lý khóa học") };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  try {
    const courses = await listAdminCourses();
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Administration</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Quản lý khóa học</h1>
          </header>
          <CourseManagementView initialCourses={courses} />
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof AdminServiceError && error.code === "FORBIDDEN") redirect("/dashboard");
    throw error;
  }
}
