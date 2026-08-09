import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("presents the current learning product and onboarding actions", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: /Học Python bằng cách/i })).toBeInTheDocument();
    expect(screen.getByText("AI Mentor an toàn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo tài khoản miễn phí" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Khám phá khóa học" })).toHaveAttribute("href", "/courses");
    expect(screen.queryByText(/sẵn sàng để xây dựng/i)).not.toBeInTheDocument();
  });
});
