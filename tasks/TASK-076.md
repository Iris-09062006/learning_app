# TASK-076 — Tavily Web Ingestion Phase B Active Path

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase B (T010–T025) of `specs/002-tavily-web-ingestion/tasks.md`:
switch confirmed discovered and manual web URLs to the verified provider-neutral Tavily Extract
boundary, create deterministic immutable snapshots, and reuse the existing staged-source,
chunking, Course-import initialization/attachment, partial-failure, and retry lifecycle.

## Scope
- Add explicit Search/Research More/render/select/unselect/confirm Extract call-boundary tests.
- Route discovered and manual URL ingestion through one provider-backed service orchestration.
- Preserve original/canonical provenance, deterministic title fallback, snapshot/hash/storage
  identity, existing materialization/chunking, and usable-evidence requirements.
- Preserve independent partial settlement and the existing idempotency key across pre-snapshot and
  post-snapshot retry states without duplicate source/job/bridge persistence.
- Extend only the selected research, manual URL, and partial/retry Phase B browser scenarios.
- Keep Phase C/D cleanup, generation changes, database migrations, provider policy changes,
  deployment, push, and remote Supabase operations out of scope.

## Acceptance Criteria
- [x] T010–T025 and the Phase B gate pass task by task.
- [x] Research/search-only and all pre-confirmation actions make zero Extract calls.
- [x] Each confirmed selected URL makes exactly one Extract call; unselected URLs make zero.
- [x] Manual and discovered URLs share one service/provider/snapshot orchestration while retaining
  `manual_url` and `discovered` ingestion provenance.
- [x] `source_url`, validated `canonical_url`, canonical domain, deterministic title/snapshot/hash,
  existing materialization/chunking, and at-least-one-chunk rules pass focused tests.
- [x] First usable evidence uses existing atomic initialization; secondary evidence uses existing
  attachment; failed evidence never becomes Course membership or the order-zero anchor.
- [x] Partial failures preserve successes; retry is source-specific and creates no duplicate
  source document, snapshot identity, Course-import job, or bridge.
- [x] Normal URL ingestion makes zero calls to the old direct fetch/Readability path and has no
  automatic direct-fetch fallback.
- [x] PDF/file regression and required Phase B browser scenarios pass without Tavily calls.
- [x] No migration, Phase C/D implementation, push, deployment, or remote operation occurs.
- [x] Required quality gates, diff/security review, and scoped commit pass.

## Required Commands
- Every T010–T025 Verify command and the Phase B gate from
  `specs/002-tavily-web-ingestion/tasks.md`.
- Focused provider/service/route/component/repository and PDF/file regression tests.
- Selected research, manual URL, and partial/retry Playwright scenarios.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
