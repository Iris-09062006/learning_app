import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminUserFilters,
  AdminUserListResult,
  AdminUserSummary,
  ChangeUserRoleResponse,
  ChangeUserStatusResponse,
  HealthResponse,
} from "@/features/admin/types";

export class AdminRepositoryError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "LAST_ACTIVE_ADMIN"
      | "DATABASE_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "AdminRepositoryError";
  }
}

export async function requireAdminActor(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new AdminRepositoryError("UNAUTHENTICATED", "Authentication required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    throw new AdminRepositoryError("DATABASE_ERROR", "Unable to verify administrator access.");
  }
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw new AdminRepositoryError("FORBIDDEN", "Administrator access required.");
  }
  return authData.user.id;
}

export async function fetchAdminUsers(filters: AdminUserFilters): Promise<AdminUserListResult> {
  await requireAdminActor();
  const adminClient = createAdminSupabaseClient();
  const authUsers: Array<{ id: string; email?: string; created_at: string }> = [];
  const authPageSize = 1000;
  let authPage = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: authPage,
      perPage: authPageSize,
    });
    if (error) {
      throw new AdminRepositoryError("DATABASE_ERROR", "Unable to load authentication users.");
    }
    authUsers.push(...data.users);
    if (data.users.length < authPageSize) break;
    authPage += 1;
  }

  if (authUsers.length === 0) {
    return { items: [], page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 };
  }

  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, username, role, is_active, created_at")
    .in("id", authUsers.map((user) => user.id));
  if (profileError) {
    throw new AdminRepositoryError("DATABASE_ERROR", "Unable to load user profiles.");
  }

  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const search = filters.search?.trim().toLocaleLowerCase();
  const filtered: AdminUserSummary[] = (profiles ?? [])
    .map((profile) => ({
      id: profile.id,
      email: authById.get(profile.id)?.email ?? "",
      username: profile.username,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
    }))
    .filter((user) => !filters.role || user.role === filters.role)
    .filter((user) => filters.isActive === undefined || user.isActive === filters.isActive)
    .filter((user) =>
      !search
      || user.email.toLocaleLowerCase().includes(search)
      || user.username.toLocaleLowerCase().includes(search),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const total = filtered.length;
  const from = (filters.page - 1) * filters.pageSize;
  return {
    items: filtered.slice(from, from + filters.pageSize),
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
  };
}

function mapRpcError(error: { code?: string; message?: string }): never {
  if (error.code === "P0001") throw new AdminRepositoryError("UNAUTHENTICATED", "Authentication required.");
  if (error.code === "P0003") throw new AdminRepositoryError("FORBIDDEN", "Administrator access required.");
  if (error.code === "P0002") throw new AdminRepositoryError("NOT_FOUND", "User not found.");
  if (error.code === "P0006") {
    throw new AdminRepositoryError("LAST_ACTIVE_ADMIN", "The final active administrator cannot be changed.");
  }
  throw new AdminRepositoryError("DATABASE_ERROR", "Unable to update user.");
}

export async function changeUserRole(
  userId: string,
  role: "learner" | "moderator" | "admin",
): Promise<ChangeUserRoleResponse> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_change_user_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) mapRpcError(error);
  return data as unknown as ChangeUserRoleResponse;
}

export async function changeUserStatus(
  userId: string,
  isActive: boolean,
): Promise<ChangeUserStatusResponse> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_change_user_status", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) mapRpcError(error);
  return data as unknown as ChangeUserStatusResponse;
}

export async function checkSystemHealth(): Promise<HealthResponse> {
  const timestamp = new Date().toISOString();
  try {
    const adminClient = createAdminSupabaseClient();
    const { error } = await adminClient.from("profiles").select("id").limit(1);
    if (error) return { status: "degraded", database: "unavailable", timestamp };
    return { status: "ok", database: "connected", timestamp };
  } catch {
    return { status: "degraded", database: "unavailable", timestamp };
  }
}
