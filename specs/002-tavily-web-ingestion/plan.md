# Implementation Plan: Tavily Web Ingestion

**Branch**: `002-tavily-web-ingestion` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for the bounded brownfield change `002-tavily-web-ingestion`

## Summary

Replace only the active acquisition step for Admin-selected web URLs with a
provider-neutral extraction boundary backed by Tavily Extract. Every selected
URL is sent as a single Basic, full-page Markdown extraction request. The
application validates the provider response and canonical URL, normalizes the
untrusted Markdown, enforces the fixed 80–200,000 normalized-character range,
serializes an immutable private snapshot, and then reuses the existing source
metadata, chunking, job-source, generation, review, and publication pipeline.

Search remains discovery-only. File/PDF ingestion and all downstream generation
flows remain unchanged. There is no Crawl, Research, Advanced fallback,
automatic direct-fetch fallback, database migration, Tavily response table, or
browser-visible provider contract.

## Technical Context

**Language/Version**: TypeScript 5.9.3 on Node.js 22.x
**Primary Dependencies**: Next.js 15.5.22 App Router, React 19.2.8, Supabase JS 2.112.1, native server-side `fetch`; existing `@mozilla/readability` 0.6.0 and `jsdom` 26.1.0 remain installed but leave the active URL-ingestion path
**Storage**: Existing Supabase Postgres entities plus the existing private Storage bucket for immutable source snapshots; no schema or policy change
**Testing**: Vitest 3.2.7, React Testing Library, Playwright 1.62.1, existing lint/typecheck/build scripts
**Target Platform**: Next.js Node runtime, deployed in the project's existing server environment; Admin browser remains a thin client
**Project Type**: Brownfield web application
**Performance Goals**: One Extract request per selected URL; maximum Extract concurrency of 1 per Admin selection action; at most the existing 8 selected sources; provider timeout of 10 seconds with a bounded local abort guard; no fan-out or hidden retries
**Constraints**: Basic extraction only; Markdown only; no query/chunk filtering, images, favicon, Advanced retry, or direct-fetch fallback; fixed 80-character minimum and 200,000-character maximum before snapshot metadata; at least one usable chunk; immutable snapshot must precede generation; server-only credential; stable generic client errors
**Scale/Scope**: One provider adapter, one existing URL-ingestion service path, one existing Admin endpoint, existing retry paths, focused unit/integration/E2E regression coverage; no database, role, endpoint, or UI workflow expansion

## Constitution Check

The repository has no separate Spec Kit constitution. The governing checks are
`AGENTS.md`, `CODEX.md`, and the ordered project source-of-truth documents.

### Pre-design gate

| Gate | Result | Evidence |
|---|---|---|
| Bounded to the requested change | PASS | Only selected web-page acquisition changes; Search, file/PDF, generation, and publication contracts remain in place. |
| Existing architecture and contracts preserved | PASS | The provider feeds the current immutable-snapshot and chunk pipeline; the Admin endpoint keeps its request and success envelope. |
| No unsupported database/API expansion | PASS | Migration `030` and current repository RPCs already hold required provenance; no tables, columns, enums, roles, or endpoints are added. |
| Security boundaries preserved | PASS | Tavily is called only on the server; credentials and raw provider responses are neither returned to the browser nor persisted. |
| Immutable evidence preserved | PASS | Normalized provider content is stored before chunking, generation, regeneration, continuation, lesson generation, or publication. |
| Testability and rollback identified | PASS | Provider, service, route, UI, generation-boundary, regression, and opt-in real-provider checks are specified below; rollback is non-destructive. |

### Post-design gate

PASS. `research.md`, `data-model.md`, `contracts/openapi.yaml`, and
`quickstart.md` introduce no constitution exception. Complexity tracking is not
required because the design adds one narrow adapter seam and reuses existing
persistence and orchestration.

## Project Structure

### Documentation for this feature

```text
specs/002-tavily-web-ingestion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── spec.md
└── checklists/
    └── requirements.md
```

No `tasks.md` is produced during this command.

### Source code affected by the future implementation

```text
src/
├── app/api/admin/content-sources/url/route.ts
└── features/content-pipeline/
    ├── providers/
    │   ├── web-content-extraction-provider.ts              # new boundary
    │   ├── tavily-web-content-extraction-provider.ts       # new adapter
    │   └── *.test.ts                                       # request/response/error tests
    ├── services/content-pipeline-service.ts                # switch URL acquisition
    ├── extraction/web-snapshot.ts                          # reuse or narrowly adapt serializer
    ├── content-pipeline-errors.ts                          # generic error mapping
    └── *.test.ts                                           # ingestion/retry/generation boundaries

tests/e2e/critical-flows.spec.ts                            # bounded regression updates
```

The existing `web-page-fetcher.ts` and `web-page-extractor.ts` cease to be
dependencies of the active URL-ingestion path. They and their dependencies are
not removed in this feature unless a final repository-wide usage proof shows
that deletion is a purely mechanical, independently verified cleanup. Default
scope is to retain them inactive.

## Structure Decision

Keep the change inside the existing content-pipeline feature. Define a small
server-only `WebContentExtractionProvider` interface so the service owns
validation, persistence, chunking, and retry semantics while the Tavily adapter
owns HTTP request/response translation. Do not place Tavily concepts in route,
browser, repository, database, or generation types.

The provider result is data, not trusted content. The application remains the
authority for URL validation, normalization, eligibility, snapshot format,
storage location, metadata materialization, and chunks.

## Planned Design

### Provider boundary

Add a server-only interface with one operation that accepts one already
application-validated Admin-selected URL. The adapter returns a
`WebContentExtractionResult` containing the requested URL, provider-reported URL
candidate, raw full-page Markdown, and capture timing. A separate
application-owned normalizer produces `NormalizedWebExtractionResult` with the
validated canonical URL, optional deterministic title, normalized Markdown,
normalized character count, and capture timing. Neither type exposes Tavily
request IDs, usage, raw response objects, images, or favicon data downstream.

The Tavily adapter sends exactly one URL to `POST /extract` with:

```json
{
  "urls": "<validated selected URL>",
  "extract_depth": "basic",
  "format": "markdown",
  "include_images": false,
  "include_favicon": false,
  "timeout": 10
}
```

It omits `query`, `chunks_per_source`, and all Advanced/Crawl/Research options.
It uses `Authorization: Bearer <TAVILY_API_KEY>`, `Content-Type:
application/json`, a no-store request, and a bounded local abort guard. There is
one outbound call and no adapter-level retry.

### Response and eligibility pipeline

For each successful provider response, the service performs these steps in
order:

1. Require exactly one structurally valid successful result for the one-URL
   request. Bind that result to the request by cardinality. Require a non-empty
   string `results[0].url`; reject missing/non-string URLs, multiple successes,
   or a success and failure for the same request as malformed. A differing URL,
   including a different origin, is allowed to proceed as a canonical candidate;
   do not invent same-origin or redirect-chain checks absent from Tavily's API.
2. Treat `raw_content` as untrusted Markdown; normalize it with the existing
   deterministic document-text rules.
3. Measure normalized content before application snapshot metadata. Reject
   missing, blank, whitespace-only, effectively empty, under-80-character, or
   over-200,000-character content as a recoverable source-specific failure.
4. Determine `canonical_url`: validate and normalize Tavily's returned result
   URL when it differs from the selected URL; if the returned URL is the same
   and Tavily therefore supplies no distinct final URL, use the locally
   normalized Admin-selected URL. A missing/non-string required result URL is a
   malformed response, not a fallback case. A returned invalid HTTP(S) URL,
   embedded credentials, or failure of existing canonical URL validation
   rejects the extraction; it is never persisted.
5. Preserve the Admin-selected/original value as `source_url`, even when the
   canonical URL differs. Derive the Admin-facing domain from `canonical_url`.
6. Serialize the application-owned deterministic Markdown snapshot, upload it
   to the existing private deterministic storage path, materialize existing
   source metadata, and run the existing extraction/chunking service.
7. Require at least one usable document chunk before the source can become
   extracted/ready for review.

Tavily documentation identifies each successful result's `url`, but does not
promise a separate redirect-history/final-URL field. The adapter therefore
treats the returned URL as a provider-reported canonical candidate and applies
the application rules above; it does not infer redirect provenance that the
provider did not supply.

### Errors and observability

Provider failures are classified internally as configuration/authentication,
quota, timeout, upstream, failed-result, invalid-response, invalid-canonical,
and unusable-content failures. Route responses remain generic and
provider-neutral:

- request/auth/application rate-limit failures retain existing status behavior;
- malformed, invalid, empty, weak, oversized, invalid-canonical, or chunkless
  sources are recoverable source-specific failures (`422`, or existing `413`
  for the maximum-size contract);
- unavailable credentials, provider auth/quota, timeout, and upstream service
  failures map to a stable generic `503` envelope;
- only existing safe details such as retry delay or source identity are exposed.

Server logs may include a sanitized internal category, duration, status class,
and application attempt/source identifier. They must not contain the Tavily key,
Authorization header, full Markdown, raw provider response, or credential-bearing
URL. Provider quota is not mislabeled as the application's own `429` rate limit.

### Idempotency, retry, and immutability

The existing staged-source/idempotency identity remains authoritative. A change
in Tavily's returned URL does not create a second source attempt.

- Repeating an already accepted idempotency key reuses its immutable snapshot
  and performs zero Tavily calls.
- If acquisition failed before a source snapshot was materialized, Retry calls
  Tavily again with the same Basic request and the same eligibility rules.
- If a snapshot/source exists but chunking failed, Retry uses the existing
  source extraction endpoint to re-chunk that snapshot and performs zero Tavily
  calls.
- Outline generation, outline regeneration, Continue, lesson generation, and
  publication read stored source/chunk data only and perform zero Tavily calls.

### Concurrency and cost boundary

Preserve the current sequential Admin ingestion loop: maximum concurrent Tavily
Extract calls per selection action is **1**. The existing selected-source limit
remains **8**, so the maximum is eight Basic calls for an eight-source action,
performed sequentially. Each request contains exactly one URL. There is no
batch expansion, recursive discovery, fan-out, hidden retry, or automatic
upgrade to Advanced.

### Compatibility and cleanup

The `POST /api/admin/content-sources/url` body and success envelope stay
compatible: `discovery` remains the string enum `manual_url | discovered`,
`idempotencyKey` remains a UUID, `title` remains bounded to 300 characters, and
the response remains `{ success: true, data: SourceAttempt }`. Current HEAD's
implemented status behavior is authoritative: both a newly accepted attempt and
idempotent reuse return `201`, and `data.reused` distinguishes them. The stale
historical `001` OpenAPI-only `200` replay branch is not introduced by this
acquisition change. Manual URL entry and selected Search results continue
through the same endpoint. No Tavily fields appear in browser state. File/PDF
ingestion is untouched.

The former direct-fetch/Readability path remains inactive rather than becoming
an automatic fallback. Dependency removal is deferred unless all imports and
tests prove it is unused and removal does not broaden this change.

### Rollback

No database rollback is needed. Operational rollback disables new URL
acquisition by withholding/removing the server-only Tavily credential or by
deploying a narrow route-disable patch that returns the same recoverable generic
service-unavailable error. Stored snapshots, chunks, files, and course generation
continue to work. Do not roll back by silently reactivating the known-unreliable
direct-fetch path; reactivation would require a separate explicit product and
security decision.

## Implementation Phases

### Phase A — Provider boundary and adapter

- Add provider-neutral request/result/error types and the Tavily Basic adapter.
- Add exact outbound request tests, response parsing tests, status/failure
  mapping tests, timeout tests, and secret-safe logging assertions.
- Add deterministic normalization, threshold, size, and canonical-provenance
  tests at the boundary that owns each rule.
- Exit criterion: all adapter tests pass without touching storage, database, UI,
  or generation.

### Phase B — Switch active URL ingestion

- Inject/call the new provider from the existing `ingestUrlSource` service.
- Replace the active direct-fetch/Readability acquisition steps with provider
  Markdown normalization and existing snapshot serialization.
- Preserve storage path, idempotency, materialization, chunking, endpoint body,
  success envelope, selected-source limit, and sequential UI behavior.
- Exit criterion: manual and discovered URL sources create valid immutable
  snapshots/chunks through Tavily; file/PDF tests remain unchanged and pass.

### Phase C — Recovery, compatibility, and old-path isolation

- Implement stable generic route mapping for all provider and content failures.
- Prove retry behavior for pre-snapshot failure, post-snapshot chunk failure,
  and accepted-idempotency reuse.
- Prove a changed provider URL preserves `source_url`, updates only valid
  canonical provenance, and never duplicates the staged attempt.
- Remove active imports/calls to direct fetch and Readability; retain their files
  and packages unless an independently safe cleanup is proven.
- Exit criterion: retry/call-count/contract tests pass and no automatic fallback
  exists.

### Phase D — Full regression and readiness

- Run focused unit and integration suites, route/component tests, generation
  immutability call-boundary tests, critical E2E flows, and all project quality
  gates.
- Optionally run one explicitly enabled real Tavily smoke test with a temporary
  credential; never make it a default or CI prerequisite.
- Review actual diff for scope, API, persistence, security, logging, cost, and
  acceptance criteria.
- Exit criterion: required gates pass, no Critical/High/Medium findings remain,
  and the change is ready for the repository's normal commit workflow.

## Test Strategy

1. **Provider unit tests**: exact endpoint, bearer auth, body fields and omitted
   fields, Basic-only behavior, one URL, Markdown, timeout/abort, no retry, each
   response/status category, missing/blank/malformed results, and sanitized logs.
2. **Eligibility tests**: normalized lengths 79/80/200000/200001, whitespace and
   effectively empty content, metadata excluded from measurement, at least one
   usable chunk, identical rules on Retry, and exactly 100 serializations of one
   fixed validated extraction yielding byte-identical Markdown and one hash.
3. **Provenance tests**: original `source_url`, valid provider URL as
   `canonical_url`, local fallback when no distinct final URL exists, invalid
   provider URL rejection, canonical-derived domain, and changed final URL with
   stable staged identity.
4. **Service/repository integration tests**: deterministic private snapshot,
   existing metadata/RPC inputs, storage cleanup behavior, chunk materialization,
   partial failures, idempotent reuse, and zero raw Tavily persistence.
5. **Call-boundary tests**: exactly one Extract call for a new URL; zero for
   stored retry/idempotent reuse and every generation/publication action; same
   Basic call for eligible acquisition retry.
6. **Route/UI tests**: compatible URL request/success envelope, generic errors,
   manual/discovered sources sharing one path, sequential maximum concurrency 1,
   selected-only ingestion, and partial success recovery.
7. **Regression tests**: file/PDF import, existing Search discovery, multi-source
   source qualification, Admin review, learner access, and exercise flows.
8. **Optional real-provider smoke**: explicitly gated by environment flag and a
   temporary test credential; verifies only the live API shape and one benign
   public URL, with no persisted secret or default network dependency.

## Deliverables and Non-Deliverables

Deliverables are the provider boundary/adapter, active ingestion switch,
provider-neutral errors, focused tests, and documentation updates needed by the
implementation. Non-deliverables are database migrations, Supabase remote
changes, Crawl/Research usage, Advanced extraction, automated direct fetch,
additional UI workflows, Search ranking changes, tasks generation, deployment,
and changes to completed feature `001` artifacts.

## Plan Self-Review

| Question | Answer |
|---|---|
| 1. Is the change limited to selected web URL acquisition? | Yes. |
| 2. Is Search still discovery-only? | Yes. |
| 3. Is every request Basic full-page Markdown? | Yes. |
| 4. Are query/chunk filters, images, and favicon excluded? | Yes. |
| 5. Are Advanced and direct-fetch automatic fallbacks prohibited? | Yes. |
| 6. Is the eligibility rule fixed at 80–200,000 normalized characters plus one chunk? | Yes. |
| 7. Is provider content normalized into an immutable snapshot before generation? | Yes. |
| 8. Are source and canonical provenance semantics explicit? | Yes. |
| 9. Does invalid provider provenance fail without persistence? | Yes. |
| 10. Is retry deterministic and idempotency-preserving? | Yes. |
| 11. Is maximum Extract concurrency explicitly 1? | Yes. |
| 12. Are API/browser and file/PDF compatibility preserved? | Yes. |
| 13. Is no database migration required or planned? | Yes. |
| 14. Are security, observability, cost, tests, and rollback covered? | Yes. |
| 15. Are any unresolved design questions or clarification markers left? | No. |

## Complexity Tracking

No constitution violations or unjustified complexity are introduced.
