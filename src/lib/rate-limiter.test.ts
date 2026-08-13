import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimitBuckets,
} from "./rate-limiter";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(),
}));

describe("rate limiter", () => {
  afterEach(() => {
    resetRateLimitBuckets();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("allows requests under the limit", async () => {
    for (let i = 0; i < 5; i += 1) {
      await expect(checkRateLimit("auth:forgot-password", "1.2.3.4")).resolves.toEqual({
        allowed: true,
      });
    }
  });

  it("rejects the request after the limit is exceeded", async () => {
    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit("auth:forgot-password", "1.2.3.4");
    }

    const result = await checkRateLimit("auth:forgot-password", "1.2.3.4");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks different identifiers independently", async () => {
    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit("auth:forgot-password", "1.2.3.4");
    }

    await expect(checkRateLimit("auth:forgot-password", "5.6.7.8")).resolves.toEqual({
      allowed: true,
    });
  });

  it("returns allowed for unknown scopes", async () => {
    await expect(checkRateLimit("unknown:scope", "1.2.3.4")).resolves.toEqual({
      allowed: true,
    });
  });

  it("uses the distributed RPC with a hashed identifier in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, retry_after_seconds: 0 }],
      error: null,
    });
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc } as never);

    await expect(checkRateLimit("auth:login", "192.0.2.1")).resolves.toEqual({
      allowed: true,
    });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", expect.objectContaining({
      p_identifier_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_limit: 10,
      p_scope: "auth:login",
      p_window_seconds: 600,
    }));
    expect(rpc.mock.calls[0]?.[1]?.p_identifier_hash).not.toContain("192.0.2.1");
  });

  it("applies the distributed 20-per-hour research scope", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null });
    vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc } as never);
    await expect(checkRateLimit("content-research", "admin-id")).resolves.toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", expect.objectContaining({
      p_scope: "content-research",
      p_limit: 20,
      p_window_seconds: 3600,
    }));
  });

  it("fails closed when the production limiter store is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(createAdminSupabaseClient).mockImplementation(() => {
      throw new Error("store unavailable");
    });

    await expect(checkRateLimit("auth:login", "192.0.2.1")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });
});
