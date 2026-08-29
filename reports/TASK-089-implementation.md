# TASK-089 Implementation Report

## Outcome

The active AI provider abort timeout is now 180 seconds for pedagogical Lesson requests and Exercise
generation. Matching fake-timer expectations and current feature documentation were updated.

Course outline requests now emit metadata-only diagnostics for the HTTP response, provider response
shape, missing content, successful outline validation, and validation failure. Prompt text, source
chunks, generated content, API keys, and authorization headers are not logged.

The multi-call pedagogical Lesson pipeline now emits stable metadata-only diagnostics for
`synthesis_blueprint`, `sections`, `quality_review`, `correction`, and `re_review`. Response logs are
limited to status/content type/model/choice count/content type/content length; validation logs are
limited to code/path and section or Lesson index when available.

The 240-second Course scheduling deadline and 300-second browser/route envelopes remain unchanged.

## Files changed

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/features/ai/providers/ai-provider.ts`
- `src/features/ai/providers/__tests__/ai-provider.test.ts`
- `docs/features.md`
- Task state and TASK-089 report files

## Verification

- `npm test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts --silent` — PASS (248 tests)
- Focused ESLint on the four changed provider/service implementation and test files — PASS
- `npm run typecheck` — PASS
- `git diff --check` — PASS

No build or live AI request was run. No commit was created.
