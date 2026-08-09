"use client";

interface CoursesErrorProps {
  reset: () => void;
}

export default function CoursesError({ reset }: CoursesErrorProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Không thể tải danh sách khóa học
        </h1>
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Thử lại
        </button>
      </div>
    </main>
  );
}
