import Link from "next/link";

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
      className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label
          htmlFor="course-search"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Tìm khóa học
        </label>
        <input
          id="course-search"
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Nhập tiêu đề hoặc mô tả"
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>
      <input type="hidden" name="pageSize" value={pageSize} />
      <button
        type="submit"
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Tìm kiếm
      </button>
      {search ? (
        <Link
          href={createCourseCatalogHref({ pageSize })}
          className="rounded-md px-4 py-2.5 text-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          Xóa tìm kiếm
        </Link>
      ) : null}
    </form>
  );
}
