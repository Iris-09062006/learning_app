# TASK-095 — UI/UX Pro Max Visual Redesign

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `f0ca2f5f1747da75781cd1520c4d99e48c06cea5`

## Objective

Redesign LearningApp into a polished, course-agnostic education product using UI/UX Pro Max as the
primary design system while preserving all existing product behavior and data contracts.

## Scope

- Replace the `LA` placeholder with a compact, subject-neutral geometric brand mark.
- Establish a calm dark-first slate/indigo visual system shared by public and authenticated UI.
- Redesign the public header, hero, product preview, value section, and CTA hierarchy.
- Refine authenticated navigation, catalog search, Course cards, and Course detail presentation.
- Improve typography, spacing, responsive behavior, focus states, and touch targets.
- Add focused regressions and capture desktop/mobile landing plus authenticated catalog screenshots.

## Files allowed to change

- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/app/(auth)/**`
- `src/app/(main)/layout.tsx`
- `src/app/(main)/courses/**`
- `src/components/brand/**`
- `src/components/layout/**`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/*.test.tsx`
- `src/config/product.ts`
- `src/features/courses/components/**`
- `src/features/ai/components/exercise-generation-form.test.tsx`
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `src/features/profile/components/__tests__/profile-view.test.tsx`
- `tests/e2e/**`
- `tasks/TASK-095.md`
- `reports/TASK-095-*.md`
- `reports/TASK-095-screenshots/**`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- No visible `LA` mark, Python/code imagery, or oversized hero typography remains.
- New brand mark works at 24–40px and does not contain letters.
- Landing is balanced at desktop and mobile widths with clear hierarchy and no awkward wrapping.
- Authenticated navigation and Course surfaces share the same semantic color and spacing system.
- Course content remains derived from real server data; auth, Supabase, AI, database, permissions,
  publication, and progress behavior are unchanged.
- Focused UI tests, relevant Playwright, lint, typecheck, build, screenshot review, and diff check pass.
- No AI provider call, deploy, push, or commit.

## Explicit exclusions

No product behavior, API, auth, database, Supabase, AI/provider/router/generation, permission,
publication, or progress-semantic change; no new dependency, live AI call, deploy, push, or commit.
