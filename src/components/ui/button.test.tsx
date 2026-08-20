import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button, type ButtonSize, type ButtonVariant } from "./button";

describe("Button", () => {
  it("renders a primary medium button by default", () => {
    render(<Button>Continue</Button>);

    const button = screen.getByRole("button", { name: "Continue" });

    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-on-primary");
    expect(button.className).toContain("h-10");
  });

  it.each<[ButtonVariant, string]>([
    ["primary", "bg-primary"],
    ["secondary", "bg-surface-subtle"],
    ["outline", "border-border"],
    ["ghost", "bg-transparent"],
    ["danger", "bg-danger-container"],
  ])("applies the %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);

    expect(screen.getByRole("button").className).toContain(expectedClass);
  });

  it.each<[ButtonSize, string]>([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
  ])("applies the %s size", (size, expectedClass) => {
    render(<Button size={size}>{size}</Button>);

    expect(screen.getByRole("button").className).toContain(expectedClass);
  });

  it("disables interaction and preserves its content while loading", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save progress
      </Button>,
    );

    const button = screen.getByRole("button") as HTMLButtonElement;
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Save progress").className).toContain("invisible");
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("forwards the disabled state and prevents clicks", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Locked
      </Button>,
    );

    const button = screen.getByRole("button") as HTMLButtonElement;
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(button.className).toContain("disabled:bg-surface-subtle");
    expect(button.className).toContain("disabled:text-text-muted");
    expect(button.className).toContain("disabled:opacity-100");
    expect(button.className).not.toContain("disabled:opacity-50");
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("merges custom classes after variant and size classes", () => {
    render(<Button className="px-8">Custom</Button>);

    const className = screen.getByRole("button").className;
    expect(className).toContain("px-8");
    expect(className).not.toContain("px-4");
  });
});
