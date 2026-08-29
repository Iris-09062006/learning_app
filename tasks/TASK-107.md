# TASK-107 â€” Stabilize Prerequisite Progression Validation

- **Status:** `IN_PROGRESS`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `3e547c5fef25bbcf92ca3be9e2c4f3d3253d4dfb`

## Objective

Prevent a recap or summary that revisits an already introduced prerequisite from producing a false
`PREREQUISITE_PROGRESSION_VIOLATION`, while continuing to reject genuinely dependent content that
appears before a prerequisite and giving the bounded repair retry an actionable constraint.

## Scope

- Base prerequisite ordering on each prerequisite item's first blueprint occurrence.
- Keep the existing strict rejection when dependent content precedes any prerequisite introduction.
- Add a progression-specific semantic repair instruction.
- Add focused regression coverage without executing tests, per the user's explicit request.
- Preserve provider routing, schemas, call budget, evidence ownership, persistence, and public APIs.

## Files allowed to change

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- task, queue, and report files for TASK-107

## Acceptance criteria

- A prerequisite first introduced before dependent content remains valid when recap/summary cites it again.
- Dependent content before the first prerequisite introduction remains invalid.
- Repair attempt two explicitly explains the prerequisite progression constraint.
- No provider, database, persistence, frontend, or public contract change.

## Verification status

Implementation and static diff review are complete. Automated gates were not run at the user's
request, so this task remains `IN_PROGRESS` and is not eligible for `VERIFIED`. The user explicitly
requested committing and pushing the unverified state.

