# Tasks: Topic-Based Multi-Source Course Creation

**Input**: Design documents from `specs/001-topic-course-research/`

**Required context**: `spec.md`, `plan.md`, `data-model.md`, `research.md`, `quickstart.md`,
`contracts/openapi.yaml`, and the three `docs/ai-course-*.md` audits.

**Organization**: Tasks preserve the five compatibility-first implementation phases from
`plan.md`. Story labels identify the primary specification story served by a task; Phase 1 and
Phase 5 tasks are shared foundations or cross-cutting gates.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: May run in parallel with adjacent tasks after its stated dependencies are complete.
- **[US1]**: Research a Topic and Choose Evidence.
- **[US2]**: Build an Outline from Multiple Reviewed Sources.
- **[US3]**: Add Manual and File Sources.
- **[US4]**: Recover from Source Ingestion Failures.
- **[US5]**: Review, Publish, and Preserve Existing Flows.
- Every task names its affected files and an explicit verification requirement.

## Global Guardrails

- Keep all database work additive and backward-compatible; never rewrite historical outline,
  content, citation, publication, or curriculum rows.
- Keep the legacy PDF/document-only path functional at every phase gate.
- Do not change auth, enrollment, learner progress, learner UI, Exercise, or moderation architecture.
- Do not add embeddings, pgvector, crawlers, `research_sessions`, or a replacement Course pipeline.
- Treat bare chunk indexes as legacy single-source values only; multi-source persistence always
  resolves source-qualified refs to canonical `document_chunks.id` inside the job boundary.
- Continue remains the evidence-locking approval checkpoint; source mutation is forbidden after it.

---

## Phase 1: Additive Database Compatibility and Job-Wide Reads

**Goal**: Establish backward-compatible multi-source ownership, transactional persistence, and
job-wide repository reads before any multi-source UI or generation caller is enabled.

**Independent gate**: Migration/repository tests pass, duplicate concurrent initialization creates
one job, and the unchanged legacy PDF E2E publishes successfully.

- [x] T001 Add failing compatibility-field contract coverage for `source_documents.initialize_import_job` plus nullable unique `course_import_jobs.initialization_key` and immutable `initialization_fingerprint` in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: run `npm run test -- src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts` and confirm failures are limited to the not-yet-added additive fields/default/uniqueness contract.
- [x] T002 Add the source compatibility flag and job initialization key/fingerprint fields in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T001 and confirm legacy rows/default inserts remain valid while initialization keys are nullable and unique only when present.
- [x] T003 Add failing metadata-table contract coverage for columns, provenance checks, indexes, RLS, and grants in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: the focused test fails only because `source_document_metadata` is not yet present and asserts no protected table changes.
- [x] T004 Add `source_document_metadata` with provenance constraints, indexes, RLS, and least-privilege grants in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T003 and confirm file/web validation plus active-Admin boundaries pass.
- [x] T005 Add failing bridge-table contract coverage for keys, source order, 1..8 policy support, relevance bounds, exclusive source ownership, indexes, RLS, and grants in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: the focused test fails only because `course_import_job_sources` is not yet present.
- [x] T006 Add `course_import_job_sources` with additive constraints, indexes, RLS, and least-privilege grants in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T005 and confirm anchor compatibility and protected citation/publication schemas remain unchanged.
- [x] T007 Add backfill and invariant tests for one file metadata row and one order-zero bridge row per existing job in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: the focused test fails before backfill SQL and asserts legacy anchors plus protected row counts/content.
- [x] T008 Implement idempotent metadata/bridge backfill and fail-fast anchor/count invariants in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run the focused migration test and confirm existing published/unpublished revisions and curriculum rows remain unchanged.
- [x] T009 Add legacy trigger dual-write regression cases in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: assert a default file insert creates exactly one job and one order-zero bridge row while `initialize_import_job=false` creates neither.
- [x] T010 Replace the legacy initialization function/trigger compatibly in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T009 and existing migration tests, confirming the legacy default and new staged branch both pass.
- [x] T011 Add staged source materialization RPC contract tests for active-Admin ownership, provenance validation, idempotency, and zero job/bridge writes in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: focused tests reject foreign/invalid metadata and keep failed attempts unattached.
- [x] T012 Add the hardened staged materialization/provenance RPC in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T011 and confirm `PUBLIC`/`anon` execution is revoked, authenticated access is bounded, and retries return one source.
- [x] T013 Add atomic ordered-set initialization tests, including duplicate and truly concurrent calls, same-key/different-fingerprint conflict, overlapping-source conflict, 1..8 bounds, failed/zero-chunk rejection, and anchor order in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: prove one workflow key/set produces at most one job and one initial bridge set.
- [x] T014 Implement the job-centric ordered usable-source initialization RPC and immutable request fingerprint in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T013 and confirm no per-source no-job initializer exists and all validation/inserts roll back atomically on failure.
- [x] T015 Add later attach/detach tests for required `jobId`, exclusive ownership, source limit, deterministic order, anchor reassignment, last-attached-source guard, stale outline transition, and post-Continue rejection in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: historical revisions/citations never change.
- [x] T016 Implement hardened later attach/detach and guarded staged-attempt removal RPCs in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T015 and confirm failed unattached attempts are removable without invoking the last-source guard.
- [x] T017 Add job-centric outline persistence tests for canonical chunk membership, cross-job/unattached rejection, immutable revisions, and legacy wrapper behavior in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: two sources with local chunk zero persist distinct canonical chunk IDs.
- [x] T018 Implement `create_course_outline_for_job` and preserve the single-source wrapper in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T017 and confirm no historical `course_drafts` or outline-child rows are updated in place.
- [x] T019 Implement job-centric Lesson citation persistence while preserving existing citation tables and single-source compatibility in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: extend/run `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts` to reject cross-job chunks and chunks outside the approved outline Lesson.
- [x] T020 Add all-source publication archival and idempotency regression cases in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: simulated failure rolls back curriculum plus every source status, and success retry returns the same publication.
- [x] T021 Extend `publish_course_import_job` in place to archive all bridge sources and return ordered `sourceDocumentIds` while retaining the singular anchor field in `supabase/migrations/030_topic_course_multi_source.sql`; Verify: run T020 and confirm Course/Chapter/Lesson/publication semantics are unchanged.
- [x] T022 Regenerate additive Supabase types for the migration and RPCs in `src/generated/database.types.ts`; Verify: run `npm run typecheck` and confirm protected table/RPC types were not removed or weakened.
- [x] T023 Add repository tests for staged materialization, ordered-set initialization, later attach/detach, and idempotent result validation in `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`; Verify: run the focused repository suite and assert failed/empty sources never become evidence.
- [x] T024 Implement repository RPC wrappers for materialization, initialization, attach/detach, and staged removal in `src/features/content-pipeline/repositories/content-pipeline-repository.ts`; Verify: run T023 and confirm every mutation validates returned shapes and preserves the legacy source creation helper.
- [x] T025 Add job-wide ordered source/chunk read and provenance normalization tests in `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`; Verify: assert ordering by `source_order` then `chunk_index`, canonical IDs, and order-zero legacy aliases.
- [x] T026 Implement `listCourseImportSources`, job-wide generation context, and additive queue normalization in `src/features/content-pipeline/repositories/content-pipeline-repository.ts`; Verify: run T025 and confirm server-only chunk content is not added to browser DTOs.
- [x] T027 Route job-centric outline/Lesson persistence and plural publication results through repository wrappers in `src/features/content-pipeline/repositories/content-pipeline-repository.ts`; Verify: run repository tests and confirm legacy single-source wrappers still call compatible contracts.
- [x] T028 Add ordered `sources[]`, provenance, source-qualified citation joins, and legacy anchor aliases to `GET /api/admin/course-drafts` via `src/features/content-pipeline/types/index.ts`, `src/features/content-pipeline/repositories/content-pipeline-repository.ts`, and `src/app/api/admin/course-drafts/route.ts`; Verify: run `src/app/api/admin/__tests__/course-drafts-route.test.ts` and existing clients' response assertions.
- [x] T029 Expand Phase 1 route/repository regression coverage in `src/app/api/admin/__tests__/course-drafts-route.test.ts` and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`; Verify: run both files and confirm authorization, envelopes, no-store behavior, additive fields, and legacy payloads.
- [x] T030 Run the Phase 1 focused gate from `specs/001-topic-course-research/quickstart.md`; Verify: migration and repository commands pass, then record no protected-domain schema or behavior changes in the task report.
- [x] T031 Run the unchanged legacy PDF Course-import browser gate in `tests/e2e/critical-flows.spec.ts`; Verify: `npm run test:e2e -- tests/e2e/critical-flows.spec.ts --grep "reviews an outline"` reaches outline review, Continue, content review, and one atomic publication.

**Checkpoint**: Phase 1 may merge only after T030-T031 pass. Multi-source writes/UI remain disabled.

---

## Phase 2: Multi-Source Generation Boundary

**Goal**: Make outline and Lesson generation job-wide and source-qualified while retaining the
existing editor, Continue action, revision model, and publication workflow.

**Independent gate**: A mocked two-source job with colliding local chunk indexes is generated,
edited, Continued, reviewed, and published; the legacy PDF E2E remains green.

- [x] T032 [US2] Add additive `CourseImportSource`, `CourseSourceChunk`, `CourseSourceRef`, provider ref, plural publication, and dual legacy/new DTO types in `src/features/content-pipeline/types/index.ts`; Verify: run `npm run typecheck` and existing content-pipeline type consumers.
- [x] T033 [P] [US2] Add failing provider tests for distinct request-local refs, strict returned-ref membership, duplicate/unknown refs, one-source canonicalization, untrusted source labels, and parser refusal of cross-source/bare multi-source identities in `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`; Verify: focused failures describe only the new source-ref contract.
- [x] T034 [US2] Implement request-local `sourceRef` schemas, prompt framing, parsers, and legacy adapter behavior in `src/features/content-pipeline/providers/lesson-draft-provider.ts`; Verify: run T033 and confirm provider output never supplies trusted database IDs or bare multi-source indexes.
- [x] T035 [P] [US2] Add deterministic source-aware 80,000-character selection tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: each non-empty source is represented before refill, order is stable, and the cap is never exceeded.
- [x] T036 [US2] Replace leading-prefix selection with round-robin job-wide selection in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: run T035 plus the legacy single-source selection tests.
- [x] T037 [US2] Add job-wide initial outline generation tests for attached-only evidence, canonical ref mapping, zero-usable rejection, immutable snapshot reuse, explicit source statuses, and provider failure handling in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: cross-job/unattached refs fail before persistence, in-flight work leaves sources `extracted`/`ready_for_review`, success marks the exact set `ready_for_review`, and failure changes no source/bridge/revision state.
- [x] T038 [US2] Implement job-scoped initial outline generation and retain the source-ID legacy wrapper in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: run T037 and confirm generation reads bridge sources rather than only the anchor.
- [x] T039 [US2] Add `POST` job-wide outline generation to `src/app/api/admin/course-drafts/[id]/outline/route.ts`; Verify: extend/run `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` for Admin auth, no-store, timeout, validation, and immutable revision response.
- [x] T040 [US5] Update outline save/regeneration validation to resolve `sourceRefs` through current job membership while accepting bare indexes only for verified legacy one-source jobs in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: run service tests for unknown, duplicate, foreign, and ambiguous references.
- [x] T041 [US5] Preserve immutable outline update/regeneration route contracts in `src/app/api/admin/course-drafts/[id]/outline/route.ts` and `src/app/api/admin/course-drafts/[id]/outline/regenerate/route.ts`; Verify: route tests prove each save/regenerate inserts a new revision and never rewrites an older revision.
- [x] T042 [US5] Add source-qualified outline citation selectors and provenance labels while preserving add/remove/reorder/edit/Continue controls in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component tests show multi-source refs are controlled values and legacy single-source display still works.
- [x] T043 [US5] Add outline editing regression tests for source-qualified refs, copied refs on new Lessons, stale evidence, and disabled Continue in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`; Verify: run the focused component suite with keyboard interactions.
- [x] T044 [US5] Add failing Lesson generation/regeneration tests for approved-outline-only canonical chunks and complete per-section citations in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: foreign job and non-approved chunks are rejected.
- [x] T045 [US5] Make initial Lesson generation job-wide while preserving `prepareCourseLessonGeneration` and Continue semantics in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: run T044 and confirm the approved outline revision/evidence set is the only generation source.
- [x] T046 [US5] Make individual Lesson regeneration source-qualified and immutable in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: service tests prove only the targeted Lesson receives a new content revision and no live URL is fetched.
- [x] T047 [US5] Extend Admin Lesson citation provenance reads/display without changing citation ownership editing in `src/features/content-pipeline/repositories/content-pipeline-repository.ts` and `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component/repository tests show title, domain/URL, local location, and excerpt only to Admin DTOs.
- [x] T048 [US2] Add a two-source outline-to-publication browser scenario in `tests/e2e/critical-flows.spec.ts` and fixtures in `tests/e2e/support/mock-supabase-server.mjs`; Verify: colliding local chunk zero refs remain distinct through outline, Continue, content review, and publication.
- [x] T049 [US5] Re-run the unchanged legacy PDF scenario in `tests/e2e/critical-flows.spec.ts`; Verify: the exact T031 command passes after all Phase 2 generation changes.

**Checkpoint**: Phase 2 may merge only after multi-source and legacy browser gates both pass.

---

## Phase 3: Manual URL, Optional File, and Source Review

**Goal**: Safely stage, ingest, review, initialize, attach, retry, and remove URL/file sources before
outline generation without allowing failed evidence or duplicate Course imports.

**Independent gate**: Manual URL and optional file coexist, partial failure is recoverable, one
ordered usable set initializes one job atomically, refresh creates no duplicates, and legacy PDF
still publishes.

- [ ] T050 [P] [US3] Add approved runtime dependencies and lockfile changes for `@mozilla/readability` and `jsdom` in `package.json` and `package-lock.json`; Verify: run `npm install --package-lock-only`, `npm ls @mozilla/readability jsdom`, and `npm run build` without adding unrelated packages.
- [ ] T051 [P] [US3] Add the complete SSRF matrix as failing unit tests in `src/features/content-pipeline/extraction/web-page-fetcher.test.ts`; Verify: cover schemes, credentials, IP literals, ports, all blocked CIDRs, mixed DNS answers, rebinding-safe lookup, redirects, downgrade, headers, timeout, decompressed size, MIME, and header forwarding.
- [ ] T052 [US3] Implement connection-bound SSRF-safe HTTP(S) fetching in `src/features/content-pipeline/extraction/web-page-fetcher.ts`; Verify: run T051 and confirm five-hop, 15-second, 16-KiB-header, and 2-MiB-decompressed limits.
- [ ] T053 [P] [US3] Add HTML/plain-text extraction tests for scripts/resources disabled, Readability limits, charset handling, empty/unreadable content, and untrusted text in `src/features/content-pipeline/extraction/web-page-extractor.test.ts`; Verify: focused tests never execute or render page code.
- [ ] T054 [US3] Implement bounded main-content extraction and reuse normalized text rules in `src/features/content-pipeline/extraction/web-page-extractor.ts` and `src/features/content-pipeline/extraction/document-extractor.ts`; Verify: run T053 plus `document-extractor.test.ts` to protect existing file extraction.
- [ ] T055 [P] [US3] Add deterministic Markdown snapshot/hash tests in `src/features/content-pipeline/extraction/web-snapshot.test.ts`; Verify: identical captured inputs serialize identically and generation retry requires no network call.
- [ ] T056 [US3] Implement immutable private Markdown snapshot serialization in `src/features/content-pipeline/extraction/web-snapshot.ts`; Verify: run T055 and confirm title, canonical URL, capture time, and normalized plain text are preserved without executable HTML.
- [ ] T057 [US3] Add URL staging orchestration tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: storage precedes materialization, metadata uses `initialize_import_job=false`, extraction precedes evidence, interrupted cleanup is bounded, and idempotent retry reuses the snapshot/source.
- [ ] T058 [US3] Implement URL fetch/snapshot/materialize/extract orchestration in `src/features/content-pipeline/services/content-pipeline-service.ts` and repository storage helpers in `src/features/content-pipeline/repositories/content-pipeline-repository.ts`; Verify: run T057 and confirm success remains unattached until ordered-set initialization or later attach.
- [ ] T059 [US3] Add `POST /api/admin/content-sources/url` in `src/app/api/admin/content-sources/url/route.ts`; Verify: route tests in `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` cover Admin auth, UUID, no-store, rate limit, 413/415/422, and staged envelopes.
- [ ] T060 [US3] Add the explicit new-flow staged-file branch to `src/app/api/admin/content-sources/route.ts` and `uploadContentSource` in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: route/service tests prove `{file}` alone retains immediate legacy initialization while `{file,idempotencyKey}` creates no job/bridge.
- [ ] T061 [US4] Implement retry-safe extraction and guarded removal for unattached attempts in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: tests prove failure records a source-specific error, retry reuses the same source/object, and zero chunks never become usable.
- [ ] T062 [US4] Add `DELETE /api/admin/content-sources/[id]` in `src/app/api/admin/content-sources/[id]/route.ts` while preserving `POST /extract` in `src/app/api/admin/content-sources/[id]/extract/route.ts`; Verify: route tests distinguish unattached removal from job-scoped detach and reject attached/historical evidence deletion.
- [ ] T063 [US2] Implement ordered usable-set initialization orchestration and `POST /api/admin/course-imports` in `src/features/content-pipeline/services/content-pipeline-service.ts` and `src/app/api/admin/course-imports/route.ts`; Verify: service/route tests assert deterministic Admin order, 1..8 validation, one anchor, and no call when all attempts fail.
- [ ] T064 [US4] Add duplicate/concurrent initialization API tests in `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` and service tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: parallel identical calls return one `jobId`, same-key/different-set conflicts, and overlapping competing sets cannot create a second job.
- [ ] T065 [US3] Implement later source listing/attach/detach endpoints in `src/app/api/admin/course-drafts/[id]/sources/route.ts` and `src/app/api/admin/course-drafts/[id]/sources/[sourceDocumentId]/route.ts`; Verify: route tests require existing `jobId`, enforce <=8, reject post-Continue changes, and return stale-outline state.
- [ ] T066 [US5] Wire source-set changes and explicit source-status semantics to immutable outline staleness/replacement-generation requirements in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: service tests preserve the old revision, set the job `processing`, clear approval where allowed, block Continue, forbid mutation after Continue, leave source states unchanged in flight/failure, and mark only the successfully persisted generation set `ready_for_review`.
- [ ] T067 [US4] Add versioned checkpoint v2 parsing/storage/recovery while retaining the legacy two-field checkpoint in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component tests recover topic, selection, per-source keys/status, workflow initialization key, job ID, and pending outline action without duplication.
- [ ] T068 [US3] Build the source-review UI for manual URL, optional file, origin/provenance, Admin-only scores, selected/attached counts, status, Retry, Remove, and outline readiness in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component tests cover 8-source limit, zero-usable block, and discovered/manual/file coexistence.
- [ ] T069 [US4] Implement partial/all-failure UI behavior and refresh recovery in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: tests preserve successes when one fails, allow unattached retry/removal without a job, and keep outline unavailable when all fail.
- [ ] T070 [US3] Expand component coverage for source review, checkpoint v1/v2, initialization, later attach/detach, stale outline, loading/error announcements, keyboard, and focus in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`; Verify: run the focused suite with no weakened legacy assertions.
- [ ] T071 [US3] Run Phase 3 extraction/security/route/service/component suites listed in `specs/001-topic-course-research/quickstart.md`; Verify: every SSRF, snapshot, retry, concurrency, failed-evidence, explicit source-status, and legacy upload assertion passes using mocks only.
- [ ] T072 [US3] Add the manual URL + optional file + partial failure + refresh browser journey and controlled-duration acceptance to `tests/e2e/critical-flows.spec.ts` and `tests/e2e/support/mock-supabase-server.mjs`; Verify: one atomic initial job is created, later attach uses its ID, stale outline is replaced, publication completes without duplicates, and mocked 1..8-source runs reach per-source outcomes plus an editable outline/actionable error within five simulated minutes without live websites.
- [ ] T073 [US5] Re-run the unchanged legacy PDF scenario in `tests/e2e/critical-flows.spec.ts`; Verify: the exact T031 command passes after Phase 3 upload/extraction/UI changes.

**Checkpoint**: Phase 3 may merge only after SSRF/security, manual/file, partial-failure, concurrency,
and legacy gates pass.

---

## Phase 4: Topic Research and Ranked Discovery

**Goal**: Add stateless Vietnamese-first, source-language-aware research, bounded candidate review,
selected-only ingestion, and graceful provider fallback.

**Independent gate**: Starting only from a topic, an Admin can research, select/unselect, Research
More, ingest only selected sources, and reach publication with accessible interactions; research
performs no database writes.

- [ ] T074 [P] [US1] Add vendor-neutral research candidate, cursor, query, and provider contracts in `src/features/content-pipeline/types/index.ts` and `src/features/content-pipeline/providers/web-search-provider.ts`; Verify: run `npm run typecheck` and confirm no Brave payload type reaches UI/domain contracts.
- [ ] T075 [P] [US1] Add Brave adapter contract/error tests with mocked network responses in `src/features/content-pipeline/providers/brave-web-search-provider.test.ts`; Verify: cover auth, quota, timeout, malformed payload, count/offset bounds, cursor, web-only results, and server-only credentials.
- [ ] T076 [US1] Implement the Brave Web Search adapter in `src/features/content-pipeline/providers/brave-web-search-provider.ts` and document its server-only variable in `.env.example`; Verify: run T075 and confirm no live/paid provider call occurs in automated tests.
- [ ] T077 [P] [US1] Add deterministic topic/query planner tests in `src/features/content-pipeline/research/course-research.test.ts`; Verify: cover 3..300 validation, normalized topic, Vietnamese educational query, language-aware official/reference query, and maximum three queries.
- [ ] T078 [US1] Implement the deterministic query planner in `src/features/content-pipeline/research/course-research.ts`; Verify: run T077 and confirm no AI query-planner dependency or persistence is introduced.
- [ ] T079 [P] [US1] Add URL normalization/deduplication tests in `src/features/content-pipeline/research/normalize-search-results.test.ts`; Verify: cover scheme/host casing, default ports, fragments, tracking denylist, meaningful query parameters, malformed URLs, duplicates, and stable candidate keys.
- [ ] T080 [US1] Implement provider-result normalization and canonical deduplication in `src/features/content-pipeline/research/normalize-search-results.ts`; Verify: run T079 and confirm only HTTP(S) vendor-neutral candidates remain.
- [ ] T081 [P] [US1] Add deterministic relevance/authority ranking tests in `src/features/content-pipeline/research/rank-search-results.test.ts`; Verify: assert 0..1 bounds, rank/topic overlap signals, conservative authority signals, canonical-URL tie breaks, and no automatic selection.
- [ ] T082 [US1] Implement advisory ranking in `src/features/content-pipeline/research/rank-search-results.ts`; Verify: run T081 and confirm scores remain review-only and Admin-only.
- [ ] T083 [US1] Add stateless research orchestration tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`; Verify: assert distributed rate limiting, <=20 results, <=3 queries, opaque cursor, stable provider errors, and zero repository/database calls.
- [ ] T084 [US1] Implement research orchestration and provider failure mapping in `src/features/content-pipeline/services/content-pipeline-service.ts` and add the research rate-limit scope in `src/lib/rate-limiter.ts`; Verify: run T083 and existing rate-limit tests.
- [ ] T085 [US1] Add `POST /api/admin/course-research` in `src/app/api/admin/course-research/route.ts`; Verify: route tests in `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` cover Admin auth, validation, no-store, 200/400/429/503 envelopes, and no persistence.
- [ ] T086 [US1] Implement Topic, Research, candidate review, select/unselect, `n/8`, and Research More append/retention UI in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component tests cap visible candidates at 20, preserve selected candidates, and ingest nothing on display alone.
- [ ] T087 [US1] Connect explicit confirmation to selected-only Phase 3 ingestion in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component/service tests prove unselected candidates receive no idempotency key, fetch, snapshot, source row, job row, or citation.
- [ ] T088 [US1] Preserve topic/results/selection plus Retry, Add URL, and file fallback during provider outage in `src/features/content-pipeline/components/content-pipeline-admin.tsx`; Verify: component tests cover recoverable 503 and unchanged client state.
- [ ] T089 [US1] Add keyboard, focus, label, live-region, alert, disabled/loading, and selection-limit accessibility tests in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`; Verify: run the component suite and assert no serious Axe violations in the research/source-review surface.
- [ ] T090 [US1] Add the topic-only Research/Research More/selected-only ingestion browser journey in `tests/e2e/critical-flows.spec.ts` and provider fixtures in `tests/e2e/support/mock-supabase-server.mjs`; Verify: publication completes from at least two web sources and Axe reports no serious violations.
- [ ] T091 [US5] Re-run the unchanged legacy PDF scenario in `tests/e2e/critical-flows.spec.ts`; Verify: the exact T031 command passes after Phase 4 research/UI changes.

**Checkpoint**: Phase 4 may merge only after stateless research, selected-only ingestion,
provider-fallback, accessibility, topic E2E, and legacy PDF gates pass.

---

## Phase 5: Compatibility Hardening and Rollout

**Goal**: Prove old/new behavior side by side, harden operations and documentation, and run the
complete production-quality gate without changing protected learner or Exercise architecture.

**Independent gate**: Production-like backfill verification and the full lint/typecheck/test/build/
E2E suite pass with legacy, multi-source, learner, progress, and Exercise regressions.

- [ ] T092 Add production-like pre/post backfill invariant fixtures and count/content assertions in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: bridge count equals legacy job count, anchors match order zero, ownership is exclusive, and no historical revision/publication/curriculum data changes.
- [ ] T093 Add final RLS/grant/function-ACL verification for staged sources, snapshots, metadata, bridge rows, and hardened RPCs in `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`; Verify: active Admin access passes while `anon`, inactive, cross-owner, and direct unauthorized writes fail.
- [ ] T094 Stabilize content-pipeline error codes/envelopes for research, fetch, extraction, initialization, attach/detach, limits, stale outline, invalid refs, provider failure, and publication retry in `src/app/api/admin/content-pipeline-route-utils.ts` and `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: run `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` for exact status/envelope/no-store behavior.
- [ ] T095 Add metadata-only operational signals for research/fetch/source/ref/stale/publication outcomes in `src/features/content-pipeline/services/content-pipeline-service.ts`; Verify: service tests assert actor/job/source IDs, stage, code, duration/count metadata and prove bodies, chunks, provider payloads, tokens, credentials, and private addresses are never logged.
- [ ] T096 Add compatibility diagnostics for missing bridges, anchor drift, duplicate membership, and invalid provenance joins in `src/features/content-pipeline/repositories/content-pipeline-repository.ts`; Verify: repository tests produce stable diagnostics without mutating data or exposing source content.
- [ ] T097 Update architecture, database, API, security, UI, feature, and decision/operations documentation in `docs/architecture.md`, `docs/database.md`, `docs/api_contract.md`, `docs/security.md`, `docs/ui.md`, `docs/features.md`, and `docs/decisions.md`; Verify: documentation matches `specs/001-topic-course-research/contracts/openapi.yaml`, preserves the legacy path, and names all rollout/rollback gates.
- [ ] T098 Run and extend the complete content-pipeline compatibility suite in `src/features/content-pipeline/**` and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`; Verify: legacy checkpoint/import, existing unpublished fixture, multi-source refs, partial/all failure, concurrency, staleness, immutable revisions, and publication retry all pass.
- [ ] T099 Add learner DTO non-leakage regressions in `src/features/courses/services/__tests__/course-service.test.ts`, `src/features/lessons/services/__tests__/lesson-service.test.ts`, and `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`; Verify: learners receive no Admin scores, private provenance, new citation UI, source bodies, or changed Course/Lesson behavior.
- [ ] T100 Run enrollment/progress smoke regressions in `src/app/api/courses/[courseId]/enroll/__tests__/route.test.ts`, `src/app/api/courses/[courseId]/progress/__tests__/route.test.ts`, and `src/app/api/lessons/[lessonId]/progress/__tests__/route.test.ts`; Verify: existing enrollment and progress behavior passes without production-code changes in those domains.
- [ ] T101 Run Exercise generation/moderation/publication smoke regressions in `src/features/ai/services/__tests__/ai-exercise-generation-service.test.ts`, `src/features/moderation/services/__tests__/moderation-service.test.ts`, and `src/features/moderation/repositories/lesson-to-exercise-migration.test.ts`; Verify: Exercises remain per published Lesson, solutions stay private, and no Course-import source contract enters the Exercise flow.
- [ ] T102 Add the combined rollout regression matrix to `tests/e2e/critical-flows.spec.ts` and `tests/e2e/support/mock-supabase-server.mjs`; Verify: legacy file-only, existing-unpublished, topic multi-source, partial failure, stale replacement outline, publication retry, learner access/progress, and published-Lesson Exercise journeys pass in one build.
- [ ] T103 Run final quality gates from `package.json` and `specs/001-topic-course-research/quickstart.md`; Verify: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:e2e` all pass with actual results recorded before review/commit.

**Checkpoint**: Phase 5 is complete only when T092-T103 pass and review finds no Critical, High,
or Medium issue. Deployment/provider/legal approval remains separate from implementation completion.

---

## Dependencies and Execution Order

### Phase dependencies

1. **Phase 1** has no feature-code dependency and blocks all later phases.
2. **Phase 2** depends on the Phase 1 bridge, RPCs, generated types, and job-wide reads.
3. **Phase 3** depends on Phases 1-2 so staged evidence can initialize one job and enter the
   existing multi-source generation boundary.
4. **Phase 4** depends on Phase 3 ingestion/review; research itself remains stateless.
5. **Phase 5** depends on all preceding phase gates and performs no product redesign.

### Critical task chains

- **Atomic initialization**: T001-T014 -> T022-T024 -> T063-T064 -> T092-T093.
- **Canonical citations**: T017-T019 -> T025-T027 -> T032-T044 -> T098.
- **Immutable URL evidence**: T050-T058 -> T059-T062 -> T071-T072.
- **Source locking/staleness**: T015-T016 -> T065-T066 -> T098.
- **Research selected-only flow**: T074-T085 -> T086-T090.
- **Legacy protection**: T031 -> T049 -> T073 -> T091 -> T102-T103.

### User-story traceability

- **US1**: T074-T090, with Phase 3 ingestion dependencies.
- **US2**: T032-T039, T044-T048, T063-T064.
- **US3**: T050-T060, T065, T068, T071-T072.
- **US4**: T061-T064, T067, T069-T070, T072.
- **US5**: T040-T047, T049, T066, T073, T091, plus all Phase 5 gates.

## Parallel Opportunities

- After T006, backfill test design (T007), trigger tests (T009), and RPC contract test preparation
  (T011/T013/T015/T017/T020) may proceed in parallel, but SQL changes remain sequential in the
  single migration file.
- In Phase 2, provider tests (T033), context tests (T035), and outline service tests (T037) may be
  prepared in parallel after T032.
- In Phase 3, dependency review (T050), SSRF tests (T051), extractor tests (T053), and snapshot
  tests (T055) touch separate files and may proceed in parallel.
- In Phase 4, provider, planner, normalization, and ranking test/implementation pairs
  (T075-T082) may proceed in parallel after T074.
- Protected-domain smoke tasks T099-T101 may run in parallel after T098.

## Incremental Delivery Strategy

1. Deliver Phase 1 alone as additive schema/dual-read compatibility; keep new writes disabled.
2. Deliver Phase 2 multi-source internals and validate mocked jobs without exposing research.
3. Deliver Phase 3 manual URL/file source review and atomic ordered-set initialization.
4. Deliver Phase 4 topic research only after provider and policy readiness gates are satisfied.
5. Complete Phase 5 before rollout; retain additive schema and disable new entry paths for rollback.

## Completion Rules

- A task is complete only after its named verification passes; do not weaken or skip legacy tests.
- Review the real diff after each phase and fix/retest all Critical/High/Medium findings.
- Commit only verified in-scope files with Conventional Commits; do not push or deploy unless
  separately authorized.
