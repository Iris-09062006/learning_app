# Implementation Plan: Topic-Based Multi-Source Course Creation

**Branch**: `001-topic-course-research` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-topic-course-research/spec.md` plus the audited
brownfield direction in `docs/ai-course-current-flow.md`, `docs/ai-course-database-audit.md`, and
`docs/ai-course-change-impact.md`.

**Planning constraint**: This artifact does not implement code, create a production migration, or
run `speckit.tasks`.

## Summary

Extend the active Admin Course-import workflow so an Admin can research a topic, review and select
up to eight web/file sources, materialize selected web pages as immutable private snapshots, and
generate the existing editable outline and Lesson content from source-qualified multi-source
evidence. Deliver the change in five compatibility-first phases: additive database bridge and
backfill, multi-source generation, safe source ingestion/review, topic research, then rollout and
regression hardening.

The plan preserves the existing modular-monolith boundary, immutable Course/lesson draft
revisions, relational citation tables, Continue semantics, and atomic/idempotent publication.
Learner and Exercise behavior remain unchanged.

## Verified Brownfield Baseline

Current HEAD is `2fbba0b2cd7881fcae5b92a11bf73eb41a7fd469`. The relevant content-pipeline,
Admin route, migration, configuration, and E2E paths have no diff from the change-impact audit
baseline. Direct verification found:

- `initialize_course_import_job_after_source` still creates one job after every source insert;
- `course_import_jobs.source_document_id` remains non-null and unique;
- `document_chunks` remains unique by `(source_document_id, chunk_index)`;
- outline/Lesson provider schemas, services, repository readers, and Admin UI still use bare
  `sourceChunkIndexes`/`citationChunkIndexes`;
- `selectProviderChunks` still uses the leading 80,000-character prefix;
- `publish_course_import_job` still archives only `v_job.source_document_id`;
- the legacy browser checkpoint remains `{sourceDocumentId, sourceFilename}`; and
- production dependencies contain no web-search or HTML readability parser.

No audited assumption is contradicted by current HEAD.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22.x, SQL/PLpgSQL on PostgreSQL/Supabase

**Primary Dependencies**: Next.js 15, React 19, `@supabase/ssr`, `@supabase/supabase-js`, existing
OpenAI-compatible AI provider; planned `@mozilla/readability`, runtime `jsdom`, and Brave Web Search
API adapter

**Storage**: Supabase PostgreSQL plus private Supabase Storage bucket `lesson-sources`

**Testing**: Vitest 3, Testing Library, migration contract tests, Playwright 1.62 with Axe

**Target Platform**: Vercel Node.js route handlers and Supabase PostgreSQL/Storage

**Project Type**: Brownfield full-stack web application in a modular monolith

**Performance Goals**: At most 20 visible candidates, at most 8 attached sources, web fetch bounded
to 15 seconds and 2 MiB decompressed, source result visible per ingestion attempt, provider context
bounded to 80,000 characters, existing 60/300-second generation route budgets preserved

**Constraints**: Active Admin only; server-only keys/source bodies; HTTP(S) 80/443; five redirect
hops; HTML/plain text only; immutable snapshots; no embeddings/vector/crawler/research-session
model; no source changes after Continue

**Scale/Scope**: One Course-import job with 1-8 exclusive sources, each retaining the existing
200,000 extracted-character and 4,000-character chunk limits; 2-20 outline Lessons

## Constitution Check

No project `.specify/memory/constitution.md` exists. Repository governance is therefore evaluated
against `AGENTS.md`, `CODEX.md`, and the normative architecture/security/database/API/UI docs.

### Pre-design gates

| Gate | Result | Evidence |
|---|---|---|
| Source-of-truth order respected | PASS | Current spec and three AI Course audits drive the plan; current HEAD was verified directly. |
| Brownfield architecture preserved | PASS | Work stays in `content-pipeline`, current Admin routes, Supabase schema/RPCs, and current UI. |
| Protected domains untouched | PASS | No auth, enrollment, progress, submission, learner UI, or Exercise implementation changes. |
| Database contract additive | PASS | Bridge/metadata and compatible RPCs retain the legacy anchor and immutable tables. |
| Security boundaries retained | PASS | Active-Admin service/RPC checks, RLS, private storage, server-only providers, strict validation. |
| Revision/publication invariants retained | PASS | No historical mutation; Continue and atomic/idempotent publish remain authoritative. |
| Tests planned with implementation | PASS | Every phase contains migration, unit, route, component, and E2E acceptance evidence. |
| No unsupported architecture added | PASS | No vector store, crawler, research session, new Course model, or replacement editor/publisher. |

### Post-design re-check

All gates remain PASS after Phase 0/1 design. The only new production dependencies are bounded
HTML parsing and the explicitly required search-provider integration; they do not add an
architecture layer. No complexity exception is required.

## Project Structure

### Documentation for this feature

```text
specs/001-topic-course-research/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- openapi.yaml
`-- checklists/
    `-- requirements.md
```

`tasks.md` is intentionally not created by this command.

### Existing and proposed source paths

```text
src/app/api/admin/
|-- course-research/route.ts                         # new in Phase 4
|-- content-sources/route.ts                         # extend optional multi-source upload
|-- content-sources/url/route.ts                     # new in Phase 3
|-- content-sources/[id]/extract/route.ts            # reuse
|-- course-imports/route.ts                          # new atomic ordered-set initialization
|-- content-sources/[id]/course-outline/route.ts     # keep legacy wrapper
|-- course-drafts/route.ts                           # additive sources[]
|-- course-drafts/[id]/sources/route.ts              # new GET/POST
|-- course-drafts/[id]/sources/[sourceDocumentId]/route.ts # new DELETE
|-- course-drafts/[id]/outline/route.ts              # add POST, extend PATCH
|-- course-drafts/[id]/outline/regenerate/route.ts   # reuse route, job-wide service
|-- course-drafts/[id]/lessons/**                    # keep routes, job-wide internals
`-- content-pipeline-route-utils.ts                  # extend stable error mapping

src/features/content-pipeline/
|-- components/content-pipeline-admin.tsx            # extend pre-outline source review
|-- extraction/
|   |-- document-extractor.ts                        # export/reuse normalization
|   |-- web-page-fetcher.ts                          # new SSRF-safe fetch
|   |-- web-page-extractor.ts                        # new readability adapter
|   `-- web-snapshot.ts                              # new deterministic Markdown snapshot
|-- providers/
|   |-- lesson-draft-provider.ts                     # sourceRef schemas/parsers
|   |-- web-search-provider.ts                       # new provider interface
|   `-- brave-web-search-provider.ts                 # new concrete adapter
|-- research/
|   |-- course-research.ts                           # topic/query orchestration
|   |-- normalize-search-results.ts                  # URL normalization/dedupe
|   `-- rank-search-results.ts                       # deterministic advisory scores
|-- repositories/content-pipeline-repository.ts      # bridge/job-wide reads and RPCs
|-- services/content-pipeline-service.ts             # orchestration and validation
`-- types/index.ts                                   # additive source-qualified contracts

src/generated/database.types.ts                      # regenerate after migration
src/lib/rate-limiter.ts                              # research/fetch scopes
supabase/migrations/030_*.sql                        # future Phase 1 migration; not created now
tests/e2e/critical-flows.spec.ts                      # legacy + multi-source scenarios
```

Tests remain colocated with the affected component/provider/service/repository/route. Proposed new
fetch, extraction, research, and provider files each receive focused adjacent tests.

**Structure decision**: Extend the existing Next.js modular monolith and content-pipeline feature.
No new application, package, service, or domain module is introduced.

## Cross-Phase Technical Design

### Compatibility model

Use expand-and-contract without a contract/removal step in this feature:

1. additive tables, flag, backfill, dual-write, and compatible RPCs;
2. additive `sources[]`/source-ref DTOs with legacy anchor/index aliases;
3. job-wide reads and generation behind current routes plus a new job-scoped entry point;
4. new source-review and research UI only after database/service compatibility exists;
5. retain legacy PDF route/checkpoint and source-scoped wrappers as permanent regression paths
   until a separately approved cleanup.

### Reference normalization

- Database remains authoritative through `document_chunks.id` FKs.
- Admin/API multi-source refs are `{sourceDocumentId, chunkIndex}`.
- AI provider refs are dense request-local integers.
- Service maps provider/Admin refs only through the current job bridge.
- Job-centric RPCs validate every canonical chunk ID through
  `course_import_job_sources` and, for Lesson citations, through the approved outline Lesson's
  `course_outline_lesson_sources`.
- Legacy bare indexes are accepted only when the job has exactly one bridge source matching the
  legacy anchor.

### Context budget

Keep 80,000 characters. For outline generation, walk sources round-robin by source order and
chunks by local index, including one chunk per non-empty source before filling remaining budget.
The provider can cite only supplied request-local refs. Each Lesson's approved refs are therefore a
bounded subset and can all be supplied during content generation/regeneration.

### Idempotency and recovery

New ingestion accepts a UUID idempotency key and derives a deterministic private storage path.
Materialization creates or returns the same unattached source attempt and provenance metadata for
an authorized matching retry; it never creates a Course-import job or bridge row. Extraction and
chunk replacement are retry-safe against that same source. The checkpoint also owns one
workflow-level UUID `initializationKey`. After ingestion settles, one atomic job-centric operation
receives that key plus the complete ordered set of currently usable sources. It validates and
attaches the whole initial set while creating exactly one job. A unique nullable initialization
key and immutable initialization-payload fingerprint on new-path jobs plus transactional source
locking make duplicate/concurrent calls resolve to that job; a retry with the same key but a
different ordered set is rejected as an idempotency conflict. Later usable sources attach only to
an existing job ID.
The versioned session checkpoint stores topic, candidate selection, idempotency keys, job ID,
workflow initialization key, ordered source status, and pending outline action while continuing to
parse the legacy two-field checkpoint. Server state, not the checkpoint, remains authoritative.

## Critical Risk Controls

| Risk | Required control and proof |
|---|---|
| Unusable source becomes Course evidence | `initialize_import_job` defaults true only for the unchanged legacy path. New materialization always uses false; ordered-set initialization and later attach validate successful extraction and non-empty chunks. |
| Concurrent initial sources split into jobs | Expose no no-job per-source initializer. One workflow `initializationKey` and one ordered-set transaction create all initial bridge rows; uniqueness plus locks make concurrent duplicates return one job and mismatched replays fail. |
| Chunk-index collision | Use source-qualified application refs and unique request-local provider refs; persist canonical chunk IDs. Test two sources both with chunk zero. |
| Cross-job AI/client reference | Service membership mapping plus RPC bridge validation; reject any unattached or foreign canonical ID transactionally. |
| Anchor/bridge drift | Backfill, trigger dual-write, attach/detach anchor reassignment, invariant queries, and migration tests. |
| Historical revision mutation | Source changes move job to `processing`; old revisions/source rows remain; a new outline revision is mandatory. |
| Partial publication/source archival | Set-based archive of all current bridge sources inside the existing publication transaction; idempotent response retains anchor and adds plural IDs. |
| SSRF/redirect bypass | Connection-bound custom DNS lookup, public-address blocklist, manual redirect validation, port/scheme limits, no credential forwarding. |
| Mutable web evidence | Store deterministic private Markdown before extraction; generation and retries read only the stored object/chunks. |
| Prompt injection | Treat title/snippet/page/chunks as untrusted data, delimit source context, strict schemas, no tools/secrets in provider context. |
| Unbounded/biased provider context | Deterministic source-round-robin selection under the existing 80k cap; every source represented before refill. |
| Duplicate jobs/sources on retry | Per-source ingestion keys, deterministic storage paths, one workflow initialization key, atomic/idempotent ordered-set initialization, idempotent later attach, versioned checkpoint. |
| Legacy checkpoint breakage | Versioned decoder accepts the old `{sourceDocumentId, sourceFilename}` shape and new job/source shape; regression test both. |

## Phase 0: Research and Decision Record

### Objective

Resolve technical choices before implementation: bridge compatibility, source-set staleness,
provider refs, deterministic context selection, concrete web search, SSRF-safe fetch, HTML
extraction, snapshot format, idempotency, and rollout gates.

### Output

[research.md](research.md) records decisions and rejected alternatives. It selects Brave Web
Search, Node connection-bound HTTP/HTTPS fetching, `net.BlockList`, Readability/jsdom,
deterministic Markdown snapshots, and no research-session/vector/crawler infrastructure.

### Gate

No unresolved technical question remains. Provider terms and snapshot retention/site-access
approval are explicit production rollout dependencies, not architectural unknowns.

## Phase 1: Additive Database Compatibility and Job-Wide Reads

### Objective

Make the database and repository safely understand one-to-eight sources while leaving the current
PDF-only application behavior operational.

### Exact existing components likely affected

- Future migration after `supabase/migrations/029_allow_sequential_lesson_advance.sql`.
- `src/generated/database.types.ts`.
- `content-pipeline-repository.ts`:
  `createSourceDocument`, `getCourseGenerationContext`, `persistCourseOutline`, `RawImportJob`,
  `loadCourseImports`, `getCourseImportChunks`, `persistCourseLessonContent`,
  `publishCourseImport`.
- `types/index.ts`: additive source descriptors/refs and plural publication/source fields.
- `course-drafts/route.ts`: unchanged route with additive response.
- Migration/repository/route tests.

### Database and RPC work

Plan one future additive migration; do not create it during planning.

1. Add `source_documents.initialize_import_job boolean not null default true`.
2. Add nullable unique `course_import_jobs.initialization_key` and nullable immutable
   `initialization_fingerprint` for new-path initialization. The fingerprint is derived from the
   canonical ordered source IDs and normalized initial source metadata. Legacy jobs keep both null
   and their current creation behavior.
3. Add `source_document_metadata` and `course_import_job_sources` exactly as described in
   [data-model.md](data-model.md), with RLS, indexes, bounded score checks, and first-release source
   exclusivity.
4. Backfill file metadata and one order-zero bridge row per existing job. Include invariant checks
   in the migration so it fails rather than partially accepting drift.
5. Replace `initialize_course_import_job` so legacy insertion creates a job and order-zero bridge
   row atomically when the flag is true.
6. Add an active-Admin, security-definer, empty-search-path initialization RPC accepting one
   workflow `initializationKey` and an ordered array of 1..8 source IDs plus job-specific metadata.
   It computes the canonical payload fingerprint. In one transaction it resolves/claims the unique
   key, locks source rows in deterministic order, validates ownership, `extracted` state, non-empty
   chunks, uniqueness, and unattached membership; inserts exactly one job with order-zero as its
   legacy anchor; and inserts every initial bridge row. A duplicate/concurrent request whose key
   and fingerprint match returns the existing job; the same key with a different fingerprint
   fails. The fingerprint remains unchanged even if the job's source set changes later. No
   per-source operation without `jobId` may create a new-path job.
7. Add hardened RPCs for unattached source materialization/provenance, later attachment with a
   required job ID, detachment, anchor reassignment, source limit, ownership, lifecycle, and
   staleness rules. Revoke `PUBLIC/anon`; grant only authenticated execution.
8. Add job-centric outline persistence (`create_course_outline_for_job`) accepting canonical chunk
   IDs and validating bridge membership. Keep `create_course_outline` as a single-source wrapper.
9. Add job-centric Lesson-content persistence accepting canonical per-section citations and
   validating both bridge membership and approved outline allowance. Keep the legacy function for
   single-source callers.
10. Extend `publish_course_import_job` in place: archive all bridge sources inside the same
   transaction, preserve idempotency/official curriculum writes, retain `sourceDocumentId`, and
   add ordered `sourceDocumentIds`.
11. Do not change `prepare_course_lesson_generation`.

### Repository work

- Add `listCourseImportSources`, `getCourseImportGenerationContext(jobId)`,
  `materializeSourceAttempt`, `initializeCourseImportFromUsableSources`,
  `attachCourseImportSource`, and `detachCourseImportSource`.
- Make job-wide reads order by `source_order`, then `chunk_index`, and return canonical chunk ID,
  source identity, metadata, and content only in server-side contexts.
- Extend `loadCourseImports` with `sources[]` and source-qualified outline/content citation joins;
  preserve `sourceDocumentId/sourceFilename` as order-zero aliases.
- Keep legacy `getCourseGenerationContext(sourceDocumentId)` and historical draft repository paths
  unchanged.

### Service work

No new UI behavior yet. Add repository result validation and helpers needed by later phases while
keeping current source-scoped generation as the only active caller.

### Provider and type work

- Add `CourseImportSource`, `CourseSourceChunk`, `CourseSourceRef`, and provenance fields
  additively.
- Do not switch provider schemas in this phase.
- Normalize relational source/citation rows into both legacy indexes for one-source jobs and new
  source refs for all jobs.

### API work

- `GET /api/admin/course-drafts` returns additive `sources[]` and provenance; existing fields and
  status/error envelope remain.
- No new write endpoint is enabled in the UI yet.

### UI work

None beyond ensuring additive response fields do not change current rendering.

### Unit/integration tests

- Migration contract: tables, constraints, RLS, grants, hardened functions, dual-write.
- Backfill: exactly one bridge row per old job and unchanged historical row counts/content.
- Lifecycle/concurrency: materialization creates no job or bridge row; one ordered usable-source
  initialization creates exactly one job and all initial bridge rows; later successful sources
  attach only with that job ID; duplicate attach is idempotent; eighth attached source succeeds
  and ninth fails.
- Run duplicate and genuinely concurrent initialization calls with the same workflow key and
  ordered usable-source set; prove both resolve to one job ID, one job row, one ordered bridge set,
  and no duplicate anchor. Prove a same-key/different-set replay fails without a second job.
- Failed or zero-chunk sources cannot enter initialization/attach, remain retryable/removable without a job, and
  never become the legacy anchor. If all attempts fail, job and bridge counts stay unchanged.
- Anchor removal safely reassigns order zero; last-source detach fails.
- Cross-owner/cross-job attach and chunk persistence fail.
- Publication archives every bridge source and stays idempotent/atomic.
- Existing repository, route, provider, service, and migration tests pass unchanged.

### Browser/E2E acceptance criteria

The existing `reviews an outline, generates Lesson contents, and atomically publishes a Course`
scenario passes without route or fixture changes.

### Compatibility strategy

Deploy the additive migration/backfill before application multi-source writes. Legacy upload uses
the default trigger flag, anchor, wrapper RPCs, and old DTO fields exactly as before.

### Rollback considerations

Application rollback remains safe because legacy fields/RPCs continue to exist. Keep additive
tables and dual-write migration in place; do not reverse the backfill or drop provenance.

### Dependencies

- Clean production-like backfill rehearsal.
- Generated Supabase types after migration design is approved.
- No Phase 2/3/4 write caller may deploy first.

## Phase 2: Multi-Source Generation Boundary

### Objective

Switch the active Course-import generation internals from one anchor source to a job-wide,
source-qualified context without changing review, Continue, or publication behavior.

### Exact existing components likely affected

- `types/index.ts` generation and DTO types.
- `lesson-draft-provider.ts` schemas, prompt framing, parsers, single-chunk canonicalization.
- `content-pipeline-repository.ts` job-wide readers and new persistence calls.
- `content-pipeline-service.ts`: `validateCourseOutline`, `selectProviderChunks`,
  `generateCourseOutline`, `updateCourseOutline`, `regenerateCourseOutline`,
  `generateOneCourseLesson`, `generateCourseLessonContents`,
  `regenerateCourseLessonContent`.
- `course-drafts/[id]/outline/route.ts` (add POST; extend PATCH internally).
- Existing source-scoped Course-outline route remains the compatibility entry.
- Provider/service/repository/route/component tests.

### Database and RPC work

Use the Phase 1 job-centric RPCs. No second schema redesign. Verify that all persistence calls pass
canonical IDs and database membership guards reject foreign chunks.

### Repository work

- Read all attached chunks through the bridge, never through only `job.source_document_id`.
- Persist job-wide outline source IDs and per-section citation IDs through the new RPCs.
- Read Admin citation provenance by joining chunk -> source -> metadata and bridge relevance.
- Keep relational citation rows authoritative when legacy/new JSON shapes differ.

### Service work

1. Add source-aware round-robin context selection under 80k.
2. Build a request-local `sourceRef -> CourseSourceChunk` map for every provider call.
3. Resolve every provider result back to canonical chunk IDs; reject unknown/duplicate refs.
4. Validate Admin-edited `sourceRefs` against the job bridge and current context budget.
5. Generate initial outline by job ID; retain the source-ID function as a wrapper that resolves the
   anchor job.
6. Regenerate from the same stored source/chunk set; never fetch live pages.
7. Generate/regenerate each Lesson only from the approved outline's canonical allowed sources.
8. Keep `prepareCourseLessonGeneration`/Continue and failure state handling unchanged.

### Provider and type work

- New provider chunks: `{sourceRef, sourceLabel, content}`.
- New outline fields: `sourceRefs`; new Lesson section fields: `citationSourceRefs`.
- Prompt each chunk with request-local ref plus human-readable source label and repeat the
  untrusted-data instruction.
- Strict schema/parser accepts only supplied refs. Sole-source canonicalization targets the sole
  request-local ref, not document-local zero.
- Preserve a legacy adapter/parser for historical single-source types/tests until all callers are
  intentionally migrated.

### API work

- Add `POST /api/admin/course-drafts/:id/outline` for initial/replacement job-wide generation.
- Extend outline PATCH/queue DTOs with `sourceRefs`; accept `sourceChunkIndexes` only for a verified
  one-source legacy job.
- Keep outline regenerate, Continue, Lesson regenerate, Lesson edit, and review route contracts.
- Keep no-store/error envelope/max-duration behavior.

### UI work

- Render source-qualified provenance instead of ambiguous numbers for multi-source outline and
  content citations.
- For multi-source Lessons, replace raw numeric editing with a controlled selector limited to
  server-returned refs; keep legacy display compatibility.
- Adding a Lesson copies a valid bounded ref set from the current outline rather than inventing
  `[0]`.
- Preserve all Course/Lesson metadata editing, add/remove/reorder, save, regenerate, and Continue
  controls.

### Unit/integration tests

- Two documents with chunk zero map to distinct provider refs and canonical IDs.
- Unknown, duplicate, unattached, and cross-job refs fail at parser, service, and RPC layers.
- Round-robin selection is deterministic, source-aware, and <=80k.
- Admin edit/regenerate creates a new revision and never updates old rows.
- Content generation uses only approved outline refs and retains complete per-section citations.
- One-source compatibility wrapper preserves current sole-chunk normalization.
- Publication remains atomic/idempotent and Exercise symbols never enter Course schemas.

### Browser/E2E acceptance criteria

A mocked two-source job reaches the existing outline editor, edits/reorders/adds Lessons with valid
source refs, Continues, reviews source-qualified citations, and publishes. The legacy PDF scenario
remains green.

### Compatibility strategy

Dual-read old/new shapes. Emit new source-qualified refs for multi-source jobs while retaining
anchor and bare-index fields for old jobs. Never rewrite historical outline/content JSON.

### Rollback considerations

Keep Phase 1 RPCs and dual-shape readers. If the Phase 2 application is rolled back, disable
multi-source job creation first; legacy jobs remain operational.

### Dependencies

- Phase 1 migration, backfill, job-centric RPCs, and generated types deployed.
- No source-review UI yet depends on this phase.

## Phase 3: Manual URL, Optional File, and Source Review

### Objective

Let Admins assemble and recover a reviewed source set, safely ingest selected URLs as immutable
private evidence, coexist with uploaded documents, and require a replacement outline after source
changes before Continue.

### Exact existing components likely affected

- New `web-page-fetcher.ts`, `web-page-extractor.ts`, `web-snapshot.ts` and tests.
- `document-extractor.ts` normalization export/reuse and regression tests.
- `content-pipeline-service.ts`: URL ingestion, upload orchestration, attach/detach, retry.
- `content-pipeline-repository.ts`: staged-attempt, ordered-set initialization, attach, and
  source-state helpers.
- `content-pipeline-admin.tsx`: source-review state, checkpoint v2, ingestion progress.
- Existing upload route plus new URL and source attachment routes.
- `package.json`/lockfile: `@mozilla/readability`; move `jsdom` to runtime dependency.
- `next.config.ts` only if runtime tracing proves explicit inclusion is necessary.

### Database and RPC work

Use Phase 1 materialization/initialization/attach/detach RPCs. For the new path, materialization stores
the source and provenance with `initialize_import_job=false` and creates neither a job nor a
`course_import_job_sources` row. After all current attempts settle, one initialization transaction
receives the workflow key and complete ordered usable-source set, locks them, verifies every source
has successful extraction and at least one usable chunk, then creates one job, chooses order zero
as the legacy anchor, and inserts all initial bridge rows atomically. Later attachment requires an
existing job ID. Attachment changes enforce one-to-eight sources and
exclusive ownership, reject post-Continue states, safely reassign anchor/order, clear approval,
and set `processing` when an outline becomes stale. Do not delete or alter historical
revision/citation rows. The unchanged legacy file-only insert continues to initialize immediately
through the default flag.

### Repository work

- Materialize file/web source attempts and provenance after private storage succeeds, always
  unattached and without requiring a job ID; clean the object if materialization fails.
- Lookup deterministic storage path/idempotency ownership on retries and return the same source
  attempt rather than inserting a duplicate.
- Initialize from the complete ordered set of currently usable, non-empty sources using one
  workflow initialization key. Make the whole transaction idempotent and concurrency-safe; there
  is no no-job per-source initializer.
- Attach a later successfully extracted, non-empty source only when an existing job ID is supplied.
  Make attachment idempotent and concurrency-safe.
- Allow retry and guarded removal of an unattached failed attempt without requiring a job. The
  last-source detach rule applies only to bridge rows for successfully attached evidence.
- Expose ordered source-review state for checkpoint recovery.
- Reuse `replaceDocumentChunks` and current source status updates.

### Multi-source source-status semantics

- A staged attempt stays `uploaded`, `extracting`, `extracted`, or ingestion `failed`; only
  `extracted` with at least one chunk is usable for initialization or later attach.
- Job-wide outline generation/regeneration records transient AI work on the Course-import job and
  does not move attached sources to `generating`; they remain `extracted` or `ready_for_review`
  while the provider call is in flight, so a process interruption cannot strand usable evidence.
- On successful outline persistence, transition every source in that exact generation set to
  `ready_for_review` in the same transaction that commits the new immutable outline revision.
- If provider or persistence work fails, record failure on the Course-import job and leave every
  attached source state unchanged. Do not label a successfully ingested snapshot
  as ingestion `failed`, detach it, or mutate an earlier outline revision.
- Continue does not alter source status; it locks bridge mutation through the existing approved
  outline transition. Publication alone archives every attached source atomically.

### Service work

1. Validate URL request, UUID idempotency key, staged/attached source limits, and active Admin
   before network.
2. Apply distributed URL-fetch limit.
3. Safe-fetch with scheme/port/credential/IP/DNS/redirect/timeout/header/body/MIME controls.
4. Parse main content with scripts/resources disabled; reject empty/unreadable results.
5. Serialize deterministic Markdown; upload privately; materialize the source with
   `initialize_import_job=false`; persist provenance without a bridge row.
6. Reuse existing Markdown extraction/chunking/status flow. A failure records source-specific
   state but cannot enter initialization/attach and creates no bridge row.
7. After current ingestion attempts settle, collect every usable source in deterministic Admin
   selection order and submit that entire 1..8 set once with the workflow initialization key. The
   single transaction initializes one job, uses the first ordered source as anchor, and creates all
   initial bridge rows. Successful attempts remain eligible when another attempt fails.
8. Extend file upload only when optional multi-source fields are present; legacy multipart path
   remains unchanged.
9. Make per-source retry/removal independent. Retry reuses the same source and stored snapshot;
   refresh replays materialization/extraction and the job-centric initialization idempotently. If
   all selected sources fail, no initialization request is sent, no job exists, and no unusable
   source becomes the anchor.

### Provider and type work

No search provider yet. Add source ingestion/checkpoint/error types and Admin provenance fields.
AI generation continues consuming only stored chunks.

### API work

- `POST /api/admin/content-sources/url` as specified in OpenAPI.
- Extend `POST /api/admin/content-sources` with an explicit new-flow/idempotency branch that
  materializes an unattached file attempt; do not change the legacy `{file}` request or its
  immediate initialization behavior.
- `POST /api/admin/course-imports` atomically initializes one import from the workflow
  `initializationKey` and ordered usable-source set.
- `DELETE /api/admin/content-sources/:sourceDocumentId` removes only an unattached staged attempt.
- `GET|POST /api/admin/course-drafts/:id/sources` and
  `DELETE /api/admin/course-drafts/:id/sources/:sourceDocumentId`.
- Use Node runtime, no-store, existing envelope, explicit timeout/size/content error mapping.

### UI work

- Add a source-review list with origin, title/domain/filename, Admin-only scores, ingestion status,
  source-specific error, Retry, and Remove.
- Add manual URL and optional file controls; allow discovered/manual/file coexistence.
- Show one source result per ingestion attempt and permit continuation with successful sources.
- Prevent >8 selected/attached sources and outline generation with zero usable sources.
- When source set changes after an outline, mark the outline stale, hide/disable Continue, and
  require job-scoped outline generation before review resumes.
- Version checkpoint data; parse legacy checkpoint and retain current legacy retry behavior.
- Preserve labels, keyboard use, focus, `aria-live`, `role=alert`, and disabled/loading states.

### Unit/integration tests

- Full SSRF matrix in [quickstart.md](quickstart.md), including DNS rebinding/custom lookup and
  redirect revalidation.
- HTML/plain text <=2 MiB, decompression, charset, empty/readability, timeout, and redirect tests.
- Deterministic snapshot/hash/chunks and no live refetch on generation retry.
- Idempotent URL/file materialization, extraction, ordered-set initialization, later attach, and interrupted storage/database
  cleanup with no duplicate source/job/bridge.
- One ordered usable-source set initializes one job and all initial attachments atomically;
  failed/zero-chunk sources are excluded; all-failed selection creates no job or anchor.
- Duplicate and parallel initialization with one workflow key/set returns the same job; a
  same-key/different-set replay conflicts and cannot create another job.
- Partial failure, unattached remove/retry, attached last-source guard, anchor reassignment, stale
  outline, and post-Continue rejection.
- Checkpoint v1/v2 decoding and recovery.
- File-only request/response compatibility and extraction regression.
- Controlled-latency acceptance for 1..8 selected sources proves that per-source outcomes and an
  editable outline or actionable error are reached within the SC-007 five-minute budget without
  making live external network calls.

### Browser/E2E acceptance criteria

Admin adds a manual URL and file, handles one failed source without losing another, removes the
failed unattached attempt without a job dependency, initializes one import from the ordered usable
set, later attaches another successfully ingested source by job ID, removes an attached source
before Continue, generates a replacement outline, and
completes publication. Refresh during any stage recovers the same source attempts, job, and bridge
state without duplicates.

### Compatibility strategy

Manual URL and multi-source upload are additive branches. Existing upload -> extract ->
source-scoped outline remains visible and contract-compatible on the same screen.

### Rollback considerations

Feature-disable URL ingestion and source mutation while retaining stored snapshots/metadata and
bridge rows. Do not remove snapshots referenced by any revision. Legacy file flow remains active.

### Dependencies

- Phases 1 and 2 deployed.
- Readability/jsdom dependency/security/license approval.
- Product/legal/security approval for snapshot retention and site-access policy before production
  enablement.

## Phase 4: Topic Research and Ranked Discovery

### Objective

Add Vietnamese-first, language-aware topic research with no persistence until Admin selection,
bounded candidate review, deterministic ranking, and graceful provider failure.

### Exact existing components likely affected

- New research/provider files listed in Project Structure and their tests.
- New `course-research/route.ts` and route tests.
- `content-pipeline-service.ts`: topic validation/research orchestration.
- `content-pipeline-admin.tsx`: topic, Research, Research More, selection state.
- `types/index.ts`: normalized candidates/cursor.
- `src/lib/rate-limiter.ts`: research scope.
- `.env.example`: server-only Brave credential documentation.

### Database and RPC work

None. Research candidates, queries, cursors, and unselected results are never persisted. Only the
Phase 3 selected-source path writes staged snapshots/metadata; it writes the initial bridge set
only through one job-centric transaction after selected sources have ingested successfully, and
uses job-scoped attach only for later usable evidence.

### Repository work

None for research. Repository calls start only after selection triggers ingestion.

### Service work

- Normalize topic (3-300 characters) and create <=3 deterministic Vietnamese-first,
  language-aware queries.
- Enforce a distributed research-round rate limit before provider access.
- Call provider with bounded pagination, normalize and canonicalize HTTP(S) results, deduplicate,
  score, sort deterministically, and cap response to 20.
- Map provider auth/quota/timeout/upstream errors to stable recoverable codes without clearing UI
  state.
- Pass selected candidates to existing URL-ingestion orchestration only after Admin confirmation.

### Provider and type work

- `WebSearchProvider` accepts normalized query, language/country hints, result count, and cursor;
  returns vendor-neutral URL/title/snippet/provider-rank/page state.
- Brave adapter sends server-only subscription token, requests web results only, disables display
  decoration, uses count/offset bounds, validates response shape, and exposes no vendor payload.
- Candidate key is derived from canonical URL; ranking scores are bounded and Admin-only.

### API work

- `POST /api/admin/course-research` remains stateless and performs no database writes.
- Response contains topic, <=3 queries, <=20 normalized candidates, opaque bounded cursor, and
  `hasMore`.
- Provider unavailable returns recoverable 503; validation/rate-limit keep existing 400/429
  patterns.

### UI work

- Topic field, Research, Research More, candidate metadata, accessible checkbox selection, count
  (`n/8`), and advisory score labels.
- Research More merges new unique candidates, keeps selected items, and caps the visible set at
  20; selected candidates cannot be displaced by truncation.
- Keep candidates/request state only; no ingestion until explicit confirmation.
- Provider failure preserves topic, candidates, selection, manual URL, and file controls.
- Only selected candidates receive idempotency keys and enter Phase 3 ingestion.

### Unit/integration tests

- Topic and query validation, Vietnamese-first/language-aware variants.
- Brave response validation and error mapping with mock fetch only.
- URL canonicalization, tracking-parameter policy, unsupported scheme, duplicates.
- Stable relevance/authority score bounds and tie ordering.
- <=20 candidates, <=8 selection, Research More merge/retention.
- Assert zero repository/database calls during research.
- Assert only selected results are fetched/snapshotted.
- Provider failure preserves component state and fallback actions.
- Keyboard/focus/live-region/error accessibility tests.

### Browser/E2E acceptance criteria

Starting with only a topic, Admin researches, selects/unselects, uses Research More without losing
selection, adds a manual URL/file, ingests only selected sources, handles a provider failure, opens
the existing outline editor, reviews/publishes, and passes Axe with no serious violations.

### Compatibility strategy

Topic research is an additive entry mode. Manual URL and file-only modes remain available when
Brave is missing, limited, or unavailable.

### Rollback considerations

Remove/disable the research UI and route/config while leaving Phase 3 manual/file source review
operational. No research rows require cleanup.

### Dependencies

- Phase 3 ingestion/review available.
- Brave credential, subscription/quota, terms, and production configuration approved.
- No AI query planner dependency.

## Phase 5: Compatibility Hardening and Rollout

### Objective

Prove old and new flows side by side, verify production-like backfill and operational controls,
then enable research/URL ingestion progressively without changing learner or Exercise behavior.

### Exact existing components likely affected

- All focused tests added in Phases 1-4.
- `tests/e2e/critical-flows.spec.ts` and mock Supabase server/fixtures.
- Existing learner/progress and Exercise/moderation smoke tests, without product-code changes.
- `docs/architecture.md`, `docs/database.md`, `docs/api_contract.md`, `docs/security.md`,
  `docs/ui.md`, `docs/features.md`, and decision/operations notes where applicable.
- Structured error/metric logging in the existing content-pipeline/service boundaries.

### Database and RPC work

- Run production-like backfill verification and invariant queries before deployment approval.
- Verify RLS/grants/function ACLs through local/test Supabase and advisors.
- Confirm existing published jobs remain read-only/idempotent and old revisions/citations are
  unchanged.
- Do not drop the anchor, compatibility RPCs, or legacy fields in this feature.

### Repository work

- Add invariants/diagnostics for missing bridge rows, anchor drift, duplicate source membership,
  and invalid provenance joins.
- Verify queue reads for legacy unpublished, stale pre-Continue, multi-source, and published jobs.

### Service work

- Stabilize error codes for search, fetch, extraction, attachment, source limit, stale outline,
  invalid refs, provider failure, and publication retry.
- Emit metadata-only operational signals: actor/job/source IDs, stage, stable code, duration, byte
  count, redirect count, source count; never log page/chunk/provider body or credentials.
- Monitor search/fetch success, source failures, invalid refs, stale attempts, and publication
  retries.

### Provider and type work

- Lock dual-shape normalization tests and prevent Admin-only scores/provenance from entering learner
  Lesson DTOs.
- Verify prompts continue excluding exercises/answers/solutions and framing all source text as
  untrusted.

### API work

- Contract-test every new/extended route for authorization, validation, status, envelope, no-store,
  timeout/rate-limit/error behavior.
- Confirm existing endpoints and response fields remain compatible.

### UI work

- Finalize responsive/loading/empty/partial-failure/retry/stale/locked states.
- Confirm Admin-only provenance/scores and no new learner citation UI.
- Retain the explicit link to the separate per-Lesson Exercise flow.

### Unit/integration tests

- Run focused suites after every phase, then `lint`, `typecheck`, full Vitest, build, and Playwright.
- Add regression coverage for legacy checkpoint, PDF-only import, existing unpublished fixture,
  historical published Course, partial source failure, source-change revision, cross-job refs,
  publication retry, learner access/progress, and Exercise generation/moderation/publication.
- Perform secret scan, diff review, migration review, and generated-type verification before
  commit.

### Browser/E2E acceptance criteria

In one build, all pass:

1. legacy file-only Course publication;
2. existing-unpublished job after backfill;
3. topic-only multi-source publication;
4. partial URL failure and successful continuation;
5. source change -> stale outline -> new revision -> Continue;
6. publication failure/retry idempotency;
7. learner Course/Lesson/enrollment/progress smoke;
8. published-Lesson Exercise generation, moderation, and publication;
9. no new learner citation UI and no Admin-only score leakage.

### Compatibility strategy

Roll out in order: database/backfill -> dual-read application -> multi-source internals -> manual
URL/file source review -> topic research. Keep legacy file UI/route and compatibility wrappers
enabled until a separately approved cleanup.

### Rollback considerations

- Database additions remain in place for every application rollback.
- Disable research and URL ingestion independently through deployment configuration/UI gating.
- Before rolling application code back below multi-source-read compatibility, stop multi-source
  writes and deploy a bridge-aware compatibility release.
- Never delete snapshots, bridge/metadata rows, or historical revisions as rollback.

### Dependencies

- All preceding phases verified.
- Production-like backfill rehearsal and owner approval.
- Provider, legal/retention/site-access, security, and operations readiness gates.
- No deployment or production migration is authorized by this planning artifact.

## Delivery Ordering and Merge Gates

| Order | Merge/deploy gate |
|---|---|
| 1 | Phase 1 migration contract, backfill rehearsal, RLS/ACL, legacy E2E PASS |
| 2 | Phase 2 canonical-ref tests, multi-source E2E, legacy E2E PASS |
| 3 | Phase 3 SSRF/snapshot/idempotency tests, manual URL/file E2E PASS |
| 4 | Phase 4 provider/ranking/no-persistence tests, topic E2E/a11y PASS |
| 5 | Full Phase 5 regression, production-like verification, rollout approvals |

Each phase is independently reviewable. Do not combine Phases 1-4 into a single release without
passing the preceding phase gate.

## Complexity Tracking

No constitution or architecture violation requires an exception. New files are focused adapters
and pure helpers within the existing content-pipeline layers; new durable schema is limited to the
two audited tables, one transitional source flag, and the nullable initialization key/fingerprint
fields on `course_import_jobs` required for atomic retry/concurrency safety.
