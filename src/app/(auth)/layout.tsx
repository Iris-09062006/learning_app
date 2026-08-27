import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { PRODUCT_NAME } from "@/config/product";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-text-primary sm:px-6">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-0 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 size-72 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-7">
        <Link
          href="/"
          aria-label={`Về trang chủ ${PRODUCT_NAME}`}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <BrandMark className="size-9 text-primary" />
          <span className="text-lg font-semibold tracking-[-0.02em]">{PRODUCT_NAME}</span>
        </Link>
        {children}
        <p className="text-center text-xs leading-5 text-text-muted">
          Học từng bước nhỏ. Tiến bộ mỗi ngày.
        </p>
      </div>
    </main>
  );
}
