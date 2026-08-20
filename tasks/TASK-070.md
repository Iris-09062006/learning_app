# TASK-070 — Topic-Based Multi-Source Course Creation: Phase 4

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase 4 (T074–T091) of `specs/001-topic-course-research/tasks.md`: stateless
Vietnamese-first topic research, Brave Web Search behind a vendor-neutral provider, deterministic
normalization/ranking, accessible candidate selection and Research More, and selected-only handoff
to the verified Phase 3 ingestion flow.

## Scope
- Phase 4 tasks T074–T091 only.
- Reuse the verified Phase 3 URL/file ingestion, source review, ordered initialization, outline,
  content review, and publication flow.
- Research request/client state only; no research persistence or database migration.
- Preserve manual URL, optional file, Phase 2 multi-source generation, and legacy PDF paths.
- No Phase 5 rollout/observability work, crawler, embeddings, AI query planner, learner, Exercise,
  auth, enrollment, progress, push, deployment, or production mutation.

## Acceptance Criteria
- [x] Vendor-neutral provider contract and Brave adapter validate bounded request/response shapes
      and map auth/quota/timeout/upstream failures without leaking credentials or vendor DTOs.
- [x] Topic/query planning, URL canonicalization/deduplication, and advisory ranking are bounded,
      deterministic, Vietnamese-first, language-aware, and covered by focused tests.
- [x] `POST /api/admin/course-research` is active-Admin-only, rate-limited, no-store, stateless,
      contract-compatible, and performs zero repository/database calls.
- [x] Research UI supports Research More, max 20 visible candidates, max 8 selections, preserved
      state on provider failure, accessible operation, and explicit selected-only ingestion.
- [x] Phase 4 topic E2E, Phase 3 manual/file, Phase 2 two-source, and legacy PDF regressions pass.
- [x] Lint, typecheck, full tests, build, diff/security review, and commit complete.

## Required Commands
- Per-task focused commands from `specs/001-topic-course-research/tasks.md`.
- Phase 4 focused commands from `specs/001-topic-course-research/quickstart.md`.
- Phase 4 Playwright scenario, Phase 3 manual/file regression, Phase 2 multi-source regression,
  and legacy PDF regression.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
