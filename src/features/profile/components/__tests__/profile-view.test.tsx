import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileView } from "../profile-view";
import type { ProfileResponse } from "@/features/profile/types";

vi.mock("next/link", () => ({
  default: function Link({
    children,
    className,
    href,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

const profile: ProfileResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "learner@example.com",
  username: "E2E Learner",
  role: "learner",
  createdAt: "2026-01-01T00:00:00.000Z",
  learningMetrics: {
    enrolledCourses: 1,
    activeCourses: 1,
    completedCourses: 0,
    completedLessons: 1,
    totalLessons: 5,
  },
};

describe("ProfileView", () => {
  it("renders the page header and a primary back-link to the dashboard", () => {
    render(<ProfileView profile={profile} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Hồ sơ cá nhân" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Xem thông tin tài khoản và cập nhật tên hiển thị."),
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /Về dashboard/ });
    expect(backLink).toHaveAttribute("href", "/dashboard");
    expect(backLink).toHaveClass("text-primary");
  });

  it("renders account information from the profile payload", () => {
    render(<ProfileView profile={profile} />);

    expect(screen.getByText("Thông tin tài khoản")).toBeInTheDocument();
    expect(screen.getByText("Email")).toHaveClass("text-text-muted");
    expect(screen.getByText("learner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Vai trò")).toBeInTheDocument();
    expect(screen.getByText("learner")).toBeInTheDocument();
    expect(screen.getByText("Ngày tạo")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("renders the username update form pre-filled with the profile username", () => {
    render(<ProfileView profile={profile} />);

    expect(screen.getByText("Cập nhật username")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("E2E Learner");
    expect(
      screen.getByRole("button", { name: "Lưu thay đổi" }),
    ).toBeInTheDocument();
  });

  it("uses shared Card token defaults for the two cards", () => {
    const { container } = render(<ProfileView profile={profile} />);

    const cardTitles = screen.getAllByRole("heading", { level: 3 });
    expect(cardTitles.map((title) => title.textContent)).toEqual([
      "Thông tin tài khoản",
      "Cập nhật username",
    ]);

    container
      .querySelectorAll<HTMLElement>("h3")
      .forEach((title) => {
        const card = title.closest("div.rounded-xl");
        expect(card).not.toBeNull();
        expect(card).toHaveClass("bg-surface", "border-border");
      });
  });

  it("does not reintroduce legacy palette utilities, local dark overrides, or slash-opacity tokens", () => {
    const { container } = render(<ProfileView profile={profile} />);

    const legacyPalette =
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|red|rose|white)-\d+/;
    const localDark = /(^|\s)dark:/;
    const slashOpacityToken =
      /(^|\s)(bg|text|border|hover:border|hover:bg)-(primary|danger|surface-subtle|warning|info|success)(-\S*)?\/\d+/;

    const offenders: string[] = [];
    container
      .querySelectorAll<HTMLElement>("h1, h2, h3, p, span, div, dl, dt, dd, form, label, button, svg, a, input")
      .forEach((element) => {
        const className = element.className;
        if (
          typeof className === "string" &&
          (legacyPalette.test(className) ||
            localDark.test(className) ||
            slashOpacityToken.test(className))
        ) {
          offenders.push(className);
        }
      });

    expect(offenders).toEqual([]);
  });
});