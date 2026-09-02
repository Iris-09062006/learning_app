# TASK-110 — Render LaTeX in Generated Exercises

- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `828c65462e4382e287e382ddc00ed750d57bd3e6`

## Objective

Require generated mathematical notation to use valid, delimiter-wrapped LaTeX and render that
notation in learner Exercises and Admin Exercise moderation instead of exposing raw source such as
`$A = \begin{pmatrix}...\end{pmatrix}$`.

## Proven root cause

- The Exercise provider prompt did not specify a mathematical notation contract.
- `ExerciseView` rendered titles, prompts, options, and grading feedback as plain text.
- The Admin generated-Exercise preview also rendered mathematical fields as plain text.
- The safe KaTeX renderer introduced by TASK-108 was only used by Lesson content.

## Scope

- Require KaTeX-compatible LaTeX with `$...$` / `$$...$$` delimiters in generated non-code fields.
- Keep `codeSnippet` literal and free of LaTeX delimiters.
- Reuse the TASK-108 safe renderer for learner Exercise title, prompt, options, ordering/matching
  labels, and persisted/static grading feedback.
- Render generated mathematical fields in the Admin moderation detail and formatted preview.
- Preserve Exercise schemas, persistence, publication, grading, solution privacy, and APIs.

## Files allowed to change

- `src/features/ai/providers/ai-provider.ts`
- `src/features/ai/providers/__tests__/ai-provider.test.ts`
- `src/features/lessons/components/lesson-markdown.tsx`
- `src/features/exercises/components/exercise-view.tsx`
- `src/features/exercises/components/__tests__/exercise-view-subject-agnostic.test.tsx`
- `src/features/moderation/components/moderation-detail-view.tsx`
- `src/features/moderation/components/__tests__/moderation-detail-view.test.tsx`
- task, queue, and TASK-110 report files

## Acceptance criteria

- The provider prompt explicitly requires valid, JSON-escaped, delimiter-wrapped LaTeX for math.
- A generated matrix prompt renders as KaTeX rather than visible `\begin{pmatrix}` source.
- Mathematical choices and correct/incorrect grading feedback render as KaTeX.
- Admin moderation renders the same math before approval/publication.
- KaTeX remains `trust: false`, includes MathML output, and wide display math remains locally
  scrollable through the existing TASK-108 renderer.
- Focused tests, full tests, lint, typecheck, build, `git diff --check`, and review pass.
- No migration, live AI request, push, or deployment.

## Verification summary

- Generated mathematical notation is explicitly requested as JSON-escaped, KaTeX-compatible LaTeX;
  code snippets remain literal.
- Learner prompts, choices, ordering/matching content, and persisted grading feedback render through
  the safe Lesson math boundary; Admin moderation renders the same notation before publication.
- Focused 69-test gate, full 1,247-test suite, lint, typecheck, production build, diff check, scoped
  secret scan, and final review pass. One provider integration test remains intentionally skipped by
  its existing environment gate.
- Review verdict: `PASS`; migration: `NONE`; live AI request: `NONE`; push/deploy: `NONE`.
