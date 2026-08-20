export default function CoursesLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-7xl animate-pulse space-y-6"
      >
        <span className="sr-only">Đang tải danh sách khóa học...</span>
        <div className="h-10 w-72 rounded bg-surface-container" />
        <div className="h-11 w-full rounded-lg bg-surface-container" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-56 rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
