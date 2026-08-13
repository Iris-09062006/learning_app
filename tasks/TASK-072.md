# TASK-072 — Clear Completed Course Source Workflow

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Clear the Admin source-composer state and its session checkpoint after the associated Course import
is published or rejected, so completed sources do not remain stuck in the next creation session.

## Scope
- Reset only client-side workflow state associated with the resolved Course import.
- Preserve immutable source documents, snapshots, citations, revisions, and publication evidence.
- Do not change database schema, RLS, API contracts, or learner behavior.
- Add a regression test covering restored attached sources followed by successful publication.

## Acceptance Criteria
- [x] Publishing the active Course import removes its staged/attached sources from the composer.
- [x] Topic, research results, selections, pagination, job association, and v2 checkpoint are cleared.
- [x] Publication failure does not discard the recoverable workflow.
- [x] Historical source evidence remains untouched on the server.
- [x] Focused test, lint, typecheck, full test, and build pass.

## Required Commands
- `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
