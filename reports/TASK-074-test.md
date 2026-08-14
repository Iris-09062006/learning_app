# TASK-074 Test Report

## Mandatory baseline probes

- Native fetch: PASS — HTTP 200, `text/html`, 559 characters.
- DNS lookup: PASS — two public IPv6 and two public IPv4 answers.
- Safe fetch before fix: FAIL as reproduced — `FETCH_FAILED`; low-level
  `ERR_INVALID_IP_ADDRESS`, `Invalid IP address: undefined`.
- Safe fetch after fix: PASS — canonical `https://example.com/`, `text/html`, 559 bytes, zero
  redirects.

## Focused tests

- Final fetcher + service regression: PASS — 2 files / 70 tests.
- Phase 3 extraction/security: PASS — 4 files / 24 tests.
- Phase 3 service: PASS — 55 tests.
- Phase 3 Admin component: PASS — 16 tests.
- Phase 3 Admin routes: PASS — 31 tests.

Coverage includes controlled public IPv4/IPv6 success, mapped IPv6 classification, localhost,
RFC1918/private/link-local/reserved blocking, mixed DNS rejection, redirect revalidation,
connection binding/DNS rebinding protection, TLS hostname and verification defaults, fixed
headers, MIME, size/decompression, redirect-count and deadline controls, plus URL extraction and
immutable snapshot materialization.

## Browser tests

PASS — 3 Chromium flows:

- manual URL + file partial-failure/recovery URL-ingestion flow;
- Phase 4 research to selected-only URL ingestion;
- legacy PDF Course import through publication.

## Full quality gates

- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm run test`: PASS; final JSON run reports 690/690 tests and zero failed suites/tests.
- `npm run build`: PASS; Next.js 15.5.22 production build.
- `git diff --check`: PASS.

Expected negative-path stderr remains in the full unit suite. Playwright retains the existing
Next.js `allowedDevOrigins` warning and webpack large-string cache warnings; no gate failed.
