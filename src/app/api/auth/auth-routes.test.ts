import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/auth.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/auth.service")>();

  return {
    authService: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      handleRouteError: actual.authService.handleRouteError.bind(
        actual.authService,
      ),
    },
  };
});

import { authService } from "@/features/auth/auth.service";

describe("Auth Route Handlers Contract Verification", () => {
  it("POST /api/auth/register handles success response contract", async () => {
    vi.mocked(authService.register).mockResolvedValueOnce({
      user: {
        id: "usr_123",
        email: "learner@example.com",
        username: "learner01",
        role: "learner",
      },
      requiresEmailConfirmation: false,
    });

    const mockRequest = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "learner@example.com",
        password: "StrongPassword123!",
        username: "learner01",
      }),
    });

    const { POST } = await import("./register/route");
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        user: {
          id: "usr_123",
          email: "learner@example.com",
          username: "learner01",
          role: "learner",
        },
        requiresEmailConfirmation: false,
      },
    });
  });

  it("POST /api/auth/register returns 400 VALIDATION_ERROR on invalid input", async () => {
    const mockRequest = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "invalid-email",
        password: "",
        username: "a",
      }),
    });

    const { POST } = await import("./register/route");
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/login sets session and returns CurrentUser", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      user: {
        id: "usr_123",
        email: "learner@example.com",
        username: "learner01",
        role: "learner",
        isActive: true,
      },
    });

    const mockRequest = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "learner@example.com",
        password: "StrongPassword123!",
      }),
    });

    const { POST } = await import("./login/route");
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        user: {
          id: "usr_123",
          email: "learner@example.com",
          username: "learner01",
          role: "learner",
          isActive: true,
        },
      },
    });
  });

  it("POST /api/auth/logout clears session", async () => {
    vi.mocked(authService.logout).mockResolvedValueOnce();

    const { POST } = await import("./logout/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        loggedOut: true,
      },
    });
  });

  it("GET /api/auth/me returns current user when authenticated", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce({
      id: "usr_123",
      email: "learner@example.com",
      username: "learner01",
      role: "learner",
      isActive: true,
    });

    const { GET } = await import("./me/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: "usr_123",
        email: "learner@example.com",
        username: "learner01",
        role: "learner",
        isActive: true,
      },
    });
  });

  it("GET /api/auth/me returns 401 UNAUTHENTICATED when unauthenticated", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(null);

    const { GET } = await import("./me/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
