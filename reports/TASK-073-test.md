# TASK-073 Test Report

## Focused provider and Phase 4 gates

- Tavily provider: PASS — 1 file / 13 tests.
- Provider/service/route/UI/query/normalization/ranking matrix: PASS — 7 files / 126 tests.
- Coverage includes basic search parameters, `auto_parameters: false`, vendor-neutral response
  normalization, auth/quota/timeout/upstream/invalid-response mappings, ignored
  `NEXT_PUBLIC_TAVILY_API_KEY`, missing-key recovery, maximum-three queries, maximum-20 candidates,
  zero content-repository writes during Research, Research More, and selected-only ingestion.

## Browser regressions

- Legacy unpublished PDF recovery/publication: PASS.
- Phase 3 manual URL plus file source-review flow: PASS.
- Phase 4 Research More plus selected-only ingestion: PASS.
- Combined result: 3 Chromium scenarios passed.

## Repository quality gates

- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test` — PASS, full suite.
- `npm run build` with `TAVILY_API_KEY` absent — PASS; `/api/admin/course-research` built.
- `git diff --check` — PASS.
- Scoped secret scan — PASS; the only `NEXT_PUBLIC_TAVILY_API_KEY` occurrence is a negative test
  proving that public-prefixed keys are ignored.

## Environment notes

The first sandboxed focused-test and build launches hit Windows `spawn EPERM`. Their approved
outside-sandbox reruns passed. Full tests printed expected stderr from existing negative-path
cases. Playwright printed the existing future `allowedDevOrigins` warning; no requested gate failed.
