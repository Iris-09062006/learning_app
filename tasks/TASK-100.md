# TASK-100 — Lesson Adjacent Navigation Layout

- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex

## Objective

Fix the TASK-099 adjacent Lesson navigation layout so a single Previous or Next card uses an
intentional full-width row, while the two-adjacent state keeps balanced columns.

## Proven root cause

The navigation always applies `sm:grid-cols-2`. In the Next-only case it also renders an empty hidden
placeholder as the first grid item, so the real Next card is constrained to the second half of the
row and its title wraps unnecessarily.

## Scope

- Make grid columns conditional on `previousLesson && nextLesson`.
- Remove empty placeholder artifacts.
- Preserve TASK-095 tokens, navigation URLs, handlers, resolver, ordering, completion, and progress.
- Verify first/middle/last visual states at 375px, 1366px, and 1920px.

## Files allowed to change

- `src/features/lessons/components/lesson-content-view.tsx`
- `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`
- `tests/e2e/support/mock-supabase-server.mjs`
- `tests/e2e/lesson-adjacent-navigation-layout.spec.ts`
- `playwright.task-100.config.ts`
- `tasks/TASK-100.md`
- `reports/TASK-100-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Both neighbors: two balanced columns.
- Next only: one full-width card with no empty first grid item.
- Previous only: one full-width card with no empty second-column artifact.
- Targets remain at least 44px; no overflow at 375px, 1366px, or 1920px.
- Screenshots cover all three states and requested viewports.
- Focused tests, Playwright, lint, typecheck, build, and `git diff --check` pass.
- No ordering/navigation URL change, migration, deploy, push, or commit.

## Verification summary

- Single Previous/Next states render one full-width card; no placeholder grid item remains.
- The middle state renders two equal columns from `sm` upward and stacks cleanly at 375px.
- Nine screenshots cover first/middle/last at 375px, 1366px, and 1920px.
- Focused Vitest, full Vitest, Chromium Playwright, lint, typecheck, build, and
  `git diff --check` pass.
- Review verdict: `PASS`; commit: `NONE`.
