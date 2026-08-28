# TASK-098 — Lesson Exercise Card Cross-Browser Contrast

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex

## Objective

Make the Lesson cards on `/moderation/lessons` use the existing dark semantic surface and foreground
tokens so the Lesson title remains readable and deterministic across Chromium-family browsers.

## Scope

- Diagnose computed styles for the Lesson card, Course label, Lesson title, and Create Exercise CTA.
- Replace legacy light-only color utilities on this route with the TASK-095 semantic tokens.
- Verify default, hover, and focus presentation at 1920×1080 and 1366×768.
- Add a computed-style Playwright regression and the minimum mock relation shape it needs.

## Files allowed to change

- `src/app/(main)/moderation/lessons/page.tsx`
- `tests/e2e/lesson-exercise-card-contrast.spec.ts`
- `tests/e2e/support/mock-supabase-server.mjs`
- `playwright.lesson-contrast.config.ts`
- `tasks/TASK-098.md`
- `reports/TASK-098-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Card surface and Lesson title use semantic dark-system tokens with normal-text contrast at least 4.5:1.
- Metadata and CTA remain readable; CTA hover and focus remain visible.
- No `bg-white`, browser-specific CSS, broad `!important`, product logic, provider, database, or auth change.
- Chromium, installed Chrome, and installed Edge pass at both requested viewports without horizontal overflow.
- Firefox is tested only if an executable is available.
- Playwright, lint, typecheck, full tests, build, and `git diff --check` pass; no commit.

## Explicit exclusions

No redesign, Exercise behavior, provider, database, auth, Supabase, migration, deployment, push, or commit.
