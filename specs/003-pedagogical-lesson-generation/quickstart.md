# Quickstart Validation: Pedagogical Lesson Generation

**Purpose**: Validate feature `003` after implementation without live Gemini calls or database migration.

## Prerequisites

- Node.js 22 and repository dependencies installed.
- Feature implementation completed according to [plan.md](./plan.md).
- Deterministic fake provider responses available for every stage.
- No real `AI_API_KEY` is required for ordinary validation.
- Working tree reviewed so unrelated user changes remain untouched.

## 1. Artifact and database boundary check

Confirm the final contract and transient model match [data-model.md](./data-model.md):

- `StructuredLessonDraft` has no new persisted purpose/review fields.
- No new migration exists for feature `003`.
- Existing persistence and publication RPC signatures are unchanged.
- No `tasks.md` assumption is needed to run these validation scenarios.

Expected result: database migration requirement remains **NO**.

## 2. Focused provider and service tests

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
```

Expected result: all deterministic provider and orchestration tests pass with no network call.

## 3. Representative conceptual Lesson

Use a networking fixture whose approved evidence supports concepts, prerequisites, comparison, an example, and a misconception.

Verify:

1. Call 1 returns evidence-supported synthesis and a blueprint with an intentional prerequisite-first progression.
2. The blueprint uses only justified section purposes and not the full taxonomy.
3. Call 2 generates all sections in blueprint order.
4. Call 3 passes a valid candidate.
5. Exactly three provider calls occur.
6. Every final citation resolves to an approved canonical chunk.
7. Final output contains only the existing structured draft fields.

## 4. Representative procedural Lesson

Use a `cp`/`mv`-style fixture whose evidence supports prerequisites, ordered steps, expected results, comparison, and a common mistake.

Verify:

1. The structure differs meaningfully from the conceptual fixture.
2. A procedure section contains prerequisites, ordered steps, result, and supported mistake guidance.
3. No unsupported practice, misconception, or deep-dive section is padded into the Lesson.
4. The final draft and citations validate identically to the conceptual path.

## 5. Evidence and citation rejection matrix

Run fake responses for:

- synthesis with an unknown or duplicate ref;
- blueprint with a nonexistent synthesis key or evidence ref;
- generated section with no citation;
- single-source and multi-source chunks sharing local index `0`;
- foreign canonical chunk in approved outline context;
- provider attempt to return a canonical database ID as authority;
- prompt-like source text attempting to escape the untrusted evidence wrapper.

Expected result: every invalid case fails before persistence; no provider-created identity is trusted; source text never changes workflow rules.

## 6. Quality review and bounded correction

Use candidates containing each required finding category, including duplication, overlap, scope drift, unsupported claims, missing prerequisites, weak examples, irrelevant/shallow/broad sections, repetition, and article-like progression.

Verify:

- pass path uses exactly three calls;
- correctable path changes only targeted sections/metadata;
- correction is followed by one full re-review;
- correctable path uses exactly five calls;
- unresolved re-review fails with no sixth call and no persistence;
- non-correctable rejection uses no correction call;
- the full merged Lesson is revalidated after correction.

## 7. Concurrency, timeout, and partial failure

Use delayed fake stage methods and more than three missing Lessons.

Verify:

1. Concurrent Lesson pipelines/provider calls never exceed three.
2. Stages within one Lesson remain sequential.
3. A first hard failure stops queued Lessons and cancels/settles in-flight work.
4. Already completed Lessons retain one valid immutable draft.
5. The job is marked with the existing `LESSON_GENERATION_FAILED` state once.
6. Retry generates only missing Lessons.
7. Work is not started after the 240-second scheduling deadline.
8. Provider timeout/unavailability never falls back to the old one-shot generator.

Use fake timers; do not wait for real 45/240-second intervals.

## 8. Persistence and immutable revision compatibility

Verify service/repository mocks receive:

- unchanged `StructuredLessonDraft` fields;
- canonical citations shaped as `{ sectionIndex, documentChunkId }`;
- no synthesis, blueprint, purpose, finding, or correction field.

Then verify:

- initial generation persists one ready revision only after review passes;
- Lesson-wide regeneration creates a new immutable revision for only the selected Lesson;
- Admin text edits preserve section count and citation sets as before;
- no repository or RPC signature change is needed.

## 9. Route and Admin recovery regressions

```powershell
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
```

Expected result:

- Continue uses the same endpoint/action and still refreshes persisted state after its 60-second browser wait expires.
- `generating_content`, recoverable failure, retry, and `content_review` UI behavior is unchanged.
- Single-Lesson regeneration uses the same route envelope and returns a new content revision.

## 10. Publication, learner, progress, and Exercise compatibility

```powershell
npm run test:e2e -- tests/e2e/critical-flows.spec.ts
```

Expected result:

- publication still serializes ordered sections as `## heading`, blank line, `bodyMarkdown`;
- learner Markdown renders headings, lists, code blocks, and supported callouts;
- enrollment/progress behavior is unchanged;
- Exercise generation/review still consumes the published Lesson and remains a separate workflow;
- Tavily/source ingestion and outline behavior are unchanged.

## 11. Full quality gates

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the full Playwright suite when the implementation changes main-flow fixtures or shared Course-import behavior:

```powershell
npm run test:e2e
```

Expected result: every required gate passes without a live AI call, skipped assertion, weakened citation check, new migration, or changed external contract.

## 12. Optional provider smoke

A real Gemini/9Router smoke is not part of normal tests. If separately authorized with an explicitly supplied test credential, run one conceptual Lesson through the three-call pass path and verify schemas/citations only. Do not log prompts, source content, credentials, provider responses, or private evidence.
