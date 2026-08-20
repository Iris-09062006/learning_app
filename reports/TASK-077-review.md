# TASK-077 — Review Report

## Verdict

`PASS` — no Critical, High, or Medium findings remain.

## Review

- Scope: changes are limited to T026–T035 hardening, regression tests, and required task evidence.
  Phase D, migrations, remote state, deployment, and package cleanup are untouched.
- Immutability/cost: every post-acquisition generation, review, publication, reuse, and retry path
  reads stored evidence and makes zero Tavily Extract calls.
- Failure isolation: all six provider error classes affect only new URL acquisition, expose generic
  recoverable errors, invoke no direct-fetch fallback, and do not block file/PDF ingestion.
- Security: unsafe URL classes fail before provider access; stored evidence is escaped and explicitly
  treated as untrusted; strict source/citation ownership cannot be overridden by prompt-like text.
- Privacy/observability: signals contain stable categories and precise stages but no URL, secret,
  raw response, request ID, or evidence body. Tavily DTOs remain inside the server adapter boundary.
- Compatibility: manual/discovered URL, stored multi-source Course regeneration/publication,
  learner progress, Exercise generation, and legacy PDF flows pass.
- Cleanup: caller analysis confirms the direct network fetcher and Readability extractor are
  inactive. T030 explicitly requires retention, and `jsdom` remains an active test dependency, so
  deletion/package cleanup is intentionally deferred.

## Findings handled

- Medium — pre-provider URL validation allowed localhost-style hostnames. Added rejection and
  zero-provider-call regressions.
- Medium — legacy single-source chunks were interpolated without delimiter escaping. Reused XML
  escaping and added prompt-injection/source-ownership regressions.
- Medium — ingestion failures used an ambiguous two-stage diagnostic. Added metadata-only stage
  progression and redaction tests.
- Test isolation — repeated outage matrices exhausted the shared in-memory rate bucket. Reset the
  bucket after each service test without weakening production rate limiting.

## Remaining limitations

- Legacy inactive fetch/extractor deletion, dependency cleanup, documentation/observability rollout,
  live Tavily smoke testing, and release operations remain Phase D or explicitly out of scope.
