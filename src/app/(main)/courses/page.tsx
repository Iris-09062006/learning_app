import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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
    <main className="min-h-screen bg-background py-8 sm:py-10 lg:py-12">
      <PageContainer className="pb-16 lg:pb-0">
        <PageHeader
          eyebrow="Python Learning Platform"
          title="Danh sách khóa học"
          description="Chọn một khóa học phù hợp với cấp độ của bạn và bắt đầu hành trình học Python."
        />

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
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Trang trước
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted">
                Trang trước
              </span>
            )}

            <span className="text-sm text-text-secondary">
              Trang {result.page} / {result.totalPages}
            </span>

            {result.page < result.totalPages ? (
              <Link
                href={createCourseCatalogHref({
                  page: result.page + 1,
                  pageSize: result.pageSize,
                  search,
                })}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Trang sau
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted">
                Trang sau
              </span>
            )}
          </nav>
        )}
      </PageContainer>
    </main>
  );
}
