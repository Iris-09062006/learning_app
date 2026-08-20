# TASK-069 — Topic-Based Multi-Source Course Creation: Phase 3

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase 3 (T050–T073) of `specs/001-topic-course-research/tasks.md`: manual URL
and optional-file staging, SSRF-safe immutable web snapshots, source review/recovery, atomic
initialization, later attach/detach, stale-outline handling, and Phase 3 regression gates.

## Scope
- Phase 3 tasks T050–T073 only.
- Reuse the verified Phase 1 ownership/RPC foundation and Phase 2 job-wide generation boundary.
- Preserve the legacy file-only Course-import flow unchanged.
- No topic research, search provider, embeddings, crawler, learner, Exercise, auth, enrollment,
  progress, publication redesign, push, or deployment.

## Acceptance Criteria
- [x] Web acquisition satisfies the complete approved SSRF, redirect, timeout, header, body, and
      MIME controls and stores deterministic private Markdown evidence.
- [x] New URL/file attempts remain staged until usable; failed/empty evidence never initializes
      or attaches to an import.
- [x] Ordered usable sources initialize one job atomically and retries create no duplicates.
- [x] Admin source review supports partial failure, retry/remove, later attach/detach, checkpoint
      v2 recovery, and stale-outline replacement before Continue.
- [x] Phase 3 focused/E2E gates and legacy Phase 2/PDF regressions pass.
- [x] Lint, typecheck, full tests, build, diff/security review, and commit complete.

## Required Commands
- Phase 3 focused commands from `specs/001-topic-course-research/quickstart.md`.
- Phase 3 Playwright scenario, Phase 2 multi-source regression, and legacy PDF regression.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
