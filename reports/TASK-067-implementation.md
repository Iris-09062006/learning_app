# TASK-067 Implementation Report

## Outcome

Phase 1 only is complete. The existing Course-import pipeline now has additive one-to-eight-source
ownership primitives, canonical job-scoped persistence, and job-wide Admin reads. No Phase 2–5
provider, ingestion UI, research, learner, Exercise, auth, enrollment, or progress work was added.

## Implemented

- Added migration `030_topic_course_multi_source.sql` with the legacy initialization flag,
  workflow initialization key/fingerprint, provenance metadata, ordered ownership bridge,
  idempotent backfill, deferred anchor invariant, and least-privilege RLS/grants.
- Preserved the default file/PDF trigger and dual-wrote its order-zero bridge; explicit staged
  materialization creates neither a job nor bridge.
- Added atomic ordered-set initialization with deterministic source locks, immutable request
  fingerprint, exclusive ownership, 1..8 validation, extracted/non-empty guards, and duplicate
  response recovery.
- Added later attach/detach/staged-removal RPCs with source limits, anchor reassignment, stale
  outline transition, historical-evidence protection, last-source guard, and Continue lock.
- Added canonical job-centric outline and Lesson-citation persistence while retaining the legacy
  bare-index single-source wrappers and immutable revision tables.
- Extended atomic/idempotent publication only to archive every attached bridge source and return
  ordered `sourceDocumentIds` alongside the singular anchor alias.
- Added generated database types, hardened repository wrappers, ordered job-wide source/chunk
  reads, additive Admin DTO provenance/canonical IDs, and route/repository/migration coverage.

## Scope confirmation

`prepare_course_lesson_generation` is unchanged. No protected historical schema was altered, and
no embeddings, vector database, crawler, or `research_sessions` model was introduced.
