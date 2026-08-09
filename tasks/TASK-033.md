# TASK-033 — User Administration and System Health Dashboard

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 16: Admin Module — F-ADMIN-01..05, Module 17: System Module — F-SYSTEM-01)
- `docs/database.md` (§7.1 `profiles`, §7.14 `admin_logs`)
- `docs/api_contract.md`
- `docs/security.md`

## Objectives
1. Implement User Management API (`GET /api/admin/users`, `PATCH /api/admin/users/:userId/role`, `PATCH /api/admin/users/:userId/status`).
2. Build audit logging mechanism when user role or active status is updated.
3. Protect against demoting the final active admin account.
4. Implement System Health API (`GET /api/system/health`) returning application and database connection status.
5. Create Admin Dashboard UI (`/admin/users`, `/admin/system`) with user search, filtering, role/status toggles, and system health status.

## File Scope
- `src/features/admin/types/index.ts`
- `src/features/admin/repositories/admin-repository.ts`
- `src/features/admin/services/admin-service.ts`
- `src/features/admin/components/`
- `src/app/api/admin/`
- `src/app/api/system/`
- `src/app/(main)/admin/`
- `supabase/migrations/014_create_admin_user_management_rpc_functions.sql`
- `src/generated/database.types.ts`
- `src/features/admin/**/__tests__/`
- `src/app/api/admin/**/__tests__/`
- `src/app/api/system/**/__tests__/`
- `tasks/TASK-033.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `project/ROADMAP.md`
- `reports/TASK-033-implementation.md`
- `reports/TASK-033-test.md`
- `reports/TASK-033-review.md`

## Implementation Contract
- `GET /api/admin/users` returns `{ items, page, pageSize, total, totalPages }`; items follow `AdminUserSummary` in `docs/api_contract.md`.
- Search is case-insensitive across Auth email and profile username; `role` and `isActive` filters are optional and pagination is applied after filtering.
- Role and status mutations use authenticated, narrowly granted database RPC functions so last-active-admin protection, profile update, and `admin_logs` insert are atomic.
- TASK-033 intentionally exposes the basic public health endpoint as `GET /api/system/health`, overriding the older `/api/health` path in `docs/api_contract.md` for this task. Its response fields remain `status`, `database`, and `timestamp`.
- `admin_logs` is the canonical audit table. No `audit_logs` table is introduced.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- `/api/admin/*` endpoints strictly reject non-Admin users with 403 Forbidden.
- User management API allows pagination, text searching by email/username, and filtering by role/active status.
- Role and status modifications generate corresponding `admin_logs` entries.
- System prevents demoting or deactivating the last remaining active Admin user.
- `/api/system/health` returns basic operational status without leaking secret credentials.
- Tests verify authorization enforcement, audit log generation, last-admin protection, and UI components.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass without errors or warnings.

## Non-Goals
- Password management or forced password resets via direct DB write.
- Complex metrics/analytics graphics.
