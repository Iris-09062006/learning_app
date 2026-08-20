# TASK-069 Implementation Report

## Outcome

Phase 3 tasks T050–T073 are complete. Admins can stage manual URLs and optional files, review
partial outcomes, initialize one ordered Course import from usable evidence, attach or detach later
evidence before Continue, and regenerate a stale outline. Phase 4–5 work was not started.

## Implemented

- Added a connection-bound SSRF-safe HTTP(S) fetcher with DNS/redirect revalidation, public-address
  enforcement, fixed headers, 15-second deadline, five-redirect ceiling, 16 KiB header ceiling,
  and 2 MiB compressed/decompressed limits.
- Added bounded HTML/plain-text extraction with jsdom and Mozilla Readability plus deterministic,
  immutable Markdown snapshot serialization and stable hashing/chunk normalization.
- Added deterministic URL/new-flow file storage identities, safe concurrent materialization,
  retry/adoption/cleanup behavior, provenance persistence, and staged extraction before promotion.
- Reused the Phase 1 atomic ordered-set RPCs for first initialization, later attachment,
  detachment, anchor reassignment, last-source protection, staleness, and post-Continue locking.
- Added Admin API routes for URL ingestion, staged-source removal, Course-import initialization,
  and job-scoped source list/attach/detach.
- Added source-review UI for URL/file coexistence, per-source status/error/retry/remove, max-eight
  accounting, partial failures, source mutation, stale-outline replacement, and Admin provenance.
- Added checkpoint v2 hydration for attempts, idempotency keys, job identity, attached state, and
  pending action while retaining the legacy checkpoint decoder.

## Scope confirmation

No topic research, search provider, crawler, embeddings, learner UI, Exercise, auth, enrollment,
progress, publication redesign, database architecture, push, deployment, or production mutation
was performed. The legacy file-only flow remains available and unchanged in behavior.
