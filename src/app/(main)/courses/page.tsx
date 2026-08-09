import type { Metadata } from "next";
import Link from "next/link";

import { CourseList } from "@/features/courses/components/course-list";
import {
  CourseSearchForm,
  createCourseCatalogHref,
} from "@/features/courses/components/course-search-form";
import {
  getPublishedCourses,
  normalizeCourseSearch,
} from "@/features/courses/services/course-service";

export const metadata: Metadata = {
  title: "Danh sách khóa học | Python Learning Platform",
  description: "Khám phá các khóa học Python đã được phát hành.",
};

interface CoursesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function CoursesPage({
  searchParams,
}: CoursesPageProps) {
  const query = await searchParams;
  const search = normalizeCourseSearch(query.search);
  const result = await getPublishedCourses({ ...query, search });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Python Learning Platform
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Danh sách khóa học
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Chọn một khóa học phù hợp với cấp độ của bạn và bắt đầu hành trình
            học Python.
          </p>
        </header>

        <CourseSearchForm search={search} pageSize={result.pageSize} />

        <CourseList courses={result.items} search={search} />

        {result.totalPages > 1 && (
          <nav
            aria-label="Phân trang khóa học"
            className="mt-10 flex items-center justify-center gap-4"
          >
            {result.page > 1 ? (
              <Link
                href={createCourseCatalogHref({
                  page: result.page - 1,
                  pageSize: result.pageSize,
                  search,
                })}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Trang trước
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-400 dark:border-slate-800">
                Trang trước
              </span>
            )}

            <span className="text-sm text-slate-600 dark:text-slate-300">
              Trang {result.page} / {result.totalPages}
            </span>

            {result.page < result.totalPages ? (
              <Link
                href={createCourseCatalogHref({
                  page: result.page + 1,
                  pageSize: result.pageSize,
                  search,
                })}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Trang sau
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-400 dark:border-slate-800">
                Trang sau
              </span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
