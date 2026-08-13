# Phase 0 Research: Topic-Based Multi-Source Course Creation

**Feature**: `001-topic-course-research`

**Date**: 2026-08-13

**Verified HEAD**: `2fbba0b2cd7881fcae5b92a11bf73eb41a7fd469`

## Evidence Baseline

The relevant content-pipeline application files and migrations have no changes between the
change-impact audit baseline (`87db4612b219bcf497852b7dfcff65203233b7a8`) and current HEAD.
Direct inspection confirmed these current constraints:

- every `source_documents` insert triggers a single `course_import_jobs` row;
- `course_import_jobs.source_document_id` is non-null and unique;
- `document_chunks.chunk_index` is unique only within a source document;
- Course outline, Lesson generation, UI editing, and provider schemas use bare chunk indexes;
- `publish_course_import_job` archives only the anchor source;
- the browser checkpoint contains only one source ID and filename; and
- no production HTML readability or web-search dependency exists.

The audits therefore remain applicable and no architecture contradiction was found.

## Decision 1: Extend the Existing Course-Import State Machine

**Decision**: Keep the current `content-pipeline` module, immutable outline/content revisions,
Continue checkpoint, review flow, and atomic publication. Add source discovery and selection
before the existing outline review. Keep the historical migration-023 and one-Lesson paths
single-source and compatibility-only.

**Rationale**: The active Course-import model is already normalized around job-scoped revisions
and canonical chunk foreign keys. The cardinality bottleneck is isolated to job/source ownership
and application reference shapes.

**Alternatives considered**:

- A new Course-generation subsystem: rejected because it duplicates review/publication state.
- A research-session table: rejected because candidates are intentionally request/client state
  until selected.
- Embeddings or vector retrieval: rejected because explicit source-to-outline citations already
  define the retrieval boundary.

## Decision 2: Add a Bridge and Companion Metadata, Retain the Anchor

**Decision**: Add `course_import_job_sources` and `source_document_metadata`. Retain
`course_import_jobs.source_document_id` as the order-zero anchor. Add a transitional
`source_documents.initialize_import_job` flag defaulting to `true`; legacy inserts continue to
trigger job creation, while explicit multi-source materialization inserts with `false` and remains
unattached through provenance persistence and extraction. Add a nullable unique workflow
initialization key and immutable initialization-payload fingerprint to new-path Course-import
jobs. A single job-centric transaction accepts that key plus the complete ordered set of 1..8
usable extracted sources, creates one job, chooses order zero as anchor, and inserts all initial
bridge rows. Per-source mutation can attach only after a job ID exists. Initially, each attached
source can belong to only one import job.

**Rationale**: This preserves the existing file-only insert contract, prevents failed or
concurrently completed sources from creating standalone jobs, and keeps the shared source
lifecycle unambiguous. The workflow key is the common concurrency boundary that per-source
idempotency cannot provide. The bridge contains only usable Course evidence; the anchor remains a
compatibility alias for its order-zero row. An unattached staged attempt can therefore be retried
or removed without conflicting with the last-attached-source invariant.

**Alternatives considered**:

- Drop or null the anchor column: rejected because it creates deployment skew and breaks legacy
  reads/RPCs.
- Permit one source in several jobs immediately: rejected because `source_documents.status` is
  still job-like shared state.
- Put URL columns directly on `source_documents`: rejected because immutable snapshot storage
  invariants should remain uniform for file and web evidence.

## Decision 3: Represent Source-Set Staleness with Existing Job State

**Decision**: Attaching or detaching a source after an outline exists but before Continue keeps
historical revisions unchanged, clears any approval, and moves the job to `processing`. A new
job-scoped outline revision moves it back to `outline_review`. Continue remains unchanged and
locks the evidence set by making attach/detach invalid once an outline is approved.

**Rationale**: This enforces the locked product decision without adding a parallel revision
system or mutating `course_drafts`. Existing job status is sufficient to prevent Continue while
the current source set is stale.

**Alternatives considered**:

- Store a source-set hash on `course_drafts`: rejected because the audited draft schema is
  structurally protected.
- Delete or overwrite the old outline: rejected because outline revisions are immutable.
- Allow source mutation during content review: rejected by the locked Continue boundary.

## Decision 4: Use Source-Qualified Application Refs and Request-Local Provider Refs

**Decision**: Application DTOs use source-qualified references containing
`sourceDocumentId + chunkIndex`; services resolve them against the job bridge to canonical
`document_chunks.id`. Each provider call receives dense request-local integer `sourceRef` values
and a source label. Provider output is accepted only when every returned ref exists in the
request-local map. Persistence receives canonical chunk IDs and validates bridge membership again
inside the transaction.

**Rationale**: Two documents may both have chunk `0`. Source-qualified refs are stable for Admin
review, request-local refs keep database IDs out of AI prompts, and canonical FK validation
preserves database provenance.

**Alternatives considered**:

- Concatenate bare chunk indexes: rejected because it can cite the wrong document.
- Trust database chunk IDs returned by AI or the browser: rejected because existence is not job
  ownership.
- Redesign citation tables: rejected because they already store canonical chunk foreign keys.

## Decision 5: Use Deterministic Source-Aware Context Selection

**Decision**: Preserve the existing 80,000-character provider cap. For job-wide outline
generation, select chunks round-robin by `source_order`, preserving each source's `chunk_index`
order and guaranteeing at least one chunk per attached non-empty source before filling remaining
capacity. A Lesson may reference only chunks supplied to its outline request, so its later content
generation context remains within the same bound.

**Rationale**: A leading-prefix strategy would systematically favor the first source. Round-robin
selection is deterministic, testable, does not require embeddings, and preserves representation
for up to eight sources.

**Alternatives considered**:

- Authority-weighted selection: rejected for the first release because Admin-only scores are
  advisory and must not silently authorize evidence.
- Truncate per Lesson after outline approval: rejected because it could drop explicitly approved
  evidence.
- Vector retrieval: rejected as unnecessary scope expansion.

## Decision 6: Use Brave Web Search Behind a Local Provider Interface

**Decision**: Define one server-only `WebSearchProvider` interface and implement a Brave Web
Search adapter. Use a deterministic planner that issues at most three bounded queries per round:
the normalized topic, a Vietnamese educational-intent variant, and a language-aware
official/reference-material variant. Request only web results, normalize vendor payloads, and
return at most 20 ranked candidates. `Research More` advances a bounded page cursor; the browser
merges unique results, preserves selected candidates, and caps the visible list at 20.

**Rationale**: Brave provides explicit language/country controls, supports up to 20 web results
per request, and supports bounded pagination. The provider boundary prevents vendor payloads from
becoming domain/UI contracts. See the official
[Web Search API reference](https://api-dashboard.search.brave.com/api-reference/web/search/get)
and [pagination guidance](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started).

**Alternatives considered**:

- AI-generated query planning: rejected initially because deterministic queries meet the
  requirement without another paid model call or prompt surface.
- Provider-specific DTOs in the UI: rejected because they prevent substitution and complicate
  validation.
- Persist all search results: rejected by the selected-evidence-only product rule.

## Decision 7: Normalize, Deduplicate, and Rank Deterministically

**Decision**: Canonicalize HTTP(S) URLs by lowercasing scheme/host, removing fragments and default
ports, normalizing path syntax, and removing only an explicit denylist of tracking parameters.
Deduplicate by canonical URL. Compute bounded advisory scores: relevance combines normalized
provider rank with topic/query token overlap in title and snippet; authority uses conservative
HTTPS and recognized government/education/official-documentation signals with a neutral default.
Break ties by canonical URL. Scores remain Admin-only.

**Rationale**: Deterministic scoring supports stable tests and review ordering without claiming
that a score proves truth or licensing suitability.

**Alternatives considered**:

- Remove all query parameters: rejected because parameters may identify distinct content.
- Use an LLM ranker: rejected because it adds cost and nondeterminism before evidence selection.
- Treat rank as automatic ingestion authorization: rejected because Admin selection is the
  authoritative decision.

## Decision 8: Fetch Web Pages with a Connection-Bound SSRF Guard

**Decision**: Implement a server-only fetcher on Node's HTTP/HTTPS primitives with a custom
`lookup` callback so the address checked is the address used for the connection. Allow HTTP(S)
only on ports 80/443; reject credentials and IP-literal URLs. Resolve all A/AAAA addresses and
reject the destination if any address is loopback, private, link-local, carrier-grade NAT,
multicast, documentation/reserved, or otherwise non-public. Disable connection reuse, follow at
most five redirects manually, repeat full validation at every hop, and reject HTTPS-to-HTTP
downgrades. Send no cookies, authorization, or user headers.

Use Node's stable `net.BlockList` with an explicit reviewed IPv4/IPv6 CIDR set for address
classification, avoiding another runtime dependency. Node 22 supports subnet rules and address
checks through this API; see the official
[Node 22 net documentation](https://nodejs.org/download/release/latest-jod/docs/api/net.html).

Use one overall 15-second deadline, a 16 KiB response-header ceiling, and a 2 MiB decompressed
body ceiling. Accept only successful readable `text/html` or `text/plain` responses. Stream and
abort as soon as a declared or observed limit is exceeded.

**Rationale**: Preflight-only DNS validation is vulnerable to rebinding between validation and
connection. Node HTTP clients permit a custom `lookup` function, while `dns.lookup(..., {all:
true})` exposes all candidate addresses for validation. See the official Node
[HTTP request options](https://nodejs.org/api/http.html) and
[DNS lookup documentation](https://nodejs.org/api/dns.html).

**Alternatives considered**:

- Global `fetch` after one DNS lookup: rejected because it does not bind validation to the actual
  connection.
- Allow arbitrary ports: rejected because it expands access to unintended services.
- Follow redirects automatically: rejected because every redirect target must be revalidated.

## Decision 9: Extract Main Content and Store Deterministic Markdown Snapshots

**Decision**: Add `@mozilla/readability` and move the already-used `jsdom` package to production
dependencies. Construct the DOM with scripts and remote resource loading disabled, run
Readability with an element ceiling, and use only `title`, `textContent`, language, excerpt, and
published-time metadata. Normalize the extracted text with the existing document normalization
rules, serialize a deterministic Markdown snapshot containing title, canonical URL, retrieval
time, and plain main text, store it privately as `text/markdown`, then reuse
`extractDocumentText`, `chunkDocumentText`, and `replaceDocumentChunks`.

**Rationale**: Readability is the Firefox Reader View extraction library, documents Node usage
with jsdom, and exposes bounded parser options. Scripts/resources remain disabled and extracted
HTML is never rendered. See the official
[Mozilla Readability repository](https://github.com/mozilla/readability).

**Alternatives considered**:

- Store and regenerate from the live URL: rejected because evidence would be mutable.
- Persist raw HTML as generation input: rejected because it retains noise and a larger injection
  surface.
- Build a custom readability heuristic: rejected because it adds brittle parsing logic.

## Decision 10: Make New Ingestion Idempotent Without a Research Table

**Decision**: New URL and optional-file ingestion requests carry a client-generated UUID
`idempotencyKey`, retained in the versioned browser checkpoint. Derive the private storage path
from actor ID plus that key. The unique storage path and an unattached materialization operation
make repeat requests return the same staged source attempt when ownership and request identity
match. Materialization persists provenance with `initialize_import_job=false`, but never creates a
job or bridge row. Extraction/chunk replacement retries against that identity and stored immutable
snapshot. If storage exists without a database row after an interrupted attempt, the service
performs bounded cleanup and retries materialization.

The checkpoint also retains one client-generated UUID `initializationKey` for the workflow. After
current attempts settle, the service submits that key with the full ordered usable-source set to
one atomic initializer. The transaction validates ownership, 1..8 cardinality, extraction,
non-empty chunks, and unattached membership for the entire set; creates one job with order zero as
anchor; and inserts all initial bridge rows. A unique nullable job initialization key plus an
immutable canonical fingerprint of ordered source IDs and normalized initial metadata makes
duplicate/concurrent identical requests return that job. The same key with a different set fails,
and a competing key that overlaps already-attached sources conflicts. No per-source no-job
initializer exists, so concurrently usable A and B must enter one set instead of independently
creating jobs. Later usable sources attach only with the returned job ID.

Failed attempts never enter initialization, remain retryable/removable without a job, and an
all-failed run creates no job. Legacy file-only requests continue using random paths and their
unchanged immediate-initialization contract.

**Rationale**: This covers network retries and refresh recovery without persisting unselected
candidates or adding a research-session model, while keeping “materialized source attempt” and
“usable Course evidence” as distinct states. Per-source ingestion idempotency prevents duplicate
source rows, while workflow initialization idempotency prevents split or duplicate initial jobs
and bridge sets.

**Alternatives considered**:

- Canonical URL uniqueness across the database: rejected because different Admins or later
  snapshots may legitimately capture the same URL.
- Browser state alone: rejected because an uncertain response can still create duplicates.
- A `research_sessions` table: explicitly out of scope.

## Decision 11: Preserve Security, Error, and Observability Boundaries

**Decision**: All new routes require the existing active-Admin service check and no-store
responses. Add distributed rate-limit scopes for research rounds and URL fetches. Keep provider
keys server-only. Log stable error codes and identifiers but never source bodies, snapshots,
provider payloads, tokens, or private addresses. Treat every source string as untrusted in search,
extraction, prompts, and UI rendering. Add metrics for search/fetch result, attachment rejection,
invalid provider refs, stale-outline attempts, and publication retry outcomes.

**Rationale**: This extends existing security and operational patterns without exposing private
source content or creating a new privilege boundary.

For source status, distinguish ingestion failure from Course-generation failure. New-path staged
sources become usable only as `extracted` non-empty snapshots. Job-wide outline work records its
transient state on the Course-import job and leaves attached source states unchanged while the
provider call runs; successful immutable outline persistence marks the exact set
`ready_for_review`, while failure changes no source state and records the error on the job. This
preserves retryable evidence even across process interruption and avoids misreporting a provider
failure as bad source ingestion. Continue locks ownership without changing source status, and
publication remains the only operation that archives evidence.

**Alternatives considered**:

- Browser-side fetching/search: rejected because it leaks credentials and cannot enforce SSRF or
  immutable snapshots.
- Detailed raw-error logging: rejected because pages and provider bodies may contain sensitive or
  adversarial data.

## Production Dependencies and Rollout Gates

- Brave Search API credentials and provider terms must be approved before Phase 4 is enabled.
- Product/legal/security must approve web snapshot retention and site-access policy before web
  ingestion is enabled in production. This is a rollout gate, not a new architecture decision.
- The additive database migration and backfill verification must deploy before application code
  performs multi-source writes.
- `@mozilla/readability` and runtime `jsdom` must pass license, vulnerability, bundle, and Node 22
  compatibility checks before Phase 3 merges.
- Existing PDF-only and publication regression suites remain mandatory in every rollout phase.
