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

    expect(screen.getByRole("heading", { level: 1, name: /Một lộ trình rõ ràng/i })).toBeInTheDocument();
    expect(screen.getByText("Hỗ trợ đúng thời điểm")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Các bước trong lộ trình mẫu" })).toBeInTheDocument();
    expect(screen.queryByText(/Python/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tạo tài khoản miễn phí/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Khám phá khóa học" })).toHaveAttribute("href", "/courses");
  });

  it("renders authenticated navigation and hides guest CTAs from server session truth", async () => {
    authMocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "learner@example.com",
      username: "Minh",
      role: "learner",
    });

    render(await HomePage());

    expect(screen.queryByRole("link", { name: "Đăng nhập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Bắt đầu học|Tạo tài khoản miễn phí/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Hồ sơ" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Tiếp tục học/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Chào Minh · Tiếp tục theo tiến độ của bạn")).toBeInTheDocument();
  });

  it("falls back to guest actions when session resolution fails", async () => {
    authMocks.getCurrentUser.mockRejectedValue(new Error("DATABASE_ERROR"));

    render(await HomePage());

    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tạo tài khoản miễn phí/ })).toBeInTheDocument();
  });
});
