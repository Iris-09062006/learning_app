# AI Course multi-source change-impact audit

## Feature 002 implementation addendum (2026-08-14)

The planned multi-source flow is now implemented. Tavily Search owns discovery only; explicitly
confirmed discovered/manual URLs share one server-only Basic Markdown Tavily Extract orchestration.
The application validates untrusted output and creates the existing immutable private snapshot
before chunks or Gemini generation. The earlier safe direct-fetch/Readability design below is now
historical: its network/extractor code is retained but production-unused and never a provider
failure fallback. PDF/file, Course generation/review/publication, learner/progress, and Exercise
contracts are unchanged, and feature 002 requires no database migration.

## Scope and evidence

This document identifies the minimum application changes needed to extend the current Course-import pipeline from one source per import job to reviewed, selected multi-source imports that can begin with a topic and web research. It is an impact analysis only; it does not authorize an implementation or a database change.

Evidence was checked against repository HEAD `87db4612b219bcf497852b7dfcff65203233b7a8` on 2026-08-13. `.ua/meta.json` describes commit `8d21221a3a75c7a5933684f0ac85628cc2d981e3`, so `.ua` was used only as a navigation aid. The active files, API handlers, application services, repository code, provider contracts, tests, and Supabase migrations were read from HEAD. The relevant content-pipeline code and migrations do not differ between the `.ua` target commit and HEAD; the two AI Course audit documents are newer.

Database conclusions are inherited from `docs/ai-course-database-audit.md` and were cross-checked against the current migrations. No contradiction was found. In particular:

- add `course_import_job_sources` and `source_document_metadata` rather than replacing existing tables;
- retain and backfill `course_import_jobs.source_document_id` as the legacy/order-zero anchor during transition;
- keep `document_chunks`, outline revisions, outline-to-chunk rows, lesson citations, and publication rows structurally unchanged;
- materialize a web page as an immutable private TXT/MD snapshot before creating its `source_documents` row and chunks;
- make job-centric RPCs validate chunk ownership across the job's attached sources.

### Classification legend

| Classification | Meaning in this audit |
| --- | --- |
| **KEEP** | Existing behavior and contract remain as-is. |
| **REUSE** | Use the component for the new flow without changing its core responsibility. |
| **EXTEND** | Add optional data or behavior while retaining the legacy contract. |
| **CHANGE** | A single-source assumption must be replaced in this component. |
| **DO NOT TOUCH** | Outside scope or regression-sensitive and not needed for this capability. |

## Minimal target flow

```text
topic (client/pre-import state)
  -> POST research -> ranked candidate metadata
  -> admin selects results, adds URLs, and/or uploads files
  -> selected sources are fetched/uploaded, snapshotted, extracted, and chunked
  -> first source creates the legacy-compatible import job
  -> remaining sources attach through course_import_job_sources
  -> job-scoped outline generation maps request-local source refs to document_chunk IDs
  -> existing immutable outline-review revisions
  -> existing Continue action approves the current outline and generates lessons
  -> existing content review
  -> existing atomic/idempotent publication
  -> existing Exercise flow remains separate
```

Research results should remain client/request state until the admin selects them. This is the smallest design because a current import job requires a non-null source document. If resumable research before source selection becomes a concrete requirement, a separate research-session model would be needed; making `course_import_jobs.source_document_id` nullable or creating a synthetic source would conflict with the backward-compatible database plan.

## Admin UI impact

The existing outline and content editors already provide the required editing, ordering, Continue, review, and publication behaviors. The new work belongs before the outline editor, plus source provenance display where a bare chunk number would be ambiguous.

| Component/file/function | Class | Minimal impact |
| --- | --- | --- |
| `src/app/(main)/admin/content/page.tsx` / `AdminContentPage` | **KEEP** | Keep the route, admin authorization, layout, and rendering of `ContentPipelineAdmin`. Copy/metadata may be updated, but no page split is required. |
| `src/features/content-pipeline/components/content-pipeline-admin.tsx` / `ContentPipelineAdmin` | **EXTEND** | Add topic input, Research action, research-result review, selected/unselected state, Add URL, optional upload, ingestion progress, and a source list. After ingestion, continue into the current selected-import outline/content panels. |
| `requestPipelineApi` | **REUSE** | It already handles JSON and multipart responses. Use it for the new research, URL-ingestion, and attach/detach endpoints. |
| `submitSource` | **CHANGE** | Preserve its current file-only sequence as the legacy branch. For the new branch, upload may initialize the first job or attach to the active job; outline generation must wait until all selected sources have finished ingestion. |
| `PendingGeneration`, `readCheckpoint`, `storeCheckpoint` | **EXTEND** | Keep the single-source checkpoint readable. Add an optional `jobId`, source collection, and completed-ingestion state for multi-source recovery. Version the stored shape or accept both shapes; do not strand existing session storage. |
| `runOutlineGeneration` | **CHANGE** | Use job-scoped outline generation for a multi-source job. Retain the source-scoped endpoint as the legacy PDF path. |
| `retryOutline` | **EXTEND** | Retry by `jobId` when present and by legacy `sourceDocumentId` for an old checkpoint. Do not re-fetch or mutate immutable selected snapshots during a retry. |
| `outlinePayload` | **EXTEND** | Preserve title/description/objectives/order. New multi-source drafts should submit canonical source references returned by the API, not user-editable bare chunk indexes; continue accepting the legacy shape for existing jobs. |
| `editLesson`, `reorderLesson`, `addLesson`, `removeLesson` | **REUSE** | Preserve current outline editing. When adding a lesson, copy a valid canonical source-reference set rather than only `sourceChunkIndexes`; no UI redesign is needed. |
| `saveOutline`, `regenerateOutline` | **EXTEND** | Keep routes and interactions. Send/receive the additive source-reference shape for multi-source jobs while continuing to support legacy indexes. Regeneration must use all attached sources. |
| Continue button and `generateContents` | **KEEP** | Continue remains outline approval plus lesson generation through the existing route. No new approval screen or status is needed. |
| `ContentEditor`, `saveContent`, `regenerateContent`, review controls, publish controls | **REUSE** | Keep editing and review behavior. Extend citation labels to show source title/domain plus per-source chunk number when the response supplies provenance. Do not make citation ownership editable. |
| Exercise navigation/link in `ContentPipelineAdmin` | **DO NOT TOUCH** | Exercise generation is downstream and separate from Course-import source selection. |
| `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` | **EXTEND** | Keep current legacy, outline-editing, Continue, content-review, publication, and Exercise-separation tests. Add topic research, selection, Add URL, optional upload, failed-source handling, job-scoped outline transition, and legacy checkpoint cases. |
| `tests/e2e/critical-flows.spec.ts` Course-import case | **EXTEND** | Retain the current PDF/file-only browser path as a regression. Add a separate mocked topic-to-multi-source path rather than replacing it. |

The source-review panel needs only these states: candidate result metadata, selection checkbox, ingestion status/error, immutable-snapshot completion, and remove/detach before outline generation. This is the concrete **create from Topic** UI: its Research action produces a discovered source list, select/unselect controls choose evidence, Add URL supplies a manual source, and an optional uploaded document can join the same selection. A selected source should display title, URL/domain or uploaded filename, discovery method, and authority/relevance indicators. Ranking is advisory; explicit admin selection is authoritative.

## API route impact

### Existing routes

| Route/file | Class | Required behavior |
| --- | --- | --- |
| `POST /api/admin/content-sources` (`content-sources/route.ts`) | **EXTEND** | Keep the existing multipart `{file}` request and response. Optionally accept `jobId`/attachment intent so an uploaded file can be attached after ingestion. The service must still enforce admin access, MIME, size, private storage, and cleanup. |
| `POST /api/admin/content-sources/:id/extract` | **REUSE** | Continue file extraction/chunking. Web snapshots should enter the same source status and chunking lifecycle, either through this service or an internal shared helper. No multi-source semantics belong in this route. |
| `POST /api/admin/content-sources/:id/course-outline` | **KEEP** | Preserve as the legacy one-file entry point. Internally it may use the new job-centric implementation after the first/anchor job is resolved. |
| `GET /api/admin/course-drafts` | **EXTEND** | Keep route and queue semantics; add ordered `sources[]` and source-qualified references to each import DTO while retaining singular anchor fields. |
| `PATCH /api/admin/course-drafts/:id/outline` | **EXTEND** | Keep editable-outline behavior and immutable revision creation. Accept the additive canonical source-reference shape and legacy `sourceChunkIndexes`. |
| `POST /api/admin/course-drafts/:id/outline/regenerate` | **EXTEND** | Same route and UI action; generation context changes from anchor source to all attached sources. |
| `POST /api/admin/course-drafts/:id/lessons/generate` | **KEEP** | Preserve Continue-as-approval semantics and status transition. Its service internals will load job-wide chunks. |
| `POST /api/admin/course-drafts/:id/lessons/:lessonId/regenerate` | **KEEP** | Preserve public route contract; service internals resolve the lesson's canonical citations across sources. |
| `PATCH /api/admin/lesson-drafts/:id` with `pipeline: "course_import"` | **KEEP** | Keep current Course-content edits and immutable lesson-content revision behavior. |
| `POST /api/admin/course-drafts/:id/reviews` | **KEEP** | Keep review decisions and atomic/idempotent publication call. |
| compatibility `/generate`, legacy lesson-draft routes, content target/curriculum routes | **DO NOT TOUCH** | They are not required for the active multi-source Course-import path. |

### New API surfaces

Use three small capabilities and one job-scoped generation entry point:

1. `POST /api/admin/course-research`
   - Request: `{ topic: string }`.
   - Response: `{ topic, queries, results[] }`, where each result has a stable request-local key, URL, title, domain, snippet, discovery method, and ranking signals/scores.
   - This endpoint does not create database rows or an import job.

2. `POST /api/admin/content-sources/url`
   - Request: `{ url: string, discovery: "manual_url" | "discovered", title?: string, jobId?: number, relevanceScore?: number }`.
   - Validate and fetch server-side, create an immutable private snapshot, create source metadata, extract/chunk, then either initialize a first-source job or attach to `jobId`.
   - Return the source plus attachment/job state. Repeated submissions should be idempotent within a job using canonical URL/snapshot identity where practical.

3. `POST /api/admin/course-drafts/:id/sources` and `DELETE /api/admin/course-drafts/:id/sources/:sourceDocumentId`
   - Attach an already ingested source or detach it before outline approval.
   - The service/RPC must reject cross-owner sources, duplicate attachment, detaching the last/anchor source without safe anchor reassignment, and detaching a source referenced by the current outline or lesson drafts.
   - If the UI always ingests and attaches atomically, POST is still useful as the explicit service boundary; do not expose direct table writes.

4. `POST /api/admin/course-drafts/:id/outline`
   - Generate an initial outline from all attached job sources.
   - This can coexist with the current PATCH in the same route file. It avoids overloading the legacy source-scoped endpoint and gives retries a stable job identity.

Batch URL ingestion is optional. A small implementation may call the URL endpoint once per selected result with bounded concurrency, then make one job-scoped outline request. A batch endpoint should be added only if atomic selection ingestion becomes a requirement; web fetches themselves cannot be made transactionally atomic.

All new routes must use the current `contentPipelineErrorResponse`, `readPipelineJson`, no-store responses, Node runtime, admin authorization in the service layer, rate limits for AI/search work, and explicit timeouts.

## Repository and service impact

### Repository

| File/function | Class | Exact single-source assumption and minimal change |
| --- | --- | --- |
| `content-pipeline-repository.ts` / `getCourseGenerationContext(sourceDocumentId)` | **CHANGE** | It filters `document_chunks` by one document. Replace the Course-import use with `getCourseImportGenerationContext(jobId)`, loading ordered attached sources and chunks. Keep the old function for compatibility callers if still used. |
| `persistCourseOutline` | **CHANGE** | It calls `create_course_outline(p_source_document_id, ...)`. Add a job-centric path/RPC payload containing canonical `document_chunk_id` references; retain the legacy wrapper for source-only imports. |
| `RawImportJob` and `loadCourseImports` | **EXTEND** | The query joins one `source_documents` row and maps `sourceDocumentId/sourceFilename`. Keep those anchor fields, also load ordered bridge sources plus metadata, and load outline/citation joins with `document_chunks.id`, `source_document_id`, and per-document `chunk_index`. |
| `listCourseImports`, `getCourseImport` | **REUSE** | Keep public responsibilities; they return the extended DTO from `loadCourseImports`. |
| `getCourseImportChunks(sourceDocumentId)` | **CHANGE** | Add/replace Course-import usage with `getCourseImportChunks(jobId)` semantics (or a clearly named job variant). Load only chunks whose documents are attached to the job, ordered by source order then chunk index. Do not infer ownership from the anchor. |
| `prepareCourseLessonGeneration` | **KEEP** | It calls the unchanged preparation RPC; no source lookup occurs here. |
| `persistCourseLessonContent` | **CHANGE** | Pass canonical chunk IDs/source references to the changed persistence RPC. Legacy sections/index payloads remain supported only for single-source jobs. |
| `failCourseImport`, `reviseCourseLessonContent`, `reviewCourseImport` | **KEEP** | Their responsibilities are job/draft status or immutable revisions and do not require source cardinality changes. Revision validation must continue to preserve existing citations. |
| `publishCourseImport` | **REUSE** | Keep the repository entry and response. Its RPC changes only to archive all attached sources while preserving the current publication transaction/idempotency. |
| upload/source helpers (`createSourceDocument`, `uploadSourceObject`, `downloadSourceObject`, `replaceDocumentChunks`, `updateSourceStatus`) | **REUSE** | Use for immutable web snapshots and files. Add metadata/attachment repository helpers rather than folding web/search behavior into these primitives. |
| legacy `getGenerationContext`, legacy lesson-draft/batch, content-target/curriculum functions | **DO NOT TOUCH** | They serve non-Course-import compatibility flows and are not required for this change. |

New repository helpers should be narrowly scoped: `createSourceMetadata`, `attachCourseImportSource`, `detachCourseImportSource`, `listCourseImportSources`, and `getCourseImportGenerationContext(jobId)`. Creation/attachment should use database RPCs or constrained writes that preserve ownership and lifecycle invariants.

### Application services

| Function | Class | Required change |
| --- | --- | --- |
| `uploadContentSource` | **EXTEND** | Preserve file validation/storage. Add an optional orchestration path to initialize/attach after successful extraction, or keep attachment in a separate service called by the route. |
| `extractContentSource` | **REUSE** | Keep status transitions, download, extraction, chunk replacement, and error handling for uploaded and materialized text/markdown snapshots. |
| `generateCourseOutline` | **CHANGE** | Retain the source-ID legacy wrapper; add job-scoped generation that builds a context from all attached sources, assigns unique request-local refs, calls the provider, resolves refs to canonical chunk IDs, and persists a new immutable outline revision. |
| `updateCourseOutline` | **CHANGE** | It currently validates indexes against chunks from `job.sourceDocumentId`. Validate canonical references against the job's attached sources. Never accept a client-supplied chunk ID merely because it exists. Preserve revision immutability and editing rules. |
| `regenerateCourseOutline` | **CHANGE** | It currently delegates using the singular source. Regenerate from a stable snapshot of all attached sources for the job and persist the next revision. |
| `generateCourseLessonContents` | **CHANGE** | Keep `prepareCourseLessonGeneration`/Continue. Load job-wide chunks once, then generate each lesson only from the canonical chunks referenced by its approved outline revision. |
| `generateOneCourseLesson` | **CHANGE** | It currently matches `sourceChunkIndexes` against one document and labels one filename. Accept source-qualified/canonical chunks, create request-local refs, include source labels in provider context, and map returned citations back to canonical chunk IDs before persistence. |
| `regenerateCourseLessonContent` | **CHANGE** | Load the lesson's outline sources across the job instead of `job.sourceDocumentId`; keep immutable content revision behavior. |
| `getCourseDraftQueue` | **REUSE** | Return the repository's extended import DTO. |
| `updateCourseLessonContent`, `submitCourseImportReview` | **KEEP** | Keep content editing, review, slugging, and publication behavior. Manual content revisions must retain valid existing citation ownership. |
| legacy `generateLessonDraft`, `generateCourseDraft`, lesson-draft queue/review/publication, content-target/curriculum services | **DO NOT TOUCH** | They are separate compatibility workflows. |

## Provider and type transition

### Problem

`document_chunks.chunk_index` is unique only within a `source_document`. Two attached documents can both contain chunk `0`. The current application types and provider contract use bare integers in `chunkIndex`, `sourceChunkIndexes`, and `citationChunkIndexes`, so a multi-source request cannot distinguish those chunks.

The database already stores canonical foreign keys (`document_chunk_id`) in `course_outline_lesson_sources` and `lesson_content_draft_citations`. The ambiguity is therefore an application/provider boundary problem, not a reason to redesign the citation tables.

### Minimal compatible model

Introduce a source-qualified application record, for example:

```ts
interface CourseSourceChunk {
  documentChunkId: number;       // server-side canonical identity
  sourceDocumentId: number;
  sourceOrder: number;
  sourceTitle: string;
  sourceUrl: string | null;
  chunkIndex: number;            // index within this source only
  content: string;
}

interface ProviderSourceChunk {
  sourceRef: number;             // unique only within one provider request
  sourceLabel: string;
  content: string;
}
```

The server creates a map `sourceRef -> CourseSourceChunk`, sends only unique request-local refs and labels to the AI provider, validates every returned ref against that map, and persists `documentChunkId`. Database IDs should not be trusted from AI output or arbitrary client input.

| Type/provider area | Class | Transition |
| --- | --- | --- |
| `CourseImportDraft` | **EXTEND** | Retain `sourceDocumentId/sourceFilename` as anchor compatibility fields; add ordered `sources[]`. |
| `CourseOutlineLesson` and `LessonDraftSection` | **EXTEND** | Add source-qualified/canonical references for new multi-source data. Continue parsing legacy `sourceChunkIndexes` and `citationChunkIndexes` for existing single-source rows. |
| generation request chunk types | **CHANGE** | Replace ambiguous application-level `chunkIndex` with `sourceRef` plus a source label. The legacy one-source wrapper may translate its indexes into refs without changing callers. |
| `CourseImportLessonDraft.citations` | **EXTEND** | Add source document/title/domain and canonical chunk identity while retaining `chunkIndex` for display compatibility. |
| `lesson-draft-provider.ts` schemas, prompts, `parseCourseOutline`, `parseDraft` | **CHANGE** | Ask for `sourceRefs`/`citationSourceRefs`, validate against the request-local set, and include source labels in `<source_chunk>` context. Keep a legacy parser/wrapper for old tests/callers where practical. |
| one-chunk canonicalization | **REUSE** | It remains safe within one request, but canonicalize to the sole `sourceRef`, not a per-document index. |
| provider selection, endpoint/model, JSON-schema response mode, timeout/error mapping | **KEEP** | Multi-source support does not require changing providers. |

Do not rewrite historical JSON revision payloads. Readers should normalize both shapes into one internal representation. New multi-source writes should use the unambiguous shape; legacy single-source calls may continue to emit the old fields until all active callers migrate. The authoritative provenance remains the relational citation/source rows.

## Web research impact

Only selected pages become sources. Search candidates are not course evidence until fetched, snapshotted, extracted, and attached.

| New/reused component | Class | Minimal responsibility |
| --- | --- | --- |
| topic validation and query planner | **EXTEND** | Add this capability to the existing content-pipeline service boundary. Normalize a bounded topic and create a small set of focused search queries. A deterministic template is sufficient initially; an AI query planner is optional and should use separate rate-limit scope if added. |
| `WebSearchProvider` interface and one server adapter | **EXTEND** | Add a focused provider boundary that returns normalized title, URL, snippet, and provider ranking. Keep vendor payloads out of UI/domain types. |
| result normalizer/ranker | **EXTEND** | Add URL canonicalization/deduplication, unsupported-scheme rejection, and simple authority/relevance scoring. Scores are review aids, not automatic authorization to ingest. |
| source-review state in `ContentPipelineAdmin` | **EXTEND** | Select/unselect, Add URL, optional file, and show per-source state. Keep candidates in client/request state before ingestion. |
| safe web fetcher | **EXTEND** | Add a server-only ingestion helper. Allow only HTTP(S); resolve and block loopback/private/link-local destinations; revalidate every redirect; enforce timeout, redirect, byte, and content-type limits; do not forward cookies/credentials; record final canonical URL. |
| HTML main-content extractor | **EXTEND** | Add a web-specific extraction adapter that removes scripts/navigation/noise, preserves title and readable text, and treats page content as untrusted data. A small dedicated dependency may be justified; current production dependencies do not include an HTML readability parser. |
| immutable snapshot writer | **EXTEND** | Add snapshot orchestration, then reuse the private bucket, `createSourceDocument`, metadata creation, extraction, and chunk replacement. Serialize extracted page title/text to deterministic TXT/MD and never regenerate citations from a later live page. |
| `chunkDocumentText` | **REUSE** | It already creates bounded, hashed, per-document chunks. No embedding or vector layer is required. |
| embeddings, vector store, semantic retrieval, crawler/site graph | **DO NOT TOUCH** | Do not add these systems: the current explicit outline-to-chunk mapping supplies the needed retrieval boundary. |

Search-provider terms, page-fetch policy, robots/copyright requirements, and retention need product/security confirmation before implementation, but they do not require a broader Course architecture.

## Database impact

Use `docs/ai-course-database-audit.md` as the database design. Application implementation depends on these additive pieces:

- `course_import_job_sources(job_id, source_document_id, source_order, ingestion_method, relevance_score, ...)` with backfill and transitional uniqueness/lifecycle rules;
- `source_document_metadata(source_document_id, source_type, ingestion_method, source_url, canonical_url, title, domain, authority_score, fetched_at, ...)`;
- dual-write/backfill compatibility for the anchor source;
- job-centric initialization/attachment, outline persistence, citation persistence, and publication ownership validation;
- unchanged immutable outline/content/publication tables.

Classification remains:

- **EXTEND:** `source_documents`, `course_import_jobs` through companion/bridge relationships.
- **REUSE:** `document_chunks`, `course_outline_lesson_sources`, `lesson_content_draft_citations` without structural changes.
- **DO NOT TOUCH:** `course_drafts`, `course_outline_lessons`, outline objectives, `lesson_content_drafts`, `course_import_publications`, `course_import_lesson_publications`, and final Course/chapter/Lesson tables.
- **CHANGE:** `initialize_course_import_job`, `create_course_outline`, `persist_lesson_content_draft`, and `publish_course_import_job` through backward-compatible overload/wrapper or additive job-centric RPCs.
- **KEEP:** `prepare_course_lesson_generation`.

The application change should not ship before the bridge backfill and compatibility RPCs. Conversely, the additive migration can ship first without changing current PDF behavior.

## Compatibility matrix

| Existing behavior/data | Preservation strategy |
| --- | --- |
| PDF/DOCX/TXT/MD-only import | Keep current upload, extract, and source-scoped outline endpoint. Backfill/dual-write its anchor source into the bridge. Its old chunk indexes translate deterministically because only one source is attached. |
| currently unpublished import jobs | Backfill the current source as source order `0`. Continue reading legacy fields; expose `sources[]` additively. Do not alter current outline/content revisions. New sources may attach only before an approved outline/content dependency unless a new revision is explicitly generated. |
| existing published Courses | Do not rewrite Course/chapter/Lesson/publication rows. Backfill provenance only. Published jobs remain read-only and publish RPC idempotency continues returning the existing publication. |
| existing outline citations | Preserve `course_outline_lesson_sources.document_chunk_id`. Join through the chunk to show source provenance; no remapping is required. |
| existing lesson citations | Preserve `lesson_content_draft_citations.document_chunk_id` and historical section JSON. Normalize legacy index fields when reading; relational citation rows remain authoritative. |
| outline revisions | Every update/regeneration still inserts a new immutable `course_drafts` revision. Source changes after an outline exists require an explicit new revision; never mutate old references. |
| Continue behavior | Keep the existing button and `prepare_course_lesson_generation`; it approves the current outline revision and begins lesson generation. |
| publication | Keep one database transaction and idempotency markers. Extend only source archival to all attached documents. |
| Exercise flow | No route, table, service, provider, prompt, moderation UI, or learner behavior changes. It continues from published Lessons. |

## Recommended implementation phases

### Phase 1 — Additive database compatibility and job-wide repository reads

Minimal files: one new migration, `content-pipeline-repository.ts`, repository/migration tests, and additive types.

- Add metadata/bridge tables, backfill, dual-write, and constrained job-centric RPCs as specified by the database audit.
- Extend queue reads with `sources[]`; preserve anchor fields and all legacy calls.
- Add job-wide context and source attachment repository helpers, but do not expose the new UI yet.

Independent tests:

- migration tests prove every old job has exactly one ordered bridge row and no historical publication/revision row changes;
- repository tests prove cross-owner chunks cannot enter outline/citation persistence;
- legacy repository tests continue passing unchanged.

Browser/E2E acceptance: the existing file-only `reviews an outline...publishes a Course` Playwright scenario passes without route or fixture changes.

### Phase 2 — Multi-source provider boundary and generation services

Minimal files: `types/index.ts`, provider, Course-import repository/service functions, their unit tests, and the job-scoped outline POST handler.

- Add source-qualified internal chunks and request-local provider refs.
- Add job-scoped initial outline generation; extend update/regenerate and lesson generation to job-wide sources.
- Preserve the source-scoped legacy wrapper and Continue semantics.

Independent tests:

- two documents both having chunk `0` map to distinct provider refs and canonical database IDs;
- foreign/unattached refs are rejected for outline and lesson citations;
- regeneration uses only the approved outline revision's attached chunks;
- publication remains idempotent and atomic.

Browser/E2E acceptance: a mocked job with two attached sources reaches the unchanged outline editor, edits/reorders lessons, Continues, reviews content with source-qualified citations, and publishes; the legacy E2E remains green.

### Phase 3 — Optional multi-file/manual-URL source review

Minimal files: `ContentPipelineAdmin`, content-source route/service extensions, URL-ingestion route, attach/detach routes, new fetch/extract helpers, and focused tests.

- Add source list, Add URL, optional file, selection/removal, ingestion status, and job-scoped Continue-to-outline.
- Implement safe page fetch, immutable snapshot, metadata, extraction, and attachment.
- Keep the current upload-first CTA/path available behind the same screen.

Independent tests:

- SSRF/redirect/content-type/size/timeout controls;
- snapshot immutability and metadata persistence;
- attach/detach ownership and referenced-source guards;
- file-only submission remains byte-for-byte contract-compatible.

Browser/E2E acceptance: admin adds a manual URL plus an uploaded document, removes one before generation, sees the remaining sources, enters the existing outline editor, and completes publication; a failed URL remains removable/retryable without losing successful sources.

### Phase 4 — Topic research and ranked discovery

Minimal files: research route, search provider/normalizer/ranker, topic/source-review UI additions, configuration validation, and focused tests.

- Add topic input, Research action, query generation, normalized ranked candidates, selection, and ingestion of selected results.
- Keep unselected results out of the database. Do not add embeddings, vector search, or a crawler.
- Preserve manual URL and file-only fallbacks if the provider is unavailable.

Independent tests:

- provider response normalization, URL deduplication, deterministic ranking/ties, validation, rate-limit/error mapping, and no database writes during research;
- selection causes fetch/snapshot only for selected results;
- prompts continue treating all source text as untrusted.

Browser/E2E acceptance: starting with only a topic produces ranked results; select/unselect works by keyboard; Add URL and optional upload coexist; only selected sources are ingested; Continue opens the existing outline editor; full content review/publication completes; accessibility scan has no serious violations.

### Phase 5 — Compatibility hardening and rollout

Minimal files: existing unit/E2E suites, observability/error-code mapping, and documentation. Avoid feature refactors.

- Run backfill verification against production-like data and exercise legacy/multi-source paths side by side.
- Roll out new UI after bridge/RPC/service compatibility is deployed; keep legacy route until real jobs demonstrate stable behavior.
- Monitor search/fetch failures, source attachment errors, invalid AI refs, revision conflicts, and publication retries.

Browser/E2E acceptance: legacy file-only, existing-unpublished fixture, topic/multi-source, publication retry, and published learner/Exercise smoke flows all pass in the same build.

## CURRENT FLOW TO KEEP

- **KEEP** admin route/auth shell and the current active Course-import queue.
- **REUSE** private upload, safe document extraction, hashed chunking, and source status/error handling.
- **KEEP** immutable `course_drafts` outline revisions and the existing outline editor's add/remove/reorder/edit behavior.
- **KEEP** Continue as outline approval plus lesson generation.
- **KEEP** immutable lesson-content revisions, content editing/review, relational citations, and source quotes.
- **KEEP** atomic/idempotent `publish_course_import_job` transaction and existing published Course/chapter/Lesson rows.
- **DO NOT TOUCH** Exercise generation, moderation, publication, learner UI, auth, enrollment, and progress.

## NEW CAPABILITIES TO ADD

- Topic entry and stateless web research.
- Search query planning, one provider adapter, result normalization/deduplication/ranking.
- Source-review selection, manual URL, optional uploaded documents, and ingestion status.
- Safe server-side page fetch plus immutable private text/markdown snapshots.
- Ordered job-to-source attachment and metadata supplied by the database audit.
- Job-wide generation context and request-local source refs mapped to canonical `document_chunks.id`.
- Source-qualified citation display without changing relational citation architecture.

## FILES/FUNCTIONS TO CHANGE

| Area | Files/functions | Class |
| --- | --- | --- |
| Admin UI | `content-pipeline-admin.tsx`: `ContentPipelineAdmin`, `retryOutline`, `outlinePayload`, checkpoint helpers | **EXTEND** |
| Admin UI orchestration | `submitSource`, `runOutlineGeneration` | **CHANGE** |
| Types | `types/index.ts`: Course-import DTOs and citation display provenance | **EXTEND** |
| Generation types | `types/index.ts`: outline/section source references and provider request chunks | **CHANGE** |
| Provider | `lesson-draft-provider.ts`: schemas, source context, parsers/validators | **CHANGE** |
| Repository reads | `RawImportJob`, `loadCourseImports` | **EXTEND** |
| Repository source ownership | `getCourseGenerationContext`, `persistCourseOutline`, `getCourseImportChunks`, `persistCourseLessonContent` | **CHANGE** |
| Upload service | `uploadContentSource` | **EXTEND** |
| Generation services | `generateCourseOutline`, `updateCourseOutline`, `regenerateCourseOutline`, `generateCourseLessonContents`, `generateOneCourseLesson`, `regenerateCourseLessonContent` | **CHANGE** |
| Routes | upload route, queue GET, outline PATCH/regenerate, plus research/URL/attachment/job-outline handlers | **EXTEND** |
| Tests | component, provider, service, repository/migration, route, and Course-import Playwright cases | **EXTEND** |

Proposed files should stay within the existing feature and are all classified **EXTEND** because they extend the existing content pipeline: `src/features/content-pipeline/research/web-search-provider.ts`, `src/features/content-pipeline/research/rank-search-results.ts`, `src/features/content-pipeline/extraction/web-page-fetcher.ts`, `src/features/content-pipeline/extraction/web-page-extractor.ts`, and their tests. Proposed route files are `src/app/api/admin/course-research/route.ts`, `src/app/api/admin/content-sources/url/route.ts`, `src/app/api/admin/course-drafts/[id]/sources/route.ts`, and `src/app/api/admin/course-drafts/[id]/sources/[sourceDocumentId]/route.ts`; the existing `course-drafts/[id]/outline/route.ts` is **EXTEND** with POST. Exact helper names are implementation choices, not new architecture layers.

## FILES/FUNCTIONS TO KEEP

| Area | Files/functions | Class |
| --- | --- | --- |
| Admin shell | `src/app/(main)/admin/content/page.tsx` | **KEEP** |
| Outline UI | `editLesson`, `reorderLesson`, `removeLesson`; current editor layout | **REUSE** |
| Outline approval | Continue interaction and `generateContents` route contract | **KEEP** |
| Content UI | `ContentEditor`, save/review/publish interaction | **REUSE** |
| Extraction | `extractContentSource`, `extractDocumentText`, `chunkDocumentText` | **REUSE** |
| Repository readers/entry point | `listCourseImports`, `getCourseImport`, `publishCourseImport` | **REUSE** |
| Repository state/revision functions | `prepareCourseLessonGeneration`, `failCourseImport`, `reviseCourseLessonContent`, `reviewCourseImport` | **KEEP** |
| Queue service | `getCourseDraftQueue` | **REUSE** |
| Content/review services | `updateCourseLessonContent`, `submitCourseImportReview` | **KEEP** |
| Routes | lesson generation/regeneration, lesson draft PATCH, Course review/publication route contracts | **KEEP** |
| Database provenance | outline/citation join tables | **REUSE** |
| Database revisions/publication | outline/content revision tables, publication tables, final curriculum tables | **DO NOT TOUCH** |
| Unrelated domains | auth, enrollment, learner progress/UI, Exercises and moderation | **DO NOT TOUCH** |

## NEW API SURFACES

- `POST /api/admin/course-research` — topic to ranked candidate results; no persistence.
- `POST /api/admin/content-sources/url` — validate/fetch/snapshot/extract a selected or manual page and optionally initialize/attach it.
- `POST /api/admin/course-drafts/:id/sources` — attach an already ingested source.
- `DELETE /api/admin/course-drafts/:id/sources/:sourceDocumentId` — detach an unreferenced source before approval.
- `POST /api/admin/course-drafts/:id/outline` — initial job-wide outline generation.

Existing source upload/extract, queue, outline PATCH/regenerate, lesson generation/regeneration, content edit, and review routes remain in place.

## COMPATIBILITY STRATEGY

Use expand-and-contract without the contract step in this project phase: additive tables/RPCs/types first, backfill and dual-write, job-wide readers second, new UI last. Retain singular anchor fields and source-scoped generation as compatibility adapters. Normalize old and new reference shapes on read, but persist new multi-source provenance through canonical chunk foreign keys. Never rewrite historical outline/content JSON, publication rows, or final Course data. Keep the legacy PDF browser scenario as a permanent regression gate until a separately approved cleanup proves every active client has migrated.

## IMPLEMENTATION PHASES

1. Additive database bridge/metadata, backfill, compatibility RPCs, and job-wide repository reads.
2. Source-qualified provider boundary and multi-source outline/lesson service internals.
3. Manual URL, optional upload, source review, snapshotting, and attach/detach UI/API.
4. Topic research, one search adapter, deterministic ranking, and selected-result ingestion.
5. Side-by-side compatibility hardening, production-like backfill verification, observability, and staged rollout.

Each phase is independently testable and retains the legacy path; detailed unit and browser acceptance criteria are specified above.

## HIGH-RISK REGRESSIONS

- **Chunk identity collision:** treating per-document chunk `0` as globally unique can cite or teach from the wrong source. Map request-local refs to canonical chunk IDs server-side.
- **Cross-job provenance:** accepting arbitrary client/AI chunk IDs can attach another admin's or job's source. Validate every chunk through `course_import_job_sources` in the database transaction.
- **Revision mutation:** changing attached sources or references in place would invalidate immutable outline/content history. Source changes must produce explicit new revisions and old rows must remain readable.
- **Legacy anchor drift:** bridge and `course_import_jobs.source_document_id` can diverge. Backfill, dual-write, deterministic source order, and invariant tests are required.
- **Publication partial failure:** moving source archival outside `publish_course_import_job` would weaken atomicity. Archive all attached sources inside the existing idempotent transaction.
- **SSRF and redirect bypass:** URL ingestion can reach private services unless DNS resolution and every redirect hop are validated with strict limits.
- **Mutable web evidence:** citing live URLs without snapshots makes reviews irreproducible. Generate only from immutable stored artifacts.
- **Prompt injection:** discovered pages are untrusted. Preserve and strengthen the current provider instruction boundary; never execute page instructions or expose secrets/tools to source content.
- **UI state loss/duplicate jobs:** retrying ingestion or old session checkpoints can create duplicate source/job rows. Version checkpoints and make initialization/attachment idempotent.
- **Premature job creation:** a topic-only job cannot satisfy the current non-null anchor. Keep research pre-import until the first source is materialized.
- **Unbounded provider context:** combining all chunks can exceed the current 80,000-character selection strategy or bias early sources. Apply a deterministic, source-aware budget while retaining every outline lesson's explicit citations; do not add vector infrastructure by default.
- **Exercise/learner regression:** publication output is consumed by existing Exercise and learner flows. Keep final Course/chapter/Lesson contracts unchanged and run their existing browser smoke tests.
