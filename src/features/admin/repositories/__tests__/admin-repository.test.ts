import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeUserStatus,
  checkSystemHealth,
  fetchAdminUsers,
  requireAdminActor,
} from "../admin-repository";

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockRpc = vi.fn();
const mockAdminFrom = vi.fn();
const mockListUsers = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
    rpc: mockRpc,
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    auth: { admin: { listUsers: mockListUsers } },
    from: mockAdminFrom,
  })),
}));

function createBuilder(result: unknown) {
  const builder = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(),
    then(resolve: (value: unknown) => unknown) { return Promise.resolve(result).then(resolve); },
  };
  builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder); builder.limit.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe("admin repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated and non-admin actors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(requireAdminActor()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    mockServerFrom.mockReturnValueOnce(createBuilder({ data: { role: "learner", is_active: true }, error: null }));
    await expect(requireAdminActor()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("combines server-only auth email with profile filters and pagination", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServerFrom.mockReturnValue(createBuilder({ data: { role: "admin", is_active: true }, error: null }));
    mockListUsers.mockResolvedValueOnce({
      data: { users: [
        { id: "admin-1", email: "root@example.com", created_at: "2026-01-01T00:00:00Z" },
        { id: "learner-1", email: "learner@example.com", created_at: "2026-01-02T00:00:00Z" },
      ] }, error: null,
    });
    mockAdminFrom.mockReturnValueOnce(createBuilder({
      data: [
        { id: "admin-1", username: "Root", role: "admin", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        { id: "learner-1", username: "Student", role: "learner", is_active: true, created_at: "2026-01-02T00:00:00Z" },
      ], error: null,
    }));

    await expect(fetchAdminUsers({ page: 1, pageSize: 20, search: "ROOT", role: "admin" }))
      .resolves.toMatchObject({ total: 1, items: [{ email: "root@example.com", username: "Root" }] });
  });

  it("passes status changes to the atomic RPC and maps last-admin errors", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "P0006", message: "LAST_ACTIVE_ADMIN" } });
    await expect(changeUserStatus("admin-1", false)).rejects.toMatchObject({ code: "LAST_ACTIVE_ADMIN" });
    expect(mockRpc).toHaveBeenCalledWith("admin_change_user_status", {
      p_user_id: "admin-1", p_is_active: false,
    });
  });

  it("returns only coarse health information", async () => {
    mockAdminFrom.mockReturnValueOnce(createBuilder({ data: [{ id: "x" }], error: null }));
    await expect(checkSystemHealth()).resolves.toMatchObject({ status: "ok", database: "connected" });
  });
});
