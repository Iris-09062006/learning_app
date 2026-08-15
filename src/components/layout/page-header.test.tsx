import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as a page-level heading", () => {
    render(<PageHeader title="Danh sách khóa học" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Danh sách khóa học");
  });

  it("renders eyebrow, description, and actions when provided", () => {
    render(
      <PageHeader
        title="Quản lý người dùng"
        eyebrow="Administration"
        description="Tìm kiếm, phân quyền và quản lý tài khoản."
        actions={<button type="button">Xem system health</button>}
      />,
    );

    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm, phân quyền và quản lý tài khoản.").tagName).toBe(
      "P",
    );
    expect(
      screen.getByRole("button", { name: "Xem system health" }),
    ).toBeInTheDocument();
  });

  it("omits optional regions when absent", () => {
    render(<PageHeader title="Chỉ có tiêu đề" />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Chỉ có tiêu đề",
    );
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("composes custom classes over the default spacing", () => {
    render(<PageHeader title="Tiêu đề" className="mb-4" data-testid="header" />);

    const header = screen.getByTestId("header");
    expect(header.className).toContain("mb-4");
    expect(header.className).not.toContain("mb-8");
  });
});