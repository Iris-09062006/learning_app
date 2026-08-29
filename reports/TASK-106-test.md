# TASK-106 Test Report

## Final gates

| Command | Result |
|---|---|
| Focused Exercise/Lesson Vitest (5 files) | PASS — 55/55 |
| `npm test` | PASS — 1,229 passed, 1 skipped (1,230 total) |
| `npx playwright test --config playwright.task-106.config.ts --project=chromium` | PASS — 8/8 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS — line-ending notices only |
| client solution-boundary scan | PASS — no `correctAnswer` or `exercise_solutions` reference |
| secret-pattern scan | PASS — no findings |

## Required scenarios

- Correct completion: persisted, `Hoàn thành` shown, submit hidden, in-panel Lesson CTA works.
- MCQ review: selected option restored/disabled; feedback visible; refresh on both attempt and review
  URLs preserves the answer.
- Non-MCQ review: unit coverage restores short-answer, ordering, matching, scenario, true/false,
  predict-output, and fix-the-bug answers.
- Retry: incorrect attempt retains `Nộp lại`; correct/review has no retry action.
- Isolation: learner B has no completion, restored selection, feedback, or completed panel from A.

Two initial Playwright runs exposed test-only assertion issues (a misplaced locator declaration and
an incorrect expected fixture sentence). Both tests were corrected; the final complete run passed.
