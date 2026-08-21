# TASK-090 Review Report

## Verdict

PASS. No Blocking, Critical, High, or Medium finding remains.

## Review

- Root cause classification: `D. VALIDATOR_TOO_STRICT_FOR_VALID_PROVIDER_OUTPUT`.
- Boundary bug versus model content: boundary bug. The structured content is usable after a
  conventional one-based-to-zero-based representation normalization.
- The parser accepts only a wholly contiguous zero-based or wholly contiguous one-based sequence;
  it always returns the original zero-based internal contract. Existing malformed-order tests remain
  closed.
- Exact model remains `gemini-3.7-flash`; reasoning effort remains low; temperature remains absent.
- Transport/HTTP failures remain internally distinct as `AI_PROVIDER_REQUEST_FAILED`; unusable
  HTTP-200 responses remain `AI_RESPONSE_INVALID` or `AI_PROVIDER_RESPONSE_INVALID`. The public
  route continues returning safe generic `AI_PROVIDER_ERROR` / HTTP 502 without provider content.
- No retry, fallback model, extra provider call, prompt redesign, final draft relaxation, route,
  persistence, citation, regeneration, publication, database, UI, or orchestration change exists.
- Scope, secret, diff, tests, lint, typecheck, and build review pass.

## Findings handled

- The current tree lacked the previously proven one-based order compatibility despite retaining the
  approved Gemini 3.7 request configuration. The exact normalization and regression were restored.
- The provider request test now explicitly locks `reasoning_effort: "low"`, absence of temperature,
  and the zero-based prompt hint.

## Deferred

- A single real Lesson smoke remains optional and was not justified: the same boundary shape was
  already proven by privacy-safe historical provider evidence and deterministic current-tree tests,
  while the strict cost guard prioritizes avoiding an unnecessary paid call.
