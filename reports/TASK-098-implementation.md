# TASK-098 Implementation Report

## Outcome

`/moderation/lessons` now uses explicit TASK-095 semantic surface/foreground classes. The card is a
dark `bg-surface` surface with explicit `text-text-primary`; metadata uses `text-primary`; the CTA
uses `bg-primary text-on-primary` with tokenized hover, active, and focus states.

## Root cause

The card declared `bg-white`, which computed to `rgb(255, 255, 255)`, while its title had no color
class and inherited the dark shell's `--text-primary`, computing to `rgb(248, 250, 252)`. Both had
opacity `1`. The mismatch was deterministic CSS, not a browser default or opacity overlay.

`--card` and `--foreground` are undefined in this design system. The relevant inherited tokens are
`--surface: #111827` and `--text-primary: #f8fafc` under the shell's `.dark` ancestor.

## Files changed

- `src/app/(main)/moderation/lessons/page.tsx`
- `tests/e2e/lesson-exercise-card-contrast.spec.ts`
- `tests/e2e/support/mock-supabase-server.mjs`
- `playwright.lesson-contrast.config.ts`
- TASK-098 task/report state files

No browser-specific hack or `!important` was added. No Exercise logic or external contract changed.
