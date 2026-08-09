import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminRepositoryError,
  changeUserRole,
  fetchAdminUsers,
} from "@/features/admin/repositories/admin-repository";
import {
  listAdminUsers,
  parseAdminUserFilters,
  parseRoleInput,
  parseStatusInput,
  parseUserId,
  updateAdminUserRole,
} from "../admin-service";

vi.mock("@/features/admin/repositories/admin-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/repositories/admin-repository")>();
  return {
    ...actual,
    changeUserRole: vi.fn(),
    changeUserStatus: vi.fn(),
    checkSystemHealth: vi.fn(),
    fetchAdminUsers: vi.fn(),
    requireAdminActor: vi.fn(),
  };
});

describe("admin service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes pagination and parses filters", () => {
    const filters = parseAdminUserFilters(new URLSearchParams("page=2&pageSize=500&role=admin&isActive=false&search= root "));
    expect(filters).toEqual({ page: 2, pageSize: 100, role: "admin", isActive: false, search: "root" });
  });

  it("rejects invalid filters, IDs, roles, statuses, and unknown fields", () => {
    expect(() => parseAdminUserFilters(new URLSearchParams("role=guest"))).toThrowError(/role filter/);
    expect(() => parseUserId("not-a-uuid")).toThrowError(/user ID/);
    expect(() => parseRoleInput({ role: "guest" })).toThrowError(/Invalid role/);
    expect(() => parseRoleInput({ role: "admin", actorId: "forged" })).toThrowError(/Only role/);
    expect(() => parseStatusInput({ isActive: "true" })).toThrowError(/boolean/);
  });

  it("returns repository pagination results", async () => {
    const result = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
    vi.mocked(fetchAdminUsers).mockResolvedValueOnce(result);
    await expect(listAdminUsers({ page: 1, pageSize: 20 })).resolves.toEqual(result);
  });

  it("maps last-active-admin protection without weakening the error", async () => {
    vi.mocked(changeUserRole).mockRejectedValueOnce(
      new AdminRepositoryError("LAST_ACTIVE_ADMIN", "The final active administrator cannot be changed."),
    );
    await expect(updateAdminUserRole("00000000-0000-4000-8000-000000000001", "learner"))
      .rejects.toMatchObject({ code: "LAST_ACTIVE_ADMIN" });
  });
});
