# TASK-031 — Content Moderation API and Moderation Queue

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 14: Content Moderation Module — F-MOD-01, F-MOD-02, F-MOD-03)
- `docs/database.md` (§7.11 `generated_exercises`, `exercise_reviews`, §7.6 `exercises`)
- `docs/api_contract.md`
- `docs/security.md`

## Objectives
1. Implement moderation queue API (`GET /api/moderation/generated-exercises`) for Moderators and Admins.
2. Implement exercise review API (`POST /api/moderation/generated-exercises/:id/reviews`) supporting `approved`, `rejected`, and `needs_revision` statuses with audit trailing.
3. Implement publishing logic to safely convert an approved generated exercise into a published `exercise` record with its options and solutions in a single transaction.
4. Build a Moderator/Admin facing dashboard UI for reviewing and publishing AI-generated exercises.
5. Cover access control (rejecting Learners/Guests), transactional safety, and UI states with tests.

## File Scope
- `src/features/moderation/types/index.ts`
- `src/features/moderation/repositories/moderation-repository.ts`
- `src/features/moderation/services/moderation-service.ts`
- `src/features/moderation/components/`
- `src/app/api/moderation/`
- `src/app/(main)/moderation/`
- `src/features/moderation/**/__tests__/`
- `src/app/api/moderation/**/__tests__/`
- `tasks/TASK-031.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `project/ROADMAP.md`
- `reports/TASK-031-implementation.md`
- `reports/TASK-031-review.md`

## Acceptance Criteria
- Unauthenticated or non-moderator/admin users are denied access with 401/403.
- Moderation queue listing correctly paginates and filters generated exercises.
- Submitting a review properly records an `exercise_reviews` audit record and updates the status.
- Publishing creates `exercises`, `exercise_options`, and `exercise_solutions` records cleanly inside a transaction without orphaned data.
- UI allows editing fields (title, code snippet, options, explanation) prior to approval/publishing.
- Tests cover authorization, state transitions, transaction rollback on failure, and UI rendering.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass without errors or warnings.

## Non-Goals
- Real-time notification of newly generated exercises.
- Automated moderation without human review.