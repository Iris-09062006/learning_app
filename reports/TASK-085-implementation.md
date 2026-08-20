# TASK-085 Implementation Report

## Outcome

Live read-only diagnostics on one Lesson from job 25 reproduced the local failure three times at
the first pedagogical stage: Gemini returned HTTP 429 and the provider collapsed it to the generic
`AI_PROVIDER_REQUEST_FAILED`, which the service exposed as HTTP 502.

Pedagogical requests made by one `NineRouterLessonDraftProvider` instance are now serialized and
started at least 12.5 seconds apart. The Course scheduler still owns at most three Lesson pipelines,
but their outbound AI stages cannot create a concurrent or per-minute request burst. Provider HTTP
failures retain their status, and Lesson generation
maps upstream 429 to the existing `RATE_LIMITED`/HTTP 429 contract with a 60-second retry hint.

No hidden retry, delay loop, model fallback, call-budget increase, persistence change, migration,
or public response-shape change was introduced.
