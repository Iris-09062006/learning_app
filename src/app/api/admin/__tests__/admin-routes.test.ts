import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminServiceError,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "@/features/admin/services/admin-service";

vi.mock("@/features/admin/services/admin-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/services/admin-service")>();
  return {
    ...actual,
    listAdminUsers: vi.fn(),
    updateAdminUserRole: vi.fn(),
    updateAdminUserStatus: vi.fn(),
  };
});

const userId = "00000000-0000-4000-8000-000000000001";

describe("admin user API routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns filtered pagination for an admin", async () => {
    vi.mocked(listAdminUsers).mockResolvedValueOnce({ items: [], page: 2, pageSize: 10, total: 0, totalPages: 0 });
    const { GET } = await import("../users/route");
    const response = await GET(new Request("http://localhost/api/admin/users?page=2&pageSize=10&role=admin"));
    expect(response.status).toBe(200);
    expect(listAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 10, role: "admin" }));
  });

  it("GET strictly maps a non-admin to 403", async () => {
    vi.mocked(listAdminUsers).mockRejectedValueOnce(new AdminServiceError("FORBIDDEN", "Administrator access required."));
    const { GET } = await import("../users/route");
    const response = await GET(new Request("http://localhost/api/admin/users"));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("PATCH role validates the route/body and returns the atomic result", async () => {
    vi.mocked(updateAdminUserRole).mockResolvedValueOnce({
      userId, role: "moderator", updatedAt: "2026-08-05T00:00:00Z", auditLogId: 12,
    });
    const { PATCH } = await import("../users/[userId]/role/route");
    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "moderator" }) }),
      { params: Promise.resolve({ userId }) },
    );
    expect(response.status).toBe(200);
    expect(updateAdminUserRole).toHaveBeenCalledWith(userId, "moderator");
  });

  it("PATCH role rejects actor IDs and maps last-active-admin to 409", async () => {
    const { PATCH } = await import("../users/[userId]/role/route");
    const invalid = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "admin", actorId: userId }) }),
      { params: Promise.resolve({ userId }) },
    );
    expect(invalid.status).toBe(400);

    vi.mocked(updateAdminUserRole).mockRejectedValueOnce(
      new AdminServiceError("LAST_ACTIVE_ADMIN", "The final active administrator cannot be changed."),
    );
    const protectedResponse = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "learner" }) }),
      { params: Promise.resolve({ userId }) },
    );
    expect(protectedResponse.status).toBe(409);
  });

  it("PATCH status accepts only boolean isActive", async () => {
    vi.mocked(updateAdminUserStatus).mockResolvedValueOnce({
      userId, isActive: false, updatedAt: "2026-08-05T00:00:00Z", auditLogId: 13,
    });
    const { PATCH } = await import("../users/[userId]/status/route");
    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ isActive: false }) }),
      { params: Promise.resolve({ userId }) },
    );
    expect(response.status).toBe(200);
    expect(updateAdminUserStatus).toHaveBeenCalledWith(userId, false);

    const invalid = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ isActive: "false" }) }),
      { params: Promise.resolve({ userId }) },
    );
    expect(invalid.status).toBe(400);
  });
});
