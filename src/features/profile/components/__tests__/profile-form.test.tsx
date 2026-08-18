import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "../profile-form";

describe("ProfileForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("validates username length before submitting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForm initialUsername="Learner" />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(screen.getByRole("alert")).toHaveTextContent("3 đến 50");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits only the trimmed username and announces success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, data: { username: "New learner" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForm initialUsername="Learner" />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "  New learner  " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Đã cập nhật"));
    expect(screen.getByRole("status")).toHaveClass("text-success");
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ username: "New learner" }),
    }));
  });

  it("announces failures with the danger status token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false, error: { message: "Lỗi máy chủ." },
    }), { status: 500, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileForm initialUsername="Learner" />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Learner 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Lỗi máy chủ"));
    expect(screen.getByRole("alert")).toHaveClass("text-danger");
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
      method: "PATCH",
    }));
  });

  it("wires the visible helper text for accessibility", () => {
    render(<ProfileForm initialUsername="Learner" />);
    const input = screen.getByLabelText("Username");
    const helperId = input.getAttribute("aria-describedby");
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId as string)).toHaveTextContent(
      "Từ 3 đến 50 ký tự",
    );
  });

  it("does not reintroduce legacy palette utilities, local dark overrides, or slash-opacity tokens", () => {
    const { container } = render(<ProfileForm initialUsername="Learner" />);

    const legacyPalette =
      /(^|\s)(bg|text|border|shadow|ring)-(slate|indigo|emerald|red|rose|white)-\d+/;
    const localDark = /(^|\s)dark:/;
    const slashOpacityToken =
      /(^|\s)(bg|text|border|hover:border|hover:bg)-(primary|danger|surface-subtle|warning|info|success)(-\S*)?\/\d+/;

    const offenders: string[] = [];
    container
      .querySelectorAll<HTMLElement>("form, div, label, input, p, button")
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
