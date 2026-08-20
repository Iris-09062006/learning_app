import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatePanel } from "./state-panel";

describe("StatePanel", () => {
  it("announces loading with the shared surface treatment", () => {
    render(<StatePanel variant="loading">Đang tải dữ liệu…</StatePanel>);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("data-state", "loading");
    expect(status).toHaveClass("border-border", "bg-surface", "rounded-xl");
  });

  it("announces errors and keeps semantic danger tokens", () => {
    render(
      <StatePanel variant="error" title="Không thể tải">
        Vui lòng thử lại.
      </StatePanel>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft", "text-danger");
  });

  it("renders an empty-state action without changing its behavior", () => {
    render(
      <StatePanel variant="empty" action={<button type="button">Khám phá</button>}>
        Chưa có dữ liệu.
      </StatePanel>,
    );

    expect(screen.getByText("Chưa có dữ liệu.").closest("[data-state]"))
      .toHaveAttribute("data-state", "empty");
    expect(screen.getByRole("button", { name: "Khám phá" })).toBeEnabled();
  });
});
