# Validation Quickstart: Topic-Based Multi-Source Course Creation

**Feature**: `001-topic-course-research`

**Purpose**: Runnable validation guide for implementation and rollout. This planning command does
not run these future feature tests or apply a production migration.

## Prerequisites

- Node.js 22.x and dependencies installed from the committed lockfile.
- Local/test Supabase configuration suitable for migration and RLS verification.
- Mock AI and web-search providers for deterministic tests; default automated tests must not call
  paid or live providers.
- A private `lesson-sources` bucket in the test environment.
- For a manual provider smoke test only: a server-only Brave Search credential and the existing
  server-only AI provider configuration.

Never place provider keys in `NEXT_PUBLIC_*`, fixtures, snapshots, reports, or committed files.

## Artifact References

- Feature behavior: [spec.md](spec.md)
- Technical sequence and rollout: [plan.md](plan.md)
- Source/provenance model: [data-model.md](data-model.md)
- HTTP contracts: [contracts/openapi.yaml](contracts/openapi.yaml)
- Technical decisions: [research.md](research.md)

## Phase 1: Additive Database Compatibility

### Focused checks

```powershell
npm run test -- src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts
npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
```

### Required evidence

1. A migration contract test detects both new tables, constraints, RLS, grants, backfill, and
   hardened RPCs.
2. Every legacy job receives exactly one bridge row at source order zero.
3. Every legacy anchor equals the order-zero bridge source.
4. The legacy source insert trigger creates one job and one bridge row atomically.
5. New-path materialization with `initialize_import_job=false` creates neither a job nor a bridge
   row; a secondary source creates no unwanted standalone job.
6. Existing draft, citation, publication, Course, Chapter, and Lesson rows remain unchanged by
   backfill.
7. Existing PDF-only repository and route tests pass unchanged.

### Browser acceptance

Run the existing Course import scenario without modifying its request fixtures:

```powershell
npm run test:e2e -- tests/e2e/critical-flows.spec.ts --grep "reviews an outline"
```

Expected: the existing uploaded-document flow reaches outline review, Continue, content review,
and one atomic publication.

## Phase 2: Multi-Source Generation Boundary

### Focused checks

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
```

### Required evidence

1. Two attached sources both containing chunk index zero receive different request-local refs.
2. Provider output maps back to the correct canonical chunk IDs.
3. A client/AI ref from an unattached or foreign source is rejected by both service validation
   and transactional persistence.
4. Job-wide selection is deterministic, source-aware, and bounded to 80,000 characters.
5. Saving or regenerating an outline inserts a new immutable revision.
6. Continue retains the current approval semantics and Lesson generation uses only the approved
   outline's canonical refs.
7. Legacy single-source indexes remain accepted only for a legacy one-source job.

### Browser acceptance

Add a mocked two-source scenario beside the legacy test. Expected: the Admin reviews and edits a
multi-source outline, uses Continue, sees source-qualified Admin citations, reviews Lesson content,
and publishes once.

## Phase 3: Source Ingestion and Review

### Focused checks

```powershell
npm run test -- src/features/content-pipeline/extraction
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
```

### SSRF test matrix

- reject non-HTTP(S), embedded credentials, IP literals, and non-80/443 ports;
- reject IPv4/IPv6 loopback, private, link-local, carrier-grade NAT, multicast, documentation,
  reserved, and IPv4-mapped private addresses;
- reject a hostname when any resolved address is non-public;
- bind the validated address to the actual connection;
- revalidate every redirect and reject an HTTPS-to-HTTP downgrade;
- stop after five redirects or the overall 15-second deadline;
- reject response headers beyond the configured ceiling;
- reject a declared or streamed/decompressed body above 2 MiB;
- reject content other than readable `text/html` or `text/plain`;
- forward no cookie, authorization, or browser headers.

### Snapshot and source-state evidence

1. A successful page becomes deterministic private Markdown and stable chunks.
2. Outline retry/regeneration reuses the stored snapshot and does not refetch the page.
3. Materializing a URL or new-flow file persists its source/provenance with
   `initialize_import_job=false` and no job or bridge row.
4. Extraction/chunking completes before initialization or attach; a failed or zero-chunk attempt never receives
   a `course_import_job_sources` row and never becomes an anchor.
5. The complete current usable-source set, in deterministic Admin selection order, initializes
   exactly one job and all initial bridge rows in one transaction; order zero becomes the anchor.
6. One failed selected URL remains removable/retryable without a job or loss of successful
   sources. If every selected source fails, job and bridge counts remain unchanged.
7. Duplicate and truly parallel initialization requests using one workflow initialization key and
   identical ordered source set both resolve to one job ID, one job row, and one bridge set.
8. Reusing an initialization key with a different ordered set returns a conflict and creates no
   second job; an overlapping competing initialization cannot bypass exclusive source ownership.
9. A source that becomes usable after initialization attaches only with the existing job ID.
10. Retrying or refreshing materialization, extraction, initialization, or later attach reuses the
    same source/job and creates no duplicate bridge row.
11. Manual URL, discovered URL, and uploaded file can coexist up to eight attached sources.
12. Attach/detach works only before Continue, preserves at least one successfully attached evidence
   source, safely reassigns the anchor, and makes an existing outline stale without mutating its
   revision. The last-source guard does not block deletion of an unattached attempt.
13. The versioned browser checkpoint reads the legacy shape and restores staged attempts plus the
    new job/source shape.
14. Job-wide outline generation records transient work on the job and leaves attached sources
    `extracted` or `ready_for_review`; success commits the new revision and marks that exact set
    `ready_for_review`, while provider/persistence failure changes no source, bridge, or historical
    revision state.
15. With mocked fetch/provider durations set to their configured upper bounds, a 1..8-source run
    emits one visible outcome per source and reaches an editable outline or actionable error within
    five simulated minutes; the automated test uses fake/controlled time and no live websites.

### Browser acceptance

Expected: add a manual URL and a file, recover or remove a failed unattached attempt, observe the
ordered usable set initialize one import atomically, later attach another usable source by job ID,
remove attached evidence before outline generation, generate a replacement outline after a
source-set change, then complete publication without duplicate sources/jobs after refresh.

## Phase 4: Topic Research

### Focused checks

```powershell
npm run test -- src/features/content-pipeline/research
npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
```

### Required evidence

1. Topic validation and Vietnamese-first, language-aware query generation are deterministic.
2. Provider normalization strips vendor-only fields and rejects malformed/unsupported URLs.
3. URL canonicalization and deduplication are stable.
4. Ranking and tie-breaking are deterministic; authority/relevance scores remain Admin-only.
5. A research round returns no more than 20 candidates and writes no source/job rows.
6. Research More appends non-duplicates, preserves selected candidates, and keeps no more than 20
   visible candidates.
7. The UI prevents selecting more than eight sources.
8. Only selected candidates are fetched, snapshotted, materialized, and extracted; only those that
   become usable enter the one ordered-set initialization or a later job-scoped attach.
9. Provider unavailability preserves topic/results/selection and leaves Retry, Add URL, and file
   upload available.
10. Selection controls, retry, removal, and Continue are keyboard-operable with accessible status
    and error announcements.

### Browser acceptance

Expected: starting with only a topic, research and select multiple sources, Research More without
losing selection, ingest only selected sources, reach the existing outline editor, complete
review/publication, and report no serious accessibility violations.

## Phase 5: Compatibility and Rollout

### Full quality gates

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

### Required regression scenarios

- legacy PDF/document-only import;
- existing unpublished import fixture after bridge backfill;
- topic-only multi-source import;
- one selected source failure with successful-source continuation;
- all selected sources failing without creating a job, bridge row, or unusable anchor;
- duplicate/concurrent ordered-set initialization resolving to one job and one bridge set;
- retry/refresh during staging, initialization, and later attach without duplicate
  source/job/bridge rows;
- source-set change and replacement outline before Continue;
- publication failure/retry and idempotent success;
- learner Course/Lesson, enrollment, and progress smoke flows;
- Exercise generation, moderation, and publication from one published Lesson;
- learner response contains no new citation UI or Admin-only scores.

### Backfill verification

Against production-like data, record counts and invariant queries before and after the additive
migration. Confirm:

- bridge row count initially equals Course-import job count;
- every order-zero bridge source equals the legacy anchor;
- no source is attached to multiple jobs;
- every web source has complete metadata and an immutable private object;
- no historical revision/publication/curriculum content changed;
- published jobs remain idempotently readable.

## Rollback Validation

- Before enabling multi-source writes, application rollback is safe because additive tables and
  legacy dual-write remain compatible.
- After multi-source jobs exist, do not roll back to code that reads only the anchor unless the new
  UI/write paths are disabled first; retain additive schema and deploy a read-compatible release.
- Never down-migrate by deleting bridge/metadata rows or rewriting historical revisions.
- Feature flags/configuration may disable research and URL ingestion independently while file-only
  import, review, Continue, and publication remain operational.
