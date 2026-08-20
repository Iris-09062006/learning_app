# TASK-074 Implementation Report

## Outcome

The Phase 3 URL safe-fetch regression is fixed. The connection-bound lookup now satisfies both
Node DNS callback forms while continuing to expose only the one address selected from the fully
validated public DNS set. A real `https://example.com` capture succeeds locally.

## Root cause

- Native Node fetch returned HTTP 200, `text/html`, and 559 characters.
- `dns.lookup(..., { all: true })` returned two public IPv6 and two public IPv4 addresses.
- The existing safe fetcher failed at the low-level request catch in `web-page-fetcher.ts` with
  `TypeError [ERR_INVALID_IP_ADDRESS]: Invalid IP address: undefined`, mapped to `FETCH_FAILED`.
- Current Node HTTPS connection setup invokes the custom lookup with `options.all=true`. The
  implementation always called back with `(address, family)` instead of the required address
  array, so Node attempted to consume an undefined address before TCP/TLS began.

## Implemented

- When the connection requests all addresses, the custom lookup returns `[selected]`; otherwise
  it retains the single `(selected.address, selected.family)` callback form.
- Added controlled IPv4 and IPv6 all-address regressions that emulate the Node 22+ contract.
- Added assertions that the original HTTPS hostname remains the request target, certificate
  verification is not disabled, and the validated address remains connection-bound.
- Added a service regression proving a valid URL reaches page extraction, deterministic Markdown
  snapshot upload, and the source extraction checkpoint.

## Scope and security

No search provider, route contract, schema, migration, dependency, Supabase state, or deployment
configuration changed. URL parsing, credentials/port restrictions, complete DNS-set validation,
private/reserved address blocking, redirect revalidation, HTTPS downgrade prevention, connection
binding, TLS hostname/certificate defaults, fixed headers, 15-second deadline, five redirects,
16 KiB headers, 2 MiB compressed/decompressed body limits, and MIME checks are unchanged.

The Next.js skill kept the route on the existing Node runtime boundary. Context7's Node 22 DNS
documentation directly confirmed the two callback result shapes and informed the minimal fix.
