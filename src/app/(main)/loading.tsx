export default function MainRouteLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10 sm:px-6 lg:min-h-screen lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <span className="sr-only">Đang chuyển trang…</span>
        <div aria-hidden="true" className="animate-pulse space-y-6">
          <div className="h-4 w-32 rounded bg-surface-container" />
          <div className="h-10 w-72 max-w-full rounded bg-surface-container" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-40 rounded-xl border border-border bg-surface" />
            <div className="h-40 rounded-xl border border-border bg-surface" />
            <div className="h-40 rounded-xl border border-border bg-surface" />
          </div>
        </div>
      </div>
    </main>
  );
}
