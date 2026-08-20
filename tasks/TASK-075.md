# TASK-075 — Tavily Web Ingestion Phase A Provider Boundary

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase A (T001–T009) of `specs/002-tavily-web-ingestion/tasks.md`: a
vendor-neutral web extraction boundary, Tavily Basic Extract adapter, deterministic
application normalization/eligibility, stable provider-neutral error mapping, and focused tests.

## Scope
- Add the provider-neutral request/result/error contract and application normalizer.
- Add a server-only Tavily Extract adapter using one Basic full-page Markdown request.
- Validate response cardinality and translate only provider-independent fields.
- Enforce normalized content eligibility at 80–200,000 characters and usable chunk presence.
- Add provider/configuration/error/redaction/determinism tests and focused regressions.
- Keep active URL ingestion, Search, file/PDF, storage, database, UI, Gemini, Course generation,
  learner, Exercise, deployment, and Supabase state unchanged.

## Acceptance Criteria
- [x] T001–T009 and the Phase A gate pass.
- [x] Tavily request is Basic Markdown, one URL, images/favicon disabled, with no query/chunk
  filtering, retry, Advanced fallback, Crawl, or Research.
- [x] Only `TAVILY_API_KEY` is used and a keyless build succeeds.
- [x] Valid/malformed/failure responses and 79/80/200000/200001 boundaries are tested.
- [x] Invalid canonical candidates and zero usable chunks fail recoverably.
- [x] Active URL ingestion, Tavily Search, and PDF/file behavior remain unchanged.
- [x] No database migration, push, deployment, or remote operation occurs.
- [x] Required gates and diff/security review pass; scoped commit is the final repository step.

## Required Commands
- Phase A task-level verify commands and Phase A gate from
  `specs/002-tavily-web-ingestion/tasks.md`.
- `npm run lint`
- `npm run typecheck`
- Focused URL-ingestion, Tavily Search, and PDF/file regression tests.
- `$env:TAVILY_API_KEY=''; npm run build`
- `git diff --check`
