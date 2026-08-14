# TASK-073 — Replace Default Brave Search with Tavily

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Replace Brave with Tavily Search as the default Phase 4 web-search provider while preserving the
existing vendor-neutral `WebSearchProvider` boundary and all verified Phase 1–4 behavior.

## Scope
- Add a server-only Tavily adapter using `TAVILY_API_KEY`, `search_depth: "basic"`, and
  `auto_parameters: false`.
- Keep Brave only as unused optional compatibility code.
- Preserve deterministic query planning, candidate caps, normalization, canonical URL
  deduplication, ranking, Research More, selected-only ingestion, and zero research persistence.
- Update provider/config tests, `.env.example`, deployment/security documentation, and task reports.
- Do not change database schema, migration 030, Supabase state, Phase 1–3 behavior, push, or deploy.

## Acceptance Criteria
- [x] Tavily implements the existing vendor-neutral provider contract without leaking vendor DTOs.
- [x] Auth, quota/rate-limit, timeout, invalid response, and upstream failures map to existing stable
      provider and application errors.
- [x] A missing `TAVILY_API_KEY` is recoverable at research time and does not break startup/build,
      manual URL, file/PDF, or legacy ingestion.
- [x] Tavily requests always use basic search with automatic parameters disabled.
- [x] Existing Phase 4 research and Phase 3/legacy ingestion regressions pass without database or
      migration changes.
- [x] Full quality gates, focused diff review, and secret scan pass.

## Required Commands
- `npm run test -- src/features/content-pipeline/providers/tavily-web-search-provider.test.ts`
- Focused Phase 4 service/route/component tests proving zero research writes and selected-only ingestion.
- Phase 4, Phase 3, and legacy PDF Playwright scenarios.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- Secret scan and staged-diff review.
