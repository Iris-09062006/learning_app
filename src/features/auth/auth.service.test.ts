import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supabaseJsMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseJsMocks.createClient,
}));

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
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
    if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = originalVercelUrl;
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("register creates user via Supabase Auth and returns RegisterResponse", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "learning-preview-team.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
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
        emailRedirectTo: "https://learning-preview-team.vercel.app/login",
      },
    });
  });

  it("register prefers the configured site URL outside Preview", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "learning-generated.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://learn.example.com/base-path";
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "usr_456", email: "site@example.com" },
            session: null,
          },
          error: null,
        }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    await service.register({
      email: "site@example.com",
      password: "password123",
      username: "siteuser",
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "https://learn.example.com/login",
        }),
      }),
    );
  });

  it("register falls back to localhost when no deployment URL is configured", async () => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "usr_local", email: "local@example.com" },
            session: null,
          },
          error: null,
        }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    await service.register({
      email: "local@example.com",
      password: "password123",
      username: "localuser",
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "http://localhost:3000/login",
        }),
      }),
    );
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

  it("login rejects inactive accounts", async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_123", email: "test@example.com" } },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_123", email: "test@example.com" } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { username: "testuser", role: "learner", is_active: false },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      asServerSupabaseClient(mockSupabase),
    );

    await expect(
      service.login({ email: "test@example.com", password: "password123" }),
    ).rejects.toThrow("ACCOUNT_INACTIVE");
    expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
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

  it("forgotPassword calls resetPasswordForEmail and returns a generic response", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "learning-preview-team.vercel.app";
    const mockSupabase = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      },
    };
    supabaseJsMocks.createClient.mockReturnValueOnce(mockSupabase);

    const result = await service.forgotPassword({
      email: "test@example.com",
    });

    expect(result).toEqual({ submitted: true });
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      {
        redirectTo: "https://learning-preview-team.vercel.app/reset-password",
      },
    );
  });

  it("forgotPassword propagates Supabase errors", async () => {
    const diagnostic = vi.fn();
    const resetError = Object.assign(
      new Error("email rate limit exceeded"),
      {
        code: "over_email_send_rate_limit",
        status: 429,
        name: "AuthApiError",
      },
    );
    const mockSupabase = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          data: {},
          error: resetError,
        }),
      },
    };
    supabaseJsMocks.createClient.mockReturnValueOnce(mockSupabase);

    await expect(
      service.forgotPassword({ email: "test@example.com" }, diagnostic),
    ).rejects.toThrow("email rate limit exceeded");
    expect(diagnostic).toHaveBeenLastCalledWith({
      stage: "reset_password_for_email",
      supabase_reset_call_attempted: "yes",
      supabase_error_code: "over_email_send_rate_limit",
      supabase_error_message: "email rate limit exceeded",
      supabase_error_status: 429,
      supabase_error_name: "AuthApiError",
    });
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
      "test@example.com",
    );
  });
});
