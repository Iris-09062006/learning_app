# TASK-074 — Repair URL Safe-Fetch Runtime Compatibility

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Fix the production-readiness regression that makes public HTTPS URL ingestion return
`FETCH_FAILED` under current Node runtimes, without changing the approved Phase 3 security design.

## Scope
- Correct only the connection-bound lookup callback in `web-page-fetcher.ts`.
- Add regression coverage for Node's all-address lookup shape and the URL-to-snapshot pipeline.
- Preserve all URL, DNS, IP, redirect, TLS, timeout, header, body, and MIME controls.
- Update task and verification reports.
- No search-provider changes, schema/migrations, feature work, push, deployment, or Supabase writes.

## Root cause baseline
- Native Node fetch of `https://example.com`: HTTP 200, `text/html`, 559 characters.
- DNS: two public IPv6 and two public IPv4 answers.
- Safe fetcher: `FETCH_FAILED` at the request catch in `web-page-fetcher.ts`.
- Low-level error: `TypeError [ERR_INVALID_IP_ADDRESS]: Invalid IP address: undefined`.
- Defect: the bound lookup always returns `(address, family)` even when Node calls it with
  `options.all=true` and requires an address array.

## Acceptance Criteria
- [x] A controlled public HTTPS request using `options.all=true` succeeds.
- [x] Public IPv4/IPv6 and mapped-address classification remains correct.
- [x] Local/private/link-local/mixed DNS/unsafe redirects remain blocked.
- [x] DNS rebinding protection and TLS certificate/hostname validation remain enabled.
- [x] Timeout, redirect, header, body, decompression, and MIME limits remain unchanged.
- [x] Valid URL ingestion reaches extraction, immutable snapshot storage, and chunk extraction.
- [x] Real `https://example.com` safe fetch succeeds locally.
- [x] Focused tests, URL E2E, lint, typecheck, full tests, and build pass.
- [x] Diff/security review passes and the scoped fix is committed without push/deploy.

## Required Commands
- Phase 3 focused commands from `specs/001-topic-course-research/quickstart.md`.
- URL-ingestion, Phase 4 selected-URL, and legacy PDF Playwright scenarios where practical.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
