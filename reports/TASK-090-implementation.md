# TASK-090 Implementation Report

## Outcome

The Gemini 3.7 HTTP-200 stage-one failure was reproduced and repaired at the provider response
boundary. A contiguous one-based provider `blueprint.sections[].order` sequence is now accepted as
semantically equivalent and normalized to the unchanged internal zero-based `LessonBlueprint`.
Zero-based output remains valid; mixed, duplicated, gapped, or otherwise non-contiguous ordering
still fails closed.

## Exact failure path

`POST /api/admin/course-drafts/{jobId}/lessons/{lessonId}/generate` calls
`generateCourseLessonContent()` -> `generateOneCourseLesson()` ->
`generateReviewedPedagogicalLesson()` -> `generatePedagogicalLessonSections()` ->
`NineRouterLessonDraftProvider.synthesizeEvidenceAndBlueprint()` -> `fetch()` ->
`parseProviderResponse()` -> `choices[0].message.content` -> `parseSynthesisBlueprint()`.

Before the fix, `parseSynthesisBlueprint()` required `section.order === index`. A valid Gemini
sequence `1, 2, ...` reached the section validator and threw `AI_RESPONSE_INVALID`; the pedagogical
wrapper then reached `generateCourseLessonContent()`, which failed the job without persistence and
mapped the error to public `AI_PROVIDER_ERROR` / HTTP 502. Calls 2-5 were never started.

## Expected synthesis contract

- Root: exactly required object fields `synthesis` and `blueprint`.
- `synthesis.items`: required array with at least one item.
- Item: exactly required `itemKey`, `kind`, `statement`, `evidenceRefs`; key is non-empty, at most
  80 characters and unique; kind is one of concept, definition, prerequisite, procedure,
  comparison, example, misconception, best_practice, relationship; statement is non-empty;
  evidence refs are non-empty unique integers owned by the request-local evidence map.
- `synthesis.coverageGaps`: required array, allowed empty.
- Gap: exactly required `gapKey`, `description`, `affectedObjectiveIndexes`, `relatedEvidenceRefs`;
  key is non-empty, at most 80 characters and unique; description is non-empty; affected objective
  indexes are non-empty unique valid zero-based indexes; related evidence refs may be empty but must
  be unique, integral, and request-owned.
- `blueprint.progressionRationale`: required non-empty string.
- `blueprint.sections`: required array of 1-12 sections.
- Section: exactly required `sectionKey`, `order`, `purpose`, `heading`, `teachingObjective`,
  `synthesisItemKeys`, `evidenceRefs`, `expectedElements`; section key is non-empty, at most 80
  characters and unique; provider order is a wholly contiguous zero-based or one-based sequence and
  is normalized to zero-based; purpose is one of the 13 repository `SECTION_PURPOSES`; heading is
  non-empty and at most 150 characters; teaching objective is non-empty; synthesis keys and expected
  elements are non-empty unique strings of at most 240 characters; synthesis keys must exist;
  evidence refs must be non-empty, unique, request-owned, and supported by the named synthesis
  items. Prerequisite synthesis must precede dependent content except introduction/objectives.
- Every schema object rejects additional properties. Markdown JSON fences are stripped only at the
  outer content boundary; arbitrary malformed JSON is not repaired.

## Migration history

- `1cc29ee8`: changed the locked pedagogical model and matching test fixtures from
  `gemini-3.6-flash` to `gemini-3.7-flash`; it added no envelope/parser/schema compatibility logic.
- `935067b`: replaced pedagogical temperatures with `reasoning_effort: "low"`, asserted no
  temperature and exact 3/5-call payloads; scheduler serialization, client timeout, reports, and UI
  changes are unrelated to this boundary. Its commit diff did not add order normalization.
- The missing compatibility behavior existed separately in `18d452b`: accept fully contiguous
  one-based order and normalize it to zero-based. The target Feature 005 tree omitted that behavior
  while already retaining the approved Gemini 3.7 request settings.

## Files changed

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- TASK-090 state and reports

No validator requirement was weakened. `StructuredLessonDraft`, public API, database, citations,
regeneration, publication, Exercises, learner progress, provider timeout, client timeout,
orchestration, retry count, and call budget are unchanged.
