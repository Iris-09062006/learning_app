import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CourseSearchFormProps {
  search?: string;
  pageSize: number;
}

export function createCourseCatalogHref(params: {
  page?: number;
  pageSize: number;
  search?: string;
}): string {
  const query = new URLSearchParams({ pageSize: String(params.pageSize) });

  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
  return `/courses?${query.toString()}`;
}

export function CourseSearchForm({
  search,
  pageSize,
}: CourseSearchFormProps) {
  return (
    <form
      action="/courses"
      method="get"
      role="search"
      className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.75)] sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Input
          id="course-search"
          name="search"
          type="search"
          label="Tìm khóa học"
          defaultValue={search}
          placeholder="Nhập tiêu đề hoặc mô tả"
        />
      </div>
      <input type="hidden" name="pageSize" value={pageSize} />
      <Button type="submit" className="px-5 sm:mb-0">
        Tìm kiếm
      </Button>
      {search ? (
        <Link
          href={createCourseCatalogHref({ pageSize })}
          className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Xóa tìm kiếm
        </Link>
      ) : null}
    </form>
  );
}
