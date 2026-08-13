# LearningApp Task Registry

## Status Legend

- `DONE`: Historical task completed and committed.
- `VERIFIED`: Implementation, required tests, and review evidence pass.
- `READY`: Packet is defined and ready to implement.
- `IN_PROGRESS`: Currently being implemented.
- `PLANNED`: Packet đã được định nghĩa nhưng chưa thể bắt đầu vì dependency/order.
- `DRAFT`: Packet đã có nhưng còn thiếu contract, quyết định sản phẩm hoặc dependency.

## Active Task

`TASK-070` — Topic-Based Multi-Source Course Creation: Phase 4 (`VERIFIED`). Stateless topic
research, Brave provider integration, deterministic candidate review/ranking, selected-only Phase 3
handoff, accessibility, and Phase 4 browser gates only; Phase 5 remains excluded. Phases 1–3 remain
verified at `d28f8da`, `95bb7ab`, and `06f8f76`. `TASK-066` remains in progress
on its prior external verification.

Recently verified supporting hotfixes:

| Task ID | Title | Status | Phase | Dependency |
|---|---|---|---|---|
| `TASK-045` | Reduce Page Navigation Latency | VERIFIED | Performance hotfix | None |
| `TASK-046` | Stabilize AI Content Pipeline and New Lesson Targets | VERIFIED | Content operations hotfix | `TASK-043` |

`TASK-045` and `TASK-046` passed review and all required local gates. The prior task below remains externally blocked.

`TASK-044` — Fix Supabase Auth Email Redirects on Preview (`BLOCKED`). Code, tests,
push and Preview deployment pass; final email-link verification requires the
Supabase Auth Redirect URLs wildcard and a fresh confirmation email.

## Verified and Completed Tasks

| Task ID | Title | Status | Phase | Evidence |
|---|---|---|---|---|
| `TASK-070` | Topic-Based Multi-Source Course Creation: Phase 4 | VERIFIED | Course research Phase 4 | `reports/TASK-070-implementation.md`, `reports/TASK-070-review.md`, `reports/TASK-070-test.md` |
| `TASK-069` | Topic-Based Multi-Source Course Creation: Phase 3 | VERIFIED | Course research Phase 3 | `reports/TASK-069-implementation.md`, `reports/TASK-069-review.md`, `reports/TASK-069-test.md` |
| `TASK-068` | Topic-Based Multi-Source Course Creation: Phase 2 | VERIFIED | Course research Phase 2 | `reports/TASK-068-implementation.md`, `reports/TASK-068-review.md`, `reports/TASK-068-test.md` |
| `TASK-067` | Topic-Based Multi-Source Course Creation: Phase 1 | VERIFIED | Course research Phase 1 | `reports/TASK-067-implementation.md`, `reports/TASK-067-review.md`, `reports/TASK-067-test.md` |
| `TASK-064` | Repair Vercel PDF Extraction Packaging | VERIFIED | Content operations hotfix | `reports/TASK-064-implementation.md`, `reports/TASK-064-review.md`, `reports/TASK-064-test.md` |
| `TASK-063` | Allow Learners to Advance to the Next Lesson | VERIFIED | Phase 4 UX hotfix | `reports/TASK-063-implementation.md`, `reports/TASK-063-review.md`, `reports/TASK-063-test.md` |
| `TASK-062` | Reveal and Redesign the Lesson Learning Experience | VERIFIED | Phase 4 UI hotfix | `reports/TASK-062-implementation.md`, `reports/TASK-062-review.md`, `reports/TASK-062-test.md` |
| `TASK-061` | Start Lesson Through a Security-Definer RPC | VERIFIED | Phase 4 hotfix | `reports/TASK-061-implementation.md`, `reports/TASK-061-review.md`, `reports/TASK-061-test.md` |
| `TASK-060` | Fix Course Publish Markdown JSON Precedence | VERIFIED | Content operations hotfix | `reports/TASK-060-implementation.md`, `reports/TASK-060-review.md`, `reports/TASK-060-test.md` |
| `TASK-059` | Fix Gemini Structured-output Compatibility | VERIFIED | Content operations hotfix | `reports/TASK-059-implementation.md`, `reports/TASK-059-review.md`, `reports/TASK-059-test.md` |
| `TASK-058` | Lesson-to-Exercise Pipeline | VERIFIED | Content operations | `reports/TASK-058-implementation.md`, `reports/TASK-058-review.md`, `reports/TASK-058-test.md` |
| `TASK-057` | Two-stage PDF-to-Course Pipeline | VERIFIED | Content operations | `reports/TASK-057-implementation.md`, `reports/TASK-057-review.md`, `reports/TASK-057-test.md` |
| `TASK-056` | Admin Learner Removal and Safe Course Deletion | VERIFIED | Admin operations | `reports/TASK-056-implementation.md`, `reports/TASK-056-review.md`, `reports/TASK-056-test.md` |
| `TASK-055` | Generate Reviewable Courses and Lesson-scoped Exercises | VERIFIED | Content operations | `reports/TASK-055-implementation.md`, `reports/TASK-055-review.md`, `reports/TASK-055-test.md` |
| `TASK-054` | Repair Lesson Review and Publish Flow | VERIFIED | Content operations hotfix | `reports/TASK-054-implementation.md`, `reports/TASK-054-review.md`, `reports/TASK-054-test.md` |
| `TASK-053` | Allow Active Admins to Read Draft Curriculum Targets | VERIFIED | Content operations hotfix | `reports/TASK-053-implementation.md`, `reports/TASK-053-review.md`, `reports/TASK-053-test.md` |
| `TASK-052` | Fix Production PDF Extraction Runtime | VERIFIED | Content operations hotfix | `reports/TASK-052-implementation.md`, `reports/TASK-052-review.md`, `reports/TASK-052-test.md` |
| `TASK-051` | Publish Verified Release to GitHub and Vercel Production | VERIFIED | Production release | `reports/TASK-051-implementation.md`, `reports/TASK-051-review.md`, `reports/TASK-051-test.md` |
| `TASK-050` | Separate New Course and Existing Lesson Upload Flows | VERIFIED | Content operations hotfix | `reports/TASK-050-implementation.md`, `reports/TASK-050-review.md`, `reports/TASK-050-test.md` |
| `TASK-049` | Bootstrap Empty Content Curriculum | VERIFIED | Content operations hotfix | `reports/TASK-049-implementation.md`, `reports/TASK-049-review.md`, `reports/TASK-049-test.md` |
| `TASK-048` | Deploy Navigation and AI Pipeline Hotfix to Current Preview | VERIFIED | Hotfix release | `reports/TASK-048-implementation.md`, `reports/TASK-048-review.md`, `reports/TASK-048-test.md` |
| `TASK-041` | Preview Deployment and Smoke Verification | VERIFIED | Phase 7 | `reports/TASK-041-implementation.md`, `reports/TASK-041-review.md`, `reports/TASK-041-test.md` |
| `TASK-042` | Restore Public Onboarding and Product Navigation | VERIFIED | Critical hotfix | `reports/TASK-042-implementation.md`, `reports/TASK-042-review.md`, `reports/TASK-042-test.md` |
| `TASK-035` | Self-service Password Recovery | VERIFIED | Feature completion | `reports/TASK-035-implementation.md`, `reports/TASK-035-review.md`, `reports/TASK-035-test.md` |
| `TASK-036` | Accessible Fix-the-Bug Drag-and-Drop | VERIFIED | Feature completion | `reports/TASK-036-implementation.md`, `reports/TASK-036-review.md`, `reports/TASK-036-test.md` |
| `TASK-037` | Admin-triggered Password Reset | VERIFIED | Feature completion | `reports/TASK-037-implementation.md`, `reports/TASK-037-review.md`, `reports/TASK-037-test.md` |
| `TASK-038` | Security and RLS Regression Hardening | VERIFIED | Phase 7 | `reports/TASK-038-implementation.md`, `reports/TASK-038-review.md`, `reports/TASK-038-test.md` |
| `TASK-039` | Critical-flow E2E and Accessibility | VERIFIED | Phase 7 | `reports/TASK-039-implementation.md`, `reports/TASK-039-review.md`, `reports/TASK-039-test.md` |
| `TASK-040` | Performance and Release Readiness | VERIFIED | Phase 7 | `reports/TASK-040-implementation.md`, `reports/TASK-040-performance.md`, `reports/TASK-040-review.md`, `reports/TASK-040-test.md` |
| `TASK-028` | AI Mentor API and Explanation Service | VERIFIED | Phase 5 | `reports/TASK-028-implementation.md`, `reports/TASK-028-review.md`, `reports/TASK-028-test.md` |
| `TASK-030` | AI Exercise Generation Backend | VERIFIED | Phase 5 | `reports/TASK-030-implementation.md`, `reports/TASK-030-review.md` |
| `TASK-031` | Content Moderation API and Moderation Queue | VERIFIED | Phase 6 | `reports/TASK-031-implementation.md`, `reports/TASK-031-review.md` |
| `TASK-032` | Learner Dashboard and Profile Management | VERIFIED | Phase 6 | `reports/TASK-032-implementation.md`, `reports/TASK-032-review.md`, `reports/TASK-032-test.md` |
| `TASK-033` | User Administration and System Health Dashboard | VERIFIED | Phase 6 | `reports/TASK-033-implementation.md`, `reports/TASK-033-review.md`, `reports/TASK-033-test.md` |
| `TASK-034` | Course Catalog Search | VERIFIED | Feature completion | `reports/TASK-034-implementation.md`, `reports/TASK-034-review.md`, `reports/TASK-034-test.md` |
| `TASK-029` | AI Learning Recommendation Experience | VERIFIED | Phase 5 | `reports/TASK-029-implementation.md`, `reports/TASK-029-review.md`, `reports/TASK-029-test.md` |
| `TASK-000` | Documentation and Agent Workflow | DONE | Phase 0 | Repository workflow documentation (`AGENTS.md`, `CODEX.md`) |
| `TASK-001` | Bootstrap Next.js and Project Configuration | DONE | Phase 1 | Git commit history & baseline configs |
| `TASK-002` | Configure Vitest and Playwright | DONE | Phase 1 | `reports/TASK-002-implementation.md`, `reports/TASK-002-review.md` |
| `TASK-003` | Primitive UI Components Foundation | DONE | Phase 1 | `reports/TASK-003-implementation.md`, `reports/TASK-003-review.md` |
| `TASK-004` | CI Quality-Gates Workflow | DONE | Phase 1 | `reports/TASK-004-implementation.md`, `reports/TASK-004-review.md` |
| `TASK-010A` | Repair Project Baseline | VERIFIED | Phase 1 | `reports/TASK-010A-implementation.md`, `reports/TASK-010A-review.md` |
| `TASK-015` | Apply and Verify Supabase Core Database | VERIFIED | Phase 2 | `reports/TASK-015-implementation.md`, `reports/TASK-015-review.md` |
| `TASK-020` | Authentication Service and API Handlers | VERIFIED | Phase 3 | `reports/TASK-020-implementation.md`, `reports/TASK-020-review.md` |
| `TASK-021` | Auth Pages UI (Login and Register) | VERIFIED | Phase 3 | Git commit (`5f4b7c8`), `src/app/(auth)/`, 12 tests PASS |
| `TASK-022` | Course Catalog and Course Detail | VERIFIED | Phase 3 | `reports/TASK-022-implementation.md`, `reports/TASK-022-review.md` |
| `TASK-023` | Course Enrollment Feature & API Integration | VERIFIED | Phase 3 | `reports/TASK-023-implementation.md`, `reports/TASK-023-review.md` |
| `TASK-024` | Visual Learning Roadmap Page | VERIFIED | Phase 3 | `reports/TASK-024-implementation.md`, `reports/TASK-024-review.md` |
| `TASK-025` | Lesson Content API and Viewer | VERIFIED | Phase 4 | `TASK-024`; `reports/TASK-025-implementation.md`, `reports/TASK-025-review.md` |
| `TASK-026` | Exercise API, Evaluation, and Submissions | VERIFIED | Phase 4 | `TASK-025` |
| `TASK-027` | Progress Tracking API and Learner Progress Engine | VERIFIED | Phase 4 | `TASK-026` |

## Ready Queue

| Task ID | Title | Status | Phase | Dependency |
|---|---|---|---|---|

## In Progress

| Task ID | Title | Status | Phase | Dependency |
|---|---|---|---|---|
| `TASK-066` | Normalize Single-Chunk Lesson Citations | IN_PROGRESS | Content operations hotfix | CI and production verification |

## Active Epic

| Task ID | Title | Status | Phase | Dependency |
|---|---|---|---|---|
| `TASK-043` | Document-to-Lesson Content Pipeline | VERIFIED | Content Operations Epic | Review PASS; Cloud migrations and all required gates complete |

## Draft / Deferred Queue

| Task ID | Title | Status | Phase | Blocker or dependency |
|---|---|---|---|---|
| `TASK-047` | Stitch-led UI Redesign | DRAFT | UI refresh | Awaiting user-provided Stitch screens and states |

## Planned Work

| Phase | Scope |
|---|---|
| Phase 4 | `TASK-025`–`TASK-027` verified: lesson content/start flow, exercises/submissions/grading, and progress engine |
| Phase 5 | `TASK-028`–`TASK-031` verified: AI explanations, rule-based learning recommendations, controlled AI exercise generation, and content moderation |
| Phase 6 | `TASK-031`–`TASK-033` verified: moderation, learner dashboard/profile, user administration, and system health |
| Feature completion | `TASK-034`–`TASK-037`: search course, password recovery, accessible drag-and-drop, and optional Admin reset |
| Phase 7 | `TASK-038`–`TASK-041`: security/RLS regression, critical E2E + accessibility, performance/release readiness, then explicitly authorized preview deployment |

## Retired Task IDs

The former `TASK-010`–`TASK-014` packets were overlapping database subtasks and are retired. Their verified database scope is represented by `TASK-015`.

The former `TASK-101`–`TASK-105` packets were duplicate or obsolete authentication planning packets and are retired. Their relevant completed work is represented by `TASK-020` and `TASK-021`.

Retired task IDs must not be reintroduced unless a new packet is explicitly created with a distinct scope and acceptance criteria.
