# Data Model: Tavily Web Ingestion

**Feature**: `002-tavily-web-ingestion`
**Database impact**: **No schema change**

## Scope

This change substitutes the acquisition provider before the existing immutable
snapshot boundary. It does not add or alter a table, column, enum, index, RPC,
RLS policy, Storage bucket, or generated database type. No migration is planned.

## Transient domain types

These types exist only inside the server-side provider/service boundary.

### WebContentExtractionRequest

| Field | Type | Rule |
|---|---|---|
| `sourceUrl` | string | Admin-selected URL after existing application URL validation; HTTP(S), no embedded credentials. |
| `capturedAt` | timestamp | Application-controlled capture time used for deterministic snapshot metadata. |

The Tavily adapter derives all policy fields internally. Callers cannot request
Advanced depth, filtered chunks, images, favicon, Crawl, or Research.

### WebContentExtractionResult

Provider-independent adapter output. It remains untrusted and transient.

| Field | Type | Rule |
|---|---|---|
| `sourceUrl` | string | One application-validated URL submitted in the request. |
| `canonicalUrlCandidate` | string | Required non-empty Tavily result URL; may differ by origin and is not trusted until application validation. |
| `rawMarkdown` | string | Full-page provider Markdown before application normalization. |
| `capturedAt` | timestamp | Application-controlled capture timestamp. |

### NormalizedWebExtractionResult

| Field | Type | Rule |
|---|---|---|
| `sourceUrl` | string | Original/Admin-selected URL retained for provenance. |
| `canonicalUrl` | string | Application-validated normalized differing provider candidate, or locally normalized selected URL when the returned result URL is the same and no distinct final URL exists; a missing/non-string result URL is malformed, not a fallback case. |
| `markdown` | string | Provider Markdown after deterministic application normalization, before snapshot metadata. |
| `normalizedCharacterCount` | integer | Must be 80 through 200,000 inclusive. |
| `capturedAt` | timestamp | Application-controlled capture timestamp. |

Provider request IDs, usage, raw responses, images, and favicon data are not part
of this result and are not passed into persistence.

### WebExtractionFailure

Internal discriminated categories cover configuration/authentication, quota,
timeout, upstream, failed result, invalid response, invalid canonical URL,
unusable content, excessive content, and chunkless content. These categories are
translated to stable provider-neutral application errors before reaching the
route or browser.

## Existing persisted entities reused

### source_documents

Stores the application-owned immutable Markdown snapshot in the existing
private Storage location and the existing source-document lifecycle state. The
stored object is the normalized snapshot, never the Tavily response object.

### source_document_metadata

Existing fields retain these meanings:

| Field | Value for this feature |
|---|---|
| `source_document_id` | Existing source identity. |
| `source_type` | `web_page`. |
| `ingestion_method` | Existing `manual_url` or `discovered` value. |
| `source_url` | Admin-selected/original URL, preserved even when canonical differs. |
| `canonical_url` | Validated normalized differing Tavily result URL, or locally normalized selected URL when Tavily returns that same URL and no distinct final URL exists; missing/non-string result URL fails before persistence. |
| `title` | Existing deterministic title input/fallback; Tavily Extract is not relied upon for a title field. |
| `domain` | Derived from `canonical_url`, not `source_url`. |
| `authority_score` | Existing caller-supplied/bounded value. |
| `discovered_from_source_document_id` | Existing Search-discovery provenance when applicable. |
| `fetched_at` | Application capture time for the immutable snapshot. |
| `created_at` | Existing database creation time. |

No provider name, Tavily request ID, credit usage, or raw JSON is persisted.

### document_chunks

Generated only from the stored application snapshot through the existing
chunking service. At least one usable chunk is required for a successful source.
The existing chunk schema, ordering, size rules, and source qualification remain
unchanged.

### course_import_job_sources

Continues to associate the staged source with a course-import job, source order,
and existing job/source state. The association and staged idempotency identity
do not change when Tavily returns a different valid canonical URL.

## State transitions

```text
staged attempt
  ├─ provider/config/network/content failure
  │    └─ recoverable source-specific failure (no invalid provenance persisted)
  └─ valid normalized extraction
       └─ immutable private snapshot + existing metadata
            ├─ chunk failure
            │    └─ recoverable failure; Retry reuses snapshot
            └─ >= 1 usable chunk
                 └─ existing extracted/ready-for-review lifecycle
```

Retry before snapshot materialization repeats the same Basic policy. Retry after
snapshot materialization never reacquires content. All generation and
publication states consume only stored snapshots/chunks.

## Validation invariants

1. `source_url` is never overwritten by provider provenance.
2. `canonical_url` is valid normalized HTTP(S) with no embedded credentials.
3. An invalid returned provider URL causes failure before metadata persistence.
4. Domain is derived only from `canonical_url`.
5. Normalized Markdown length is measured before snapshot front matter and is
   always 80–200,000 inclusive.
6. Success requires at least one usable chunk.
7. A staged idempotency identity is stable across retries and canonical changes.
8. A persisted snapshot is immutable and is the only evidence input to later
   generation.
9. Raw Tavily responses and credentials are never persisted.

## Migration and rollback

No migration, remote Supabase operation, schema regeneration, or data backfill
is required. Rollback does not mutate or delete stored records. Disabling new
web acquisition leaves existing snapshots, chunks, jobs, files, and courses
usable.
