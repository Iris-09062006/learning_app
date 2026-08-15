import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, type BadgeVariant } from "./badge";

describe("Badge", () => {
  it.each<[BadgeVariant, string]>([
    ["default", "bg-surface-subtle"],
    ["success", "bg-success-soft"],
    ["error", "bg-danger-soft"],
    ["warning", "bg-warning-soft"],
    ["ai", "bg-ai-soft"],
    ["outline", "border-border"],
  ])("applies the %s status variant", (variant, expectedClass) => {
    render(<Badge variant={variant}>{variant}</Badge>);

    const badge = screen.getByText(variant);
    expect(badge.tagName).toBe("SPAN");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain(expectedClass);
  });

  it("merges custom classes after its variant classes", () => {
    render(<Badge className="bg-indigo-500">Custom</Badge>);

    const className = screen.getByText("Custom").className;
    expect(className).toContain("bg-indigo-500");
    expect(className).not.toContain("bg-surface-subtle");
  });
});
