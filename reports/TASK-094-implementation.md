# TASK-094 Implementation Report

## Outcome

`VERIFIED` locally. The public and authenticated learning experience now uses the established
generic `LearningApp` product name and no longer assumes every Course is Python or programming.
Persisted Course/Lesson identity remains unchanged and data-first.

## Baseline

- Starting HEAD: `f0ca2f5f1747da75781cd1520c4d99e48c06cea5`
- Production UI at HEAD: 31 literal case-insensitive `Python` matches.
- Additional semantic assumptions at HEAD: three `Py` brand marks, two Course `language` badge
  renderers, and one Python code demo in the landing hero.

## Implementation

- Added `src/config/product.ts` as the centralized source for `LearningApp`, its neutral `LA` mark,
  generic product description, and page-title composition.
- Reworked landing copy around trusted learning sources, Course roadmaps, Lessons, checkpoints,
  progress, and appropriate AI assistance.
- Replaced the Python hero code block with a neutral Course/Lesson/checkpoint progress preview.
- Made auth, navigation, catalog, Course detail/roadmap, dashboard/profile, and Admin metadata generic.
- Removed `course.language` badges from cards/detail because the schema's legacy default is `Python`
  and is not reliable subject/category data. Real Course title, description, level, chapters, Lessons,
  counts, enrollment, and progress remain server-derived.
- Added non-Python Course data to the local E2E fixture while retaining the legitimate Python Course.
- Added regression coverage for Software Engineering, Database, and legitimate Python Course cases.

## Database and protected scope

- DB migration required: no.
- No AI provider, 9Router, Course/Lesson/Exercise generation, validation, persistence, auth,
  permissions, publication state, or learner-progress semantics changed.
- No live AI provider call, deployment, push, or commit occurred.

## Files changed

- Product config: `src/config/product.ts`
- Landing/root: `src/app/page.tsx`, `src/app/page.test.tsx`, `src/app/layout.tsx`
- Auth: `src/app/(auth)/**`, `src/features/auth/components/login-form.tsx`,
  `src/features/auth/components/register-form.tsx`, `register-form.test.tsx`
- Platform chrome/metadata: `src/components/layout/app-navigation.tsx` and test,
  dashboard/profile pages, Admin page metadata
- Courses: catalog/detail/roadmap pages, Course card/detail components and focused tests
- E2E: `tests/e2e/sample.spec.ts`, `tests/e2e/critical-flows.spec.ts`,
  `tests/e2e/course-agnostic-ui.spec.ts`, and local fixture support
- Workflow: `tasks/TASK-094.md`, `ACTIVE_TASK.md`, `project/TASKS.md`, TASK-094 reports

## Regression result

Production source searches for case-insensitive `Python` and exact `Py` mark: zero matches.
Legitimate Python Course content remains covered and rendered from supplied Course data.
