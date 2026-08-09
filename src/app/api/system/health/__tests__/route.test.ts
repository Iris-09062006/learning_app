import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSystemHealth } from "@/features/admin/services/admin-service";

vi.mock("@/features/admin/services/admin-service", () => ({ getSystemHealth: vi.fn() }));

describe("GET /api/system/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns public coarse operational status", async () => {
    vi.mocked(getSystemHealth).mockResolvedValueOnce({
      status: "ok", database: "connected", timestamp: "2026-08-05T00:00:00Z",
    });
    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: {
      status: "ok", database: "connected", timestamp: "2026-08-05T00:00:00Z",
    } });
    expect(JSON.stringify(body)).not.toMatch(/password|secret|url|key/i);
  });

  it("uses 503 for degraded database connectivity", async () => {
    vi.mocked(getSystemHealth).mockResolvedValueOnce({
      status: "degraded", database: "unavailable", timestamp: "2026-08-05T00:00:00Z",
    });
    const { GET } = await import("../route");
    expect((await GET()).status).toBe(503);
  });
});
