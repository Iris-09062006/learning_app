import { describe, expect, it, vi } from "vitest";
import { UnauthenticatedError, getOptionalUser, requireUser } from "./session";

// Mock Supabase Server Client
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

function asServerSupabaseClient(mock: unknown): ServerSupabaseClient {
  return mock as ServerSupabaseClient;
}

describe("Session Helper Tests", () => {
  it("getOptionalUser returns user when session is valid", async () => {
    const mockUser = { id: "usr_123", email: "user@example.com" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    const user = await getOptionalUser();
    expect(user).toEqual(mockUser);
  });

  it("getOptionalUser returns null when user is unauthenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    const user = await getOptionalUser();
    expect(user).toBeNull();
  });

  it("requireUser returns user when authenticated", async () => {
    const mockUser = { id: "usr_123", email: "user@example.com" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    const user = await requireUser();
    expect(user).toEqual(mockUser);
  });

  it("requireUser throws UnauthenticatedError when user is unauthenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      asServerSupabaseClient(mockSupabase),
    );

    await expect(requireUser()).rejects.toThrow(UnauthenticatedError);
  });
});
