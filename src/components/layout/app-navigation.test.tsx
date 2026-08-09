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

    expect(screen.getAllByRole("link", { name: "Kiểm duyệt" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Quản trị" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Hệ thống" }).length).toBeGreaterThan(0);
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
