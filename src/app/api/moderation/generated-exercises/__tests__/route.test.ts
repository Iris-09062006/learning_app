import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import { GET } from "../route";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/features/moderation/services/moderation-service", () => {
  return {
    ModerationService: vi.fn().mockImplementation(() => ({
      listQueueItems: vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            title: "Test Queue Item",
            status: "pending",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    })),
  };
});

describe("GET /api/moderation/generated-exercises", () => {
  const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServerSupabaseClient.mockResolvedValue(
      mockSupabase as unknown as SupabaseClient<Database>
    );
  });

  function mockProfileRole(role: string | null) {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: role ? { role } : null,
            error: role ? null : { message: "not found" },
          }),
        }),
      }),
    } as unknown as ReturnType<typeof mockSupabase.from>);
  }

  it("returns 401 when unauthorized", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockProfileRole(null);

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockProfileRole("student");

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises"
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("returns 200 with queue items when user is admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockProfileRole("admin");

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises?status=pending&limit=10"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});