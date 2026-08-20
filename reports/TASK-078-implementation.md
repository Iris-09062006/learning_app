# TASK-078 — Implementation Report

## Outcome

`VERIFIED` — Phase D contract, opt-in smoke harness, documentation, read-only readiness inspection,
and regression work pass. T039's earlier `UPSTREAM` was a local test-runtime defect: Vitest `jsdom`
created a cross-realm `AbortSignal` that native Node fetch rejected before HTTP dispatch. The smoke
now runs in the Node environment and its one final Basic Markdown adapter call passed. Feature 002
is verified; deployment readiness is a conditional GO pending Vercel `TAVILY_API_KEY`, redeploy,
and a post-deploy production smoke under separate authorization.

## Implementation

- Added an OpenAPI 3.1/PyYAML validator that recursively resolves every local JSON Pointer `$ref`.
- Added explicit route coverage proving new and idempotently reused URL attempts both return the
  locked provider-neutral HTTP 201 envelope.
- Added an opt-in integration test gated by `TAVILY_EXTRACT_SMOKE=1` plus `TAVILY_API_KEY`. It uses
  one `https://example.com` Basic Markdown request, no retry, no database/Storage write, and emits
  only sanitized metrics or diagnostic category/status/transport metadata.
- Locked that server-only integration test to Vitest's Node environment and added an offline
  regression proving its timeout signal is accepted by native fetch. The provider's Basic timeout
  and bounded 10-second client guard remain unchanged because observed calls completed near 2–3
  seconds and the failed request rejected near 5 ms rather than at the deadline.
- Updated `.env.example`, README, quickstart, deployment, architecture, security, current-flow,
  database-audit, and change-impact documentation for the Search/Extract/Gemini/Supabase split,
  server-only configuration, inactive direct fetch, zero feature migrations, and non-destructive
  rollback.
- Updated migration documentation from the stale 001–016 range to the current 001–030 chain and
  aligned the documented Vercel Node runtime with `package.json` Node 22.x.

## Read-only deployment inspection

- Shared Supabase migration history contains `030_topic_course_multi_source` as remote version
  `20260813155929`; `source_document_metadata` and `course_import_job_sources` exist.
- The shared project has a private `lesson-sources` bucket and four matching object policies.
- Vercel Production lists the existing Supabase and AI variables but does not list
  `TAVILY_API_KEY`; no value was read or printed.
- Feature-002 migrations added or changed: 0. No remote write, migration application, environment
  mutation, deployment, or production-data operation occurred.

## Files changed

- Configuration/docs: `.env.example`, `README.md`, `docs/architecture.md`, `docs/security.md`,
  `docs/deployment.md`, and three `docs/ai-course-*` audit documents.
- Contract/smoke: `specs/002-tavily-web-ingestion/quickstart.md`,
  `specs/002-tavily-web-ingestion/contracts/validate_openapi.py`, route contract test, and the
  opt-in Tavily integration test.
- Task evidence: `tasks/TASK-078.md`, `reports/TASK-078-*.md`, `ACTIVE_TASK.md`, and
  `project/TASKS.md`.

## External documentation

Official Tavily Extract/API-credit documentation and Context7 were checked on 2026-08-14. The
current contract supports Bearer-authenticated `POST /extract`, Basic depth, Markdown format,
`results`/`failed_results`, and optional usage. Official pricing states one credit per five
successful Basic extractions and no charge for failed extractions.

Controlled diagnostics used one non-Extract `/usage` request, one direct Basic Extract request,
and one final adapter smoke request. No retry, fan-out, secret, raw content, raw response, request
ID, Authorization header, database write, or Storage write occurred.

## Final Phase D closure

- T001–T047 are synchronized as complete; T039 and T047 are VERIFIED.
- The final closure reran lint, typecheck, the complete non-live unit suite, keyless build, OpenAPI
  validation, and all 15 Playwright tests. The live smoke skipped by default and no additional
  Tavily request occurred.
- The 41-point final requirement audit found no contradiction. No production code, package,
  Playwright configuration, migration, protected feature-001 artifact, or external state changed.
- Supabase precondition: READY from existing read-only evidence. Feature-002 migration: not
  required. Production key, redeploy, and production smoke remain release prerequisites.
