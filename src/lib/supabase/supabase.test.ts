import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn<
    () => Promise<{
      getAll: () => Array<{ name: string; value: string }>;
      set: (name: string, value: string, options: unknown) => void;
    }>
  >(),
  createBrowserClient: vi.fn<(url: string, key: string) => unknown>(),
  createServerClient: vi.fn<
    (
      url: string,
      key: string,
      options: {
        cookies: {
          getAll: () => unknown;
          setAll: (
            cookies: Array<{
              name: string;
              value: string;
              options: unknown;
            }>,
          ) => void;
        };
      },
    ) => unknown
  >(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.createBrowserClient,
  createServerClient: mocks.createServerClient,
}));
import { createBrowserSupabaseClient } from "./client";
import { createServerSupabaseClient } from "./server";

describe("Supabase client factories", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-service-role-key");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("creates a browser client with public configuration", () => {
    const expectedClient = { kind: "browser" };
    mocks.createBrowserClient.mockReturnValue(expectedClient);

    expect(createBrowserSupabaseClient()).toBe(expectedClient);
    expect(mocks.createBrowserClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-anon-key",
    );
  });

  it("rejects missing browser configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() => createBrowserSupabaseClient()).toThrow(
      "Public Supabase environment variables are not configured.",
    );
  });

  it("creates a server client with the Next.js cookie adapter", async () => {
    const storedCookies = [{ name: "session", value: "token" }];
    const getAll = vi.fn(() => storedCookies);
    const set = vi.fn();
    const expectedClient = { kind: "server" };
    mocks.cookies.mockResolvedValue({ getAll, set });
    mocks.createServerClient.mockReturnValue(expectedClient);

    expect(await createServerSupabaseClient()).toBe(expectedClient);
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );

    const adapter = mocks.createServerClient.mock.calls[0][2].cookies;
    expect(adapter.getAll()).toBe(storedCookies);

    const options = { path: "/", sameSite: "lax" };
    adapter.setAll([{ name: "session", value: "updated", options }]);
    expect(set).toHaveBeenCalledWith("session", "updated", options);
  });

  it("does not fail when a Server Component cannot write cookies", async () => {
    const set = vi.fn(() => {
      throw new Error("Cookies can only be modified in a Server Action");
    });
    mocks.cookies.mockResolvedValue({ getAll: vi.fn(() => []), set });

    await createServerSupabaseClient();
    const adapter = mocks.createServerClient.mock.calls[0][2].cookies;

    expect(() =>
      adapter.setAll([{ name: "session", value: "updated", options: {} }]),
    ).not.toThrow();
  });

  it("rejects missing server configuration before reading cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    await expect(createServerSupabaseClient()).rejects.toThrow(
      "Public Supabase environment variables are not configured.",
    );
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("keeps the admin factory server-only and sessionless", () => {
    const source = readFileSync("src/lib/supabase/admin.ts", "utf8");

    expect(source.startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain("createClient<Database>(url, serviceRoleKey");
    expect(source).toContain("autoRefreshToken: false");
    expect(source).toContain("persistSession: false");
  });
});
