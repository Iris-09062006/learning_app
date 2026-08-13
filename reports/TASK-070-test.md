# TASK-070 Test Report

## Focused gates

- Query planning, normalization, and ranking: PASS - 3 files / 12 tests.
- Brave adapter: PASS - 1 file / 9 tests.
- Content pipeline service: PASS - 1 file / 42 tests.
- Admin research route and pipeline routes: PASS - 1 file / 22 tests.
- Admin component: PASS - 1 file / 15 tests.
- Rate limiter: PASS - 1 file / 7 tests.

The focused coverage verifies maximum-three queries, maximum-20 candidates, opaque topic-bound
cursors, provider-error mapping, no content repository/materialization calls during research,
selection persistence, maximum-eight selection, Research More deduplication, and selected-only
Phase 3 ingestion.

## Browser gates

- Phase 4 topic research, Research More, keyboard selection, provider failure/retry fallback,
  selected-only ingestion, outline/content review, publication, and Axe scan: PASS.
- Phase 3 partial-failure manual URL/file source review regression: PASS.
- Phase 2 multi-source generation regression: PASS.
- Legacy PDF Course-import regression: PASS.
- Combined result: 4 Chromium scenarios passed in 24.8 seconds.

## Repository quality gates

- `npm run lint` - PASS, zero warnings.
- `npm run typecheck` - PASS.
- `npm run test` - PASS, 103 files / 648 tests.
- `npm run build` - PASS, Next.js 15.5.22 production build including `/api/admin/course-research`.
- `git diff --check` - PASS.

## Expected output and environment notes

The full suite prints stderr from existing negative-path tests that intentionally test error
logging. The first parallel Vitest attempt hit Windows `spawn EPERM`; the required isolated rerun
passed 648/648. The first sandboxed Playwright attempt hit the same process-spawn restriction; the
approved browser rerun passed 4/4. Playwright prints the pre-existing Next.js future
`allowedDevOrigins` warning; none of these messages represents a product failure.
