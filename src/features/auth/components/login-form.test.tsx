import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

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

function fillLoginForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: password },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("renders the confirmation notice and accessible fields", () => {
    render(<LoginForm notice="Hãy xác nhận email của bạn." />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Hãy xác nhận email của bạn.",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(
      screen.getByRole("link", { name: "Đăng ký miễn phí" }),
    ).toHaveAttribute("href", "/register");
  });

  it("validates email and password before calling the API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    fillLoginForm("email-khong-hop-le", "");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(screen.getByText("Vui lòng nhập địa chỉ email hợp lệ.")).toBeVisible();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits sanitized credentials and navigates after success", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { user: { id: "usr_123" } } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    fillLoginForm("  LEARNER@Example.com  ", "StrongPassword123!");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "learner@example.com",
          password: "StrongPassword123!",
        }),
      }),
    );
  });

  it("shows the safe API error without navigating", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Email hoặc mật khẩu không chính xác.",
          },
        },
        401,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    fillLoginForm("learner@example.com", "WrongPassword");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email hoặc mật khẩu không chính xác.",
    );
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("disables the form while the request is pending", async () => {
    const pendingResponse = new Promise<Response>(() => undefined);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(pendingResponse);
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    fillLoginForm("learner@example.com", "StrongPassword123!");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Đăng nhập" }),
      ).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Mật khẩu")).toBeDisabled();
  });
});
