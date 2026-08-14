# Research: Pedagogical Lesson Generation

**Feature**: `003-pedagogical-lesson-generation`
**Date**: 2026-08-14
**Brownfield baseline**: HEAD `2cd7b7a`

## Brownfield Findings

- Course-import Lesson generation currently filters the exact canonical chunks approved for one outline Lesson, creates request-local refs only for multi-source Lessons, calls `generateLessonDraft` once, maps refs back to canonical chunk IDs, and persists through `persist_lesson_content_draft_for_job`.
- Missing Lessons currently run concurrently through unbounded `Promise.all`; Course outlines allow up to 20 Lessons.
- Every provider request has a 45-second abort timeout. Continue runs in a route with `maxDuration = 300`, while the browser stops waiting after 60 seconds and refreshes persisted state. Single-Lesson regeneration currently has `maxDuration = 60`.
- The final parser permits 1–12 sections, title up to 150 characters, estimated duration 1–180 minutes, and requires at least one citation per section. The RPC independently verifies job membership, approved-outline ownership, valid section indexes, and citation completeness.
- Publication reads the latest ready content revision and serializes each section as `## heading`, a blank line, then `bodyMarkdown`; citations remain in provenance tables.
- The current Lesson path sends every chunk assigned to the Lesson and does not apply a separate Lesson character budget.
- Gemini structured output is suitable for typed transient stages, but official guidance still requires application-side semantic validation and warns that only a JSON Schema subset is supported. See [Google Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) and [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai).

## Decision 1 — Model-call architecture

**Decision**: Choose option B.

```text
Call 1: Evidence Synthesis + Lesson Blueprint
Call 2: Generate all planned sections
Call 3: Independent quality review
```

Normal path: **3 calls per Lesson**.

If Call 3 returns correctable blocking findings:

```text
Call 4: Correct only identified sections/metadata
Call 5: Independently re-review the complete merged Lesson
```

Worst path: **5 calls per Lesson**, with exactly one correction pass.

Every call in this feature uses a dedicated model identity, **`gemini-3.6-flash`**. The existing 9Router endpoint and credential configuration remain reusable, but the new pedagogical methods do not inherit an environment-selected alternate model. Each semantic stage invocation makes exactly one outbound HTTP request and fails closed on malformed output, provider error, timeout, or an explicitly reported different response model; there is no transport retry or model fallback. Therefore the normal path is exactly three outbound model requests and the correction path is at most five, never six.

**Rationale**:

- Synthesis and blueprint are tightly coupled reasoning artifacts: the blueprint cannot be valid without immediately binding each section to synthesized evidence. One schema can express both without mixing prose generation into the decision.
- All sections should be generated together so the model can maintain transitions, avoid duplication, and respect a total 12-section cap; paragraph-level calls would multiply cost and lose whole-Lesson coherence.
- Independent review must see the complete candidate and evidence after generation. Keeping it separate avoids asking the prose generator to be the sole judge of its own work.
- A second review after correction is the safest way to verify that a targeted edit did not introduce new drift, repetition, or citation problems.

**Alternatives considered**:

- **A — Synthesis → Blueprint → all sections → Review (4 normal / 6 worst)**: strongest isolation and retry granularity, but adds a call before any prose, increases schema handoffs, and amplifies 45-second latency and concurrent Course cost without enough quality gain over combined synthesis+blueprint.
- **C — Synthesis → Blueprint+sections → Review (3 normal / 5 worst)**: same call count as B but re-couples structure choice with prose generation, recreating part of the current responsibility concentration and weakening blueprint validation before writing.
- **One call with hidden multi-step prompting**: cheapest, but preserves the primary bottleneck and cannot prove that a valid blueprint existed before prose.
- **Two calls with generation+self-review combined**: lower latency, but self-review is not sufficiently independent for unsupported claims, scope drift, and article-like exposition.
- **Four normal calls with paragraph/section fan-out**: better retry isolation for individual prose pieces, but violates the bounded-cost requirement and makes cross-section coherence/concurrency harder.

## Decision 2 — Correction strategy

**Decision**: Permit zero or one targeted correction pass. Re-review once after correction; never loop.

**Rationale**:

- Correctable findings identify stable section keys and allowed correction fields. The server accepts returned changes only for those targets and merges them into the prior candidate.
- A complete re-review is necessary because correcting one section can change progression, introduce repetition, or weaken evidence support elsewhere.
- If the first review is non-correctable, the correction response is invalid, or re-review does not pass, the Lesson is not persisted. The job uses the existing recoverable Lesson-generation failure path.

**Alternatives considered**:

- **No correction**: cheapest and simplest, but wastes valid unaffected content and conflicts with the requirement to prefer targeted fixes.
- **Correction without re-review**: insufficient for semantic and whole-Lesson invariants.
- **Repeat until pass**: rejected because cost, latency, and provider behavior become unbounded.

## Decision 3 — Concurrency and deadline

**Decision**: Use a fixed worker pool of **3 Lesson pipelines**, sequential stages within each pipeline, and a **240-second job scheduling deadline**.

**Rationale**:

- Current unbounded `Promise.all` can create up to 20 simultaneous calls. Multiplying that by three to five stages is unsafe for provider load and rate/cost control.
- Three workers retain useful throughput while capping concurrent model calls at three.
- The 240-second deadline leaves one 45-second provider window plus cleanup margin before the 300-second Continue route ceiling.
- On first hard failure or deadline exhaustion, queued work stops, in-flight stages receive cancellation, workers settle, and the job is marked failed once. Completed immutable Lesson drafts remain and retries process only missing Lessons.
- The browser's existing 60-second timeout and refresh behavior remains valid; it may observe `generating_content` while the server completes or safely fails the bounded job.

**Rate-limit decision**: Preserve the actual brownfield capacity boundary—one `ai:lesson-content` allowance is consumed when a Lesson pipeline starts. The pipeline's internal multiplier is instead bounded by five calls, three workers, 45-second timeouts, and metadata-only stage/call telemetry. Reinterpreting or raising the public security limit is outside feature `003`.

**Alternatives considered**:

- **Concurrency 1**: safest provider load, but makes multi-Lesson Course latency incompatible with the synchronous route ceiling.
- **Concurrency 2**: still likely to exhaust the route budget for ordinary Courses while providing little additional safety over three.
- **Concurrency 4+**: improves throughput but increases multiplied provider bursts and partial-failure races.
- **Retain `Promise.all`**: rejected because it leaves provider concurrency proportional to Course size.
- **New persisted/background workflow**: would solve long-running scheduling but requires new workflow persistence/contract behavior and violates the no-migration/minimal-change boundary.

## Decision 4 — Evidence input and selection

**Decision**: Preserve the exact approved Lesson evidence set. Do not add a Lesson-level character budget or retrieval/selection step in feature `003`.

**Rationale**:

- The approved outline-to-chunk set is the current ownership and pedagogical intent boundary.
- No repository evidence demonstrates that a new selection algorithm is necessary, and selection could omit prerequisites or examples needed for a deliberate teaching progression.
- Gemini Flash supports large structured text inputs; nevertheless the application continues to validate all outputs rather than trusting schema conformance alone.
- Every stage receives the same immutable map, so refs cannot silently change between synthesis, blueprint, generation, and review.

**Alternatives considered**:

- **Internal character budget**: reduces repeated input cost but requires a new ranking/coverage policy and can hide approved evidence gaps.
- **Blueprint-only subset for generation/review**: cheaper, but prevents review from detecting omitted supported examples, prerequisites, or misconceptions.
- **Embeddings/vector retrieval**: explicitly out of scope and unnecessary for a bounded approved set.

## Decision 5 — Citation propagation

**Decision**: Use one immutable request-local ref map for all Lessons, including single-source Lessons.

```text
approved CourseSourceChunk.documentChunkId
  ↔ deterministic request-local sourceRef
  → synthesis item evidenceRefs
  → blueprint section evidenceRefs
  → generated section citationEvidenceRefs
  → reviewer/correction refs
  → canonical documentChunkId citation rows
  → existing ownership-validating RPC
```

**Rationale**:

- A single representation removes the legacy single-source bare-index branch from the new pipeline without changing the final stored shape.
- Parsers can reject missing, duplicate, foreign, malformed, and ambiguous refs before the next stage.
- Canonical IDs never need to be exposed to the provider, and provider output cannot create a new identity.
- The RPC remains defense in depth and authoritative for job/outline ownership.

**Alternatives considered**:

- **Carry canonical database IDs through prompts**: rejected because it exposes durable identities unnecessarily and lets provider output appear authoritative.
- **Use local chunk indexes for single-source only**: works today but keeps two citation modes and complicates reusable stage contracts.
- **Trust final citations only**: rejected because synthesis/blueprint could drift before final validation.

## Decision 6 — Provider abstraction

**Decision**: Add a sibling `PedagogicalLessonProvider` interface and let the current NineRouter provider implement it; do not create a general AI framework.

**Rationale**:

- Orchestration depends on semantic stage operations rather than Gemini/9Router payloads.
- The existing historical `LessonDraftProvider` remains intact for its compatibility path.
- A future benchmark provider can implement four bounded operations without changing orchestration or persistence.
- Reusing the current class/config/transport avoids a dependency, SDK migration, or provider replacement.
- The new stage methods use a dedicated internal `gemini-3.6-flash` model constant rather than the generic environment-selected model used by legacy methods. Endpoint and credentials stay configurable.
- If the optional OpenAI-compatible response `model` field is present and differs from `gemini-3.6-flash`, the stage fails through the existing provider-response-invalid behavior. It does not retry, request an alternate model, or fall back; an omitted field is allowed because the outbound request itself remains locked.

**Alternatives considered**:

- **Add optional methods to the existing interface only**: easy initially, but optionality invites silent fallback and makes the new pipeline's required capability unclear.
- **One interface per stage**: maximally narrow but over-engineered for one concrete provider and makes injection/tests noisy.
- **Generic prompt/schema client framework**: unnecessary abstraction outside the bounded feature.
- **Environment-selected pedagogical model or provider-reported substitution**: rejected because it weakens the locked single-model experiment and could hide routing/fallback behavior.
- **Automatic retry after malformed output, provider error, timeout, or model mismatch**: rejected because it could exceed the three/five-call budget and create an unobservable sixth HTTP request.

## Decision 7 — Section purpose persistence

**Decision**: Keep section purpose, teaching objective, expected elements, and stable section key transient.

**Rationale**:

- Existing ordered headings and Markdown bodies can express the intended learner experience.
- Admin editing and publication do not consume a purpose field.
- Persisting it would require a migration or change the JSON contract without a current consumer.

**Alternatives considered**:

- **Add purpose to persisted section JSON**: rejected because it changes an established contract without user value in this feature.
- **Encode purpose into headings**: rejected because headings should remain learner-facing, natural language rather than internal taxonomy labels.

## Decision 8 — External contracts

**Decision**: Do not create a `contracts/` artifact.

**Rationale**: No endpoint, request body, response envelope, Admin action, learner payload, database RPC, or publication format changes. Internal stage contracts are fully specified in `data-model.md` and remain server-only.

## Resolved Questions

- Model-call architecture: B, 3 normal / 5 worst.
- Correction budget: one pass and one re-review.
- Lesson concurrency: three pipelines.
- Evidence selection: exact approved set, no new budget.
- Citation identity: one immutable request-local map to canonical IDs.
- Section purpose persistence: transient.
- Database migration: none.
- Provider replacement/benchmarking: not part of feature `003`.
- Pedagogical model: dedicated `gemini-3.6-flash` lock for Calls 1-5; configurable endpoint, no environment-selected alternate model.
- HTTP attempt budget: exactly one outbound request per stage invocation; three normal, at most five after correction, with no hidden retry or fallback.

No unresolved architecture question remains for task decomposition.
