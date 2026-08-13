# Active Task Queue

- **Active task:** `TASK-070` — Topic-Based Multi-Source Course Creation: Phase 4
- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Deferred design task:** `TASK-047` (`DRAFT`)
- **Previous blocked task:** `TASK-044` — external Supabase Redirect URL verification

## Current objective

Implement only topic research and ranked discovery in
`specs/001-topic-course-research/tasks.md`; Phase 5 is excluded.

Phase 1 T001–T031 is verified. Migration, PostgreSQL concurrency/invariant checks, focused and
full tests, legacy PDF browser E2E, lint, typecheck, and build pass. Evidence is recorded in
`reports/TASK-067-implementation.md`, `reports/TASK-067-test.md`, and
`reports/TASK-067-review.md`.

Phase 2 T032–T049 is verified. Source-qualified provider/DTO contracts, deterministic job-wide
generation, Admin provenance/editor compatibility, and both new plus legacy browser gates pass.
Phase 3 T050–T073 is verified. Phase 4 T074–T091 is verified: stateless research, Brave search,
deterministic candidate review/ranking, selected-only Phase 3 handoff, accessibility, and all
required browser regressions pass. Phase 5 remains excluded.

## Previous active external verification

Normalize provider Lesson-section citations when the server has exactly one possible source chunk,
while preserving strict multi-chunk ownership validation and generic client errors.

Commit `6d6b03c` is pushed, but three Vercel production deployments remain `UNKNOWN` before build
initialization. The production alias therefore still serves the previous deployment and final
Playwright verification cannot yet test the hotfix.

GitHub Actions identified the upstream release blocker: its build job lacked the public Supabase
variables required by Next.js at build time. A Context7-verified workflow fix now passes the
quality-gates job. The newly unblocked E2E job exposed an outdated learner flow; the deterministic
mock and test now perform the required `start_lesson` transition and pass locally.

## Previous verified objective

TASK-065 is verified in production. Course import job 7 persisted an approved three-Lesson outline
using the sole source chunk after the retry and citation-normalization deployments.

TASK-064 is verified in production. Sources 23 and 24 each persisted 2,392 extracted characters,
confirming the Vercel Node 22/native Linux PDF packaging fix before the separate outline failure.

TASK-063 is verified. Learners can use “Tiếp theo” to start the immediately following published
Lesson without waiting for completion, while exercise-based completion remains truthful. Migration
029 is applied and verified on hosted Supabase as version `20260811153651`.

## Previous verified work

TASK-061 is verified locally and on hosted Supabase. `POST /api/lessons/:lessonId/start` now writes
through a hardened, authenticated `start_lesson` RPC instead of a forbidden direct
`user_progress` upsert. Hosted migration `20260811133320` is applied; transactional smoke testing
passed and rolled back without changing learner progress.

TASK-060 is verified. Hosted migration `20260811102054` fixes Markdown/JSON operator
precedence; Course import job #5 published Course 17 and six visible Lessons atomically.

TASK-059 is verified. Provider schemas now use the Gemini-compatible structural subset while
strict server-side validation continues to enforce every business constraint.

TASK-058 is verified locally. The Lesson-specific flow now generates strict pending Exercise
drafts, preserves immutable atomic review history, and publishes approved drafts idempotently.
Migrations `024`, `025`, and `026` were applied through Supabase MCP to project
`yzucdzlgaucmduoghjft` on 2026-08-10 and verified against the remote catalog.

## Current state

TASK-057 is verified locally. The Admin PDF-to-Course flow now persists an outline review
checkpoint, generates/revises Lesson content independently, and publishes official
curriculum atomically. Migration `025` is intentionally not applied to shared Supabase,
and no deployment was performed.

TASK-055 is verified locally. PDF-to-Course batch generation, persistent review
resolution, per-Lesson exercise generation, authorization hardening, focused/full
unit tests, E2E, lint, typecheck, build, and diff review pass. Migration `023` is
intentionally not applied to shared Supabase, and no deployment was performed.
