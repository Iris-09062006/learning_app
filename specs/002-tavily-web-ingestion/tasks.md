# Tasks: Tavily Web Ingestion

**Input**: Approved design packet in `specs/002-tavily-web-ingestion/`
**Scope**: Bounded replacement of active selected/manual web acquisition only
**Tests**: Required. Test tasks precede their corresponding implementation tasks and must demonstrate the intended failure before production code changes.

## Format

Each task uses `- [ ] Txxx [P?] [US?]` and includes exact files, dependencies,
verification, and a completion condition. `[P]` means the task is technically
independent and touches different files; repository policy still assigns all
work to Codex.

## Phase A — Extraction Provider Boundary

**Purpose**: Establish and verify the provider-neutral extraction seam before
changing any active ingestion path.

- [x] T001 Define the vendor-neutral web extraction request/result/error contract in `src/features/content-pipeline/providers/web-content-extraction-provider.ts` and its type-focused tests in `src/features/content-pipeline/providers/web-content-extraction-provider.test.ts`.
  - **Depends on**: None.
  - **Responsibility**: Expose one-URL extraction and two distinct provider-independent types: adapter output `WebContentExtractionResult` (`sourceUrl`, canonical candidate, raw Markdown, capture time) and application output `NormalizedWebExtractionResult` (validated canonical URL, optional title, normalized Markdown/count, capture time), plus stable internal error categories; do not expose Tavily DTOs, usage, request IDs, images, or favicon data.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/web-content-extraction-provider.test.ts`; `npm run typecheck`; `rg -n "Tavily|request_id|usage|favicon|images" src/features/content-pipeline/providers/web-content-extraction-provider.ts src/features/content-pipeline/types src/features/content-pipeline/repositories` must show no vendor leakage outside intentional comments/tests.
  - **Complete when**: The contract compiles independently, its tests pass, and repository/UI/Gemini-facing types contain no Tavily DTO.

- [x] T002 Write failing exact-request and configuration tests for the Tavily adapter in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`.
  - **Depends on**: T001.
  - **Responsibility**: Assert one `POST https://api.tavily.com/extract` call, Bearer `TAVILY_API_KEY`, `basic`, `markdown`, images/favicon false, timeout 10, no query/chunk fields, no Advanced retry, no `NEXT_PUBLIC_TAVILY_API_KEY`, recoverable missing-key behavior, and no network call when the key is absent.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts` must initially fail for the missing adapter and later pass under T003.
  - **Complete when**: Assertions cover the complete locked request shape and prohibited fields, including exactly one call.

- [x] T003 Implement the server-only Tavily Basic Extract adapter in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.ts`.
  - **Depends on**: T001, T002.
  - **Responsibility**: Use native server `fetch`, `cache: "no-store"`, a bounded local abort guard, only `process.env.TAVILY_API_KEY`, one URL per request, and no adapter retry/fallback; keep build/startup possible without the key.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`; `npm run typecheck`; `$env:TAVILY_API_KEY=''; npm run build`.
  - **Complete when**: Exact-request tests pass, missing configuration is a recoverable provider error, and a keyless build succeeds.

- [x] T004 Add failing provider response-shape tests in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`.
  - **Depends on**: T001.
  - **Responsibility**: Cover exactly one valid result bound to the one-URL request, `failed_results`, missing result, multiple or contradictory success/failure entries, malformed JSON/object/arrays, missing/non-string result URL, and missing/non-string content without returning Tavily-only fields; a blank string is valid adapter shape but is rejected later by the application normalizer, and a differing valid URL, including another origin, remains a canonical candidate rather than an identity failure.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts` must fail before T005 and pass afterward.
  - **Complete when**: Each documented and malformed response class has an explicit expected normalized result or stable failure category.

- [x] T005 Implement Tavily response parsing and provider-independent translation in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.ts`.
  - **Depends on**: T003, T004.
  - **Responsibility**: Translate exactly one successful `url`/`raw_content` result into `WebContentExtractionResult`; bind it to the one submitted URL by cardinality, allow a differing URL as a candidate, and reject missing/non-string URLs, multiple successes, or contradictory success/failure shapes without inventing same-origin or redirect-chain validation.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`; `npm run typecheck`.
  - **Complete when**: All response-shape tests pass and no raw Tavily response escapes the adapter.

- [x] T006 Add failing error-mapping and redaction tests in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts` and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: T001.
  - **Responsibility**: Cover provider auth (401/403), quota/rate classes (429/432/433), timeout/abort, upstream 5xx/network failures, invalid response, and empty/weak extraction; assert stable generic route status/envelope and absence of keys, raw bodies, content, request IDs, and vendor details.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` must fail before T007 and pass afterward.
  - **Complete when**: Every provider failure class has a recoverable, secret-safe expected result and provider quota is not mislabeled as the application's own rate limit.

- [x] T007 Implement provider error translation and route status mapping in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.ts`, `src/features/content-pipeline/services/content-pipeline-service.ts`, and `src/app/api/admin/content-pipeline-route-utils.ts`.
  - **Depends on**: T005, T006.
  - **Responsibility**: Preserve detailed sanitized internal categories while returning provider-neutral `422`/existing `413` source failures and generic `503` availability failures; preserve application `429` semantics and safe details only.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`; `npm run typecheck`.
  - **Complete when**: Mapping tests pass and neither responses nor operational signals expose secrets or provider bodies.

- [x] T008 Add failing fixed evidence-policy tests in `src/features/content-pipeline/providers/web-content-extraction-normalizer.test.ts`, `src/features/content-pipeline/extraction/document-extractor.test.ts`, and `src/features/content-pipeline/extraction/web-snapshot.test.ts`.
  - **Depends on**: T001.
  - **Responsibility**: Assert blank/whitespace/effectively empty rejection; 79 rejection; 80 eligibility subject to chunking; 200,000 eligibility subject to chunking; 200,001 rejection using existing maximum behavior; metadata excluded from the count; zero chunks rejected; and exactly 100 serializations of one fixed validated result produce byte-identical Markdown and one identical content hash.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/web-content-extraction-normalizer.test.ts src/features/content-pipeline/extraction/document-extractor.test.ts src/features/content-pipeline/extraction/web-snapshot.test.ts` must fail before the policy implementation and pass afterward; PASS requires all 100 outputs and hashes to equal the first output/hash.
  - **Complete when**: Every exact boundary and determinism assertion exists without dynamic provider/URL/content-type/retry thresholds.

- [x] T009 Implement the application-owned normalization and fixed eligibility policy in `src/features/content-pipeline/providers/web-content-extraction-normalizer.ts`, `src/features/content-pipeline/extraction/web-snapshot.ts`, and `src/features/content-pipeline/extraction/document-extractor.ts`.
  - **Depends on**: T005, T008.
  - **Responsibility**: Convert `WebContentExtractionResult` into `NormalizedWebExtractionResult`, validate/normalize the canonical candidate, normalize untrusted Markdown before adding snapshot metadata, enforce 80–200,000 inclusive, retain Markdown as evidence, and require at least one existing usable chunk before promotion.
  - **Verify**: `npm run test -- src/features/content-pipeline/providers/web-content-extraction-normalizer.test.ts src/features/content-pipeline/extraction/document-extractor.test.ts src/features/content-pipeline/extraction/web-snapshot.test.ts`; `npm run typecheck`.
  - **Complete when**: All boundary/determinism tests pass and the policy is constant-based and identical for initial extraction and Retry.

### Phase A Gate

Run `npm run test -- src/features/content-pipeline/providers/web-content-extraction-provider.test.ts src/features/content-pipeline/providers/web-content-extraction-normalizer.test.ts src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts src/features/content-pipeline/extraction/document-extractor.test.ts src/features/content-pipeline/extraction/web-snapshot.test.ts`, then `npm run typecheck`. Phase B may begin only when the provider is independently verified and no active ingestion code has yet been switched.

---

## Phase B — Switch Active Web Ingestion

### Phase B1 — User Story 1: Ingest Only Admin-Selected Research Results (P1)

**Goal**: Extract only explicitly confirmed selected research URLs, normalize them
into immutable evidence, and reuse the existing staged-source pipeline.

**Independent test**: Research, Research More, display, select, and unselect cause
zero Extract calls; confirmation of selected A and C calls Extract once for A and
once for C, never B, and produces existing snapshots/chunks for accepted sources.

- [x] T010 [US1] Add failing call-boundary tests for research and selection in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` and `src/features/content-pipeline/research/course-research.test.ts`.
  - **Depends on**: Phase A gate.
  - **Responsibility**: Spy on Search and Extract separately; prove Research, Research More, candidate display, selection, and unselection call Extract zero times; prove explicit confirmation of A/C calls URL ingestion only for A/C and leaves B at zero; prove current sequential maximum concurrency is 1.
  - **Verify**: `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/research/course-research.test.ts` must fail only where the new Extract boundary is not wired and later pass.
  - **Complete when**: Explicit call-count and maximum-in-flight assertions cover all cost boundaries without relying on visual observation.

- [x] T011 [US1] Add failing service orchestration tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`.
  - **Depends on**: Phase A gate.
  - **Responsibility**: Assert one provider call after existing Admin/auth/rate/source-count/URL checks, no call for rejected URLs or accepted idempotent reuse, one deterministic private snapshot upload before materialization/chunking, and no direct fetch/Readability call.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts` must fail before T012 and pass afterward.
  - **Complete when**: The test fixes call order, call counts, storage path reuse, and the single common URL orchestration contract.

- [x] T012 [US1] Switch `ingestUrlSource` to the provider-neutral extraction path in `src/features/content-pipeline/services/content-pipeline-service.ts`.
  - **Depends on**: T010, T011.
  - **Responsibility**: Invoke the Tavily adapter only after application validation and explicit URL-ingestion confirmation, normalize the result, serialize/upload the immutable snapshot, and remove active `fetchWebPage`/`extractWebPage` imports and calls without creating a second pipeline or fallback.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/research/course-research.test.ts`; `rg -n "fetchWebPage|extractWebPage" src/features/content-pipeline/services/content-pipeline-service.ts` must return no matches.
  - **Complete when**: Selected research URLs use exactly one Extract call and the former direct acquisition path has no active service caller.

- [x] T013 [US1] Add failing discovered-provenance and canonical-URL tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Depends on**: Phase A gate.
  - **Responsibility**: Assert `source_url` preserves the Admin-selected URL; a differing provider URL, including another origin, remains bound to the one-URL request and becomes `canonical_url` only after HTTP(S), credential, local/private/reserved, and canonical normalization checks; the selected URL is used when no distinct final URL exists; invalid candidates fail before persistence; domain derives from canonical; `ingestion_method` remains `discovered`; title falls back from candidate input then canonical domain.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts` must fail before T014 and pass afterward.
  - **Complete when**: All provenance branches and invalid-final rejection are asserted at repository inputs, including differing original/final URLs.

- [x] T014 [US1] Implement provider-result provenance normalization in `src/features/content-pipeline/services/content-pipeline-service.ts` and deterministic title fallback in `src/features/content-pipeline/utils/document-title.ts`.
  - **Depends on**: T012, T013.
  - **Responsibility**: Preserve original source URL, validate/normalize a differing provider canonical candidate, use the locally normalized selected URL only when the returned result URL is the same and no distinct final exists, reject missing/non-string result URLs as malformed, derive domain from canonical, and retain existing discovered/title semantics.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/features/content-pipeline/utils/document-title.test.ts`; `npm run typecheck`.
  - **Complete when**: Provenance tests pass and an invalid provider URL cannot reach storage or metadata materialization.

- [x] T015 [US1] Add failing snapshot/materialization/chunk/promotion tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Depends on**: T011, T013.
  - **Responsibility**: Assert deterministic bytes/hash, private storage identity, existing `source_documents`/metadata/RPC reuse, no raw provider persistence, chunks created only from stored snapshot, at least one usable chunk, and no bridge/anchor/evidence membership for failed, weak, oversized, malformed, or zero-chunk attempts.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts` must fail before T016 and pass afterward.
  - **Complete when**: Tests prove immutable evidence precedes promotion and rejected evidence never enters Course ownership.

- [x] T016 [US1] Complete existing snapshot, materialization, chunking, and promotion integration in `src/features/content-pipeline/services/content-pipeline-service.ts` and `src/features/content-pipeline/repositories/content-pipeline-repository.ts` without schema changes.
  - **Depends on**: T014, T015.
  - **Responsibility**: Feed normalized Markdown through current deterministic Storage/source metadata/chunk lifecycle, preserve cleanup on pre-acceptance failure, and require a usable chunk before any attach/anchor operation.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`; `git diff --name-only -- supabase/migrations` must be empty.
  - **Complete when**: Accepted selected URLs produce current-model evidence and all unusable paths leave no bridge, anchor, or duplicate persistence.

- [x] T017 [US1] Add atomic initial ordered-set and secondary-attachment regression assertions in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Depends on**: T016.
  - **Responsibility**: Prove the first usable source still uses existing atomic Course-import initialization, additional successful URLs use existing attachment, source order and exclusive ownership remain authoritative, and canonical equality does not become global uniqueness.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Complete when**: Existing initialization/attachment RPC expectations pass with web snapshots and no repository API/schema addition.

- [x] T018 [US1] Verify the selected-research increment end to end in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`, `src/features/content-pipeline/services/content-pipeline-service.test.ts`, and `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T010–T017.
  - **Responsibility**: Extend the selected-only critical flow to show Search → candidate review → explicit confirmation → immutable source/chunks, while asserting unselected candidates are not acquired and Gemini remains uninvolved until generation.
  - **Verify**: `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/services/content-pipeline-service.test.ts`; `npx playwright test tests/e2e/critical-flows.spec.ts --grep "research"`.
  - **Complete when**: User Story 1 passes independently with exact Extract call boundaries and existing evidence persistence.

### Phase B2 — User Story 2: Add a Manual URL Through the Same Web Path (P1)

**Goal**: Manual Add URL uses the identical provider/snapshot lifecycle while
preserving manual provenance and the existing browser contract.

**Independent test**: One valid manual URL invokes the same provider once,
persists `manual_url`, and yields the same snapshot/chunk shape as a discovered
URL without adding provider fields to the request.

- [x] T019 [US2] Add failing shared-path manual/discovered tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: T016.
  - **Responsibility**: Parameterize string values `discovery: "manual_url" | "discovered"` through the same `ingestUrlSource` provider invocation and eligibility logic; assert only ingestion provenance differs, `idempotencyKey` remains a UUID, `title` remains at most 300 characters, and the concrete `{ success: true, data }` response has no Tavily fields.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` must fail before T020 and pass afterward.
  - **Complete when**: Tests would fail if manual URL logic bypassed or duplicated the common orchestration.

- [x] T020 [US2] Preserve the common manual/discovered URL orchestration in `src/features/content-pipeline/services/content-pipeline-service.ts` and `src/app/api/admin/content-sources/url/route.ts`.
  - **Depends on**: T019.
  - **Responsibility**: Keep one route/service/provider path, the existing string discovery enum and body fields, concrete success envelope, and `manual_url` versus `discovered` mapping; preserve current HEAD status behavior (`201` for both new and reused attempts, distinguished by `data.reused`) and do not add a manual-only provider call or endpoint.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`; `rg -n "Tavily|extract_depth|raw_content" src/app/api/admin/content-sources/url/route.ts src/features/content-pipeline/components/content-pipeline-admin.tsx` must show no provider-specific browser contract.
  - **Complete when**: Manual and discovered tests pass through the same service function and retain their domain provenance.

- [x] T021 [US2] Verify manual Add URL independently in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` and `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T020.
  - **Responsibility**: Cover manual confirmation, recoverable failure display, Retry/Remove controls, private snapshot/chunk success, and unchanged surrounding file-source controls.
  - **Verify**: `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`; `npx playwright test tests/e2e/critical-flows.spec.ts --grep "manual URL"`.
  - **Complete when**: User Story 2 succeeds independently without Tavily fields in component state or payloads.

### Phase B3 — User Story 4: Recover from Independent Web Extraction Failures (P1)

**Goal**: Each URL settles independently; failed attempts remain Retry/Remove
without losing successful sources or increasing extraction cost.

**Independent test**: In A-success/B-fail/C-success, A/C remain unchanged and
usable; B retries under the same identity with the same Basic policy or can be
removed; no duplicate source, snapshot, job, or bridge appears.

- [x] T022 [US4] Add failing partial-settlement tests in `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` and `src/features/content-pipeline/services/content-pipeline-service.test.ts`.
  - **Depends on**: T018, T021.
  - **Responsibility**: Model A success/B provider-or-content failure/C success; assert independent commits, no batch rollback/re-extraction, B Retry/Remove only, A/C attachment unchanged, and generation blocked only when no other usable source exists.
  - **Verify**: `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/services/content-pipeline-service.test.ts` must fail before recovery work and later pass.
  - **Complete when**: Per-source state and call counts prove independent settlement.

- [x] T023 [US4] Add failing retry/idempotency/provenance tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Depends on**: T016.
  - **Responsibility**: Prove pre-snapshot Retry calls one Basic Extract for only the failed URL; changed valid final URL stays in the same staged identity; accepted idempotent reuse and post-snapshot chunk retry call Extract zero times; no duplicate source document, snapshot, job, or bridge; no Advanced request.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts` must fail before T024 and pass afterward.
  - **Complete when**: All three retry/materialization states have explicit provider call and persistence-count assertions.

- [x] T024 [US4] Implement deterministic retry and independent recovery in `src/features/content-pipeline/services/content-pipeline-service.ts` and `src/features/content-pipeline/components/content-pipeline-admin.tsx`.
  - **Depends on**: T022, T023.
  - **Responsibility**: Reuse the existing staged idempotency key, reacquire only failed pre-snapshot URLs with unchanged Basic policy, reuse stored snapshots for chunk retry, preserve successes, and keep Retry/Remove source-specific.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`.
  - **Complete when**: Partial failure and retry tests pass with no duplicate persistence and no silent cost escalation.

- [x] T025 [US4] Verify recovery end to end in `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T024.
  - **Responsibility**: Extend the existing partial-failure scenario with A/B/C outcomes, failed-source Retry or Remove, preserved successes, and exactly one final publication from the remaining usable evidence.
  - **Verify**: `npx playwright test tests/e2e/critical-flows.spec.ts --grep "partial|retry"`.
  - **Complete when**: User Story 4 independently demonstrates recoverable partial failure without all-or-nothing rollback.

### Phase B Gate

Run `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`, then the selected research/manual/partial Playwright scenarios. Phase C may begin only after manual and discovered sources share one path, evidence promotion is safe, and Retry is idempotent.

---

## Phase C — Immutability, Compatibility, Security, and Old Path

### Phase C1 — User Story 3: Preserve Immutable Evidence Across Generation (P1)

**Goal**: Every downstream action reads stored evidence only and never receives
transient live Tavily output.

**Independent test**: After evidence storage, the Extract call count remains
zero for outline generation/regeneration/edit/save, Continue, Lesson generation/
regeneration, review, publication, and retry from a stored snapshot.

- [x] T026 [US3] Add explicit zero-Extract generation-boundary tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`.
  - **Depends on**: Phase B gate.
  - **Responsibility**: Inject/spy on the extraction provider across outline generation, outline regeneration, outline edit/save, Continue, Lesson generation, Lesson regeneration, content review, publication, accepted-idempotency reuse, and stored-snapshot retry; assert every path reads repository snapshots/chunks and makes zero Extract calls.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts`.
  - **Complete when**: Each named action has an explicit zero-call assertion and stored source/chunk expectation rather than an inferred absence.

- [x] T027 [US3] Add untrusted-evidence and deterministic-generation framing tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`.
  - **Depends on**: T026.
  - **Responsibility**: Use prompt-like Markdown evidence to prove application/provider instruction framing and source-qualified references remain authoritative, transient Tavily DTOs never enter Gemini inputs, and Gemini remains the only Course/Lesson generator.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/providers/lesson-draft-provider.test.ts`; `rg -n "raw_content|request_id|Tavily" src/features/content-pipeline/providers/lesson-draft-provider.ts src/features/content-pipeline/services/content-pipeline-service.ts` must show no transient provider payload reaching generation.
  - **Complete when**: User Story 3 passes independently and prompt-like evidence cannot change privileged workflow behavior.

### Phase C2 — User Story 5: Complete Existing Course and Legacy File Flows (P1)

**Goal**: Provider outages affect only new web acquisition; stored web evidence,
file/PDF ingestion, generation, publication, learner, and Exercise flows remain
available and unchanged.

**Independent test**: With every extraction-provider failure injected, new web
URL attempts fail recoverably while a PDF and already-stored web source still
generate and publish without Search or Extract calls.

- [x] T028 [US5] Add file/PDF independence tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts`, `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`, and `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`.
  - **Depends on**: Phase B gate.
  - **Responsibility**: Assert uploaded file/PDF ingestion, extraction, chunks, attachment, generation, and publication invoke neither Tavily Search nor Tavily Extract and retain existing payload/state behavior.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`.
  - **Complete when**: Explicit zero-call assertions cover file/PDF paths and existing assertions remain unchanged or strengthened.

- [x] T029 [US5] Add provider-unavailable isolation tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: T007, T028.
  - **Responsibility**: Inject missing key, auth, quota/rate, timeout, upstream outage, and malformed response; assert discovered/manual URL failure is recoverable while file/PDF ingestion, already-stored web generation, and publication still succeed with no direct-fetch fallback.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Complete when**: Every provider outage class preserves existing work and unrelated pipelines.

- [x] T030 [US5] Deactivate the legacy direct-fetch/Readability production path in `src/features/content-pipeline/services/content-pipeline-service.ts`.
  - **Depends on**: T012, T029.
  - **Responsibility**: Prove URL ingestion selects the extraction provider and never `fetchWebPage`/`extractWebPage`, including failure paths; retain `src/features/content-pipeline/extraction/web-page-fetcher.ts`, `web-page-extractor.ts`, `@mozilla/readability`, and `jsdom` unchanged as inactive legacy code for this bounded change rather than deleting them. T038 owns documentation of that decision.
  - **Verify**: `rg -n "fetchWebPage|extractWebPage" src --glob '!src/features/content-pipeline/extraction/web-page-fetcher*' --glob '!src/features/content-pipeline/extraction/web-page-extractor*'` must show no production caller; `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts`; `npm run build`.
  - **Complete when**: Active and failure paths have no automatic direct-fetch fallback, while retained files/dependencies remain non-blocking legacy code.

- [x] T031 [US5] Lock pre-provider URL validation security using the existing `validateWebUrl` export in `src/features/content-pipeline/extraction/web-page-fetcher.ts`, `src/features/content-pipeline/extraction/web-page-fetcher.test.ts`, and `src/features/content-pipeline/services/content-pipeline-service.test.ts`.
  - **Depends on**: Phase A gate.
  - **Responsibility**: Reuse—not relocate—the existing pure `validateWebUrl` function for HTTP/HTTPS-only, malformed URL, embedded credentials, and literal localhost/private/reserved rejection before any provider call; do not invoke or copy the legacy fetcher's DNS/TLS/request machinery into the adapter. Validator extraction/removal is outside 002.
  - **Verify**: `npm run test -- src/features/content-pipeline/extraction/web-page-fetcher.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts`; each rejection case must assert Extract call count zero.
  - **Complete when**: The existing validator is called before credentials/network use, every rejection asserts zero Extract calls, and no new validator module or DNS/TLS provider logic is introduced.

- [x] T032 [US5] Add operational logging/privacy tests in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`.
  - **Depends on**: T007.
  - **Responsibility**: Assert sanitized categories distinguish validation, auth, quota, timeout, upstream, response validation, snapshot, and chunking; forbid key/header, raw response, extracted body, snapshot body, credential-bearing URL, learner data, and provider DTO leakage.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/providers/tavily-web-content-extraction-provider.test.ts`.
  - **Complete when**: Diagnostics remain metadata-only and every sensitive fixture value is absent from logs/client errors.

- [x] T033 [US5] Finalize provider-neutral URL route behavior in `src/app/api/admin/content-pipeline-route-utils.ts`, `src/app/api/admin/content-sources/url/route.ts`, and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: T020, T029, T032.
  - **Responsibility**: Preserve Admin authentication/authorization, string discovery enum, UUID idempotency key, bounded title, concrete no-store success envelope, `201` for both new and reused success with `data.reused` distinction, application rate controls, source-specific recoverability, and generic availability responses without adding Tavily fields or changing file routes.
  - **Verify**: `npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`; `npm run typecheck`.
  - **Complete when**: Auth/error/compatibility tests pass for both URL origins and existing file endpoints.

- [x] T034 [US5] Add stored-evidence, publication, learner, and Exercise compatibility assertions in `src/features/content-pipeline/services/content-pipeline-service.test.ts`, `src/app/api/courses/[courseId]/progress/__tests__/route.test.ts`, and `src/app/api/ai/exercises/generate/__tests__/route.test.ts`.
  - **Depends on**: T026, T029.
  - **Responsibility**: Prove provider unavailability cannot affect stored-source outline/Lesson generation, immutable revisions, relational citations, exactly-once publication, learner access/progress, or Exercise behavior.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/courses/[courseId]/progress/__tests__/route.test.ts src/app/api/ai/exercises/generate/__tests__/route.test.ts`.
  - **Complete when**: User Story 5 passes independently with zero Search/Extract calls in legacy and downstream flows.

- [x] T035 [US5] Execute the Phase C compatibility/security gate using `src/features/content-pipeline/`, `src/app/api/admin/`, and `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T027–T034.
  - **Responsibility**: Run all focused tests, inspect active imports and provider leaks, and run stored-evidence/file critical flows; fix only Phase C findings before proceeding.
  - **Verify**: `npm run test -- src/features/content-pipeline src/app/api/admin`; `npx playwright test tests/e2e/critical-flows.spec.ts --grep "PDF|stored|publish"`; `rg -n "NEXT_PUBLIC_TAVILY|raw_content|request_id" src` must reveal no client/learner leak.
  - **Complete when**: Phase C has no Critical/High/Medium finding, legacy direct fetch is inactive, and all five user stories are independently passing.

---

## Phase D — Contract, Regression, and Deployment Readiness

**Purpose**: Verify the completed bounded change against external compatibility,
documentation, real-provider readiness, full regressions, security, and rollback.

- [x] T036 Verify the locked URL API contract in `specs/002-tavily-web-ingestion/contracts/openapi.yaml`, add deterministic local-reference validation in `specs/002-tavily-web-ingestion/contracts/validate_openapi.py`, and align `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: Phase C gate (T035).
  - **Responsibility**: Lock `POST /api/admin/content-sources/url` to `discovery: manual_url | discovered`, UUID idempotency key, title max 300, concrete provider-neutral success/error envelopes, `201` for both new/reused success with `data.reused`, Admin auth responses, application `429`, content `413/422`, and extraction `503`; the validator must parse YAML and recursively prove every local `$ref` target exists.
  - **Verify**: `python specs/002-tavily-web-ingestion/contracts/validate_openapi.py`; `npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`. PASS requires exit code 0, zero unresolved local refs, exact request-schema assertions, and explicit new/reused `201` route assertions.
  - **Complete when**: All local `$ref` values resolve, route tests match the locked contract, and no Tavily-specific client field exists.

- [x] T037 [P] Document server-only extraction configuration in `.env.example` and `docs/deployment.md`.
  - **Depends on**: T003, T029.
  - **Responsibility**: Describe `TAVILY_API_KEY` as optional for build/startup but required for Search and new URL extraction; document recoverable unavailability, no `NEXT_PUBLIC_` variant, credit-aware Basic-only policy, and no direct-fetch fallback; remove statements that URL ingestion works without Tavily.
  - **Verify**: `rg -n "TAVILY_API_KEY|NEXT_PUBLIC_TAVILY|Basic|direct.fetch|fallback" .env.example docs/deployment.md`; `$env:TAVILY_API_KEY=''; npm run build`.
  - **Complete when**: Configuration guidance matches actual behavior without revealing a key or requiring one at build time.

- [x] T038 [P] Update affected responsibility/security documentation in `docs/architecture.md`, `docs/security.md`, `docs/ai-course-current-flow.md`, `docs/ai-course-database-audit.md`, and `docs/ai-course-change-impact.md`.
  - **Depends on**: T030, T033.
  - **Responsibility**: Record Search=discovery, Basic Extract=confirmed/manual web acquisition, Supabase=immutable evidence/state, Gemini=Course generation; document untrusted Markdown, server credential, inactive direct fetch, unchanged file path, and no schema change without modifying `specs/001-topic-course-research/`.
  - **Verify**: `rg -n "Tavily|Search|Extract|immutable|Gemini|migration|direct" docs/architecture.md docs/security.md docs/ai-course-current-flow.md docs/ai-course-database-audit.md docs/ai-course-change-impact.md`; `git status --short -- specs/001-topic-course-research` must be empty.
  - **Complete when**: Only implementation-affected docs change and the final responsibility split is unambiguous.

- [x] T039 Create the opt-in real Tavily Basic integration smoke in `src/features/content-pipeline/providers/tavily-web-content-extraction-provider.integration.test.ts` and document it in `specs/002-tavily-web-ingestion/quickstart.md`.
  - **Depends on**: T009, T012.
  - **Responsibility**: Skip unless both `TAVILY_EXTRACT_SMOKE=1` and an explicit temporary `TAVILY_API_KEY` exist; call one benign approved public URL such as `https://example.com`, verify Basic response normalization, 80–200,000 eligibility, deterministic snapshot preparation, and at least one chunk; do not write database/Storage, print the key, or run by default/CI.
  - **Verify**: Default: `npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.integration.test.ts` reports skipped and consumes zero credits. Opt-in: `$env:TAVILY_EXTRACT_SMOKE='1'; $env:TAVILY_API_KEY='<temporary-test-key>'; npm run test -- src/features/content-pipeline/providers/tavily-web-content-extraction-provider.integration.test.ts; Remove-Item Env:TAVILY_EXTRACT_SMOKE; Remove-Item Env:TAVILY_API_KEY` passes exactly one controlled Basic extraction.
  - **Complete when**: The default skip and one explicitly authorized real smoke both have recorded results for production readiness, with no secret or persisted external payload.

- [x] T040 [P] Run and repair only in-scope Phase 4 research regressions in `src/features/content-pipeline/research/course-research.test.ts`, `src/features/content-pipeline/providers/tavily-web-search-provider.test.ts`, and `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`.
  - **Depends on**: T035.
  - **Responsibility**: Preserve Search discovery/ranking/Research More/candidate deduplication/selection and prove every pre-confirmation action has zero Extract calls.
  - **Verify**: `npm run test -- src/features/content-pipeline/research/course-research.test.ts src/features/content-pipeline/providers/tavily-web-search-provider.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`.
  - **Complete when**: Phase 4 behavior passes and Search remains distinct from Extract.

- [x] T041 Run and repair only in-scope Phase 3 source review/ingestion regressions in `src/features/content-pipeline/services/content-pipeline-service.test.ts`, `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`, and `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Depends on**: T035.
  - **Responsibility**: Preserve attach/detach, ordered initialization, ownership, Retry/Remove, partial settlement, rate/source limits, and source-qualified evidence.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`.
  - **Complete when**: Existing Phase 3 assertions plus new acquisition boundaries pass without a parallel persistence model.

- [x] T042 Run and repair only in-scope Phase 2 multi-source generation regressions in `src/features/content-pipeline/services/content-pipeline-service.test.ts` and provider tests under `src/features/content-pipeline/providers/`.
  - **Depends on**: T035.
  - **Responsibility**: Preserve source-qualified references, immutable revisions, citation validation, outline/Continue/Lesson flow, and Gemini provider ownership while asserting zero Extract calls.
  - **Verify**: `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/providers`; `npm run typecheck`.
  - **Complete when**: Multi-source generation passes entirely from stored evidence.

- [x] T043 Run the legacy PDF Course E2E regression in `tests/e2e/critical-flows.spec.ts` and update only test expectations made stale by the bounded server-internal change.
  - **Depends on**: T035.
  - **Responsibility**: Preserve upload → extraction/chunks → outline → Continue → Lessons/review → exactly-once publication and assert zero Tavily Search/Extract calls.
  - **Verify**: `npx playwright test tests/e2e/critical-flows.spec.ts --grep "PDF|reviews and publishes"`.
  - **Complete when**: The legacy PDF journey passes with no changed product step or payload.

- [x] T044 Run learner/progress smoke coverage in `src/app/api/courses/[courseId]/progress/__tests__/route.test.ts`, `src/app/api/lessons/[lessonId]/progress/__tests__/route.test.ts`, and `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T035.
  - **Responsibility**: Confirm published Tavily-derived and legacy courses retain learner access/progress behavior with no provider data or credential leakage.
  - **Verify**: `npm run test -- src/app/api/courses/[courseId]/progress/__tests__/route.test.ts src/app/api/lessons/[lessonId]/progress/__tests__/route.test.ts`; `npx playwright test tests/e2e/critical-flows.spec.ts --grep "learner|progress"`.
  - **Complete when**: Learner/progress tests pass unchanged in semantics.

- [x] T045 Run Exercise smoke coverage in `src/app/api/ai/exercises/generate/__tests__/route.test.ts`, `src/app/api/exercises/[exerciseId]/__tests__/route.test.ts`, and `tests/e2e/critical-flows.spec.ts`.
  - **Depends on**: T035.
  - **Responsibility**: Confirm Exercise generation/review behavior remains Gemini/application-owned and receives no Tavily provider DTO, raw content, or secret.
  - **Verify**: `npm run test -- src/app/api/ai/exercises/generate/__tests__/route.test.ts src/app/api/exercises/[exerciseId]/__tests__/route.test.ts`; `npx playwright test tests/e2e/critical-flows.spec.ts --grep "Exercise|exercise"`.
  - **Complete when**: Exercise smoke passes with no provider coupling.

- [x] T046 Verify non-destructive rollback and zero database change in `docs/deployment.md`, `specs/002-tavily-web-ingestion/data-model.md`, and the final repository diff.
  - **Depends on**: T037, T038.
  - **Responsibility**: Document/verify disabling new URL acquisition by absent server credential or a narrow recoverable route-disable patch while preserving existing source documents, snapshots, chunks, drafts, revisions, published content, and file/PDF; forbid destructive DB rollback and direct-fetch fallback.
  - **Verify**: `git status --short -- supabase/migrations`; `git diff --name-only -- supabase/migrations specs/001-topic-course-research` must both be empty; review `docs/deployment.md` for the explicit rollback procedure.
  - **Complete when**: Database-change task count remains zero and rollback preserves all persisted evidence/content.

- [x] T047 Execute the full quality, scope, security, and readiness gate over the final diff across `src/`, `tests/e2e/`, `docs/`, and `specs/002-tavily-web-ingestion/`.
  - **Depends on**: T036–T046, including a recorded authorized T039 real-smoke result for production readiness.
  - **Responsibility**: Run all supported gates and Playwright scenarios; review actual diff for scope, requirements, contract, architecture, storage, security, secrets, logging, cost, and regression findings; fix and rerun until no Critical/High/Medium finding remains; stage only task files and commit only after review PASS under repository policy.
  - **Verify**: `npm run lint`; `npm run typecheck`; `npm run test`; `npm run build`; `npm run test:e2e`; `git diff --check`; `git status --short`; `rg -n "NEXT_PUBLIC_TAVILY_API_KEY|TAVILY_API_KEY\s*=\s*[^\s]" src .env.example docs specs/002-tavily-web-ingestion`; `rg -n "TAVILY_API_KEY|NEXT_PUBLIC_TAVILY" .next/static` must return no matches after build; inspect `git diff --stat` and staged diff before commit.
  - **Complete when**: Every gate has recorded real output, secret/scope review passes, no migration or `001` change exists, the real smoke is explicitly recorded (not silently run), and review verdict is PASS.

### Phase D Gate

Feature readiness requires T036–T047, including the explicitly authorized real
provider smoke. Passing mocked tests alone is insufficient for the final
provider-readiness verdict. Push and deployment remain separate explicit user
actions.

---

## Dependencies and Execution Order

```text
Phase A: T001 → T002 → T003 → T004 → T005 → T006 → T007; T001 → T008 → T009 → A gate
  ↓
Phase B1 / US1: T010,T011,T013,T015 → T012,T014,T016 → T017 → T018
  ↓
Phase B2 / US2: T019 → T020 → T021
  ↓
Phase B3 / US4: T022,T023 → T024 → T025 → B gate
  ↓
Phase C1 / US3: T026 → T027
Phase C2 / US5: T028,T029,T030,T031,T032,T033,T034 → T035 → C gate
  ↓
Phase D: {T036,T037,T038,T039,T040,T041,T042,T043,T044,T045} → T046 → T047
```

- Phase A blocks every production-path change.
- User Story 1 establishes the selected-source path and is the MVP increment.
- User Story 2 reuses User Story 1's common orchestration; it must not fork it.
- User Story 4 validates multi-source recovery after both URL origins work.
- User Story 3 and User Story 5 start only after the Phase B ingestion contract
  is stable; their test additions may proceed in parallel where marked.
- Cleanup cannot block correctness: this task set retains the old fetcher and
  Readability/jsdom inactive and contains no dependency-removal task.
- Phase D starts only after the Phase C gate.

## Parallel Opportunities

- After T001, T008 can proceed independently from the sequential Tavily adapter
  test/implementation chain because it uses a separate normalizer test file.
- After the Phase A gate, T010 and T015 affect distinct component/repository test
  surfaces; tasks sharing `content-pipeline-service.test.ts` remain sequential.
- After T035, T037, T038, T039, and T040 touch distinct configuration,
  documentation, provider-smoke, and research files. T041–T045 remain sequential
  because they share service/provider or `critical-flows.spec.ts` surfaces.

## Implementation Strategy

### MVP first

1. Complete Phase A and its gate.
2. Complete Phase B1 / User Story 1.
3. Stop and verify Research remains discovery-only and confirmed selected URLs
   alone become immutable stored evidence.
4. Continue with manual URL, recovery, compatibility, and readiness phases; do
   not deploy the partial increment without separate authorization.

### Incremental verification

- Each test task must first fail for the intended missing behavior.
- Each implementation task must make only its paired tests pass, followed by the
  named focused command and completion check.
- Every phase gate reviews actual diff as well as tests.
- No task is complete solely because TypeScript compiles.

## Requirement and Success-Criterion Traceability

| Requirement group | Implemented/verified by |
|---|---|
| FR-001–FR-005 (Search/selection/manual/common Basic path) | T002–T003, T010–T012, T018–T021, T040 |
| FR-006–FR-008 (URL policy, existing controls, server key) | T002–T003, T011–T012, T031–T033, T037 |
| FR-009–FR-010A (response, fixed size/chunk eligibility, untrusted content) | T004–T009, T013–T016, T027, T032 |
| FR-011–FR-016 (deterministic snapshot, provenance, existing persistence, no migration) | T008–T009, T013–T017, T038, T046 |
| FR-017–FR-018 (stored-only generation, no implicit refresh) | T023–T027, T029, T034, T042 |
| FR-019–FR-023B (partial failure, Retry/Remove, provider failures, diagnostics) | T006–T007, T022–T025, T029, T032–T035 |
| FR-024–FR-027 (file, ownership, Gemini, Course/learner/Exercise compatibility) | T017, T027–T029, T034–T035, T041–T045 |
| FR-028–FR-032 (old path inactive, no rejected architecture, preserve 001) | T002–T003, T030, T038, T046–T047 |
| FR-033–FR-034 (dedup/idempotency, no global canonical uniqueness) | T017, T023–T024, T041, T046 |
| SC-001–SC-002A (same path, exact call/cost boundary, Basic only) | T002–T003, T010–T012, T018–T021, T030, T040 |
| SC-003–SC-003A and SC-011 (snapshot/chunks, thresholds, determinism) | T008–T009, T015–T016, T039 |
| SC-004 (zero Extract after storage) | T023, T026–T027, T034, T042 |
| SC-005–SC-006 (partial/provider recovery) | T006–T007, T022–T025, T029, T033 |
| SC-007–SC-009 (full web, PDF, source/course/learner/Exercise regression) | T018, T021, T025, T034–T035, T040–T045, T047 |
| SC-010 (no new persistence/migration) | T016–T017, T038, T046–T047 |
| SC-012–SC-014 (security, provenance, dedup/retry) | T013–T014, T023–T024, T027, T031–T033 |
| SC-015 (explicit real Basic smoke) | T039, T047 |

Exact functional-requirement index: FR-001, FR-002, FR-003, FR-004, FR-004A,
FR-005, FR-006, FR-007, FR-008, FR-009, FR-009A, FR-009B, FR-009C, FR-009D,
FR-009E, FR-010, FR-010A, FR-011, FR-012, FR-013, FR-013A, FR-013B, FR-013C,
FR-013D, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-019A, FR-020,
FR-021, FR-021A, FR-021B, FR-022, FR-022A, FR-023, FR-023A, FR-023B, FR-024,
FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033, and
FR-034 are mapped by the grouped rows above.

Exact success-criterion index: SC-001, SC-002, SC-002A, SC-003, SC-003A,
SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-012,
SC-013, SC-014, and SC-015 are mapped by the grouped rows above.

## Clarification Coverage

- Basic full-page Markdown, omitted filters/media, and no Advanced retry:
  T002–T005, T023–T024, T039.
- Fixed 80–200,000 normalized characters before metadata plus one usable chunk,
  identical on Retry: T008–T009, T015–T016, T023–T024, T039.
- Original/canonical URL, invalid-final rejection, canonical-derived domain, and
  stable retry identity: T013–T014, T023–T024, T036.

## Explicit Exclusions

There are **zero database-change tasks**. No task adds a migration, provider
table/session, embedding/vector store, crawler, Course/publication model, Tavily
Crawl/Research, Advanced fallback, direct-fetch fallback, Tavily-generated
curriculum, learner redesign, Exercise redesign, deployment, or modification to
completed `001-topic-course-research` artifacts.
