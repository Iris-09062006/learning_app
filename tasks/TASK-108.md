# TASK-108 — Render Mathematical Notation in Lesson Content

- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `3e547c5fef25bbcf92ca3be9e2c4f3d3253d4dfb`

## Objective

Render mathematical notation embedded in Lesson Markdown so learners and Admin reviewers can read
inline and display formulas instead of raw `$...$` / `$$...$$` source.

## Proven root causes

- `LessonMarkdown` parses a small Markdown subset but has no math token or block support.
- The Course-import content reviewer exposes section Markdown only through a textarea and provides
  no rendered preview.
- The application has no math typesetting dependency or stylesheet.

## Scope

- Add KaTeX as the math typesetting dependency and load its application stylesheet.
- Support `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` delimiters.
- Render matrices, cases, operators, subscripts, superscripts, and common symbols supported by KaTeX.
- Keep Admin section Markdown editable and add a clearly labelled rendered preview.
- Keep untrusted-input safety defaults (`trust: false`) and show invalid source text without crashing.
- Prevent display formulas from creating horizontal page overflow.
- Preserve persistence, API, database, generation, citation, and publication contracts.

## Files allowed to change

- `package.json`
- `package-lock.json`
- `src/app/layout.tsx`
- `src/features/lessons/components/lesson-markdown.tsx`
- `src/features/lessons/components/__tests__/lesson-markdown.test.tsx`
- `src/features/content-pipeline/components/content-pipeline-admin.tsx`
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- task, queue, and TASK-108 report files

## Acceptance criteria

- Inline math is typeset within surrounding prose.
- Display math, including `cases` and matrix environments, is typeset as a block.
- Admin content review shows a rendered preview while preserving the textarea editor.
- Invalid LaTeX remains visible and does not crash rendering.
- Math output is semantic/readable to assistive technology through KaTeX MathML output.
- Display math scrolls inside its own region when wider than the content column.
- Focused tests, full tests, lint, typecheck, build, `git diff --check`, and review pass.
- No migration, live AI request, push, or deployment.

## Verification summary

- Inline/display math, nested emphasis, `cases`, determinant matrices, invalid input, code literals,
  and untrusted math links have regression coverage.
- Focused 44 tests, full 1,235-test suite, lint, typecheck, production build, dependency audit,
  diff check, and secret scan pass.
- Browser screenshot verification could not run because no in-app or extension browser was connected;
  DOM, MathML, overflow classes, CSS inclusion, and production compilation were verified.
- Review verdict: `PASS`; database migration: `NONE`; push/deploy: `NONE`.
