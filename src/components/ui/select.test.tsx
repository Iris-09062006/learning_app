import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Select } from "./select";

describe("Select", () => {
  it("renders a native select with its options", () => {
    render(
      <Select aria-label="Cấp độ" defaultValue="beginner">
        <option value="beginner">Cơ bản</option>
        <option value="intermediate">Trung cấp</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", {
      name: "Cấp độ",
    }) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("beginner");
    expect(select.options).toHaveLength(2);
    expect(select.className).toContain("appearance-none");
    expect(select.className).toContain("border-border");
    expect(select.className).toContain("bg-surface");
    expect(select.className).toContain("text-text-primary");
    expect(select.className).toContain("focus-visible:ring-focus-ring");
  });

  it("keeps value/change behavior native", () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Cấp độ" defaultValue="beginner" onChange={handleChange}>
        <option value="beginner">Cơ bản</option>
        <option value="advanced">Nâng cao</option>
      </Select>,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "advanced" } });

    expect(handleChange).toHaveBeenCalledOnce();
    expect(select.value).toBe("advanced");
  });

  it("associates label/helper/error and applies the error state", () => {
    render(
      <Select
        id="level"
        label="Cấp độ"
        helperText="Chọn mức độ phù hợp."
        error="Vui lòng chọn cấp độ."
      >
        <option value="">Chọn cấp độ</option>
      </Select>,
    );

    const select = screen.getByLabelText("Cấp độ");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")).toBe(
      "level-helper level-error",
    );
    expect(select.className).toContain("border-danger");
    expect(screen.getByText("Chọn mức độ phù hợp.").id).toBe("level-helper");
    expect(screen.getByText("Vui lòng chọn cấp độ.").id).toBe("level-error");
  });

  it("supports disabled state with tokenized classes", () => {
    render(
      <Select aria-label="Cấp độ" disabled>
        <option>Chọn cấp độ</option>
      </Select>,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.className).toContain("disabled:bg-surface-subtle");
    expect(select.className).toContain("disabled:cursor-not-allowed");
  });
});