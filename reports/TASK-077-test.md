# TASK-077 — Test Report

## Results

- T026 service immutability gate — PASS: 98 tests.
- T027 service/prompt-boundary gate — PASS: 2 files, 116 tests.
- T028 outage and Admin compatibility gate — PASS: 3 files, 155 tests.
- T029 file/PDF independence gate — PASS: 2 files, 138 tests.
- T030 caller scan — PASS: no production caller for direct fetch or Readability extraction; keyless
  production build PASS.
- T031 URL validation gate — PASS: 2 files, 120 tests.
- T032 diagnostics/privacy gate — PASS: 2 files, 124 tests.
- T033 Admin route/provider-neutral contract gate — PASS: 40 tests; typecheck PASS.
- T034 learner independence gate — PASS: 3 files, 114 tests.
- T035 focused gate — PASS: 32 files, 356 tests.
- T035 selected browser gate (`PDF|stored|publish`) — PASS: 5 tests.
- Phase B browser regression (`research|manual URL|partial|retry`) — PASS: 2 tests; the publication
  retry case was also covered by the T035 browser gate.
- Legacy PDF browser flow — PASS with explicit zero Tavily Search and Extract requests.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm run test` — PASS, full repository Vitest suite. Expected stderr from intentional negative
  paths was informational.
- `$env:TAVILY_API_KEY=''; npm run build` — PASS; Next.js compiled, type-checked, generated all 32
  static pages, and completed build traces without the key.
- DTO/leak scan — PASS: Tavily/raw provider fields remain adapter/test-local and are absent from
  learner/Admin client contracts.
- Migration diff — PASS: no changed file under `supabase/migrations` or the prior 001 feature spec.
- `git diff --check` — PASS.

## Environment notes

- Sandboxed Vitest/build startup returned Windows `spawn EPERM`; identical commands passed with
  approved execution outside the process sandbox.
- Port 3000 was occupied by a pre-existing process. Browser tests passed on temporary port 3001,
  and `playwright.config.ts` was restored with no diff.
- The first partial-outage browser assertion expected the raw route message; the UI intentionally
  maps it to a provider-neutral Vietnamese message. The test was corrected and the product contract
  was unchanged.
- Next.js emitted its existing future `allowedDevOrigins` warning during development E2E only.
