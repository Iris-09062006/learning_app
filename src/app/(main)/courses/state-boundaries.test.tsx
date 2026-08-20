import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MainRouteLoading from "../loading";
import CoursesError from "./error";
import CoursesLoading from "./loading";

function expectNoLegacyStatePalette(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/(slate|indigo|red)-\d+/u);
  expect(container.innerHTML).not.toContain("dark:");
}

describe("mapped route state boundaries", () => {
  it("uses semantic shared tokens for the main and Course loading skeletons", () => {
    const main = render(<MainRouteLoading />);
    expect(main.container.querySelector("main")).toHaveAttribute("aria-busy", "true");
    expect(main.container.querySelector("main")).toHaveClass("bg-background");
    expectNoLegacyStatePalette(main.container);
    main.unmount();

    const courses = render(<CoursesLoading />);
    expect(screen.getByRole("status")).toHaveClass("animate-pulse");
    expect(courses.container.querySelector("main")).toHaveClass("bg-background");
    expectNoLegacyStatePalette(courses.container);
  });

  it("announces the Course error and preserves the existing reset callback", () => {
    const reset = vi.fn();
    const { container } = render(<CoursesError reset={reset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Không thể tải danh sách khóa học");
    expect(alert).toHaveClass("border-danger", "bg-danger-soft");

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expectNoLegacyStatePalette(container);
  });
});
