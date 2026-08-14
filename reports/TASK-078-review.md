# TASK-078 — Review Report

## Verdict

`PASS` — the mandatory live provider gate now passes and the reviewed diff has no remaining
Critical/High/Medium finding. The fix is test-only and preserves the production adapter contract,
timeout, architecture, persistence, and provider policy. Feature 002 may be committed; push and
deployment remain separately unauthorized.

## Review

- Scope: only Phase D validation, tests, documentation, and task evidence changed. No package,
  Playwright, migration, feature-001, production behavior, or provider policy change remains.
- Contract: OpenAPI parses and all refs resolve; request/success/error semantics remain
  provider-neutral and both new/reused success branches stay HTTP 201.
- Architecture/persistence: Tavily DTOs remain adapter-private; raw responses are not persisted;
  immutable stored evidence still precedes Gemini generation; feature 002 adds no schema change.
- Security/privacy: server-only key boundary, pre-provider URL validation, untrusted-content
  framing, metadata-only diagnostics, client-bundle scan, and secret scan pass.
- Compatibility: research/selection, manual URL, partial recovery, stored evidence, publication,
  PDF/file, learner/progress, and Exercise regressions pass in unit and browser suites.
- Rollback: documentation preserves snapshots, chunks, jobs/bridges, revisions, citations,
  published content, and PDF/file behavior; it forbids destructive conversion and direct-fetch
  fallback and warns that an old-code rollback reintroduces the known acquisition defect.

## Resolved finding

1. The earlier live test's generic `UPSTREAM` was a pre-HTTP `TypeError`: native Node fetch rejected
   the `AbortSignal` produced by Vitest's `jsdom` realm. An offline regression reproduced the error
   in 1 ms. Setting the server-only smoke to the Node environment resolves the mismatch.
2. Authenticated usage returned HTTP 200 with usable quota. A direct request and the final adapter
   smoke each returned HTTP 200 with one result and no failed result. The final smoke produced 167
   normalized characters, a 295-character deterministic snapshot, and one usable chunk.
3. The equal 10-second provider/client deadlines remain a theoretical race but did not cause this
   incident: the prior rejection was near 5 ms and successful calls completed in 2.2–2.7 seconds.
   Per the diagnostic constraints, no unsupported timeout change was made.

## Final feature-requirement audit

The reviewed implementation still guarantees: (1) Search is discovery; (2) Extract follows
confirmation; (3) Research makes zero Extract calls; (4) selection makes zero Extract calls;
(5) only confirmed URLs are extracted; (6) Basic only; (7) no Advanced fallback; (8) no Crawl;
(9) no Tavily Research; (10) manual/discovered use one orchestration; (11) `source_url` preserves
Admin input; (12) `canonical_url` is validated provider final provenance; (13) 80–200,000 normalized
characters plus at least one chunk; (14) the 200,000 maximum; (15) immutable app-owned snapshots;
(16) no direct Tavily-to-Gemini input; (17) regeneration makes zero Extract calls; (18) PDF/file
makes zero Tavily calls; (19) partial successes survive; (20) retry is idempotent; (21) no direct
fetch fallback; (22) the key is server-only; (23) Tavily content remains untrusted; (24) no
Tavily-specific persistence; (25) no feature-002 migration; and (26) learner, Exercise, and
publication behavior is preserved. These assertions pass both offline and at the required bounded
live-provider gate.

## Final assessment

- Feature 002 implementation: **VERIFIED**.
- Deployment readiness: **NO-GO until Vercel Production receives `TAVILY_API_KEY` and deployment is separately authorized**.
- Review findings: none remaining at Critical/High/Medium.
- Push/deployment/remote mutation: none.
