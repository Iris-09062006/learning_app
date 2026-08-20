# TASK-077 — Tavily Web Ingestion Phase C Hardening

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase C T026–T035 of `specs/002-tavily-web-ingestion/tasks.md`: prove stored
evidence and file/PDF workflows remain independent of Tavily after acquisition, lock the
pre-provider URL and untrusted-content boundaries, verify provider-neutral recovery/privacy, and
classify the inactive direct-fetch/Readability path without starting Phase D.

## Scope
- Add explicit zero-Extract assertions for every stored-evidence generation/review/publication path.
- Add prompt-like evidence framing and source-reference validation regressions.
- Add missing/auth/quota/timeout/upstream/malformed provider isolation tests.
- Add explicit file/PDF zero-Search/zero-Extract assertions.
- Preserve and test URL validation before provider access, including localhost and unsafe literals.
- Audit metadata-only diagnostics and provider-neutral route/client envelopes.
- Retain legacy fetcher/Readability/jsdom exactly as directed by T030 after caller classification.
- Run the T035 focused and browser compatibility/security gate.

## Acceptance Criteria
- [x] T026–T035 pass their exact Verify commands.
- [x] Outline generation/regeneration/edit, Continue, Lesson generation/regeneration, review,
  publication/retry, accepted reuse, and stored-snapshot retry make zero Extract calls.
- [x] Prompt-like stored evidence remains escaped/untrusted and cannot change source ownership or
  citation validation.
- [x] Every provider outage class affects only new URL acquisition and never invokes direct fetch.
- [x] File/PDF ingestion and stored-evidence Course operations make zero Tavily Search/Extract calls.
- [x] Approved URL rejection cases fail before provider access.
- [x] Logs/errors contain metadata-only stable categories and no secret/provider/source bodies.
- [x] Tavily DTOs remain adapter-private; no migration or Phase D implementation occurs.
- [x] Focused Phase C, selected E2E, Phase B regressions, and repository quality gates pass.
- [x] Review PASS and a scoped Conventional Commit are complete without push/deploy.

## Required Commands
- Every T026–T035 Verify command in `specs/002-tavily-web-ingestion/tasks.md`.
- Phase C scenarios from `quickstart.md` limited to T035 scope.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
