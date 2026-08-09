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
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ username: "New learner" }),
    }));
  });
});
