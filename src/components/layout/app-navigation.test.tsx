import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/courses",
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ replace: navigationMocks.replace, refresh: navigationMocks.refresh }),
}));

import { AppNavigation } from "./app-navigation";

function getDesktopNavLink(name: string) {
  return screen.getAllByRole("link", { name })[0];
}

describe("AppNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows public navigation and auth actions to guests", () => {
    render(<AppNavigation user={null} />);

    expect(screen.getAllByRole("link", { name: "Khóa học" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Đăng nhập" })[0]).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Quản trị" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Hồ sơ" })).not.toBeInTheDocument();
  });

  it("shows role-aware destinations to an admin", () => {
    render(<AppNavigation user={{ username: "Admin", role: "admin" }} />);

    expect(screen.getAllByRole("link", { name: "Duyệt bài tập" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Tạo & duyệt bài học" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Tạo & duyệt bài học" })[0]).toHaveAttribute("href", "/admin/content");
    expect(screen.getAllByRole("link", { name: "Quản trị" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Hệ thống" }).length).toBeGreaterThan(0);
  });

  it("restyles the desktop sidebar with Stitch semantic tokens", () => {
    render(<AppNavigation user={null} />);

    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain("w-64");
    expect(aside?.className).toContain("bg-surface-container-lowest");
    expect(aside?.className).toContain("border-border");
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("lg:flex");

    const brandTile = screen.getByText("Py");
    expect(brandTile.className).toContain("bg-primary-container");
    expect(brandTile.className).toContain("text-on-primary-container");

    const guestRegister = screen.getByRole("link", { name: "Đăng ký" });
    expect(guestRegister.className).toContain("bg-primary");
    expect(guestRegister.className).toContain("text-on-primary");

    // No Stitch-only navigation destinations were added.
    expect(screen.queryByRole("link", { name: /AI Tutor|Upgrade to Pro|Support|Bạn bè|Khu vườn/i })).not.toBeInTheDocument();
  });

  it("marks the matching route item active with Stitch semantic classes", () => {
    render(<AppNavigation user={null} />);

    const coursesLink = getDesktopNavLink("Khóa học");
    expect(coursesLink).toHaveAttribute("aria-current", "page");
    expect(coursesLink.className).toContain("bg-primary-soft");
    expect(coursesLink.className).toContain("text-primary");
    expect(coursesLink.className).toContain("focus-visible:ring-focus-ring");

    // Active marker text shares the primary foreground for a coherent pill.
    const marker = coursesLink.querySelector('[aria-hidden="true"]');
    expect(marker?.className).toContain("text-primary");
  });

  it("keeps non-matching desktop items inactive with semantic neutral classes", () => {
    render(<AppNavigation user={{ username: "Admin", role: "admin" }} />);

    const overviewLink = getDesktopNavLink("Tổng quan");
    expect(overviewLink).not.toHaveAttribute("aria-current");
    expect(overviewLink.className).toContain("text-text-secondary");
    expect(overviewLink.className).toContain("hover:bg-surface-subtle");
    expect(overviewLink.className).toContain("hover:text-text-primary");

    const coursesLink = getDesktopNavLink("Khóa học");
    expect(coursesLink).toHaveAttribute("aria-current", "page");
    expect(coursesLink.className).toContain("bg-primary-soft");
    expect(coursesLink.className).toContain("text-primary");
  });

  it("keeps nested route matching active and a single aria-current per page", () => {
    const originalPathname = navigationMocks.pathname;
    navigationMocks.pathname = "/courses/python-co-ban";
    try {
      render(<AppNavigation user={{ username: "Admin", role: "admin" }} />);

      const coursesLink = getDesktopNavLink("Khóa học");
      expect(coursesLink).toHaveAttribute("aria-current", "page");

      const overviewLink = getDesktopNavLink("Tổng quan");
      expect(overviewLink).not.toHaveAttribute("aria-current");

      const desktopCurrent = document.querySelectorAll("aside [aria-current='page']");
      expect(desktopCurrent).toHaveLength(1);
    } finally {
      navigationMocks.pathname = originalPathname;
    }
  });

  it("signs out through the auth API and returns to login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
    render(<AppNavigation user={{ username: "Lan", role: "learner" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" }));
    expect(navigationMocks.replace).toHaveBeenCalledWith("/login");
    expect(navigationMocks.refresh).toHaveBeenCalled();
  });
});
