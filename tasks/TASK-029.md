# TASK-029 — AI Learning Recommendation Experience

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 11: AI Mentor — F-AI-03)
- `docs/database.md` (§7.5 `course_enrollments`, §7.9 `user_progress`, §7.10 `submissions`)
- `docs/api_contract.md`
- `docs/security.md`

## Objectives
1. Implement F-AI-03 as a rule-based recommendation feature, not a new AI-provider capability.
2. Derive the next learning step exclusively from the current learner's enrollment, progress, and submission history.
3. Prioritize a current unfinished lesson; otherwise recommend the next unlocked lesson; recommend review of the current lesson after repeated incorrect attempts.
4. Add the contracted server endpoint and a learner-facing, accessible recommendation component.
5. Cover authorization, recommendation precedence, empty states, and UI behavior with tests.

## File Scope
- `src/features/ai/types/index.ts`
- `src/features/ai/repositories/ai-repository.ts`
- `src/features/ai/services/ai-service.ts`
- `src/features/ai/components/`
- `src/app/api/`
- `src/app/(main)/`
- `src/features/ai/**/__tests__/`
- `src/app/api/**/__tests__/`
- `tasks/TASK-029.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `project/ROADMAP.md`
- `reports/TASK-029-implementation.md`
- `reports/TASK-029-test.md`
- `reports/TASK-029-review.md`

## Acceptance Criteria
- An `unlocked` or `in_progress` lesson is recommended before any later lesson.
- After the current lesson is completed, the next unlocked lesson is returned in curriculum order.
- Repeated incorrect submissions produce the review-current-lesson recommendation defined by F-AI-03.
- No AI provider is called and no provider credential, prompt, or solution data reaches the browser.
- Unauthenticated and unenrolled requests are rejected; no learner can obtain another learner's progress or submission information.
- The rendered recommendation uses semantic content, an accessible link, and a clear no-recommendation state.
- Tests cover authentication, enrollment, ownership isolation, recommendation precedence, empty/completed state, and UI rendering.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass without errors or warnings.

## Non-Goals
- Generative AI recommendations.
- New database tables, enums, migrations, roles, RLS policies, or undocumented API contracts.
- Changes to grading or progress-unlock behavior.