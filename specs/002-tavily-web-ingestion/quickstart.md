# Quickstart: Verify Tavily Web Ingestion

This is the implementation verification guide for the bounded change. It does
not authorize deployment, migration, or remote Supabase operations.

## Preconditions

- Work on the repository branch containing checkpoints `48c6a6e`, `6f84e86`, and `c495b59`.
- Use Node.js 22.x and the repository's installed dependencies.
- Keep `TAVILY_API_KEY` server-only. Unit and default integration tests must not
  require a real key or network access.
- Confirm no completed `specs/001-*` artifact or database migration is modified.

## Focused verification

Run focused tests as they are added or updated:

```powershell
npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
```

Expected coverage:

- exact one-URL Basic Markdown request and prohibited-field omissions;
- provider status, failed-result, malformed-result, timeout, and no-retry cases;
- normalized boundaries at 79, 80, 200,000, and 200,001 characters;
- exactly 100 serializations of one fixed validated extraction produce identical
  Markdown bytes and one identical content hash;
- at least one usable chunk;
- original/canonical URL and canonical-derived domain rules;
- immutable snapshot creation and zero raw-provider persistence;
- stable idempotency and acquisition-versus-snapshot Retry behavior;
- compatible manual and discovered URL request/success envelopes;
- sequential selected-source ingestion with maximum concurrency 1;
- zero Extract calls during generation, regeneration, Continue, lesson
  generation, publication, and stored-snapshot retry;
- unchanged file/PDF flows and partial-failure recovery.

## Repository quality gates

Run every project-supported gate and record actual results:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Then run the critical E2E suite or its relevant existing scenario filters:

```powershell
npx playwright test tests/e2e/critical-flows.spec.ts
```

The E2E result must preserve PDF publication, unpublished-source retry, manual
URL/file partial failure, selected-only research ingestion, multi-source
reference qualification, learner access, and exercise flows.

## Contract and scope checks

```powershell
python specs/002-tavily-web-ingestion/contracts/validate_openapi.py
git status --short
git diff -- specs/001-* supabase/migrations src
rg -n "fetchWebPage|extractWebPage|readability|jsdom" src/features/content-pipeline
rg -n "TAVILY_API_KEY|Authorization|raw_content|request_id|include_images|include_favicon|extract_depth" src
```

Review the results manually:

- the active URL-ingestion service has no direct-fetch/Readability call;
- no automatic fallback or Advanced request exists;
- secrets and full provider content are absent from logs, errors, fixtures, and
  browser payloads;
- no migration or `001` artifact changed;
- existing direct-fetch files/dependencies may remain, but are inactive.

`contracts/validate_openapi.py` is the repository's Phase D validator. It uses installed PyYAML
to parse the OpenAPI 3.1 document and recursively resolves every local JSON Pointer `$ref`; it
does not replace route behavior tests.

## Explicit real Tavily smoke test

The smoke skips unless both `TAVILY_EXTRACT_SMOKE=1` and a non-empty server-only
`TAVILY_API_KEY` are present. First prove the keyless/default command skips and consumes zero
provider credits:

The smoke file declares Vitest's Node environment because it exercises a server-only native-fetch
adapter. Running it under the repository's browser-like `jsdom` default would create a cross-realm
`AbortSignal` that Node fetch rejects before an HTTP request is sent.

```powershell
npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.integration.test.ts
```

Then run exactly once with an explicitly provisioned test credential:

```powershell
$env:TAVILY_EXTRACT_SMOKE='1'
$env:TAVILY_API_KEY='<temporary-test-key>'
npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.integration.test.ts
Remove-Item Env:TAVILY_EXTRACT_SMOKE
Remove-Item Env:TAVILY_API_KEY
```

The smoke test should use one benign public URL, make one Basic request, validate
only the documented response shape and local normalization, and avoid database
or Storage writes. Its output contains sanitized counts/hash only, never Markdown, the raw
provider response, Authorization header, or key. Never print or commit the key.

As verified against the official Tavily documentation on 2026-08-14, the adapter calls
`POST https://api.tavily.com/extract` with Bearer authentication, `extract_depth: basic`,
`format: markdown`, media disabled, and one URL. Successful content is returned in
`results[].raw_content`; unsuccessful URLs appear in `failed_results`. Basic Extract billing is
one API credit per five successful URL extractions, failed extractions are not charged, and a
single call may report zero incremental usage until the five-success boundary is reached. The
smoke intentionally does not request or persist `usage`/`request_id`.

## Review and readiness

Before the repository's normal commit step:

1. Review the actual diff for scope, correctness, API compatibility, database
   neutrality, security, cost bounds, tests, and acceptance criteria.
2. Confirm no Critical, High, or Medium finding remains.
3. Confirm all required gates passed with real command output.
4. Stage only files that belong to this implementation; do not stage unrelated
   working-tree content.

Deployment and push require separate explicit user authorization.
