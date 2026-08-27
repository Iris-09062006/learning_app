import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function getMobileNav() {
  const nav = document.querySelector("nav[aria-label='Điều hướng di động']");
  if (!nav) throw new Error("Mobile navigation not found");
  return nav as HTMLElement;
}

function getMobileNavLink(name: string) {
  return within(getMobileNav()).getByRole("link", { name });
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

  it("uses the compact semantic desktop sidebar and geometric brand", () => {
    render(<AppNavigation user={null} />);

    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain("w-64");
    expect(aside?.className).toContain("bg-surface-container-lowest");
    expect(aside?.className).toContain("border-border");
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("lg:flex");

    const brandLink = screen.getAllByRole("link", { name: "LearningApp" })[0];
    expect(brandLink.querySelector("svg")).toHaveClass("text-primary");
    expect(screen.queryByText("LA")).not.toBeInTheDocument();

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
    expect(coursesLink.className).toContain("transition-colors");

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

  it("restyles the mobile top bar with Stitch semantic tokens", () => {
    render(<AppNavigation user={null} />);

    const topBar = document.querySelector("div.fixed.inset-x-0.top-0.z-30");
    expect(topBar).not.toBeNull();
    expect(topBar?.className).toContain("bg-surface");
    expect(topBar?.className).toContain("border-border");
    expect(topBar?.className).toContain("lg:hidden");

    const brandLink = within(topBar as HTMLElement).getByRole("link", { name: "LearningApp" });
    expect(brandLink).toHaveAttribute("href", "/");
    expect(brandLink.className).toContain("text-text-primary");
    expect(brandLink.className).toContain("focus-visible:ring-focus-ring");

    const loginLink = within(topBar as HTMLElement).getByRole("link", { name: "Đăng nhập" });
    expect(loginLink).toHaveAttribute("href", "/login");
    expect(loginLink.className).toContain("text-primary");
  });

  it("shows the signed-in username in the mobile top bar with neutral tokens", () => {
    render(<AppNavigation user={{ username: "Lan", role: "learner" }} />);

    const topBar = document.querySelector("div.fixed.inset-x-0.top-0.z-30") as HTMLElement;
    expect(topBar.textContent).toContain("Lan");
    expect(within(topBar).queryByRole("link", { name: "Đăng nhập" })).not.toBeInTheDocument();

    const usernameSpan = Array.from(topBar.querySelectorAll("span")).find((el) => el.textContent === "Lan");
    expect(usernameSpan?.className).toContain("text-text-secondary");
  });

  it("restyles the mobile bottom nav with Stitch semantic tokens", () => {
    render(<AppNavigation user={null} />);

    const nav = getMobileNav();
    expect(nav.className).toContain("bg-surface");
    expect(nav.className).toContain("border-border");
    expect(nav.className).toContain("min-h-16");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(nav.className).toContain("lg:hidden");

    const coursesLink = getMobileNavLink("Khóa học");
    expect(coursesLink).toHaveAttribute("href", "/courses");
  });

  it("marks the active mobile tab with primary-soft surface and primary foreground", () => {
    render(<AppNavigation user={null} />);

    const coursesLink = getMobileNavLink("Khóa học");
    expect(coursesLink).toHaveAttribute("aria-current", "page");
    expect(coursesLink.className).toContain("rounded-xl");
    expect(coursesLink.className).toContain("bg-primary-soft");
    expect(coursesLink.className).toContain("text-primary");
    expect(coursesLink.className).toContain("focus-visible:ring-focus-ring");
    expect(coursesLink.className).not.toContain("duration-300");
  });

  it("keeps inactive mobile tabs neutral with a subtle hover treatment", () => {
    render(<AppNavigation user={{ username: "Admin", role: "admin" }} />);

    const overviewLink = getMobileNavLink("Tổng quan");
    expect(overviewLink).not.toHaveAttribute("aria-current");
    expect(overviewLink.className).toContain("text-text-muted");
    expect(overviewLink.className).toContain("hover:bg-surface-subtle");
    expect(overviewLink.className).not.toContain("bg-primary-soft");
  });

  it("keeps a single aria-current inside the mobile nav", () => {
    const originalPathname = navigationMocks.pathname;
    navigationMocks.pathname = "/courses/python-co-ban";
    try {
      render(<AppNavigation user={{ username: "Admin", role: "admin" }} />);

      const mobileCurrent = getMobileNav().querySelectorAll("[aria-current='page']");
      expect(mobileCurrent).toHaveLength(1);
      expect(mobileCurrent[0] as HTMLElement).toHaveAttribute("href", "/courses");
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
