import { render, screen } from "@testing-library/react";
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

vi.mock("@/features/auth/auth.service", () => ({
  authService: { getCurrentUser: vi.fn() },
}));

import MainLayout from "./layout";
import { authService } from "@/features/auth/auth.service";

describe("MainLayout shell synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs the desktop sidebar width with the main content offset", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const element = await MainLayout({ children: <div>page content</div> });
    const { container } = render(element);

    // Compact desktop sidebar width (w-64 = 256px).
    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("w-64");

    // Sidebar stays hidden below the desktop breakpoint, flex from lg up.
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("lg:flex");

    // Main content offset matches the sidebar width exactly.
    const content = container.querySelector('[class*="pt-16"]');
    expect(content?.className).toContain("lg:pl-64");
    expect(content?.className).toContain("lg:pt-0");

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("uses semantic shell colors without component-local dark palette overrides", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const element = await MainLayout({ children: <div>page content</div> });
    const { container } = render(element);
    const shell = container.firstElementChild;

    expect(shell?.className).toContain("bg-background");
    expect(shell?.className).toContain("text-text-primary");
    expect(shell?.className).not.toMatch(/(?:slate-|indigo-|dark:)/u);
  });
});
