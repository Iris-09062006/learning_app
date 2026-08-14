# Implementation Plan: Pedagogical Lesson Generation

**Branch**: `003-pedagogical-lesson-generation` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-pedagogical-lesson-generation/spec.md`

**Planning boundary**: Planning artifacts only. This plan does not create `tasks.md`, change code, alter feature `002`, or authorize a database, Admin, learner, publication, or Exercise contract change.

## Summary

Replace the Course-import flow's one-shot per-Lesson generation with a transient, evidence-grounded pedagogical pipeline while preserving the existing `StructuredLessonDraft` persistence boundary. The selected design uses a vendor-neutral `PedagogicalLessonProvider` sibling to the legacy provider interface and three sequential model calls on the normal path: combined evidence synthesis plus blueprint, all-section generation, and independent quality review. A correctable review may use one targeted correction call followed by one independent re-review, for a hard maximum of five calls per Lesson.

Every stage uses request-local integer evidence references derived by the server from the exact chunks approved for the Lesson. Those references are validated at every boundary and mapped back to canonical `documentChunkId` values before the unchanged persistence RPC is called. Intermediate synthesis, blueprint, section purpose, findings, and corrections exist only in server memory.

`Promise.all` over all missing Lessons is replaced by a worker pool of at most three Lesson pipelines. Each pipeline is sequential internally, each provider request retains the 45-second timeout, and the Course-level orchestrator stops scheduling work at a 240-second deadline so it can cancel/settle workers and move the job to the existing recoverable `failed` state before the 300-second route ceiling. Completed Lesson drafts remain immutable and retries continue to generate only missing Lessons.

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js 22

**Primary Dependencies**: Next.js 15 App Router, React 19, Supabase JS 2.111, existing OpenAI-compatible HTTP transport through 9Router; every new pedagogical-stage request uses the dedicated locked model `gemini-3.6-flash`; no new runtime dependency planned

**Storage**: Existing Supabase PostgreSQL tables and JSONB `lesson_content_drafts.sections`; transient pedagogical artifacts remain in server memory

**Testing**: Vitest 3.2 with mocked/fake providers; Playwright 1.62 for existing Course-import, publication, learner, progress, and Exercise regressions; no live Gemini call in ordinary suites

**Target Platform**: Vercel/Next.js Node runtime; current Course generation route ceiling 300 seconds and single-Lesson regeneration route ceiling to be aligned to 300 seconds without changing its HTTP contract

**Project Type**: Brownfield full-stack web application with server-only provider and persistence boundaries

**Performance Goals**: At most three concurrent Lesson pipelines/provider calls per Course job; 45 seconds maximum per provider call; normal path three calls per Lesson; worst path five calls per Lesson; Course orchestration stops new stage work at 240 seconds and settles to success or a recoverable failure before the route ceiling

**Constraints**: Preserve the exact approved Lesson evidence set; every intermediate/final reference must be valid and source-qualified; every final section has at least one citation; one correction pass maximum; no fallback to one-shot generation, alternate model, or hidden transport retry; the configurable endpoint remains unchanged but the new pedagogical stages do not use an environment-selected alternate model; no database migration; no public request/response, Admin editor, publication, learner Markdown, progress, or Exercise change

**Scale/Scope**: Existing Course outline supports 2–20 Lessons, 1–8 attached sources, and final Lesson drafts support 1–12 sections; retries skip already persisted Lesson revisions

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Gate | Result | Evidence |
| --- | --- | --- |
| Current user request is the highest-priority source | PASS | Plan-only, no tasks/implementation, no feature-002 or contract changes. |
| Brownfield implementation is inspected before design | PASS | Current provider, service, types, routes, persistence RPCs, citation mapping, publication serialization, UI recovery, and relevant tests were reviewed at HEAD `2cd7b7a`. |
| Scope is bounded to approved evidence → structured draft | PASS | Tavily, ingestion, outline ownership, persistence, review, publication, learner, progress, and Exercises remain outside the changed boundary. |
| Database/API/security contracts are not invented | PASS | No new tables, columns, enums, RPCs, endpoints, roles, or public DTOs; existing RPC and HTTP envelopes remain authoritative. |
| Untrusted evidence stays server-controlled | PASS | Source text remains escaped/untrusted; only server-created request-local refs can reach provider stages. |
| Citation ownership remains authoritative | PASS | Every stage validates refs against one immutable provider map; persistence still validates canonical chunk IDs against job and approved-outline ownership. |
| Cost, latency, retries, and concurrency are bounded | PASS | Three normal/five maximum calls, one correction pass, concurrency three, 45-second per-call timeout, 240-second orchestration deadline, no unbounded retry. |
| Existing user changes are preserved | PASS | Planned files are scoped; future implementation must stage exact files and work around the currently dirty route-test/util files. |

### Post-design re-check

PASS. The data model is transient, external contracts are unchanged, `contracts/` is intentionally omitted, and all design decisions preserve the source-of-truth persistence and publication boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/003-pedagogical-lesson-generation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

No `contracts/` artifact is required because the feature adds no external API, CLI, UI, or persistence contract. Internal transient provider contracts are defined in `data-model.md`. `tasks.md` is explicitly deferred to `/speckit.tasks` and is not created by this plan.

### Source Code (repository root)

```text
src/
├── app/api/admin/course-drafts/[id]/lessons/
│   ├── generate/route.ts
│   └── [lessonId]/regenerate/route.ts
└── features/content-pipeline/
    ├── types/index.ts
    ├── providers/
    │   ├── lesson-draft-provider.ts
    │   └── lesson-draft-provider.test.ts
    └── services/
        ├── content-pipeline-service.ts
        └── content-pipeline-service.test.ts

tests/e2e/critical-flows.spec.ts
```

**Structure Decision**: Keep the feature in the existing content-pipeline module. Add transient models to its existing types boundary, add a narrow pedagogical provider interface and stage methods beside the current provider, and replace only Course-import Lesson orchestration. The historical `generateLessonDraft` compatibility workflow and all repository/RPC/publication code remain unchanged.

## Architecture Decisions

### Provider boundary

- Introduce a narrow `PedagogicalLessonProvider` interface with four operations: synthesize-and-blueprint, generate all planned sections, review the complete candidate, and correct targeted findings.
- Let the existing NineRouter/Gemini-compatible concrete provider implement this sibling interface while reusing its current server-only configuration, structured-output transport, 45-second timeout, XML escaping, and response parsing conventions.
- Use a dedicated internal pedagogical model constant equal to `gemini-3.6-flash` for Calls 1-5. The endpoint and credentials remain configurable, but generic `AI_PROVIDER_MODEL` selection applies only to existing legacy behavior and cannot substitute the model used by the new stage methods.
- Send exactly one outbound HTTP request for each stage invocation. A malformed response, provider error, timeout, or model mismatch fails that stage immediately without retry, alternate-model routing, or fallback. If an OpenAI-compatible response reports a `model`, accept it only when it exactly equals `gemini-3.6-flash`; a different reported model is rejected through the existing provider-response-invalid failure category. An omitted optional response-model field does not authorize substitution because the outbound request remains locked.
- Keep `LessonDraftProvider.generateLessonDraft` unchanged for the historical one-Lesson compatibility path; Course-import generation must not silently fall back to it.
- Keep structural JSON schemas within Gemini's supported subset and enforce length, cardinality, enum membership, uniqueness, ordering, evidence ownership, and semantic invariants in server parsers.

### Orchestration and stage flow

```text
approved canonical chunks
  → immutable request-local evidence map
  → Call 1: EvidenceSynthesis + LessonBlueprint (`gemini-3.6-flash`)
  → Call 2: purpose-aware generation of all sections (`gemini-3.6-flash`)
  → deterministic structural/evidence validation
  → Call 3: independent LessonQualityReview (`gemini-3.6-flash`)
      → pass: final validation
      → correctable: Call 4 targeted correction (`gemini-3.6-flash`) → Call 5 independent re-review (`gemini-3.6-flash`)
      → reject/unresolved: recoverable failure, no new draft
  → normalize to existing StructuredLessonDraft
  → map refs to canonical documentChunkId citations
  → existing persist_lesson_content_draft_for_job RPC
```

### Evidence and citation flow

1. Resolve the outline Lesson's `sourceChunks` against job chunks exactly as today; reject missing or foreign canonical IDs before any provider call.
2. Assign deterministic request-local refs `0..n-1` in approved source order and use that same immutable map for every stage.
3. Require every synthesis item (except an explicitly represented coverage gap) to cite one or more allowed refs.
4. Require every blueprint section and generated section to cite non-empty allowed refs; a blueprint cannot expand beyond synthesized evidence.
5. Limit deterministic validation to reference identity, approved-Lesson membership, uniqueness/ambiguity, required citation coverage, section-level structural permission, and canonical mapping. It does not decide whether prose claims are semantically supported or overstate the evidence.
6. Require the independent quality reviewer to decide semantic claim support and overstatement. Findings about unsupported content identify the affected section and, when applicable, the evidence refs involved; findings never create new refs.
7. Resolve final section refs through the immutable map to canonical `documentChunkId`; preserve existing `citationChunkIndexes` and optional `citationSourceRefs` normalization.
8. Pass the unchanged draft plus canonical citation rows to the existing RPC, which remains the final ownership/completeness authority.

### Concurrency, timeout, and recovery

- Replace unbounded per-job `Promise.all` with three workers consuming missing Lessons in outline order.
- A Lesson's stages are sequential; global concurrent model calls for the job therefore never exceed three.
- Retain the 45-second timeout per provider request and propagate a job abort signal so a first hard failure stops queued work and cancels in-flight work where possible.
- Stop starting any new provider stage after 240 seconds from Course generation start. Await worker settlement, then use existing `failCourseImport(jobId, "LESSON_GENERATION_FAILED")` once.
- Persist only after one entire Lesson passes review. Completed Lessons from earlier workers remain valid immutable revisions; the existing retry path skips them and processes only missing Lessons.
- Keep the browser's 60-second Continue timeout/refresh behavior. Align the single-Lesson regeneration route's server duration with the bounded five-call pipeline; this is runtime configuration, not an HTTP contract change.
- Preserve the implemented rate-limit placement at one `ai:lesson-content` capacity check per Lesson pipeline. The hard five-call cap, concurrency three, and stage telemetry bound the internal multiplier without changing the existing public rate-limit behavior in this feature.

### Error handling

| Failure | Planned behavior |
| --- | --- |
| Malformed synthesis JSON or invalid synthesis refs | Reject the Lesson pipeline immediately; no correction and no persistence. |
| Invalid blueprint, taxonomy value, order, or evidence refs | Reject immediately; no prose generation or persistence. |
| Section-generation transport/schema failure | Reject immediately; no old one-shot fallback. |
| Empty/duplicate/foreign final section refs | Reject before review or persistence. |
| Review transport/schema failure | Reject immediately; quality cannot be assumed. |
| Structurally valid citations attached to unsupported or overstated prose | Deterministic citation validation passes; quality review returns `correctable` or `reject`. If the claim remains unsupported after the single correction/re-review allowance, fail recoverably with no persistence. |
| Provider reports a model other than `gemini-3.6-flash` | Reject as an existing provider-response-invalid failure; do not retry, reroute, or fall back. |
| Review returns non-correctable rejection | Fail without correction or persistence. |
| Review returns correctable findings | Run exactly one targeted correction and exactly one re-review. |
| Re-review still fails or correction is malformed | Fail without persistence; correction budget is exhausted. |
| Provider timeout/unavailable | Cancel queued work, settle workers, mark the job with the existing recoverable Lesson-generation failure. |
| One Lesson fails while others run | Do not start queued Lessons; cancel/settle in-flight workers; retain already persisted Lessons; fail the job once. |
| Job deadline reached | Do not start another stage; settle and mark retryable failure before route termination. |

## Delivery Phases

### Phase A — Transient synthesis and blueprint boundary

- Add the bounded taxonomy and transient stage types/parsers.
- Add the combined synthesis-plus-blueprint provider operation using only exact approved refs.
- Prove conceptual and procedural fixtures produce different justified blueprints.
- No Course-import orchestration switch yet.

### Phase B — Purpose-aware section generation and normalization

- Add all-section generation from an approved blueprint.
- Normalize generated sections through request-local refs into the unchanged final draft shape.
- Prove every final citation maps to an allowed canonical chunk and foreign/ambiguous refs fail.

### Phase C — Independent quality review and one correction pass

- Add bounded findings, pass/correctable/reject verdicts, targeted correction, and independent re-review.
- Enforce the exact one-pass correction budget and fail closed after unresolved findings.
- Cover progression, duplication, overlap, prerequisites, article-like exposition, scope drift, unsupported claims, and weak/irrelevant sections.

### Phase D — Course-import integration and regressions

- Switch only `generateOneCourseLesson` in the Course-import path to the pedagogical provider.
- Replace `Promise.all` with the three-worker, deadline-aware orchestrator and preserve partial-success retry semantics.
- Align regeneration runtime duration without changing its route envelope.
- Run provider/service, persistence/revision, route, Course-import E2E, publication Markdown, learner/progress, and Exercise regressions.

## Test Strategy

- **Provider contract tests**: strict schemas, Gemini-compatible structural subset, untrusted-text escaping, malformed JSON, unsupported fields, invalid taxonomy, duplicate/foreign refs, timeout, and provider failure. For each of Calls 1-5, assert the outbound model is exactly `gemini-3.6-flash`, one stage invocation produces exactly one HTTP request, an explicitly different reported response model is rejected, and malformed output/provider error/timeout produces no retry or alternate-model request.
- **Pedagogical fixtures**: at least one conceptual networking Lesson and one procedural `cp`/`mv` Lesson; assert different justified structures rather than a fixed template.
- **Orchestration tests**: exact call order, three semantic calls and exactly three outbound HTTP requests on pass, five semantic calls and at most five outbound HTTP requests on one correction, no hidden sixth request, no retry/model/old-generator fallback, worker concurrency never above three, deadline stops new work, and one failure preserves completed drafts while skipping queued Lessons.
- **Quality tests**: detect all required review categories; distinguish correctable section findings from non-correctable/global rejection; re-review the full merged Lesson.
- **Citation tests**: refs survive synthesis → blueprint → sections → review/correction → canonical mapping; every final section has at least one citation; single- and multi-source local-index collisions remain safe.
- **Compatibility tests**: final object equals `StructuredLessonDraft`; unchanged persistence RPC receives the same draft/citation shape; regeneration creates a new immutable revision; publication produces the same ordered Markdown; Admin editing restrictions remain; learner, enrollment/progress, and Exercise flows remain unaffected.
- **No live provider in normal suites**: use deterministic fake stage responses. Any real Gemini smoke remains opt-in and separately authorized.

## Files Likely Affected During Implementation

| File | Planned change |
| --- | --- |
| `src/features/content-pipeline/types/index.ts` | Add transient pedagogical types and provider request/response types; do not change persisted `StructuredLessonDraft`. |
| `src/features/content-pipeline/providers/lesson-draft-provider.ts` | Add narrow stage interface/implementation, structural schemas, parsers, and shared request handling while preserving legacy methods. |
| `src/features/content-pipeline/providers/lesson-draft-provider.test.ts` | Add stage schema, prompt-safety, evidence-ref, failure, and call-budget tests. |
| `src/features/content-pipeline/services/content-pipeline-service.ts` | Add pipeline orchestration, immutable evidence map, final normalization, worker pool, cancellation/deadline, and bounded correction. |
| `src/features/content-pipeline/services/content-pipeline-service.test.ts` | Add conceptual/procedural, quality, citation, concurrency, retry, persistence-compatibility, and regeneration tests. |
| `src/app/api/admin/course-drafts/[id]/lessons/[lessonId]/regenerate/route.ts` | Align server duration with the bounded single-Lesson pipeline; no request/response change. |
| `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` | Preserve current user edits and extend only if runtime/route regression evidence requires it. |
| `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` | Re-run unchanged Continue timeout/recovery and retry behavior; edit only if a regression assertion is materially required. |
| `tests/e2e/critical-flows.spec.ts` | Extend existing mocked Course-import journey with compatible generated structure and downstream smoke assertions if current coverage is insufficient. |

Explicitly unchanged: repository persistence methods, Supabase migrations/RPCs/tables, API envelopes, Admin editor component behavior, publication SQL, learner renderer, enrollment/progress services, Exercise services, Tavily, ingestion, and outline generation.

## Complexity Tracking

No constitution violation requires an exception. The additional transient stages and worker pool are the minimum complexity needed to separate instructional planning from prose, independently review quality, and prevent multiplied provider concurrency from remaining unbounded.
