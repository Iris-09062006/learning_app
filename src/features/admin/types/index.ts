import type { UserRole } from "@/features/auth/auth.types";

export interface AdminUserSummary {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserListResult {
  items: AdminUserSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

export interface ChangeUserRoleResponse {
  userId: string;
  role: UserRole;
  updatedAt: string;
  auditLogId: number;
}

export interface ChangeUserStatusResponse {
  userId: string;
  isActive: boolean;
  updatedAt: string;
  auditLogId: number;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  database: "connected" | "unavailable";
  timestamp: string;
}
