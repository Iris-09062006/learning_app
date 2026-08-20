# TASK-084 Implementation Report

## Outcome

The live Lesson generation 502 was traced to a deterministic provider-contract mismatch in the
first pedagogical stage. Gemini returned a valid structured response with one-based blueprint
section orders (`1, 2, ...`), while `parseSynthesisBlueprint()` accepted only zero-based values
(`0, 1, ...`) and converted the HTTP 200 response into `AI_RESPONSE_INVALID`.

The parser now accepts either a fully contiguous zero-based or fully contiguous one-based provider
sequence and normalizes the result to the unchanged internal zero-based `LessonBlueprint` contract.
Mixed, duplicated, or non-contiguous order remains invalid. The prompt also explicitly requests
zero-based section order.

Three pre-existing migration contract tests were made portable across LF and CRLF worktrees after
the full suite exposed Windows-only newline assertion failures. No migration SQL changed.

## Files changed

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/repositories/content-pipeline-migration.test.ts`
- `src/features/content-pipeline/repositories/content-destination-migration.test.ts`
- `src/features/content-pipeline/repositories/content-target-migration.test.ts`
- Task state and TASK-084 reports

No endpoint, database, model, citation, scheduling, retry, persistence, or public response contract
changed. Job 25 was inspected read-only and was not retried or mutated.
