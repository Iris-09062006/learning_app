# TASK-075 — Test Report

## Test-first evidence

The initial Phase A focused run failed as intended: the three new provider/normalizer modules and
new snapshot/chunk helpers did not exist, and the new unavailable code still mapped to HTTP 500.
The first sandboxed Vitest/build attempts also hit Windows `spawn EPERM`; the identical commands
were rerun with approved execution and produced the results below.

## Results

- Phase A gate — PASS: 5 files, 53 tests.
  - `npm run test -- src/features/content-pipeline/providers/web-content-extraction-provider.test.ts src/features/content-pipeline/providers/web-content-extraction-normalizer.test.ts src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts src/features/content-pipeline/extraction/document-extractor.test.ts src/features/content-pipeline/extraction/web-snapshot.test.ts`
- Focused URL/Search/PDF regressions — PASS: 6 files, 138 tests.
  - `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts src/features/content-pipeline/providers/tavily-web-search-provider.test.ts src/features/content-pipeline/extraction/web-page-fetcher.test.ts src/features/content-pipeline/extraction/web-page-extractor.test.ts src/features/content-pipeline/extraction/document-extractor.test.ts`
- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test` — PASS, full repository unit suite. Existing expected stderr from negative-path
  tests remained informational and did not fail the suite.
- `$env:TAVILY_API_KEY=''; npm run build` — PASS; Next.js compiled, type-checked, generated all
  32 static pages, and completed build traces without the key.
- Vendor leakage scan over the neutral contract, repository contracts, and domain types — PASS,
  no match.
- `.next/static` key-name scan — PASS, no `TAVILY_API_KEY` or `NEXT_PUBLIC_TAVILY` match.
- `git diff --check` — PASS; only Git line-ending conversion notices were emitted.
- Migration and completed `001` diff checks — PASS, no changed files.

## Boundary coverage

Tests cover the exact Basic request and forbidden fields; single-call/no-retry behavior;
server-only/missing auth; valid, failed, contradictory, missing, multiple, malformed, blank, and
cross-origin result shapes; auth/quota/timeout/network/upstream mapping; secret-safe envelopes;
invalid canonical URLs; exact 79/80/200000/200001 normalized lengths; metadata exclusion; zero
chunks; and 100 byte/hash-identical snapshot serializations.
