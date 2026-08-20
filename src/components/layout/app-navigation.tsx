"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import type { CurrentUser, UserRole } from "@/features/auth/auth.types";

interface AppNavigationProps {
  user: Pick<CurrentUser, "username" | "role"> | null;
}

interface NavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  marker: string;
  roles?: UserRole[];
  authenticated?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { href: "/dashboard", label: "Tổng quan", shortLabel: "Tổng quan", marker: "01", authenticated: true },
  { href: "/courses", label: "Khóa học", shortLabel: "Khóa học", marker: "02" },
  { href: "/profile", label: "Hồ sơ", shortLabel: "Hồ sơ", marker: "03", authenticated: true },
  { href: "/moderation", label: "Duyệt bài tập", shortLabel: "Bài tập", marker: "04", roles: ["moderator", "admin"] },
  { href: "/admin/users", label: "Quản trị", shortLabel: "Quản trị", marker: "05", roles: ["admin"] },
  { href: "/admin/content", label: "Tạo & duyệt bài học", shortLabel: "Bài học", marker: "06", roles: ["admin"] },
  { href: "/admin/courses", label: "Quản lý khóa học", shortLabel: "QL khóa học", marker: "07", roles: ["admin"] },
  { href: "/admin/system", label: "Hệ thống", shortLabel: "Hệ thống", marker: "08", roles: ["admin"] },
];

function canSeeItem(item: NavigationItem, user: AppNavigationProps["user"]) {
  if (item.authenticated && !user) return false;
  if (item.roles && (!user || !item.roles.includes(user.role))) return false;
  return true;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ user }: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const visibleItems = NAVIGATION_ITEMS.filter((item) => canSeeItem(item, user));

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Không thể đăng xuất.");
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Đăng xuất chưa thành công. Vui lòng thử lại.");
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-surface-container-lowest px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-2 text-text-primary">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-container font-mono text-sm font-bold text-on-primary-container">Py</span>
          <span>
            <span className="block font-bold tracking-tight">Python Learning</span>
            <span className="block text-xs text-text-secondary">Học theo lộ trình</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="mt-8 flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${
                  active ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`font-mono text-xs ${active ? "text-primary" : "text-text-secondary"}`}
                >
                  {item.marker}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          {user ? (
            <>
              <p className="truncate px-2 text-sm font-semibold text-text-primary">{user.username}</p>
              <p className="mt-1 px-2 text-xs capitalize text-text-secondary">{user.role}</p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-3 min-h-10 w-full rounded-lg border border-border px-3 text-sm font-semibold text-text-secondary hover:bg-surface-subtle disabled:cursor-wait disabled:opacity-60"
              >
                {isSigningOut ? "Đang đăng xuất…" : "Đăng xuất"}
              </button>
              {signOutError && <p role="alert" className="mt-2 text-xs text-danger">{signOutError}</p>}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login" className="flex min-h-10 items-center justify-center rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-surface-subtle">Đăng nhập</Link>
              <Link href="/register" className="flex min-h-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover">Đăng ký</Link>
            </div>
          )}
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Link
          href="/"
          className="font-bold tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
        >
          Python Learning
        </Link>
        {user ? (
          <span className="max-w-32 truncate text-sm text-text-secondary">{user.username}</span>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
          >
            Đăng nhập
          </Link>
        )}
      </div>

      <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch gap-1 overflow-x-auto border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {visibleItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-20 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring ${
                active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-subtle active:bg-surface-container"
              }`}
            >
              <span aria-hidden="true" className="font-mono text-[10px]">{item.marker}</span>
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
