# TASK-033 Test Report

## Commands and Results

| Command | Result | Evidence |
|---|---|---|
| `npx vitest run src/features/admin src/app/api/admin src/app/api/system` | PASS | 7 files, 23 tests |
| `npm run lint` | PASS | 0 errors, 0 warnings |
| `npm run typecheck` | PASS | TypeScript completed with exit code 0 |
| `npm run test` | PASS | 58 files, 329 tests |
| `npm run build` | PASS | Production build completed; admin pages and all new endpoints are dynamic routes |
| Supabase CLI `migration list --local` | NOT RUNNABLE | `ECONNREFUSED 127.0.0.1:54322`; Docker daemon unavailable |

## Coverage

- Active-admin authorization and strict 403 mapping.
- Auth email/profile username aggregation, search, filters, and pagination.
- Strict role/status DTOs, UUID validation, and rejection of client actor IDs.
- Atomic RPC invocation, audit action/metadata SQL, last-admin locking, post-lock actor reauthorization, and narrow function grants.
- Sequential migration naming (`014_create_admin_user_management_rpc_functions.sql`).
- Healthy/degraded health API without infrastructure or credential leakage.
- Responsive table controls, mutation feedback, last-admin error announcement, pagination, and health refresh UI.

## Known Baseline Output

- Negative-path tests intentionally emit mocked error diagnostics to stderr while passing.
- Vitest initially hit sandbox `spawn EPERM`; the exact focused and full commands were rerun with process permission and passed.
- Next 15.5 build exits 0 but prints the existing ESLint 8 flat-config integration notice. Standalone lint remains authoritative and passes with `--max-warnings 0`; no linting was disabled.
