import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/generated/database.types";
import { GET } from "../route";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ModerationService } from "@/features/moderation/services/moderation-service";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/features/moderation/services/moderation-service", () => {
  const mockGetQueueItemDetails = vi.fn();
  return {
    ModerationService: class {
      getQueueItemDetails = mockGetQueueItemDetails;
    },
  };
});

describe("GET /api/moderation/generated-exercises/[id]", () => {
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

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises/1"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not moderator or admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockProfileRole("student");

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises/1"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockProfileRole("admin");

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises/abc"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "abc" }) });
    expect(response.status).toBe(400);
  });

  it("returns 200 with queue item details for admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockProfileRole("admin");

    const service = new ModerationService();
    vi.mocked(service.getQueueItemDetails).mockResolvedValueOnce({
      id: 1,
      title: "Test Detail",
      status: "pending",
    } as unknown as Awaited<ReturnType<ModerationService["getQueueItemDetails"]>>);

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises/1"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe("Test Detail");
  });

  it("returns 404 when item not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockProfileRole("admin");

    const service = new ModerationService();
    vi.mocked(service.getQueueItemDetails).mockRejectedValueOnce(
      new Error("Generated exercise with ID 999 not found")
    );

    const request = new NextRequest(
      "http://localhost/api/moderation/generated-exercises/999"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "999" }) });
    expect(response.status).toBe(404);
  });
});