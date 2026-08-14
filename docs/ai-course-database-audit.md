# AI Course multi-source database audit

## Feature 002 persistence addendum (2026-08-14)

Migration 030 has since implemented the metadata and job-source bridge described by this audit.
Feature 002 changes only the upstream web acquisition provider: normalized Tavily Markdown is
serialized into the same private immutable snapshot and reuses `source_documents`,
`source_document_metadata`, `document_chunks`, `course_import_jobs`, and
`course_import_job_sources`. No Tavily response, request ID, usage value, provider session, column,
table, enum, RLS policy, RPC, or migration is added. File/PDF persistence is unchanged.

## Scope and evidence

This is a read-only design audit of the checked-out implementation. It covers `.ua/`,
`docs/ai-course-current-flow.md`, migrations `001` through `029`, and the current
content-pipeline repository, service, provider, types, and RPC implementations. No database
or application change is made here.

The `.ua/meta.json` graph was generated for commit
`8d21221a11c08be9e260cd0a9bd31330c1120555`, while the checked-out `HEAD` during this audit
was `7b5a1b5ce6c7d9daba8a4e55c14c7c75a33d2832`. The graph was therefore used only as an
index. Every conclusion below was checked against the files currently on disk.

The desired evolution is deliberately narrow:

```text
current: source_documents 1 -- 0..1 course_import_jobs
target:  course_import_jobs 1 -- 1..n source_documents
```

The normalized outline revisions, per-Lesson generation and revision model, citation rows,
review state machine, and atomic publication transaction remain the architecture of record.
Legacy migrations `015`, `022`, and `023` remain compatibility history and are not a basis
for redesigning the active Course-import flow established by migration `025`.

## Executive conclusion

`course_import_job_sources` is the correct minimal relationship table for the active schema,
but it is not sufficient by itself. The existing trigger creates one job for every inserted
`source_documents` row, the job has a non-null unique `source_document_id`, chunk indexes are
only unique within a document, and several repository/service paths load chunks through that
single ID. A safe rollout must therefore:

1. add and backfill the bridge while retaining `course_import_jobs.source_document_id` as a
   legacy/primary-source anchor;
2. dual-write the bridge for every legacy single-source job;
3. introduce an explicit job-centric path for creating or attaching secondary sources so the
   source insert trigger does not create unwanted standalone jobs;
4. address cross-document `chunk_index` collisions in application/RPC input while continuing
   to persist canonical `document_chunks.id` foreign keys; and
5. archive every source linked to the job inside the existing publication transaction.

No publication mapping, official curriculum, learner, exercise, enrollment, or progress
schema needs to change.

## Classification legend

- **KEEP**: retain the table/function and its current contract; ordinary queries may expand.
- **REUSE**: the existing shape already models multi-source data, but callers must use it in a
  broader job-scoped context.
- **EXTEND**: preserve the object and add companion metadata or additive behavior.
- **CHANGE**: current semantics encode a single-source assumption and must be revised or
  wrapped compatibly.
- **DO NOT TOUCH**: changing it is unnecessary and would put a protected invariant at risk.

## Table audit

| Table | Classification | Current invariant and multi-source finding |
|---|---|---|
| `source_documents` | **EXTEND** | Migration `015` models a private uploaded object: non-null uploader, filename, fixed `lesson-sources` bucket, unique storage path, supported upload MIME, positive size, optional SHA-256, extraction status, and extracted character count. Keep these upload/snapshot invariants. Add source provenance through a companion metadata table rather than weakening existing columns. |
| `document_chunks` | **REUSE** | Each row already belongs to exactly one `source_document_id`; `(source_document_id, chunk_index)` is unique and citations use the globally unique chunk PK. It can hold chunks for files and materialized web pages unchanged. A bare `chunk_index` is not job-global, so callers must stop using it as the persisted multi-source identity. |
| `course_import_jobs` | **CHANGE** | `source_document_id bigint not null unique` and the insert trigger make the active relation one source to at most one job. Retain this column initially as the legacy/primary anchor, add the bridge, and move new reads/ownership validation to the bridge. Do not drop or null the column in the compatibility phase. |
| `course_drafts` | **KEEP** | Immutable `(job_id, revision)` Course metadata is already job-scoped, not source-scoped. It must remain unchanged to preserve outline revision history. |
| `course_outline_lessons` | **KEEP** | Lesson identity, order, title, and summary belong to a Course draft revision. There is no source-document FK and no single-source assumption in the table. |
| `course_outline_lesson_sources` | **REUSE** | The table already maps an outline Lesson directly to `document_chunks.id`, so chunks from different documents can coexist. Its PK and source ordering remain valid. Ownership must continue to be enforced by the write RPC against the job bridge. |
| `lesson_content_drafts` | **KEEP** | Content revisions are owned by an outline Lesson and contain no source-document FK. Keep the immutable revision behavior and current latest-ready selection. |
| `lesson_content_draft_citations` | **REUSE** | Citations already point to globally unique `document_chunks.id` and remain valid across source types/documents. Keep the unique `(draft, section, chunk)` architecture. Change only RPC validation and presentation of source references. |
| `course_import_publications` | **DO NOT TOUCH** | This is the idempotent job-to-official Course/Chapter/outline-revision publication record. Multi-source provenance is reachable through `job_id -> course_import_job_sources`; duplicating source IDs here would denormalize and weaken the publication boundary. |
| `course_import_lesson_publications` | **DO NOT TOUCH** | It preserves the exact outline Lesson, content revision, and official Lesson published. It is source-agnostic and is also used to recover objectives for Exercise generation. |

### Important constraint observation

Neither `course_outline_lesson_sources` nor `lesson_content_draft_citations` has a declarative
constraint proving that its chunk belongs to the same import job. The active implementation
correctly enforces that ownership inside `create_course_outline` and
`persist_lesson_content_draft`. Multi-source support must replace “chunk belongs to
`job.source_document_id`” with “chunk's source belongs to `course_import_job_sources` for this
job”; it must not remove server-side ownership validation.

## RPC audit

| RPC | Classification | Evidence and required direction |
|---|---|---|
| `initialize_course_import_job` | **CHANGE** | The trigger inserts one job per new source and relies on conflict at the unique singular FK. It must dual-write the bridge for legacy uploads. A new explicit job-centric initialization/attachment path is also required for secondary sources; otherwise every secondary insert first creates an unwanted standalone job. |
| `create_course_outline` | **CHANGE** | It accepts `p_source_document_id`, locks one source, finds/creates the job through the singular FK, resolves every outline source by that document's `chunk_index`, and changes only that source's status. The job-centric path must lock the job, validate all referenced chunk IDs against bridge membership, and update relevant source states without changing immutable revision inserts. Keep a legacy single-source wrapper/contract during rollout. |
| `prepare_course_lesson_generation` | **DO NOT TOUCH** | This function is already job-scoped. It locks the job, validates the current immutable draft revision, stores the approved revision, and transitions to `generating_content`. It never reads `source_document_id` or chunks. Source readiness should be validated before outline persistence or by a separate job-source guard, not by redesigning this approval checkpoint. |
| `persist_lesson_content_draft` | **CHANGE** | The citation insert explicitly joins `document_chunks` through `chunk.source_document_id = job.source_document_id` and then matches a bare chunk index. Replace that ownership predicate with bridge membership and resolve an unambiguous chunk reference. Preserve the allowed-outline-source join, per-section completeness check, revision insert, and transition to `content_review`. |
| `publish_course_import_job` | **CHANGE** | The current migration `027` implementation archives only `v_job.source_document_id` and returns singular `sourceDocumentId`. Preserve the entire transaction and idempotent publication mappings, but archive all bridge-linked sources in the same transaction. Keep the singular response field during compatibility and add `sourceDocumentIds` additively if the API needs the complete set. |

The changes to `create_course_outline`, `persist_lesson_content_draft`, and publication should
be limited to source resolution/validation and source-state updates. Their locking,
authorization, revision, completeness, audit, and atomic rollback behavior must remain.

## Explicit answers

### 1. Can `source_documents` be reused for uploaded files, manual URLs, and discovered pages?

- **Uploaded PDF/DOCX/TXT/MD: yes, unchanged.** These are exactly what the current storage,
  MIME, size, extraction, and hash constraints model.
- **Manually added URL: not as a bare URL row.** It can be reused if the server fetches the
  page, stores a private immutable TXT/Markdown snapshot in `lesson-sources`, and inserts a
  normal `source_documents` row for that snapshot.
- **Discovered web page: the same qualified yes.** Discovery provenance belongs in companion
  metadata; extracted content still belongs in `source_documents`/`document_chunks` after a
  private snapshot is materialized.

This snapshot rule is valuable, not merely a workaround: later outline revisions, citations,
review, and publication remain reproducible even if the live page changes or disappears.

### 2. Smallest backward-compatible extension

Do not make `storage_bucket`, `storage_path`, `mime_type`, or `size_bytes` nullable and do not
relax the fixed bucket/upload MIME checks. Add a one-to-one provenance table:

```sql
source_document_metadata
  source_document_id bigint primary key -> source_documents(id) on delete cascade
  source_type text not null              -- file | web_page
  ingestion_method text not null         -- uploaded | manual_url | discovered
  source_url text null
  title text null
  domain text null
  authority_score numeric null           -- bounded, e.g. 0..1
  discovered_from_source_document_id bigint null -> source_documents(id) on delete set null
  created_at timestamptz not null
```

Existing rows can be backfilled as `source_type = 'file'`,
`ingestion_method = 'uploaded'`; their title may default to `original_filename`. Web rows use
their canonical URL/title/domain while the base row points to the stored snapshot. Store the
job-relative `relevance_score` on the job-source bridge, not in global source metadata.

If reuse of one source across multiple jobs is introduced later, this separation remains
correct: authority is source-level; relevance is job-level.

### 3. Safest replacement for `course_import_jobs.source_document_id`

Use an additive bridge, but do not replace the singular column immediately:

```sql
course_import_job_sources
  job_id bigint not null -> course_import_jobs(id) on delete cascade
  source_document_id bigint not null -> source_documents(id) on delete restrict
  source_order integer not null check (source_order >= 0)
  relevance_score numeric null check (relevance_score between 0 and 1)
  added_at timestamptz not null
  primary key (job_id, source_document_id)
  unique (job_id, source_order)
  unique (source_document_id) -- recommended in the first release
```

The final unique constraint is intentional for the first release. `source_documents.status`
still carries pipeline lifecycle states (`generating`, `ready_for_review`, `archived`), so
allowing one source in concurrent jobs would make ownership and status ambiguous. Remove that
restriction only after source processing state is separated from job state.

Backfill one bridge row at `source_order = 0` from every existing
`course_import_jobs.source_document_id`. Continue writing the singular column as the primary
source/legacy response identity. All new multi-source reads and validation use the bridge.
Dropping, nulling, or renaming the old column is unnecessary for the requested evolution.

The trigger issue must be solved at the same time. The safest staged approach is:

1. make the existing trigger create the single-source job and its order-0 bridge row;
2. add an explicit active-Admin RPC that creates a job from a validated set of already
   extracted sources or attaches a source to an unpublished job;
3. deploy callers that use explicit initialization for multi-source imports; and
4. only after callers are migrated, stop automatic job creation for secondary-source inserts
   while retaining the legacy single-file path.

An additive `initialize_import_job boolean not null default true` flag on
`source_documents` is a possible transitional discriminator: existing inserts keep today's
behavior, while new multi-source ingestion sets it false for secondary sources and attaches
them transactionally. It should be considered migration plumbing, not source provenance.

### 4. Can `document_chunks` represent chunks from all source types?

Yes. The table stores normalized text, offsets, a content hash, and the owning source. It is
already source-type neutral. Web extraction must produce the same normalized text and stable
offset/hash contract. No new chunk table, polymorphic owner, URL column, or vector schema is
needed.

### 5. Can `course_outline_lesson_sources` continue unchanged?

Yes at the schema level. It references `document_chunks.id`, not a document-local index, so
one Lesson may already point to chunks from many source documents. Its ordering and PK remain
correct. The write RPC must validate that every referenced chunk's `source_document_id` is in
the job bridge.

### 6. Which services currently assume one source?

The active assumptions are concentrated in these paths:

- Repository `getCourseGenerationContext(sourceDocumentId)` loads one document and only its
  chunks.
- Repository `loadCourseImports()` joins `course_import_jobs` directly to one
  `source_documents` row and maps singular `sourceDocumentId`/`sourceFilename`.
- Repository `getCourseImportChunks(sourceDocumentId)` filters one document.
- Repository `persistCourseOutline()` calls the source-ID RPC contract.
- Service `generateCourseOutline()` starts from one source, transitions one source status,
  supplies one document title, and selects a leading 80,000-character prefix from one chunk
  list.
- Service `updateCourseOutline()` and `regenerateCourseOutline()` validate/reload through the
  singular source.
- Service `generateCourseLessonContents()` and
  `regenerateCourseLessonContent()` load all Lesson chunks through
  `job.sourceDocumentId`.
- Service `generateOneCourseLesson()` filters chunks by document-local
  `sourceChunkIndexes` and sends `job.sourceFilename` as the only source label.
- Provider request/validation and the shared types use bare integer `chunkIndex`,
  `sourceChunkIndexes`, and `citationChunkIndexes`. Since each document starts at index zero,
  these values collide when lists are simply concatenated.
- The Admin component and checkpoint also display/store singular source identity and edit bare
  source chunk indexes. These are UI/API follow-on changes, even though the core citation tables
  do not change.

The historical `generateLessonDraft`, `generateCourseDraft`, `lesson_drafts`, and migration
`023` batch services are compatibility paths. They should remain single-source rather than be
expanded into a second competing multi-source architecture.

### 7. Which database rules enforce single-source ownership?

- `course_import_jobs.source_document_id` is `not null`, `unique`, and an FK to
  `source_documents`.
- `initialize_course_import_job_after_source` runs after every source insert; its function
  inserts one job and uses conflict on the singular source ID.
- `create_course_outline` locks exactly `p_source_document_id`, looks up/creates the job by
  that column, resolves source indexes only within that source, and updates only that source.
- `persist_lesson_content_draft` joins chunks with
  `chunk.source_document_id = job.source_document_id`.
- `publish_course_import_job` archives and returns only `v_job.source_document_id`.
- `(source_document_id, chunk_index)` on `document_chunks` proves that `chunk_index` is only
  document-local, not unique within an import job.

The source table's own extraction/status constraints do not enforce job ownership, but their
job-like lifecycle makes exclusive bridge membership the safe first-release rule.

### 8. Minimal web-research metadata

Use `source_document_metadata` plus one job-relative field on
`course_import_job_sources`:

| Requirement | Location |
|---|---|
| source type (`file`, `web_page`) | `source_document_metadata.source_type` |
| original/canonical URL | `source_document_metadata.source_url` |
| title | `source_document_metadata.title` |
| domain | `source_document_metadata.domain` |
| uploaded/manual/discovered origin | `source_document_metadata.ingestion_method` |
| discovery lineage | optional `discovered_from_source_document_id` |
| authority score | `source_document_metadata.authority_score` |
| relevance score | `course_import_job_sources.relevance_score` |

Prefer bounded numeric scores and nullable values when no scorer has run. Store score model,
reasoning blobs, crawl logs, or search-result payloads only when an actual product requirement
exists; they are not required for this evolution.

### 9. Tables that must remain untouched

At minimum, do not alter:

- `course_import_publications`;
- `course_import_lesson_publications`;
- official `courses`, `chapters`, and `lessons` ownership/publication columns;
- `course_drafts`, `course_draft_objectives`, `course_outline_lessons`, and
  `course_outline_lesson_objectives` revision structure;
- learner/auth/exercise tables, including `profiles`, `course_enrollments`, `user_progress`,
  `submissions`, `generated_exercises`, `exercise_reviews`, `exercises`,
  `exercise_options`, and `exercise_solutions`; and
- legacy `lesson_drafts`, `lesson_draft_citations`, and `lesson_draft_publications` unless a
  separate compatibility defect requires a change.

`course_outline_lesson_sources`, `lesson_content_drafts`, and
`lesson_content_draft_citations` also need no schema alteration; they are listed as REUSE/KEEP
because the active services will continue using them with broader source context.

### 10. Backward-compatible migration path

1. **Add metadata and bridge only.** Enable RLS, grant select only as narrowly as the other
   Course-import tables, and route writes through active-Admin security-definer RPCs.
2. **Backfill without deleting anything.** Insert exactly one bridge row per existing job from
   `course_import_jobs.source_document_id`; insert uploaded-file metadata for existing source
   rows. Validate row counts and order-0 anchor equality.
3. **Dual-write legacy initialization.** Update `initialize_course_import_job` so current PDF
   uploads still produce one job and one bridge row atomically. Keep the singular FK populated.
4. **Add explicit multi-source initialization/attachment.** It must lock the job/sources,
   reject published/rejected jobs, prevent cross-job source reuse in the first release, assign
   deterministic source order, and avoid the insert-trigger race for secondary sources.
5. **Add job-scoped repository reads.** Return ordered source descriptors and chunks with both
   `documentChunkId` and source identity. Keep singular fields as compatibility aliases to the
   order-0 source.
6. **Use unambiguous provider references.** Flatten selected chunks into deterministic
   request-local references, retain a server-side mapping to `document_chunks.id`, and persist
   chunk IDs after strict membership validation. Do not resolve a multi-source citation from a
   bare document-local index.
7. **Change outline persistence compatibly.** Keep the existing single-source RPC as a wrapper
   for old callers; add a job-centric RPC/signature for multi-source payloads. Both paths insert
   the same immutable `course_drafts`, outline Lessons, objectives, and Lesson-source rows.
8. **Change Lesson citation persistence.** Validate cited chunks against both the outline
   Lesson's allowed chunk set and job-source membership. Keep citation rows and completeness
   checks unchanged.
9. **Extend publication in place.** Preserve migration `027`'s function body/transaction and
   publication inserts; replace singular source archival with a set-based update through the
   bridge. Preserve idempotent return behavior and add plural source IDs only additively.
10. **Cut over reads, then evaluate the anchor later.** After production data and callers use
    the bridge, the old singular column may remain indefinitely. Removing it is not required
    and should be a separate migration with its own compatibility proof.

For existing published jobs, backfill only the bridge/metadata. Do not republish them, rewrite
outline/content revisions, recreate publication mappings, or change archived source state.

## CURRENT DB MODEL

```text
source_documents (uploaded storage object + processing state)
  1
  |  unique course_import_jobs.source_document_id
  0..1
course_import_jobs (state + current/approved outline revision)
  1 ──< course_drafts (immutable revision)
           └──< course_outline_lessons
                  ├──< course_outline_lesson_sources >── document_chunks ──> source_documents
                  └──< lesson_content_drafts
                         └──< lesson_content_draft_citations >── document_chunks
  1 ── 0..1 course_import_publications
           └──< course_import_lesson_publications
```

The normalized citation tables are already capable of crossing source-document boundaries;
job ownership and application reference formats are the limiting layers.

## TARGET MINIMAL DB MODEL

```text
source_documents ── 0..1 source_document_metadata
       ^
       | unique initially
course_import_job_sources (source_order, relevance_score)
       ^
       |
course_import_jobs
  ├── legacy source_document_id (retained, order-0 anchor)
  ├──< course_drafts ──< course_outline_lessons
  │                       ├──< course_outline_lesson_sources >── document_chunks
  │                       └──< lesson_content_drafts
  │                              └──< lesson_content_draft_citations >── document_chunks
  └── 0..1 course_import_publications ──< course_import_lesson_publications
```

Only two new tables are required for the minimal durable model. A transitional source flag or
explicit source-creation RPC may also be required to suppress automatic standalone-job
creation for secondary sources; this is an initialization concern, not a new content model.

## MIGRATION RISKS

| Risk | Severity | Mitigation |
|---|---|---|
| Secondary source insert creates an unwanted standalone job | High | Ship trigger dual-write and explicit multi-source initialization/attachment as one staged rollout; make attachment transactional. |
| Chunk index `0`, `1`, etc. collides across documents | High | Use request-local references mapped to `document_chunks.id`, or pass validated chunk IDs; never concatenate and persist bare document-local indexes. |
| A citation references a valid chunk from another job | High | Check `document_chunks.source_document_id` membership in `course_import_job_sources` inside both outline and content RPCs. |
| Publication archives only the primary source | Medium | Set-based archive of every bridge source inside the existing publication transaction. |
| One source is attached to two jobs while its status is shared | Medium | Add initial uniqueness on bridge `source_document_id`; revisit only after separating source processing state. |
| Old app/new DB deployment skew | Medium | Add tables/backfill first, dual-write second, deploy dual-read callers, then enable multi-source writes. Keep singular fields/RPC wrapper. |
| Provider context limit favors the first source | Medium | Select chunks deterministically with per-source quotas/ordering while preserving the 80,000-character cap and authority/relevance inputs. This is service policy, not schema. |
| Existing published provenance is accidentally rewritten | High | Backfill bridge only; do not update publication rows, Course/Lesson rows, revisions, or source status. |
| RLS/grants expose fetched web text | High | Treat snapshots/chunks exactly like uploaded private sources; active Admin read only and RPC-mediated writes. |

## RPCs TO CHANGE

- `initialize_course_import_job`: dual-write bridge and support a safe explicit multi-source
  initialization path.
- `create_course_outline`: add a job-centric, unambiguous chunk-reference path while preserving
  the legacy single-source contract.
- `persist_lesson_content_draft`: validate citations through job-source membership instead of
  `job.source_document_id`.
- `publish_course_import_job`: archive all linked sources and optionally return plural IDs,
  without changing its atomic publication work.

`prepare_course_lesson_generation` is **DO NOT TOUCH** for this change.

## SERVICES TO CHANGE

- Repository: job/source loading in `loadCourseImports`, `getCourseGenerationContext`,
  `getCourseImportChunks`, outline persistence parameters, and citation/source mapping.
- Service: `generateCourseOutline`, `updateCourseOutline`, `regenerateCourseOutline`,
  `generateCourseLessonContents`, `regenerateCourseLessonContent`, and
  `generateOneCourseLesson`.
- Provider/types: replace ambiguous bare chunk indexes in the multi-source path with mapped,
  job-scoped source references while retaining legacy single-source DTO compatibility.
- Admin/API presentation: expose ordered sources and source-qualified citations; retain
  singular source fields as order-0 aliases during migration.

Do not expand the legacy one-Lesson or migration `023` batch service paths.

## TABLES TO KEEP UNCHANGED

- `course_drafts`
- `course_draft_objectives`
- `course_outline_lessons`
- `course_outline_lesson_objectives`
- `course_outline_lesson_sources` (schema unchanged; reused)
- `lesson_content_drafts`
- `lesson_content_draft_citations` (schema unchanged; reused)
- `course_import_publications`
- `course_import_lesson_publications`
- `courses`, `chapters`, `lessons`
- all auth, enrollment, learner progress, submission, Exercise, and Exercise-solution tables
- legacy `lesson_drafts`, `lesson_draft_citations`, reviews, and publication mappings
