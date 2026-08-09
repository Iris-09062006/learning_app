export default function CoursesLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-7xl animate-pulse space-y-6"
      >
        <span className="sr-only">Đang tải danh sách khóa học...</span>
        <div className="h-10 w-72 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-11 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-56 rounded-lg bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
