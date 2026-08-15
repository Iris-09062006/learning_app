import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("associates its label and renders with Input surface/focus tokens", () => {
    render(<Textarea label="Mô tả" name="description" />);

    const textarea = screen.getByLabelText("Mô tả") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.name).toBe("description");
    expect(textarea.className).toContain("border-border");
    expect(textarea.className).toContain("bg-surface");
    expect(textarea.className).toContain("text-text-primary");
    expect(textarea.className).toContain("placeholder:text-text-muted");
    expect(textarea.className).toContain("focus-visible:ring-focus-ring");
  });

  it("forwards native props and keeps change behavior native", () => {
    const handleChange = vi.fn();
    render(
      <Textarea
        aria-label="Phản hồi"
        defaultValue="bản nháp"
        onChange={handleChange}
        rows={6}
      />,
    );

    const textarea = screen.getByLabelText("Phản hồi") as HTMLTextAreaElement;
    expect(textarea.value).toBe("bản nháp");
    expect(textarea.rows).toBe(6);

    fireEvent.change(textarea, { target: { value: "đã sửa" } });

    expect(handleChange).toHaveBeenCalledOnce();
    expect(textarea.value).toBe("đã sửa");
  });

  it("connects helper and error messages through aria-describedby", () => {
    render(
      <Textarea
        id="bio"
        label="Giới thiệu"
        helperText="Tối đa 200 ký tự."
        error="Không được để trống."
      />,
    );

    const textarea = screen.getByLabelText("Giới thiệu");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toBe(
      "bio-helper bio-error",
    );
    expect(textarea.className).toContain("border-danger");
    expect(screen.getByText("Tối đa 200 ký tự.").id).toBe("bio-helper");
    expect(screen.getByText("Không được để trống.").id).toBe("bio-error");
  });

  it("supports disabled state with tokenized classes", () => {
    render(<Textarea disabled defaultValue="khoá" />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    expect(textarea.className).toContain("disabled:bg-surface-subtle");
    expect(textarea.className).toContain("disabled:cursor-not-allowed");
  });
});