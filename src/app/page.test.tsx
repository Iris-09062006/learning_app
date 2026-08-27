import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("presents the current learning product and onboarding actions", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: /Một lộ trình rõ ràng/i })).toBeInTheDocument();
    expect(screen.getByText("Hỗ trợ đúng thời điểm")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Các bước trong lộ trình mẫu" })).toBeInTheDocument();
    expect(screen.queryByText(/Python/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tạo tài khoản miễn phí/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Khám phá khóa học" })).toHaveAttribute("href", "/courses");
    expect(screen.queryByText(/sẵn sàng để xây dựng/i)).not.toBeInTheDocument();
  });
});
