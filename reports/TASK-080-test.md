# TASK-080 Test Report

## Commands and results

- `npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts` — PASS, 2 files and 144 tests.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS with zero warnings.
- `npm run test` — PASS (full Vitest suite); expected stderr from negative-path fixtures only.
- `npm run build` — PASS; Next.js 15.5.22 production build completed.
- `git diff --check` — PASS.
- `git diff --name-only -- supabase/migrations` — PASS, no output.

## Required behavior evidence

- Valid synthesis and valid adaptive blueprints are accepted.
- Unknown purpose, foreign/missing/duplicate refs, unknown fields/canonical IDs, empty blueprint, invalid order/key/section, invalid objective gaps, and evidence-union violations are rejected.
- Networking and `cp`/`mv` fixtures use materially different blueprint structures.
- The response contract contains synthesis and blueprint only; no final draft or section Markdown is generated.
- Each Phase A invocation sends exactly one mocked request using `gemini-3.6-flash`.
- Malformed JSON, HTTP provider error, timeout, and reported model substitution each stop after one request with no fallback.
- No live Gemini request was made.
