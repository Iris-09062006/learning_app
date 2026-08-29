# TASK-099 Implementation Report

## Outcome

Lesson navigation is bidirectional and Exercise cards now expose persisted, user-specific completion
without changing the progression model. The final state is `VERIFIED`; no migration, AI request,
deployment, push, or commit occurred.

## Starting state

- Starting HEAD: `c2fdc66825b4a963ab765cb5a7d4f305c9be13d9`
- Branch: `release/merge-003-004` (ahead 9, behind 5 relative to `origin/main`)
- Working tree was clean before TASK-099.

## Root causes and implementation

- Previous Lesson root cause: the repository already sorted the published Course curriculum by
  `(chapters.chapter_order, lessons.lesson_order)`, but selected only `currentIndex + 1`.
- One `resolveAdjacentLessons` helper now returns both `previousLesson` and `nextLesson` from that
  same ordered array. IDs are never used as ordering signals.
- Exercise completion was already persisted before this fix. `submit_exercise` inserts every attempt
  into `submissions`, with server-computed `is_correct`; a correct set of required Exercises also
  updates Lesson/Course progress atomically.
- Lesson loading now selects only correct submissions for the authenticated `user.id` and current
  Lesson Exercise IDs. A correct submission maps to `isCompleted: true`; incorrect-only attempts do
  not.
- Completed cards show an SVG checkmark, “Hoàn thành”, “Xem lại”, and remain linked to the Exercise.
  The overview reuses the same loaded data for `x/y hoàn thành` with no decorative query.
- The adjacent navigation stacks on narrow screens and uses 44px minimum targets. First Lesson has no
  Previous; middle Lesson has both exact neighbors; final Lesson retains Previous and has no Next.
- Exercise view now provides “Quay lại bài học” with prefetch disabled, ensuring the navigation fetches
  current server truth instead of relying on a stale browser-history snapshot.

## Files changed

- Lesson repository, service, types, component, and their focused tests
- Exercise view and its component regression
- Lesson API contract/test
- T022 Playwright flow, E2E fixtures/mock server, and TASK-099 Playwright config
- TASK-099 packet, reports, `ACTIVE_TASK.md`, and `project/TASKS.md`

## Progress and database behavior

- Authoritative attempted signal: any user-owned `submissions` row for the Exercise.
- Authoritative correct/completed signal: at least one user-owned `submissions.is_correct = true` row.
- Lesson completion remains `user_progress.status = completed` only after every required published
  Exercise has a correct submission.
- Course completion remains based on every published Lesson having completed progress.
- Progress formula changed: no.
- DB migration required: no.
