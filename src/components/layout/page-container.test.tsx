import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageContainer } from "./page-container";

describe("PageContainer", () => {
  it("renders children inside the shared page container", () => {
    render(
      <PageContainer data-testid="container">Nội dung trang</PageContainer>,
    );

    const container = screen.getByTestId("container");
    expect(container.textContent).toBe("Nội dung trang");
    expect(container.className).toContain("mx-auto");
    expect(container.className).toContain("w-full");
    expect(container.className).toContain("max-w-[75rem]");
    expect(container.className).toContain("px-4");
    expect(container.className).toContain("sm:px-6");
    expect(container.className).toContain("lg:px-8");
  });

  it("composes custom classes over the defaults", () => {
    render(<PageContainer className="max-w-3xl px-2" data-testid="container" />);

    const container = screen.getByTestId("container");
    expect(container.className).toContain("max-w-3xl");
    expect(container.className).not.toContain("max-w-[75rem]");
    expect(container.className).toContain("px-2");
    expect(container.className).not.toContain("px-4");
    expect(container.className).toContain("sm:px-6");
    expect(container.className).toContain("lg:px-8");
  });
});