# Data Model: Topic-Based Multi-Source Course Creation

**Feature**: `001-topic-course-research`

**Status**: Planning model only; no production migration is created by this command.

## Model Boundary

The target changes only source provenance and Course-import source ownership. The existing
outline, Lesson-content, citation, review, publication, official curriculum, learner, and
Exercise models remain structurally unchanged.

```text
source_documents 1 --- 0..1 source_document_metadata
       ^
       | unique in first release
course_import_job_sources (source_order, relevance_score)
       ^
       |
course_import_jobs
  |-- source_document_id (retained order-zero anchor)
  |--< course_drafts --< course_outline_lessons
  |                       |--< course_outline_lesson_sources >-- document_chunks
  |                       `--< lesson_content_drafts
  |                              `--< lesson_content_draft_citations >-- document_chunks
  `-- 0..1 course_import_publications --< course_import_lesson_publications
```

## Extended Entity: Source Document

The existing `source_documents` row remains the immutable private-storage artifact and extraction
lifecycle owner for both uploaded documents and materialized web snapshots.

### Existing fields retained

- identity, uploader, original filename;
- fixed private `lesson-sources` storage bucket and unique storage path;
- non-null MIME type and byte size;
- SHA-256, extraction status, extracted character count, error code, and timestamps.

### Additive transitional field

| Field | Meaning | Validation |
|---|---|---|
| `initialize_import_job` | Whether the legacy insert trigger creates an anchor Course-import job | Boolean, non-null, default `true` |

Legacy callers omit the field and retain current behavior. Explicit multi-source materialization
sets it to `false`. That insert materializes an unattached source attempt only; it cannot create a
Course-import job or `course_import_job_sources` row.

### Lifecycle

```text
uploaded -> extracting -> extracted -> generating -> ready_for_review -> archived
                  \-----------> failed ---------> retry where allowed
```

Web snapshots enter the same lifecycle as uploaded Markdown. The fetched live page is never the
generation source after the snapshot is stored.

For the new multi-source path, `failed` at this level means source acquisition or extraction
failed. Job-wide AI generation does not convert usable sources to ingestion failure or move them
to `generating`; transient generation state belongs to the Course-import job while attached
sources remain `extracted` or `ready_for_review`. Successful outline persistence marks the exact
generation set `ready_for_review` transactionally with the new immutable revision.
Provider/persistence failure records the job failure and leaves source states unchanged so a
process interruption cannot strand the same immutable evidence.

### Staged attempt versus Course evidence

For the new multi-source path, a `source_documents` row plus metadata may exist without a job or
bridge row. This is a **staged source attempt**, not Course evidence. It is eligible for promotion
into ordered-set initialization or later job-scoped attachment only when extraction has succeeded,
its status is `extracted`, its immutable private object is present, and it has at least one usable
`document_chunks` row.

Materialization, provenance persistence, and extraction therefore precede ownership. After the
current ingestion attempts settle, the application collects every usable source in deterministic
Admin selection order. One authorized initialization transaction receives that complete ordered
set and one workflow-level initialization key. It creates exactly one Course-import job, chooses
the first source as the legacy anchor, and creates all initial bridge rows atomically. There is no
new-path per-source operation that can initialize a job without a job ID. Sources that become
usable after initialization may be attached only to the existing job.

A failed or zero-chunk attempt has no bridge row, creates no job, and can be retried or removed
without a job. Retrying reuses the same source identity and immutable object where already stored.
The existing legacy file-only insert is excluded from this staged lifecycle and retains its
default immediate job initialization behavior.

## New Entity: Source Document Metadata

`source_document_metadata` provides source type and provenance without weakening private storage
constraints.

| Field | Meaning | Validation |
|---|---|---|
| `source_document_id` | Owning immutable source document | Primary key; cascade on source deletion |
| `source_type` | Artifact category | `file` or `web_page` |
| `ingestion_method` | How the source entered review | `uploaded`, `manual_url`, or `discovered` |
| `source_url` | Admin-selected/original URL | Required for web pages; null for uploaded files |
| `canonical_url` | Final normalized URL after safe redirects | Required for web pages; null for uploaded files |
| `title` | Display title | Required and non-blank for web pages; existing filename for backfilled files |
| `domain` | Canonical host for Admin provenance | Required for web pages; null for files |
| `authority_score` | Advisory source-level score | Nullable numeric from 0 through 1 |
| `discovered_from_source_document_id` | Optional discovery lineage | Nullable self-reference; set null on parent deletion |
| `fetched_at` | Time the immutable web evidence was captured | Required for web pages; null for uploaded files |
| `created_at` | Metadata creation time | Non-null |

### Validation rules

- `file` rows use `uploaded` ingestion, have no URL/fetch fields, and retain the existing filename.
- `web_page` rows use `manual_url` or `discovered` ingestion and require original URL, canonical
  URL, title, domain, and fetch time.
- Authority is advisory and Admin-only; null means no score was computed.
- Canonical URL is indexed for lookup but not globally unique because a later immutable snapshot
  or another Admin may legitimately capture the same page.

## New Entity: Course Import Job Source

`course_import_job_sources` is the authoritative ordered ownership relation between a Course
import and its evidence.

| Field | Meaning | Validation |
|---|---|---|
| `job_id` | Owning Course import | FK to job; cascade on job deletion |
| `source_document_id` | Attached immutable source | FK to source; restrict deletion |
| `source_order` | Stable order within the job | Integer >= 0; unique per job |
| `relevance_score` | Advisory topic/job-specific score | Nullable numeric from 0 through 1 |
| `added_at` | Attachment time | Non-null |

### Keys and invariants

- Primary key: `(job_id, source_document_id)`.
- First-release uniqueness: `source_document_id` belongs to at most one job.
- Each initialized job has one through eight bridge rows before outline generation; staged source
  attempts have none.
- `course_import_jobs.source_document_id` equals the bridge source at `source_order = 0`.
- A bridge source must already be successfully extracted and have at least one usable chunk at
  attachment time.
- Source orders are deterministic and contiguous after attach/detach.
- Removing the order-zero source reassigns the lowest remaining source as order zero and updates
  the legacy anchor in the same transaction.
- The last successfully attached evidence source cannot be detached. This guard does not apply to
  removal of an unattached staged or failed attempt.

### Initialization, attachment, and retry invariants

- Materialization is idempotent by Admin ownership plus ingestion idempotency key and returns the
  same staged source on retry.
- New-path initialization is job-centric, not source-centric. It requires one workflow
  `initialization_key` and the complete ordered set of 1..8 currently usable sources.
- The initialization transaction validates active-Admin ownership, uniqueness, `extracted`
  status, non-empty chunks, unattached membership, and the source count for every member before
  inserting anything. It then creates the job, uses order zero as the anchor, and creates every
  initial bridge row atomically.
- The nullable `course_import_jobs.initialization_key` is unique for new-path jobs. An immutable
  `initialization_fingerprint` records the canonical ordered source IDs and normalized initial
  source metadata. Duplicate or concurrent requests with the same key and fingerprint return the
  already-created job. The same key with a different fingerprint is an idempotency conflict and
  creates nothing, even if later attach/detach changed the current bridge set.
- Initialization locks the workflow key and all source rows in deterministic order. If another
  initialization key races for any of the same sources, first-release exclusive source ownership
  permits at most one transaction to attach them; the loser returns a conflict rather than a job.
- The API exposes no initializer for one source ID. Therefore concurrent A-only and B-only
  per-source initialization calls are not representable; A and B are submitted together under one
  workflow key. Even if two requests race, that key can identify at most one Course-import job.
- Once a job exists, later usable sources require the existing job ID and use only the attach
  operation; attach cannot initialize another job.
- If every selected attempt fails, no job or bridge row is created and no failed source can become
  `course_import_jobs.source_document_id`.

## Extended Entity: Course Import Job

No new mutable source-set version field is required. Add nullable `initialization_key` UUID with
uniqueness and nullable immutable `initialization_fingerprint` for new-path idempotent
initialization. Existing and legacy file-only jobs retain null for both, so their initialization
contract and historical rows are unchanged.

### Source-set state rules

- A Course import does not exist for the new path until the ordered usable-source set is
  initialized atomically.
- Before the first outline, attached sources may change while the job is `uploaded` or
  `processing`.
- If sources change while an outline exists and no outline is approved, historical draft rows
  remain unchanged, approval is null, and job status becomes `processing`.
- Job-scoped outline generation creates a new immutable revision and returns the job to
  `outline_review`.
- The successful outline-persistence transaction also moves the exact attached generation set to
  `ready_for_review`; a failed attempt leaves source states unchanged and changes no bridge row or
  historical revision.
- Continue keeps the existing `prepare_course_lesson_generation` semantics and sets
  `approved_outline_revision`.
- Any source attachment or detachment is rejected after Continue, including
  `generating_content`, `content_review`, `ready_to_publish`, `published`, and `rejected` states.

## Source-Qualified Application Models

These are application contracts, not new database tables.

### Course source descriptor

```text
CourseImportSource
  sourceDocumentId
  sourceOrder
  sourceType
  ingestionMethod
  title
  filename
  sourceUrl / canonicalUrl / domain
  authorityScore / relevanceScore
  status / errorCode
  chunkCount
```

### Course source chunk

```text
CourseSourceChunk
  documentChunkId       canonical server identity
  sourceDocumentId
  sourceOrder
  sourceTitle
  sourceUrl / domain
  chunkIndex            unique only within the source
  content               server-only
```

### Client/Admin source reference

```text
CourseSourceRef
  sourceDocumentId
  chunkIndex
```

The server resolves this pair only through the current job bridge. A matching chunk elsewhere is
not sufficient.

### Provider source reference

```text
ProviderSourceChunk
  sourceRef             dense integer unique within one request
  sourceLabel
  content
```

The request-local map from `sourceRef` to `CourseSourceChunk` never crosses the provider boundary.
Provider output is mapped to canonical chunk IDs before persistence.

## Preserved Entities

The following tables retain their current schema and revision/publication semantics:

- `document_chunks`;
- `course_drafts` and `course_draft_objectives`;
- `course_outline_lessons` and `course_outline_lesson_objectives`;
- `course_outline_lesson_sources`;
- `lesson_content_drafts` and `lesson_content_draft_citations`;
- `course_import_publications` and `course_import_lesson_publications`;
- `courses`, `chapters`, and `lessons`;
- all authentication, enrollment, progress, submission, Exercise, moderation, and solution tables.

New writes still store canonical `document_chunks.id` in the existing source/citation bridge
tables. Historical JSON using bare indexes remains readable; new multi-source DTOs normalize to
source-qualified refs while relational rows remain authoritative.

## Backfill and Compatibility Invariants

The additive migration must perform and verify these operations without rewriting history:

1. Insert one `source_document_metadata` row for every existing source as
   `file/uploaded`, using the original filename as title.
2. Insert one order-zero `course_import_job_sources` row from every existing
   `course_import_jobs.source_document_id`.
3. Assert every existing job has exactly one bridge row immediately after backfill.
4. Assert every anchor equals its order-zero bridge source.
5. Assert no Course draft, outline Lesson, Lesson-content draft, citation, review,
   publication, Course, Chapter, or Lesson row count/content changed.
6. Update legacy initialization to insert the job and order-zero bridge row atomically.
7. Preserve all existing RLS behavior and grant new mutations only through active-Admin RPCs.
8. Verify new-path materialization with `initialize_import_job=false` produces no job or bridge,
   failed extraction remains unattached, and only ordered-set initialization or later job-scoped
   attach can create ownership.
9. Verify duplicate/concurrent initialization for one workflow key and identical ordered source
   set yields one job row and one ordered bridge set; a mismatched replay yields no additional row.

## Publication Invariant

`publish_course_import_job` remains one transaction. Its only source-related extension is a
set-based archive of every currently attached bridge source. Its idempotent response retains
`sourceDocumentId` for the anchor and may add ordered `sourceDocumentIds`. Publication mappings
and official curriculum inserts remain unchanged.
