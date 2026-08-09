import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-0 size-72 rounded-full bg-indigo-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 size-72 rounded-full bg-cyan-200/50 blur-3xl"
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-7">
        <Link
          href="/"
          aria-label="Về trang chủ Python Learning"
          className="inline-flex items-center gap-3 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 font-mono text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            Py
          </span>
          <span className="text-lg font-bold tracking-tight">Python Learning</span>
        </Link>
        {children}
        <p className="text-center text-xs leading-5 text-slate-500">
          Học từng bước nhỏ. Tiến bộ mỗi ngày.
        </p>
      </div>
    </main>
  );
}
