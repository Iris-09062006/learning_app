# Research: Tavily Web Ingestion

**Feature**: `002-tavily-web-ingestion`
**Date**: 2026-08-14

## Sources Reviewed

- Current repository implementation and dependency tree at HEAD
  `cb57e3c92020c859903610740c352d0d191b476a`.
- Completed `001` specifications, contracts, and implemented source pipeline.
- `docs/ai-course-current-flow.md`, `docs/ai-course-database-audit.md`, and
  `docs/ai-course-change-impact.md`, treated as historical context where HEAD is
  newer.
- [Official Tavily Extract API reference](https://docs.tavily.com/documentation/api-reference/endpoint/extract),
  [Extract best practices](https://docs.tavily.com/documentation/best-practices/best-practices-extract),
  and [API-credit documentation](https://docs.tavily.com/documentation/api-credits).

## Decision 1: Use a provider-neutral server boundary

**Selected**: Add `WebContentExtractionProvider` with two explicit transient
application types. `WebContentExtractionResult` is the provider-independent
adapter output (requested URL, returned canonical candidate, raw Markdown,
capture time). `NormalizedWebExtractionResult` is produced by a separate
application normalizer (validated canonical URL, optional deterministic title,
normalized Markdown/count, capture time). The Tavily adapter uses native
server-side `fetch`, following the existing Tavily Search adapter's credential,
timeout, and error-isolation pattern.

**Rationale**: Persistence and downstream processing are application concerns;
Tavily-specific request/response fields should end at the adapter. Native
`fetch` avoids adding an SDK dependency for one stable HTTP operation.

**Rejected**:

- Calling Tavily directly from the route: couples public API behavior to a
  vendor and makes service-level retry/idempotency harder to prove.
- Calling Tavily from the browser: exposes credentials and violates the
  server-only provider rule.
- Adding the Tavily SDK: unnecessary dependency and surface area for this
  bounded endpoint.

## Decision 2: Use one exact Basic full-page Markdown request

**Selected**: One URL per `/extract` request with `extract_depth: "basic"`,
`format: "markdown"`, `include_images: false`, `include_favicon: false`, and a
10-second provider timeout. Omit query and chunk controls. Add a bounded local
abort guard and no retry.

**Rationale**: The selected URL is already known. Tavily's Extract guidance
positions Extract for content retrieval, and query/chunk controls select
relevant snippets rather than the required full-page evidence. Basic has the
lower documented credit cost and is the locked product policy.

**Rejected**:

- Search `raw_content`: Search remains discovery-only and does not own the
  selected source snapshot.
- Advanced fallback: violates deterministic cost and retry policy.
- Crawl or Research: introduces fan-out and changes feature scope.
- Batching selected URLs: complicates source-specific failures and current
  idempotency; the existing UI is sequential.

## Decision 3: Keep application-owned normalization and eligibility

**Selected**: Normalize `raw_content` before snapshot metadata, then require
80–200,000 normalized characters and at least one usable application chunk.
Apply the same rule to every new acquisition and acquisition retry.

**Rationale**: Provider success does not prove usable evidence. Deterministic
application checks preserve existing behavior, bound storage/context size, and
prevent metadata from making weak content appear eligible.

**Rejected**:

- Trusting any non-empty provider result.
- Dynamic thresholds based on URL, content type, provider, or retry count.
- Counting snapshot front matter toward the minimum.
- Persisting raw Tavily JSON as the evidence artifact.

## Decision 4: Treat Tavily's result URL as a validated canonical candidate

**Selected**: Preserve the Admin-selected value in `source_url`. When Tavily
returns its result URL, validate and normalize it using the application's
canonical URL rules before assigning `canonical_url`. If no distinct resolved
URL is available because the result URL equals the selected URL, use the locally
normalized selected URL. A missing/non-string required result URL is malformed,
not a fallback case. Derive domain from `canonical_url`. An invalid returned URL
fails the source without persistence.

**Rationale**: Tavily's documented successful result includes `url` and
`raw_content`, but the public reference does not define a separate redirect
history or guarantee a distinct “final URL” field. Calling it a provider-reported
canonical candidate avoids claiming stronger redirect provenance than the API
documents while satisfying the locked validation rules.

**Rejected**:

- Replacing `source_url` with the provider URL: loses auditable Admin intent.
- Persisting an invalid provider URL and falling back silently: makes provenance
  misleading.
- Creating a new attempt when the result URL changes: breaks idempotency.

## Decision 5: Preserve staged identity and split retry by materialization state

**Selected**:

- Before snapshot/source materialization, Retry repeats the same one-URL Basic
  acquisition under the same staged idempotency identity.
- After snapshot materialization, Retry reuses that immutable snapshot and only
  reruns existing extraction/chunking.
- An accepted idempotency key reuses the source without a provider call.

**Rationale**: This matches current retry routes and ensures provider calls are
made only when evidence does not yet exist. A new canonical URL never changes
the attempt identity.

**Rejected**:

- Re-extracting from Tavily after a snapshot exists.
- Changing depth or threshold on retry.
- Using canonical URL as the idempotency key.

## Decision 6: Make no database or storage-contract change

**Selected**: Reuse `source_documents`, `source_document_metadata`,
`document_chunks`, `course_import_job_sources`, current repository RPCs, and the
existing private deterministic snapshot path.

**Rationale**: Migration `030` already stores original and canonical URLs,
domain, source type, ingestion method, discovery linkage, capture time, and job
association. The immutable Markdown snapshot is the correct persisted evidence.

**Rejected**:

- Tavily provider/request/response tables.
- New columns or enums for provider name/status.
- Raw-response objects in metadata or Storage.

## Decision 7: Preserve sequential concurrency and bounded costs

**Selected**: Keep the current sequential selected-source ingestion loop. The
maximum concurrent Extract calls per Admin action is 1, with the existing limit
of 8 selected sources and one URL per call.

**Rationale**: It is the actual current behavior, provides simple partial-failure
isolation, and bounds load and credit usage without new orchestration.

**Rejected**:

- `Promise.all` for selected extraction.
- Provider-side URL batches.
- Background fan-out or unbounded queueing.

## Decision 8: Keep the direct-fetch code inactive during this bounded change

**Selected**: Remove it from the active service dependency path but retain the
files and packages by default. Consider deletion only as a separate mechanical
cleanup after repository-wide reference and regression proof.

**Rationale**: Removing packages is not required to achieve the behavior and can
expand regression scope. Retention does not authorize fallback.

**Rejected**:

- Keeping direct fetch as a hidden recovery path.
- Deleting it before the active switch is verified.

## Decision 9: Use stable provider-neutral errors

**Selected**: Keep internal error categories detailed while mapping browser
responses to existing/generic source failure, payload-too-large,
rate-limit, or web-extraction-unavailable envelopes. Provider quota maps to
service unavailable, not the application's own rate-limit response.

**Rationale**: Admin recovery needs a stable retry signal, not vendor account
details. Security requires keys, response bodies, and credential-bearing URLs
to stay out of responses and logs.

**Rejected**:

- Returning Tavily error bodies/codes directly.
- Reporting provider quota as an Admin request-rate violation.

## Decision 10: Keep real-provider testing optional

**Selected**: Default tests use a fake HTTP boundary. A separate smoke test runs
only when both an explicit opt-in flag and a temporary Tavily credential are
provided.

**Rationale**: The normal suite must be deterministic, offline, and secret-safe;
the optional smoke catches external contract drift without becoming a CI
dependency.

**Rejected**:

- Mandatory live-provider CI tests.
- Fixtures containing real credentials or provider response dumps.

## Decision 11: Use non-destructive disablement for rollback

**Selected**: Disable new URL acquisition through absent server credential or a
narrow service-unavailable route patch while continuing to use already stored
snapshots and all file/PDF flows.

**Rationale**: There is no schema to roll back, and reverting to the known-broken
direct-fetch acquisition path would violate the feature's core safety decision.

**Rejected**:

- Automatic or configuration-driven direct-fetch fallback.
- Deleting already stored Tavily-derived snapshots or chunks.

## Decision 12: Bind a Tavily result to the one-URL request by cardinality

**Selected**: Require exactly one successful result and a non-empty string
`results[0].url` for the single submitted URL. Reject multiple results or a
contradictory success/failure response. Treat a differing returned URL,
including a different origin, as the provider's canonical candidate and accept
it only after the full application URL policy; do not require same-origin or a
redirect chain Tavily does not expose.

**Rationale**: One URL per request provides deterministic response association.
Tavily documents a result URL but not redirect history, so additional origin or
redirect proof would be invented behavior and could reject legitimate canonical
redirects.

**Rejected**:

- Accepting missing/non-string result URLs as successful responses.
- Same-origin-only canonical URLs.
- Inferring or fabricating redirect provenance.

## Decision 13: Preserve current implemented URL endpoint status behavior

**Selected**: Keep HTTP `201` for both newly accepted and idempotently reused URL
attempts, with `data.reused` distinguishing them. Restore the remainder of the
request and response schema exactly to current HEAD (`discovery` string enum,
UUID idempotency key, bounded title, concrete success envelope).

**Rationale**: Current HEAD is the brownfield runtime source of truth. The
completed `001` OpenAPI documented a `200` replay branch that the implemented
route never emitted. Introducing that branch here would be an unrelated public
behavior change rather than preserving compatibility.

**Rejected**:

- Adding the historically documented but unimplemented `200` replay response.
- A boolean `discovery` field or provider-specific browser fields.

## Resolved Unknowns

All design questions required for planning are resolved. There are no remaining
clarification items. The only provider nuance is documented, not open:
Tavily exposes a result `url`, but its public Extract reference does not promise
a distinct redirect-final field; application validation remains authoritative.
