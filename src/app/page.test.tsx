import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./page";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/auth/auth.service", () => ({
  authService: { getCurrentUser: authMocks.getCurrentUser },
}));

describe("HomePage", () => {
  beforeEach(() => {
    authMocks.getCurrentUser.mockReset().mockResolvedValue(null);
  });

  it("presents guest onboarding actions", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: /Má»™t lá»™ trÃ¬nh rÃµ rÃ ng/i })).toBeInTheDocument();
    expect(screen.getByText("Há»— trá»£ Ä‘Ãºng thá»i Ä‘iá»ƒm")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "CÃ¡c bÆ°á»›c trong lá»™ trÃ¬nh máº«u" })).toBeInTheDocument();
    expect(screen.queryByText(/Python/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Táº¡o tÃ i khoáº£n miá»…n phÃ­/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "ÄÄƒng nháº­p" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "KhÃ¡m phÃ¡ khÃ³a há»c" })).toHaveAttribute("href", "/courses");
  });

  it("renders authenticated navigation and hides guest CTAs from server session truth", async () => {
    authMocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "learner@example.com",
      username: "Minh",
      role: "learner",
    });

    render(await HomePage());

    expect(screen.queryByRole("link", { name: "ÄÄƒng nháº­p" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Báº¯t Ä‘áº§u há»c|Táº¡o tÃ i khoáº£n miá»…n phÃ­/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tá»•ng quan" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Há»“ sÆ¡" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Tiáº¿p tá»¥c há»c/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("ChÃ o Minh Â· Tiáº¿p tá»¥c theo tiáº¿n Ä‘á»™ cá»§a báº¡n")).toBeInTheDocument();
  });

  it("falls back to guest actions when session resolution fails", async () => {
    authMocks.getCurrentUser.mockRejectedValue(new Error("DATABASE_ERROR"));

    render(await HomePage());

    expect(screen.getByRole("link", { name: "ÄÄƒng nháº­p" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Táº¡o tÃ i khoáº£n miá»…n phÃ­/ })).toBeInTheDocument();
  });
});

