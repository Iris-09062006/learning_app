# Feature Specification: Tavily Web Ingestion

**Feature Identity**: `002-tavily-web-ingestion` (specification artifacts live on the existing
`agent/update-project-guidance` branch; no dedicated feature branch was created because no hook is configured)

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Replace the active direct public-web acquisition path with Tavily Extract for explicitly selected research results and manual URLs, preserve immutable evidence and all existing Course workflows, and leave file/PDF ingestion unchanged."

## Clarifications

### Session 2026-08-14

- Q: Which Tavily Extract policy should apply to each confirmed URL? → A: Always use Basic full-page Markdown without query/chunk filtering, images, or favicon; never retry automatically with Advanced, and keep failed, empty, or weak Basic results recoverable under the same-cost retry policy.
- Q: What deterministic minimum should make a Basic extraction usable as Course evidence? → A: Require 80 normalized content characters before snapshot metadata, no more than 200,000 characters, and at least one usable document chunk; apply the same fixed rule to every initial attempt and retry.
- Q: When Tavily returns a valid resolved/final URL different from the Admin-selected URL, which URL should the existing provenance model treat as canonical? → A: Preserve the Admin-selected URL as `source_url`; use Tavily's validated and normalized differing result URL as `canonical_url`, or the locally normalized selected URL when Tavily returns that same URL and therefore no distinct final URL. A missing/non-string required result URL is malformed, not a fallback case.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest Only Admin-Selected Research Results (Priority: P1)

An authorized Admin researches a topic, reviews the returned candidates, explicitly selects the
web pages that may become Course evidence, and confirms ingestion. The system asks Tavily to fetch
and extract only those confirmed pages; simply appearing in research results or using Research More
never causes a page to be extracted or stored.

**Why this priority**: This replaces the production-incompatible web acquisition step while
preserving Admin control over evidence and Tavily credit usage.

**Independent Test**: Research a topic, select a subset of candidates, use Research More, then
confirm ingestion and verify that Tavily Extract is invoked exactly once for each confirmed URL and
never for unselected candidates.

**Acceptance Scenarios**:

1. **Given** Tavily Search has returned reviewable candidates, **When** the Admin selects one candidate and confirms ingestion, **Then** only that selected URL is submitted for Tavily extraction.
2. **Given** candidates are displayed but none has been confirmed, **When** the Admin reviews, selects, unselects, or leaves the page, **Then** no Tavily extraction occurs and no candidate becomes Course evidence.
3. **Given** the Admin already has candidates and selections, **When** the Admin uses Research More, **Then** the action remains search-only, preserves the current selection behavior, and performs no Tavily extraction.
4. **Given** one selected URL has been successfully ingested, **When** the same confirmation is retried after an uncertain response, **Then** the existing staged-source and ownership rules prevent duplicate usable evidence.
5. **Given** a selected URL fails application URL validation, **When** ingestion is requested, **Then** the URL is rejected before Tavily Extract is called and the Admin receives a source-specific correction message.

---

### User Story 2 - Add a Manual URL Through the Same Web Path (Priority: P1)

An authorized Admin can add a known public web URL without first discovering it in topic research.
After the Admin confirms it for ingestion, the URL follows the same Tavily extraction, application
validation, snapshot, provenance, and evidence rules as a selected research result.

**Why this priority**: Manual Add URL is an existing recovery and curation path and must not retain
the known failing direct-fetch behavior.

**Independent Test**: Add `https://example.com` manually, confirm it, and verify that it uses the
same Tavily extraction-to-snapshot workflow and outcome contract as a selected research candidate,
without invoking the direct safe fetcher.

**Acceptance Scenarios**:

1. **Given** an authorized Admin enters a valid public HTTP(S) URL, **When** the Admin confirms ingestion, **Then** the system uses the same Tavily extraction path used for a confirmed research result.
2. **Given** a manual URL contains credentials, uses a non-HTTP(S) scheme, is malformed, or is a clearly local, private, or reserved literal target under the approved security policy, **When** the Admin attempts ingestion, **Then** the system rejects it before any provider request.
3. **Given** a valid manual URL is extracted successfully, **When** ingestion completes, **Then** it produces the same immutable evidence, provenance, staging, attachment, and source-specific status as an equivalent selected research URL.
4. **Given** the Tavily extraction capability is unavailable, **When** the Admin submits a manual URL, **Then** the Admin receives a recoverable error and may retry, remove the attempt, or use the existing file/PDF upload path.
5. **Given** Tavily returns a different resolved/final URL, **When** that URL passes application validation and normalization, **Then** the original Admin-selected URL and the final canonical URL are both preserved and the Admin-facing domain is derived from the canonical URL.
6. **Given** Tavily returns an invalid, credential-bearing, non-HTTP(S), or otherwise unacceptable final URL, **When** the application validates the result, **Then** the extraction fails recoverably and the invalid URL is not persisted as canonical provenance.

---

### User Story 3 - Preserve Immutable Evidence Across Generation (Priority: P1)

After Tavily returns readable content for a selected web page, the application validates and
normalizes the untrusted result into a deterministic Markdown snapshot, stores it privately as
immutable evidence, and uses the existing source, metadata, chunk, ownership, and citation model.
All outline and Lesson generation or regeneration uses that stored evidence rather than fetching
the live page again.

**Why this priority**: Stable, reviewable evidence is required for reproducible generation,
source-qualified citations, auditability, and cost control.

**Independent Test**: Ingest one selected page, record the stored snapshot and extraction call
count, then generate and regenerate both the outline and a Lesson; verify that the same stored
evidence is used and the Tavily extraction call count does not increase.

**Acceptance Scenarios**:

1. **Given** Tavily returns a valid extraction result, **When** the application accepts it, **Then** the content and provenance are serialized deterministically into an immutable Markdown snapshot in private storage before becoming generation evidence.
2. **Given** the same validated extraction result and provenance inputs, **When** snapshot serialization is repeated, **Then** the serialized evidence and its content hash are identical.
3. **Given** a successful snapshot exists, **When** extraction and chunk persistence complete, **Then** the existing source document, source metadata, chunks, Course-import ownership, and source-qualified evidence relationships represent that snapshot without a separate Tavily-result persistence model.
4. **Given** an outline or Lesson is generated or regenerated, **When** evidence is assembled, **Then** only the stored immutable snapshots and chunks attached to the Course import are used and Tavily Extract is not called.
5. **Given** a live web page changes after ingestion, **When** the Admin regenerates an outline or Lesson, **Then** the generated work continues to use the previously stored evidence.
6. **Given** extracted text contains instructions aimed at the generation system, **When** the text is normalized, stored, or supplied as evidence, **Then** it remains untrusted source content and cannot override authorization, selection, generation, citation, review, or publication rules.

---

### User Story 4 - Recover from Independent Web Extraction Failures (Priority: P1)

When multiple confirmed web sources are ingested, each URL has an independent outcome. A Tavily
failure for one URL does not discard successful sources or existing evidence, and the Admin can
retry or remove the failed attempt without restarting the Course import.

**Why this priority**: External provider failures and credit limits are expected operational
conditions; recovery must not corrupt or erase successfully captured evidence.

**Independent Test**: Confirm at least two URLs while one extraction succeeds and one fails, then
verify that the successful evidence remains attached and usable while the failed attempt can be
retried or removed independently.

**Acceptance Scenarios**:

1. **Given** multiple selected URLs, **When** at least one Tavily extraction succeeds and another fails, **Then** every successful source remains intact and every failed URL retains a separate actionable outcome.
2. **Given** a failed URL attempt, **When** the Admin retries it, **Then** only that failed URL is submitted again and previously successful sources are neither re-extracted nor duplicated.
3. **Given** a failed URL attempt, **When** the Admin removes it, **Then** existing successful evidence and the Course import remain unchanged.
4. **Given** no selected web URL yields usable evidence, **When** the extraction attempts finish, **Then** no unusable web evidence is attached, outline generation remains unavailable unless other valid evidence exists, and file/PDF upload remains usable.
5. **Given** Tavily credentials are missing or Tavily reports an authentication, quota, availability, timeout, malformed-response, or upstream failure, **When** a web extraction is attempted, **Then** the Admin receives a recoverable, non-secret-bearing error and existing work remains intact.
6. **Given** previously attached successful evidence exists, **When** a later web extraction fails, **Then** the earlier evidence, selection state, outline revisions, and Course-import state are not rolled back or rewritten.
7. **Given** a Basic extraction fails or returns empty or weak content, **When** the Admin retries that source, **Then** the retry uses the same Basic full-page Markdown policy and does not silently switch to Advanced or another higher-cost mode.
8. **Given** Tavily returns missing, blank, whitespace-only, malformed, effectively empty, or otherwise unusable content, **When** the application evaluates it before snapshot creation, **Then** the attempt is rejected as a recoverable source-specific failure and no evidence is attached.

---

### User Story 5 - Complete the Existing Course and Legacy File Flows (Priority: P1)

An Admin can complete the established Course workflow using web evidence acquired through Tavily:
Research, selection, extraction, immutable snapshot, outline review, Continue, Lesson generation and
review, and atomic publication. Gemini remains the generator for Course outlines and Lesson
content. Existing PDF/file-only, learner, and Exercise behavior remains unchanged.

**Why this priority**: The architecture change is successful only if it replaces web acquisition
without redesigning or regressing the proven downstream product.

**Independent Test**: Complete one Course using selected Tavily-acquired web evidence and complete
the established PDF-only acceptance flow; verify unchanged generation responsibilities, review,
citations, publication, learner behavior, and Exercise separation.

**Acceptance Scenarios**:

1. **Given** one or more Tavily-acquired sources are successfully attached, **When** the Admin generates an outline, uses Continue, generates and reviews Lessons, and publishes, **Then** the established Course-import lifecycle completes using the stored evidence.
2. **Given** stored web evidence is ready for generation, **When** an outline or Lesson is generated, **Then** Gemini Flash remains responsible for the generated educational content and Tavily contributes no outline or Lesson content.
3. **Given** the Admin uses Continue, **When** the approved outline advances to Lesson generation, **Then** the existing evidence lock, revision, source-qualified citation, and Continue semantics remain unchanged.
4. **Given** a Course is ready to publish, **When** publication is submitted or safely retried, **Then** the existing atomic and idempotent publication behavior remains unchanged.
5. **Given** an Admin uploads a supported PDF or file, **When** that source is ingested, **Then** the existing upload, extraction, snapshot/chunk, and Course-import path runs without Tavily Search or Tavily Extract.
6. **Given** an existing PDF-only import or published Course, **When** the new web ingestion path is introduced, **Then** it remains usable without data rewriting or new required steps.
7. **Given** a Course produced through the new web path is published, **When** learners use it or authorized users manage Exercises, **Then** learner and Exercise behavior remains unchanged.

### Edge Cases

- A research candidate is selected and then unselected before confirmation; it must never be extracted.
- Research More returns a URL already selected or previously ingested; deduplication and existing selection limits remain authoritative and no extraction happens during search.
- Two candidate URLs are textually different but normalize to the same canonical URL; one Course import must not receive duplicate evidence.
- A URL passes initial syntax validation but Tavily redirects, refuses, cannot read, or returns no meaningful content; the attempt fails independently without attaching empty evidence.
- Tavily returns malformed, unexpectedly large, unsupported, incomplete, or provenance-mismatched content; the application rejects the result before storage or chunk attachment.
- Tavily returns exactly one successful result whose returned URL differs from the selected URL; the result remains bound to the one-URL request, and the returned URL is accepted as the canonical candidate only if it passes the full application HTTP(S), credential, local/private/reserved, and canonical normalization policy. Missing/non-string result URLs, multiple successes, or contradictory success/failure entries are rejected as malformed; no same-origin or undocumented redirect-chain proof is required.
- A retry for the same staged source resolves to a different valid final URL; the attempt retains its existing staged-source and idempotency identity rather than creating a duplicate source attempt.
- A provider timeout or uncertain response is retried; successful evidence is not duplicated and unrelated successful URLs are not re-extracted.
- All web extractions fail while a valid uploaded file is already attached; the file evidence remains usable for the existing Course flow.
- The Tavily credential is absent at startup or build time; the application remains usable and file/PDF workflows remain available, while Tavily-dependent actions report a recoverable runtime error.
- The stored object succeeds but later source/chunk persistence fails, or vice versa; no incomplete source becomes usable evidence and retry follows existing staged-source recovery rules.
- Outline or Lesson regeneration occurs after the live page changes or disappears; regeneration continues from the original stored snapshot.
- A request attempts to force the legacy direct fetcher as an automatic fallback; the system declines that fallback and returns the normal recoverable Tavily-path error.
- An explicit source refresh is requested where no refresh capability is currently authorized; this change does not create one implicitly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST preserve Tavily Search as the web discovery capability for topic research and MUST keep research results as non-evidence candidates until explicit Admin confirmation.
- **FR-002**: Research, Research More, candidate review, selection, and unselection MUST NOT invoke Tavily Extract or persist candidate page content.
- **FR-003**: Only URLs in the Admin's final confirmed selection MUST be eligible for Tavily Extract invocation.
- **FR-004**: The system MUST use Tavily Extract with Basic depth and full-page Markdown as the active production acquisition path for every confirmed research-result URL.
- **FR-004A**: Tavily Extract requests MUST omit query/chunk filtering, images, and favicon, and MUST NOT automatically retry with Advanced depth.
- **FR-005**: Manual Add URL MUST use the same Tavily Extract ingestion path, validation rules, result contract, and evidence lifecycle as a confirmed research-result URL.
- **FR-006**: Before sending a URL to Tavily, the system MUST enforce the approved URL policy: HTTP(S) only, no embedded credentials, and rejection of malformed or clearly local, private, or reserved literal targets.
- **FR-007**: Existing Admin authorization, source-count limits, selection rules, rate controls, and Course-import ownership checks MUST apply before web extraction and attachment.
- **FR-008**: `TAVILY_API_KEY` MUST remain a server-only secret and MUST NOT be exposed in browser-visible configuration, payloads, logs, stored evidence, or Admin errors.
- **FR-009**: The system MUST validate Tavily responses for expected source identity, usable readable content, bounded content size, and required provenance before accepting them. Because each request contains exactly one URL, expected source identity means exactly one non-contradictory successful result bound to that single request; `results[0].url` MUST be a non-empty string under Tavily's documented response shape. A returned URL may differ from the selected URL, including by origin, and is accepted only as the canonical candidate after the full application URL policy in FR-013B; missing/non-string result URLs, multiple successful results, or a success and failure for the same one-URL request are malformed recoverable failures. The application MUST NOT invent same-origin or redirect-chain checks that Tavily does not provide.
- **FR-009A**: A Tavily extraction MUST contain at least 80 normalized content characters measured before application snapshot metadata is added, MUST contain no more than 200,000 normalized content characters, and MUST produce at least one usable document chunk before it can become Course evidence.
- **FR-009B**: The eligibility rule in FR-009A MUST remain fixed across provider outcomes, URLs, content types, initial attempts, and retries; the system MUST NOT dynamically raise or lower either character boundary.
- **FR-009C**: Missing, blank, whitespace-only, malformed, or effectively empty extraction results MUST be rejected as recoverable source-specific failures and MUST NOT create attached evidence.
- **FR-009D**: The adapter MUST first translate Tavily's response into a provider-independent acquisition result containing the requested URL, returned canonical candidate, raw full-page Markdown, and application capture timestamp. A separate application normalization step MUST produce the application-owned normalized extraction result containing the requested URL, validated canonical/final URL, optional title when available, normalized full-page Markdown content, normalized character count, and capture timestamp; Tavily-only fields MUST NOT enter database, learner, Course-generation, or UI domain contracts.
- **FR-009E**: When the normalized extraction result has no usable title, the system MUST derive the required display title through the existing deterministic provenance fallback from the confirmed candidate/manual input and then the canonical domain; a missing provider title alone MUST NOT create a provider-specific database field.
- **FR-010**: Extracted remote text MUST be treated as untrusted input throughout normalization, storage, chunking, and generation, and MUST NOT override application or generation instructions.
- **FR-010A**: A successful Basic full-page Markdown response MUST still pass application-owned validation and normalization into an immutable snapshot before chunking or generation; provider success MUST NOT make the content trusted or directly generation-eligible.
- **FR-011**: Every accepted Tavily extraction MUST be normalized into a deterministic immutable Markdown snapshot before it is eligible for extraction/chunk persistence or Course generation.
- **FR-012**: For identical validated content and provenance inputs, deterministic snapshot serialization MUST produce byte-identical content and the same content hash.
- **FR-013**: Accepted snapshots MUST be stored through the existing private evidence-storage controls and MUST retain existing source metadata provenance, including the Admin-selected original URL and canonical web origin.
- **FR-013A**: `source_url` MUST store the Admin-selected/original URL. `canonical_url` MUST store Tavily's differing resolved/result URL after application-side validation and normalization, or the locally normalized Admin-selected URL when Tavily returns that same URL and therefore provides no distinct final URL. A missing/non-string required `results[0].url` is a malformed response under FR-009 and MUST fail rather than use the fallback.
- **FR-013B**: A Tavily final URL MUST use HTTP(S), contain no embedded credentials, and pass the application's canonical URL validation; an invalid final URL MUST cause a recoverable source-specific failure and MUST NOT be persisted.
- **FR-013C**: The Admin-facing source domain MUST be derived from `canonical_url`, while `source_url` MUST remain preserved when the two values differ so provenance stays auditable.
- **FR-013D**: Web provenance MUST preserve the existing domain meaning of `ingestion_method`: `discovered` for URLs originating from search and `manual_url` for URLs entered manually; Tavily is the acquisition provider and MUST NOT replace those values.
- **FR-014**: Tavily extraction results MUST use the existing source document, source metadata, snapshot, chunk, staged-source, Course-import ownership, and source-qualified evidence model.
- **FR-015**: This feature MUST NOT add database persistence dedicated to raw Tavily extraction responses, provider jobs, or provider sessions.
- **FR-016**: The implementation MUST require no database migration unless planning proves that an existing mandatory acceptance criterion cannot be met safely without a minimal additive change; any such finding requires explicit scope review before implementation.
- **FR-017**: Outline generation, outline regeneration, Lesson generation, Lesson regeneration, review, Continue, and publication MUST read stored immutable evidence and MUST NOT call Tavily Extract.
- **FR-018**: Tavily Extract MUST be invoked only during explicit source ingestion or an explicitly authorized source refresh that already exists outside this change; this feature MUST NOT introduce an implicit or automatic refresh capability.
- **FR-019**: A failed extraction for one URL MUST NOT discard, rewrite, detach, invalidate, or re-extract any successful source.
- **FR-019A**: In a multi-URL ingestion action, each URL MUST settle independently; successful staged sources MUST remain committed and usable even when other URLs fail, with no batch-wide rollback of those independent successes.
- **FR-020**: Each failed URL attempt MUST remain independently retryable or removable under the existing staged-source lifecycle.
- **FR-021**: Retrying a failed URL MUST call Tavily Extract only for that URL using the same Basic full-page Markdown policy, MUST NOT silently increase extraction depth or cost, and MUST preserve idempotency for already successful evidence.
- **FR-021A**: Retry MUST reuse the same staged-source and idempotency identity. A changed valid final URL returned during retry MUST be evaluated within that same attempt, persisted only if the extraction becomes accepted evidence, and MUST NOT create a duplicate source attempt.
- **FR-021B**: Retry applies only to an unaccepted or failed staged attempt. Once usable immutable evidence has been accepted, ordinary retry, generation, and regeneration MUST NOT re-extract it; this feature introduces no source Refresh operation.
- **FR-022**: If no selected web URL produces usable evidence, the system MUST attach no unusable web source and MUST prevent generation unless another valid attached source satisfies the existing evidence requirement.
- **FR-022A**: A failed, empty, weak, malformed, oversized, or zero-chunk web attempt MUST NOT create a Course-import bridge row, become the order-zero anchor, or count as usable evidence.
- **FR-023**: Missing credentials and Tavily authentication, quota, availability, timeout, malformed-response, and upstream failures MUST produce recoverable source-specific Admin errors without exposing secrets or destroying current work.
- **FR-023A**: When Tavily is unavailable, both discovered and manual web URL ingestion MUST be temporarily unavailable; file/PDF ingestion and generation from already stored evidence MUST remain usable, and the legacy direct fetcher MUST NOT run as a fallback.
- **FR-023B**: Existing metadata-only operational diagnostics MUST distinguish validation, provider authentication, quota/rate-limit, timeout, upstream, response-validation, snapshot, and chunking failures without logging the API key, raw provider response, extracted content, snapshot body, or private evidence.
- **FR-024**: Existing manual file and PDF upload, extraction, snapshot/chunk persistence, and Course-import behavior MUST remain unchanged and MUST NOT invoke Tavily.
- **FR-025**: Existing source attachment/detachment, atomic ordered-set Course-import initialization, evidence membership, source-qualified chunk references, immutable revisions, and relational citation validation MUST remain authoritative.
- **FR-026**: Gemini Flash MUST remain responsible for Course outline and Lesson content generation; Tavily MUST NOT generate, revise, or approve outlines, Lessons, Exercises, or published curriculum.
- **FR-027**: Existing outline review, Continue semantics, Lesson review, citation handling, atomic/idempotent publication, learner behavior, and Exercise behavior MUST remain unchanged.
- **FR-028**: The existing direct safe-fetch and Readability path MUST NOT be the default production URL-ingestion path and MUST NOT be used as an automatic fallback for Tavily failures.
- **FR-029**: This change MUST NOT require immediate deletion of the legacy direct-fetch code; retention or later removal MUST be decided through implementation planning and regression evidence without reactivating it in the production path.
- **FR-030**: The full supported web Course journey MUST remain Research → explicit selection → Tavily extraction → immutable snapshot → existing evidence/chunks → Gemini outline → Continue → Gemini Lesson content → review → publication.
- **FR-031**: This feature MUST NOT introduce Tavily Crawl, Tavily Research, embeddings, a vector database, crawler infrastructure, research-session persistence, a new Course model, or a new publication model.
- **FR-032**: Historical artifacts and completed behavior defined by `001-topic-course-research` MUST remain unchanged; this specification governs only the bounded replacement of active web acquisition.
- **FR-033**: Existing canonicalization MUST deduplicate equivalent URLs in search results and across discovered/manual candidates within the same Course-creation workflow before extraction; repeated submission under the same idempotency identity MUST return the existing attempt rather than create duplicate snapshots, source documents, jobs, or bridge rows. `POST /api/admin/content-sources/url` MUST preserve current implemented browser behavior by returning HTTP `201` for both a newly accepted attempt and idempotent reuse, with the existing provider-neutral `data.reused` boolean distinguishing those outcomes; this bounded change MUST NOT introduce the historically documented but currently unimplemented `200` replay branch.
- **FR-034**: Canonical URL equality MUST NOT become a new global uniqueness rule because the existing model permits a later intentional immutable capture or another Admin's separate source; this change MUST add no canonical-URL uniqueness migration.

### Key Entities

- **Research Candidate**: An existing, reviewable Tavily Search result. It is not Course evidence and has no extracted page content until an Admin confirms it for ingestion.
- **Confirmed Web Source**: A selected research candidate or manual public URL that has passed application validation and is authorized for one explicit Tavily extraction attempt.
- **Provider Web Extraction Result**: The provider-independent adapter output containing requested URL, returned canonical candidate, raw full-page Markdown, and application capture time. It contains no Tavily-only DTO fields and is untrusted transient input to application normalization.
- **Normalized Web Extraction Result**: The application-owned value produced after provider translation, containing requested URL, validated canonical/final URL, optional title, normalized full-page Markdown, normalized character count, and application capture time. It is validated transient input to snapshot creation, not a new durable provider-result model.
- **Web Extraction Outcome**: The source-specific success or recoverable failure returned for a confirmed URL. It is workflow state, not a new durable provider-result model.
- **Immutable Markdown Snapshot**: The deterministic private evidence artifact created from validated Tavily content and provenance; later generation uses this artifact rather than the live page.
- **Source Document and Metadata**: The existing durable source identity and provenance records associated with the immutable snapshot; no Tavily-specific replacement is introduced.
- **Source Evidence Segment**: An existing source-qualified chunk derived from the immutable snapshot and eligible to support an outline or Lesson citation.
- **Course Import**: The existing staged, ordered collection of attached evidence and immutable outline/Lesson revisions that advances through Continue and publication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of confirmed research URLs and manual URLs use the same Tavily extraction-to-snapshot path, and 0% use the legacy direct fetcher as the active path or automatic fallback.
- **SC-002**: Across selection and Research More tests, Tavily Extract is called exactly once per newly confirmed eligible URL and zero times for unselected, unconfirmed, or search-only candidates.
- **SC-002A**: Across all initial and retry extraction tests, 100% of Tavily Extract calls use Basic full-page Markdown with no query/chunk filtering, images, or favicon, and 0% automatically use Advanced depth.
- **SC-003**: For 100% of successful web ingestions, a private immutable Markdown snapshot, stable content hash, existing source provenance, and source-qualified chunks are present before the source can be used for generation.
- **SC-003A**: Boundary tests accept normalized provider content at exactly 80 and 200,000 characters only when it yields at least one usable chunk, reject content below 80 or above 200,000 characters, and apply identical outcomes on retry.
- **SC-004**: Across outline and Lesson generation and regeneration tests, the Tavily Extract call count remains unchanged and 100% of evidence resolves to the originally stored snapshot.
- **SC-005**: In partial-failure tests with at least one success and one failure, 100% of successful sources remain attached and unchanged, while each failed URL can be retried or removed independently.
- **SC-006**: In missing-key, authentication, quota, timeout, unavailable, malformed-response, and upstream-failure tests, 100% of outcomes are recoverable, expose no secret, preserve existing work, and leave file/PDF upload usable.
- **SC-007**: The complete web Course acceptance journey succeeds from Research through explicit selection, extraction, snapshot, outline, Continue, Lesson generation/review, and exactly-once publication using Gemini for all generated educational content.
- **SC-008**: Existing automated acceptance coverage for the PDF/file-only Course flow completes with no changed step, payload expectation, stored evidence behavior, or Tavily invocation.
- **SC-009**: Existing acceptance coverage for source attach/detach, ordered Course-import initialization, immutable revisions, citations, Continue, publication, learner behavior, and Exercises remains passing.
- **SC-010**: Persistence review finds zero new Tavily-result tables, provider-session records, embeddings, vector stores, Course models, or publication models, and no database migration unless the exception process in FR-016 is explicitly approved.
- **SC-011**: For a fixed validated Tavily response, 100 repeated snapshot serializations produce byte-identical Markdown and one identical content hash.
- **SC-012**: In security testing, 100% of credential-bearing, non-HTTP(S), malformed, and clearly local/private/reserved literal URLs are rejected before a Tavily call, and extracted prompt-like text cannot alter privileged workflow behavior.
- **SC-013**: Provenance tests preserve the Admin-selected URL in `source_url`, persist only a validated normalized Tavily final URL (or normalized selected-URL fallback) in `canonical_url`, derive the displayed domain from `canonical_url`, and reject every invalid final URL without attaching evidence.
- **SC-014**: Duplicate and retry tests create exactly one staged source attempt for repeated equivalent URLs under the same Course-creation/idempotency identity, while preserving the existing ability to capture a later intentional snapshot outside that identity.
- **SC-015**: When an explicitly supplied Tavily test/free credential is available, final production-readiness verification includes at least one controlled real Basic Extract smoke test against a benign public URL; this test is opt-in and does not run unconditionally in normal unit suites.

## Assumptions

- `001-topic-course-research` remains the completed historical source of truth for the broader multi-source Course feature; this specification supersedes only its active direct-web-acquisition choice.
- Tavily Search and its existing candidate limits, deduplication, ranking, Research More, and selected-only handoff remain unchanged.
- Tavily Extract supports one explicit Basic full-page Markdown request per selected public URL and returns sufficient content and provenance for application-side validation; query/chunk filtering, images, favicon, and automatic Advanced retries are excluded.
- Existing source size and usability limits remain authoritative and are applied to validated normalized content where the prior limit referred to directly fetched web content.
- Web extraction eligibility is calculated from normalized Tavily content before application-owned snapshot metadata is added; generated title, provenance, and timestamp text cannot satisfy the 80-character minimum.
- The existing private storage, source document, source metadata, chunk, Course-import, citation, revision, Continue, and publication models can represent Tavily-acquired evidence without schema changes.
- No source-refresh capability is added by this change. If an already-authorized explicit refresh exists, it must follow the same validation, snapshot, and immutability boundary and must never be triggered by generation.
- Provider terms, privacy, security, and web-content usage approval are prerequisites for production rollout but do not change the functional boundaries in this specification.

## Scope Boundaries

### In Scope

- Replace active web-page fetching/extraction for confirmed research URLs and manual URLs with Tavily Extract.
- Validate and normalize Tavily content into deterministic immutable Markdown evidence.
- Preserve per-source retry/removal, selected-only cost control, private storage, provenance, chunks, Course-import ownership, citations, generation, review, Continue, and publication.
- Keep the legacy direct fetcher inactive as either temporary compatibility code or a later cleanup candidate, subject to planning and regression evidence.

### Out of Scope

- Tavily Crawl or Tavily Research.
- Tavily-generated outlines, Lessons, Exercises, or publication content.
- Replacing Gemini Flash.
- Embeddings, vector search, crawler infrastructure, or research-session persistence.
- A new Course, publication, source-evidence, or provider-result persistence model.
- Changes to PDF/file ingestion, learner workflows, or Exercise workflows.
- Production changes, deployment, database migration, or immediate deletion of the legacy fetcher as part of this specification task.
