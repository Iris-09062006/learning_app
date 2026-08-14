# TASK-078 — Tavily Web Ingestion Phase D Readiness

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase D T036–T047 of `specs/002-tavily-web-ingestion/tasks.md`: validate the
public URL-ingestion contract, run one opt-in real Tavily Basic Extract smoke, execute the full
regression/security/readiness gate, document environment/deployment/rollback requirements, and
produce a final GO/NO-GO assessment without deployment or remote mutation.

## Scope
- Add deterministic OpenAPI YAML/local-`$ref` validation and align route contract tests.
- Add an explicit opt-in, one-URL, non-persistent real Tavily integration smoke.
- Update only implementation-affected environment, architecture, security, current-flow,
  database-audit, change-impact, quickstart, deployment, and task/report documentation.
- Run Phase 4/3/2, PDF, learner/progress, Exercise, complete Playwright, and repository gates.
- Inspect migration 030, private Storage/policy, and Vercel environment readiness read-only.
- Preserve feature-002 zero migrations, provider-neutral DTOs, inactive direct fetch, and all
  stored evidence; do not deploy, push, apply migrations, or modify remote data/configuration.

## Acceptance Criteria
- [x] T036–T047 and the Phase D gate pass with recorded command output.
- [x] The real smoke makes exactly one Basic Markdown Extract request for one benign URL.
- [x] OpenAPI parses, every local `$ref` resolves, and route behavior matches the contract.
- [x] Full unit, Playwright, lint, typecheck, build, diff, secret, bundle, leakage, and migration
      checks pass with no Critical/High/Medium finding.
- [x] Deployment and rollback documentation accurately classifies Vercel, Supabase, and provider
      prerequisites without exposing secrets or authorizing rollout.
- [x] Final reports, task registry, and active-task state are synchronized and a bounded
      Conventional Commit is created only after review PASS.

## Resolved T039 diagnostic

- The failed smoke never received an HTTP response. Vitest's repository-wide `jsdom` environment
  created a cross-realm `AbortSignal`; native Node `fetch` rejected it immediately with `TypeError`.
- An authenticated `GET /usage` returned 200 with a valid Researcher key, available plan quota,
  no rate limit, and zero Extract usage before the controlled checks.
- One direct Basic contract request returned HTTP 200 with one result and no failed result.
- The smoke is now explicitly Node-environment server integration coverage. Its one final adapter
  call returned 167 normalized characters, a deterministic snapshot, and one usable chunk.
- Vercel Production still requires `TAVILY_API_KEY` before deployment. Configuration and deployment
  remain separate, explicitly unauthorized operations and do not invalidate the local feature gate.

## Required Commands
- Every T036–T047 Verify command in `specs/002-tavily-web-ingestion/tasks.md`.
- The explicitly gated real Tavily smoke exactly once after its default-skip check.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `git diff --check`

## Final Closure

- Feature tasks: 47/47 complete; T039 and T047 VERIFIED; remaining incomplete tasks: 0.
- Final non-live gates: lint, typecheck, 802 unit tests with the live smoke skipped, 32-page
  keyless build, OpenAPI validator, 15/15 Playwright, diff/secret/bundle/scope checks — PASS.
- Feature 002 implementation verdict: VERIFIED.
- Deployment readiness: CONDITIONAL GO. Vercel Production `TAVILY_API_KEY`, redeploy, and a
  post-deploy production smoke remain required under separate authorization.
- Supabase precondition: READY. Feature-002 database migration: not required.
