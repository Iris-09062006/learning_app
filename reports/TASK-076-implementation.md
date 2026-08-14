# TASK-076 — Implementation Report

## Outcome

`VERIFIED` — implemented only Phase B T010–T025. Confirmed discovered and manual URLs now share
the provider-neutral Tavily Extract acquisition path and the existing immutable evidence and
Course-import lifecycle. Phase C/D was not started.

## Implementation

- Replaced the active `fetchWebPage`/`extractWebPage` acquisition calls in `ingestUrlSource` with
  the verified `WebContentExtractionProvider`, application normalizer, and normalized Markdown
  snapshot serializer. There is no automatic direct-fetch fallback.
- Preserved all application checks before acquisition, accepted idempotent snapshot reuse before
  a provider call, the deterministic private storage path, immutable upload, existing source
  materialization, stored-snapshot extraction/chunking, and usable-chunk requirement.
- Preserved the Admin-selected URL as `source_url`; validated and normalized the provider result
  as `canonical_url`; derived domain from canonical provenance; and retained `manual_url` versus
  `discovered` ingestion methods.
- Added deterministic web title selection: normalized candidate/Admin title first, canonical
  hostname fallback, bounded to the existing 300-character request contract.
- Kept manual and selected-research ingestion on one route/service/provider/snapshot path with the
  existing concrete `201 { success: true, data }` response and no Tavily-specific client fields.
- Preserved independent per-source settlement and the existing idempotency identity. Pre-snapshot
  retry reacquires only the failed URL; accepted/post-snapshot retries reuse stored identity and do
  not call the provider again.
- Extended unit/component/browser regressions for selection cost boundaries, provenance,
  persistence ordering, zero-chunk rejection, partial failures, retry, and legacy PDF/file flows.

## Persistence and scope

- Reused existing Storage, `source_documents`, chunk, atomic initialization, attachment, and
  Course-import bridge contracts; no repository API or schema addition was required.
- Database migrations added or changed: 0.
- Tavily Search policy, Phase A adapter policy, Gemini generation, Phase C/D cleanup, deployment,
  push, remote Supabase state, and real Tavily calls were not changed or performed.
- Current Supabase documentation was consulted for the existing immutable object-upload behavior;
  the established `upsert: false` path and deterministic identity were retained.
