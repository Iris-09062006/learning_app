# TASK-089 — Extend AI Provider Response Timeout

- **Status:** IN_PROGRESS
- **Owner / Reviewer:** Codex
- **Type:** AI provider configuration

## Objective

Increase the server-side AI provider response timeout from 45 seconds to 180 seconds.
Add metadata-only diagnostic logging around Course outline provider responses and outline parsing.
Add temporary metadata-only diagnostics around every multi-call pedagogical Lesson provider stage.

## Scope

- Apply the 180-second abort timeout to pedagogical Lesson generation and Exercise generation.
- Update timeout assertions and current feature documentation.
- Log outline HTTP status/content type, response shape metadata, and parse outcome without logging
  prompts, generated content, source material, credentials, or authorization headers.
- Log stable `synthesis_blueprint`, `sections`, `quality_review`, `correction`, and `re_review`
  stage names with response metadata; on validation failure log only stable code/path/index metadata.
- Preserve route duration, Course scheduling deadline, request budgets, retries, persistence, and APIs.
- Do not run tests or build, per the user's explicit instruction.

## Acceptance criteria

- Every active 45-second AI provider abort timer is 180 seconds.
- Timeout tests advance the matching 180-second duration.
- Course outline diagnostics identify HTTP, missing-content, valid-outline, and invalid-outline stages
  without exposing sensitive or source-derived content.
- Lesson diagnostics expose only stage, HTTP/content metadata, model, choice count, content type/length,
  and validation code/path/index metadata when applicable.
- No route or scheduling deadline is changed.

## Verification status

Focused provider/service tests, focused lint, and typecheck pass with mocked provider responses.
Build and live provider calls were not run. The task remains `IN_PROGRESS` and uncommitted by the
user's explicit instruction.
