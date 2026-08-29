import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "./register-form";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fillRegisterForm(email: string, password: string, username: string) {
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: password },
  });
}

function successfulRegistration(requiresEmailConfirmation: boolean) {
  return jsonResponse({
    success: true,
    data: {
      user: {
        id: "usr_123",
        email: "learner@example.com",
        username: "Người học mới",
        role: "learner",
      },
      requiresEmailConfirmation,
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("RegisterForm", () => {
  it("renders accessible registration fields and login link", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Tên hiển thị")).toHaveAttribute(
      "maxlength",
      "50",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("validates email, password, and trimmed username before submission", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm("invalid", "short", "  a  ");
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(screen.getByText("Vui lòng nhập địa chỉ email hợp lệ.")).toBeVisible();
    expect(screen.getByText("Mật khẩu phải có ít nhất 8 ký tự.")).toBeVisible();
    expect(
      screen.getByText("Tên hiển thị phải từ 3 đến 50 ký tự."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits sanitized data and routes confirmed sessions to dashboard", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(successfulRegistration(false));
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm(
      "  LEARNER@Example.com  ",
      "StrongPassword123!",
      "  Người học mới  ",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "learner@example.com",
          password: "StrongPassword123!",
          username: "Người học mới",
        }),
      }),
    );
  });

  it("routes users requiring email confirmation back to login", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(successfulRegistration(true));
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm(
      "learner@example.com",
      "StrongPassword123!",
      "Người học mới",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/login?registered=1");
    });
  });

  it("shows a safe conflict error without navigating", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Email này đã được đăng ký tài khoản.",
          },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm(
      "learner@example.com",
      "StrongPassword123!",
      "Người học mới",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email này đã được đăng ký tài khoản.",
    );
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("rejects malformed success responses without navigating", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm(
      "learner@example.com",
      "StrongPassword123!",
      "Người học mới",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.",
    );
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("keeps an accessible name and disables the form while submitting", async () => {
    const pendingResponse = new Promise<Response>(() => undefined);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(pendingResponse);
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    fillRegisterForm(
      "learner@example.com",
      "StrongPassword123!",
      "Người học mới",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Tạo tài khoản" }),
      ).toBeDisabled();
    });
    expect(
      screen.getByRole("button", { name: "Tạo tài khoản" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Tên hiển thị")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Mật khẩu")).toBeDisabled();
  });
});
