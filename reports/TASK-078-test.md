# TASK-078 — Test Report

## Real Tavily smoke

- Default opt-in gate — PASS/SKIP: 41 route tests passed and the integration test skipped once,
  proving ordinary tests consume zero provider credits.
- Root-cause reproduction — PASS: under Vitest `jsdom`, a local `data:` Request using
  `AbortSignal.timeout()` failed in 1 ms with a cross-realm signal `TypeError`, matching the prior
  live smoke's pre-HTTP `UPSTREAM` failure. The temporary diagnostic file was removed.
- Usage check — PASS: authenticated `GET /usage` returned HTTP 200 in 1,846 ms; key valid, Researcher
  plan, 4/1,000 plan usage, Extract usage 0, quota available, and no rate limit.
- Direct contract check — PASS: one `https://example.com` Basic Markdown request returned HTTP 200,
  one result, zero failed results, raw length 167, in 2,700 ms.
- Final adapter smoke — PASS after exactly one call: Basic/Markdown, normalized length 167,
  canonical `https://example.com/`, deterministic snapshot length 295/hash verified, one usable
  chunk, no persistence, elapsed 2,184 ms.
- Debug session Extract calls: two total—one authorized direct diagnostic and one final adapter
  recheck. No retry, fan-out, Advanced, Crawl, Research, raw content/body/request ID output,
  Authorization/key output, database write, or Storage write occurred.

## Contract and focused regression

- `python specs/002-tavily-web-ingestion/contracts/validate_openapi.py` — PASS: OpenAPI 3.1,
  1 path, 21 local refs, 0 unresolved.
- URL route contract — PASS: 41 tests, including explicit new/reused HTTP 201 behavior.
- Phase 4 research gate — PASS: 3 files, 34 tests.
- Phase 3 source/retry gate — PASS: 3 files, 150 tests.
- T039 focused adapter/runtime gate — PASS: 27 tests; one live test skipped by default.
- Phase A provider gate — PASS: 5 files / 54 tests.
- Phase B ingestion gate — PASS: 5 files / 193 tests.
- Phase C outage/no-reextract focus — PASS: 5 selected tests.
- Phase 2 stored-evidence/provider gate — PASS; live integration test skipped by default.
- Learner/progress focus — PASS: 2 files, 13 tests.
- Exercise focus — PASS: 2 files, 16 tests. Existing expected negative-path stderr was non-failing.

## Full quality gates

- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test` — PASS: 107 files / 802 tests; one live integration test skipped by default.
- `npm run test:e2e` — PASS on isolated local port 3001: 15/15 Playwright tests, including all 10
  critical flows. `playwright.config.ts` was restored and has no diff.
- `$env:TAVILY_API_KEY=''; npm run build` — PASS: 32 static pages and complete build traces.
- `git diff --check` — PASS; only expected Windows LF/CRLF notices.
- Client bundle scan — PASS: no `TAVILY_API_KEY` or `NEXT_PUBLIC_TAVILY` in `.next/static`.
- Production DTO scan — PASS: no Tavily response fields in app/types/repository/service contracts.
- Direct-fetch scan — PASS: no production caller outside retained legacy files; test-only negative
  assertions remain.
- Secret-value scan — PASS: no Tavily key-shaped value in task/repository files; `.env.local` and
  unrelated user files were not printed or staged.
- Migration/001 diff — PASS: no change under `supabase/migrations` or
  `specs/001-topic-course-research`.

## Migration rehearsal/readiness

Feature 002 adds no migration, so a new destructive local reset was not required. The previously
verified TASK-071 clean PostgreSQL rehearsal applied 001–030 and tested backfill/RLS/RPC invariants;
the full current migration contract suite also passed inside the 802-test gate. Remote status was
rechecked read-only and confirms migration 030 is now applied.

## Final non-live closure rerun

- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test` with `TAVILY_EXTRACT_SMOKE` disabled — PASS: 107 files / 802 tests; the live
  Tavily test skipped by default and closure made zero provider calls.
- `$env:TAVILY_API_KEY=''; npm run build` — PASS: 32 static pages and complete traces.
- `npm run test:e2e` — PASS: 15/15 on isolated port 3001 after port 3000 was found occupied.
  The temporary port-only Playwright edit was restored and has zero diff.
- OpenAPI validator — PASS: OpenAPI 3.1, 1 path, 21 local refs, 0 unresolved.
- `git diff --check`, tracked-secret scan, client-bundle key scan, migration/feature-001/package
  scope checks, DTO/direct-fetch/temporary-diagnostic scans — PASS.
