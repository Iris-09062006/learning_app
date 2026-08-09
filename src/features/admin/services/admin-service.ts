import {
  AdminRepositoryError,
  changeUserRole,
  changeUserStatus,
  checkSystemHealth,
  fetchAdminUsers,
  requireAdminActor,
} from "@/features/admin/repositories/admin-repository";
import type {
  AdminUserFilters,
  AdminUserListResult,
  ChangeUserRoleResponse,
  ChangeUserStatusResponse,
  HealthResponse,
} from "@/features/admin/types";
import type { UserRole } from "@/features/auth/auth.types";

export class AdminServiceError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "LAST_ACTIVE_ADMIN"
      | "VALIDATION_ERROR"
      | "DATABASE_ERROR",
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof AdminRepositoryError) {
    throw new AdminServiceError(error.code, error.message);
  }
  throw new AdminServiceError("DATABASE_ERROR", "Unable to access administration data.");
}

const roles: UserRole[] = ["learner", "moderator", "admin"];

export function parseAdminUserFilters(params: URLSearchParams): AdminUserFilters {
  const rawPage = Number(params.get("page") ?? 1);
  const rawPageSize = Number(params.get("pageSize") ?? 20);
  const role = params.get("role");
  const active = params.get("isActive");
  const search = params.get("search")?.trim();

  if (role && !roles.includes(role as UserRole)) {
    throw new AdminServiceError("VALIDATION_ERROR", "Invalid role filter.");
  }
  if (active !== null && active !== "true" && active !== "false") {
    throw new AdminServiceError("VALIDATION_ERROR", "Invalid active status filter.");
  }

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: Number.isInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 100) : 20,
    search: search || undefined,
    role: role ? (role as UserRole) : undefined,
    isActive: active === null ? undefined : active === "true",
  };
}

export function parseUserId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AdminServiceError("VALIDATION_ERROR", "Invalid user ID.");
  }
  return value;
}

export function parseRoleInput(value: unknown): UserRole {
  const role = value && typeof value === "object" ? (value as Record<string, unknown>).role : undefined;
  if (Object.keys((value && typeof value === "object" ? value : {}) as object).some((key) => key !== "role")) {
    throw new AdminServiceError("VALIDATION_ERROR", "Only role can be updated.");
  }
  if (typeof role !== "string" || !roles.includes(role as UserRole)) {
    throw new AdminServiceError("VALIDATION_ERROR", "Invalid role.");
  }
  return role as UserRole;
}

export function parseStatusInput(value: unknown): boolean {
  const isActive = value && typeof value === "object" ? (value as Record<string, unknown>).isActive : undefined;
  if (Object.keys((value && typeof value === "object" ? value : {}) as object).some((key) => key !== "isActive")) {
    throw new AdminServiceError("VALIDATION_ERROR", "Only isActive can be updated.");
  }
  if (typeof isActive !== "boolean") {
    throw new AdminServiceError("VALIDATION_ERROR", "isActive must be boolean.");
  }
  return isActive;
}

export async function listAdminUsers(filters: AdminUserFilters): Promise<AdminUserListResult> {
  try { return await fetchAdminUsers(filters); } catch (error) { mapRepositoryError(error); }
}

export async function updateAdminUserRole(userId: string, role: UserRole): Promise<ChangeUserRoleResponse> {
  try { return await changeUserRole(userId, role); } catch (error) { mapRepositoryError(error); }
}

export async function updateAdminUserStatus(userId: string, isActive: boolean): Promise<ChangeUserStatusResponse> {
  try { return await changeUserStatus(userId, isActive); } catch (error) { mapRepositoryError(error); }
}

export async function getSystemHealth(): Promise<HealthResponse> {
  return checkSystemHealth();
}

export async function assertAdminAccess(): Promise<void> {
  try { await requireAdminActor(); } catch (error) { mapRepositoryError(error); }
}
