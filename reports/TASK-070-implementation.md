# TASK-070 Implementation Report

## Outcome

Phase 4 tasks T074-T091 are complete. Active Admins can research a Vietnamese-first topic through
a vendor-neutral web-search boundary, review deterministic ranked candidates, request more results,
and explicitly hand only selected sources to the verified Phase 3 ingestion flow. Phase 5 was not
implemented.

## Implemented

- Added a bounded `WebSearchProvider` contract and stable provider-error taxonomy.
- Added a server-only Brave Web Search adapter with credential isolation, request/response
  validation, bounded pagination, web-only filtering, and stable auth/quota/timeout/upstream errors.
- Added deterministic topic normalization and a maximum of three Vietnamese-first,
  language-aware educational/reference queries.
- Added HTTP(S) URL canonicalization, tracking-parameter removal, stable candidate keys,
  canonical-URL deduplication, deterministic relevance/authority scoring, and a 20-result cap.
- Added active-Admin-only, distributed-rate-limited, no-store `POST /api/admin/course-research`
  with opaque topic-bound cursors and stable response/error envelopes.
- Added accessible Research/Research More candidate review, preserved selection/error state,
  maximum-eight selection, explicit retry/fallback, and explicit selected-only confirmation.
- Reused Phase 3 URL ingestion only after confirmation; generated idempotency keys at that handoff
  and carried discovered title, timestamp, authority, and relevance into Admin provenance.
- Extended checkpoint v2 state while preserving legacy checkpoint decoding and all manual URL/file
  controls.

## Scope confirmation

No research result is persisted during research, no schema or migration changed, and no production
database mutation was performed. No crawler, embeddings, AI query planner, learner UI, Exercise,
auth, enrollment, progress, Phase 5 rollout/observability, push, or deployment was added.
