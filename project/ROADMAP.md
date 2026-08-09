# LearningApp Roadmap

## Current State

- **Current phase:** Phase 6 complete; Phase 7 is planned.
- **Completed:** Phases 0–6, including the audited TASK-033 migration sequence.
- **In progress:** None.
- **Queued next:** Complete selected feature gaps, then execute Phase 7 hardening and release preparation.
- **Source of truth:** `project/TASKS.md`, task packets in `tasks/`, and implementation/review reports in `reports/`.

## Phase Overview

| Phase | Scope | Status |
|---|---|---|
| Phase 0 | Documentation and agent workflow | DONE |
| Phase 1 | Project foundation and quality gates | DONE |
| Phase 2 | Supabase database and security foundation | DONE |
| Phase 3 | Authentication and learning core | DONE |
| Phase 4 | Lessons, exercises, submissions, and progress | DONE |
| Phase 5 | AI explanations and mentor experience | DONE |
| Phase 6 | Dashboards and administration | DONE |
| Feature completion | Remaining P1/P2 feature gaps (`TASK-034`–`TASK-037`) | PLANNED |
| Phase 7 | Security hardening, regression testing, and release readiness (`TASK-038`–`TASK-041`) | PLANNED |

## Phase 1 — Project Foundation and Quality Gates

- `TASK-001` — Bootstrap Next.js and project configuration — **DONE**
- `TASK-002` — Configure Vitest and Playwright — **DONE**
- `TASK-003` — Primitive UI components foundation — **DONE**
- `TASK-004` — CI quality-gates workflow — **DONE**
- `TASK-010A` — Repair project baseline — **VERIFIED**

## Phase 2 — Supabase Database Foundation

- `TASK-015` — Apply and verify Supabase core database — **VERIFIED**

> The former `TASK-010`–`TASK-014` packets were overlapping database work and have been retired. Their implemented scope is represented by `TASK-015` and the current migrations/types.

## Phase 3 — Authentication and Learning Core

- `TASK-020` — Authentication service and API handlers — **VERIFIED**
- `TASK-021` — Auth pages UI — **VERIFIED**
- `TASK-022` — Course catalog and course detail — **VERIFIED**
- `TASK-023` — Course enrollment feature and API integration — **VERIFIED**
- `TASK-024` — Visual learning roadmap page — **VERIFIED**

## Phase 4 — Learning Execution

- `TASK-025` — Lesson Content API and Viewer — **VERIFIED**
- `TASK-026` — Exercise API, Evaluation, and Submissions — **VERIFIED**
- `TASK-027` — Progress Tracking API and Learner Progress Engine — **VERIFIED**

## Phase 5 — AI Mentor

- `TASK-028` — AI Mentor API and Explanation Service — **VERIFIED**
- `TASK-029` — AI Learning Recommendation Experience — **VERIFIED**
- `TASK-030` — AI Exercise Generation Backend — **VERIFIED**

## Phase 6 — Operations and Dashboards

- `TASK-031` — Content Moderation API and Moderation Queue — **VERIFIED**
- `TASK-032` — Learner Dashboard and Profile Management — **VERIFIED**
- `TASK-033` — User Administration and System Health Dashboard — **VERIFIED**

## Phase 7 — Hardening and Deployment

### Feature completion before the release candidate

| Task | Scope | State |
|---|---|---|
| `TASK-034` | F-COURSE-02 course search over published catalog data | READY |
| `TASK-035` | F-AUTH-04 self-service password recovery | DRAFT — contract required |
| `TASK-036` | F-EXERCISE-03 accessible drag-and-drop using the existing `selectedOptionId` grading contract | READY |
| `TASK-037` | F-ADMIN-04 admin-triggered password reset | DRAFT — P2 and contract required |

Already implemented and therefore not replanned: F-SUBMISSION-02, F-AI-02, F-AI-03, F-PROFILE-02, F-ADMIN-05, F-SYSTEM-01 and audit writes required by F-SYSTEM-02.

### Phase 7 execution order

1. `TASK-038` — run full RLS/security regression and close release-blocking gaps, including required rate limits.
2. `TASK-039` — replace the placeholder E2E test with the three critical learner flows and complete accessibility verification.
3. `TASK-040` — establish performance evidence, run all quality gates, and finish environment/migration/rollback/smoke-test runbooks without deploying.
4. `TASK-041` — create and verify a Preview deployment only after a separate explicit authorization to push/deploy.

Production deployment remains outside these packets and requires a new explicit user request after Preview evidence passes.
