// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { shouldRedirectToLogin, updateSession } from "./middleware";

interface MiddlewareCookieAdapter {
  setAll: (
    cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>,
    headers: Record<string, string>,
  ) => void;
}

describe("Supabase middleware route policy", () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    "/",
    "/login",
    "/register",
    "/courses",
    "/courses/python-foundations",
  ])("allows guest access to public page %s", (pathname) => {
    expect(shouldRedirectToLogin(pathname, false)).toBe(false);
  });

  it.each([
    "/api/auth/login",
    "/api/auth/register",
    "/api/system/health",
    "/api/profile",
  ])("leaves API authentication to the Route Handler for %s", (pathname) => {
    expect(shouldRedirectToLogin(pathname, false)).toBe(false);
  });

  it.each([
    "/dashboard",
    "/profile",
    "/courses/python-foundations/roadmap",
    "/lessons/lesson-1",
    "/moderation",
    "/admin/users",
  ])("redirects a guest from protected page %s", (pathname) => {
    expect(shouldRedirectToLogin(pathname, false)).toBe(true);
  });

  it("allows an authenticated user to open a protected page", () => {
    expect(shouldRedirectToLogin("/dashboard", true)).toBe(false);
  });

  it("forwards Supabase anti-cache headers when refreshed cookies are set", async () => {
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: MiddlewareCookieAdapter }) => ({
        auth: {
          getUser: async () => {
            options.cookies.setAll(
              [{ name: "session", value: "refreshed", options: { path: "/" } }],
              {
                "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
                Pragma: "no-cache",
              },
            );
            return { data: { user: null } };
          },
        },
      }),
    );

    const response = await updateSession(
      new NextRequest("http://localhost:3000/register"),
    );

    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.cookies.get("session")?.value).toBe("refreshed");
  });
});
