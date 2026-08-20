# TASK-090 Test Report

## Diagnostic evidence

- Starting baseline: clean `feature/005-per-lesson-generation` at
  `e588138b0f720e672247e25495eecd8a743c0863`.
- No raw Lesson 78 provider payload was retained. Existing privacy-safe TASK-084 evidence recorded
  HTTP 200, successful envelope/JSON extraction, first blueprint order `1`, then
  `AI_RESPONSE_INVALID`; it retained no source, prompt, response body, credential, or user content.
- Deterministic current-tree fixture changed only valid section orders from `0,1` to `1,2`.
  Pre-fix focused run: FAIL as expected, 106 passed / 1 failed, exact throw at the section-order
  predicate in `parseSynthesisBlueprint()`.
- Post-fix the same fixture returns internal orders `0,1`.
- Context7 confirmed the Gemini OpenAI-compatible chat-completions structured-output boundary uses
  schema-driven output through the successful completion response; no SDK or envelope migration was
  implicated.

## Quality gates

- Provider and service tests: PASS, 253/253 (107 provider + 146 service).
- One-Lesson route and repository tests: PASS, 59/59 (47 route + 12 repository).
- The service suite covers exact normal 3 calls, correction max 5, no sixth call, stage-one stop,
  zero persistence on failure, one-Lesson persistence, citation ownership, Lesson regeneration,
  and publication regressions.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: first run compiled and typechecked, then failed only because public Supabase env
  variables were absent; rerun with process-only non-secret placeholders PASS.
- `git diff --check`: PASS; only Windows LF-to-CRLF notices were printed.

## Cost and external actions

No real Gemini request, live smoke, database mutation, push, or deployment was performed.
