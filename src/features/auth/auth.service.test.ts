import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Mock Supabase server client factory
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

function asServerSupabaseClient(mock: unknown): ServerSupabaseClient {
  return mock as ServerSupabaseClient;
}

describe("AuthService Unit Tests", () => {
  const service = new AuthService();

  it("register creates user via Supabase Auth and returns RegisterResponse", async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "usr_123", email: "test@example.com" },
            session: null,
          },
          error: null,
        }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    const result = await service.register({
      email: "test@example.com",
      password: "password123",
      username: "testuser",
    });

    expect(result).toEqual({
      user: {
        id: "usr_123",
        email: "test@example.com",
        username: "testuser",
        role: "learner",
      },
      requiresEmailConfirmation: true,
    });
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: {
        data: {
          username: "testuser",
        },
      },
    });
  });

  it("login authenticates user and returns CurrentUser", async () => {
    const mockUser = {
      id: "usr_123",
      email: "test@example.com",
      user_metadata: { username: "testuser" },
    };

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { username: "testuser", role: "learner", is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      asServerSupabaseClient(mockSupabase),
    );

    const result = await service.login({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.user).toEqual({
      id: "usr_123",
      email: "test@example.com",
      username: "testuser",
      role: "learner",
      isActive: true,
    });
  });

  it("logout calls Supabase auth.signOut()", async () => {
    const mockSupabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    await service.logout();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it("getCurrentUser returns null when not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    const user = await service.getCurrentUser();
    expect(user).toBeNull();
  });

  it("handleRouteError maps invalid login credentials to 401 UNAUTHENTICATED", async () => {
    const error = new Error("Invalid login credentials");
    const response = service.handleRouteError(error);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Email hoặc mật khẩu không chính xác.",
      },
    });
  });

  it("handleRouteError maps duplicate email to 409 CONFLICT", async () => {
    const error = new Error("User already registered");
    const response = service.handleRouteError(error);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: {
        code: "CONFLICT",
        message: "Email này đã được đăng ký tài khoản.",
      },
    });
  });

  it("handleRouteError maps unexpected error to 500 INTERNAL_ERROR without leaking raw error", async () => {
    const error = new Error("Postgres connection string secret_db_key timeout");
    const response = service.handleRouteError(error);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("secret_db_key");
  });
});
