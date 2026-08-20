# TASK-071 — Topic-Based Multi-Source Course Creation: Phase 5

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase 5 (T092–T103) of `specs/001-topic-course-research/tasks.md`: compatibility
hardening, production-like migration/backfill and security verification, stable operational error
contracts and metadata-only signals, final documentation, full regression/E2E/accessibility gates,
and rollout/rollback readiness.

## Scope
- Phase 5 tasks T092–T103 only; no new product capability or Phase 1–4 refactor without a proven
  correctness, security, compatibility, accessibility, or operational defect.
- Preserve legacy PDF/document import, immutable evidence/revisions, Continue, atomic publication,
  learner/enrollment/progress behavior, and the separate per-Lesson Exercise flow.
- Verify migration 030 locally against a clean production-like database; remote Supabase is
  inspection-only and production mutation is forbidden.
- Stabilize existing error/observability boundaries without adding a new platform or logging
  source/provider bodies, prompts, credentials, tokens, private addresses, or storage contents.
- Update only implementation-accurate architecture/database/API/security/UI/features/decision and
  deployment/environment documentation.
- Do not push, deploy, rewrite migration history, upgrade major dependencies, or create feature
  flags/architecture not already approved.

## Acceptance Criteria
- [x] T092–T103 verification requirements pass without weakened tests.
- [x] Clean migrations and backfill invariants, RLS/RPC/grants/search paths, generated DB types,
      OpenAPI parsing/$refs, secret scan, and dependency audit are verified.
- [x] Stable error envelopes and metadata-only operational signals cover all specified Phase 5
      outcomes without sensitive content leakage.
- [x] Legacy, existing-unpublished, multi-source, topic/manual/file, failure/retry/staleness,
      publication, learner/progress, Exercise, refresh/idempotency, and accessibility regressions
      pass in the final build.
- [x] Documentation states the implemented flow and explicit rollout/rollback gates accurately.
- [x] Lint, typecheck, full Vitest, build, full Playwright, and diff/security review pass. Commit is
      recorded after the final staged-diff check.

## Required Commands
- Per-task focused commands T092–T102 from `specs/001-topic-course-research/tasks.md`.
- Phase 1–5 commands and invariant checks from `specs/001-topic-course-research/quickstart.md`.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `git diff --check`
- Repository-supported secret scan, OpenAPI parse/$ref validation, generated-type verification,
  migration review, and dependency/security audit.
