# TASK-094 — Make the Product UI Course-Agnostic

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `f0ca2f5f1747da75781cd1520c4d99e48c06cea5`

## Objective

Remove Python-only platform assumptions from the public and authenticated learning UI while
preserving legitimate Python Course/Lesson content supplied by persisted data.

## Scope

- Centralize the established generic `LearningApp` product name and neutral mark.
- Make landing, auth, navigation, catalog, dashboard/profile, Course detail/roadmap metadata generic.
- Replace the landing Python code demo with a neutral Course/Lesson/checkpoint/progress preview.
- Stop rendering the unreliable legacy `courses.language` value as a subject badge.
- Keep Course titles, descriptions, Lessons, progress, and other identity derived from server data.
- Add focused regression coverage for non-Python courses and legitimate Python course content.
- Run the requested local quality gates and focused visual smoke without calling an AI provider.

## Files allowed to change

- `src/config/product.ts`
- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/app/layout.tsx`
- `src/app/(auth)/**`
- `src/app/(main)/courses/**`
- `src/app/(main)/dashboard/page.tsx`
- `src/app/(main)/profile/page.tsx`
- `src/app/(main)/admin/**/page.tsx`
- `src/components/layout/app-navigation.tsx`
- `src/components/layout/app-navigation.test.tsx`
- `src/features/auth/components/login-form.tsx`
- `src/features/auth/components/register-form.tsx`
- `src/features/auth/components/*.test.tsx`
- `src/features/courses/components/course-card.tsx`
- `src/features/courses/components/course-detail-view.tsx`
- `src/features/courses/components/__tests__/course-card.test.tsx`
- `src/features/courses/components/__tests__/course-detail-view.test.tsx`
- `tests/e2e/sample.spec.ts`
- `tests/e2e/course-agnostic-ui.spec.ts`
- `tests/e2e/critical-flows.spec.ts`
- `tests/e2e/support/fixtures.ts`
- `tests/e2e/support/mock-supabase-server.mjs`
- `tasks/TASK-094.md`
- `reports/TASK-094-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Platform branding and SEO metadata use `LearningApp`, not a subject name.
- Landing copy describes structured courses, trusted sources, Lesson exercises/checkpoints,
  roadmap progress, and appropriate AI assistance without a programming-only claim.
- Landing hero contains no Python code demo.
- Catalog copy/search is generic and Course cards use real title/description data.
- No static or unreliable Python subject badge is rendered on Course cards/detail pages.
- Software Engineering and Database courses render without Python assumptions.
- A legitimate Python Course still renders its persisted Python title/description.
- No database migration, provider call, AI pipeline change, deploy, push, or commit.
- Focused UI tests, lint, typecheck, build, visual smoke, regression search, and diff check complete.

## Explicit exclusions

No database/schema migration, AI/provider/router/generation change, publication/auth/permission or
progress semantic change, broad visual redesign, new dependency, live AI call, deploy, push, or commit.
