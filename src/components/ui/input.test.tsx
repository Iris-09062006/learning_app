import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("associates its label with the input", () => {
    render(<Input label="Email" name="email" />);

    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.name).toBe("email");
    expect(input.className).toContain("focus-visible:ring-indigo-500");
  });

  it("connects helper and error messages through aria-describedby", () => {
    render(
      <Input
        id="password"
        label="Password"
        helperText="Use at least eight characters."
        error="Password is required."
      />,
    );

    const input = screen.getByLabelText("Password");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      "password-helper password-error",
    );
    expect(screen.getByText("Use at least eight characters.").id).toBe(
      "password-helper",
    );
    expect(screen.getByText("Password is required.").id).toBe(
      "password-error",
    );
  });

  it("preserves caller-provided accessibility descriptions", () => {
    render(
      <Input
        aria-describedby="external-description"
        helperText="Additional guidance"
      />,
    );

    const input = screen.getByRole("textbox");
    const helper = screen.getByText("Additional guidance");
    expect(input.getAttribute("aria-describedby")).toBe(
      `external-description ${helper.id}`,
    );
  });

  it("supports disabled state and custom class merging", () => {
    render(<Input disabled className="h-12" />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.className).toContain("h-12");
    expect(input.className).not.toContain("h-10");
  });
});
