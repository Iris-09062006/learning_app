# LearningApp Task Registry

## Status Legend

- `DONE`: Historical task completed and committed.
- `VERIFIED`: Implementation, required tests, and review evidence pass.
- `READY`: Packet is defined and ready to implement.
- `IN_PROGRESS`: Currently being implemented.
- `PLANNED`: Packet đã được định nghĩa nhưng chưa thể bắt đầu vì dependency/order.
- `DRAFT`: Packet đã có nhưng còn thiếu contract, quyết định sản phẩm hoặc dependency.

## Active Task

`TASK-109` is verified: every Course-import queue item has a confirmed, active-Admin-only removal
action. Removal permanently deletes the unresolved import and its owned source material while
preserving an audit record and protecting all official curriculum. Focused/full tests, lint,
typecheck, build, diff, secret, and final review gates pass. Migration `034` was applied through
Supabase MCP as `20260902034802 remove_course_import_from_queue`. Implementation commit: `1556cb6`;
task-report commit: `35cddc5`.

`TASK-108` is verified: safe KaTeX rendering now covers inline/display mathematics in learner
Lesson Markdown and rendered previews for editable Admin Lesson sections. Focused/full tests, lint,
typecheck, build, audit, diff, secret, and review gates pass without changing stored content or
publication contracts. Browser screenshot verification was unavailable because no browser was
connected.

`TASK-107` is in progress: prerequisite progression now uses first introduction rather than last
reuse, and semantic retry guidance is actionable. Regression tests are written but were not run at
the user's request, so the change remains unverified. The user explicitly requested committing and
pushing this state.

`TASK-106` is verified: successful Exercise completion provides a clear Lesson return action, and
completed Exercises restore the current learner's latest successful persisted answer in read-only
review across refresh. All gates pass; grading, solution security, completion semantics, and schema
remain unchanged. Commit: none.

`TASK-099` is verified locally: Previous and Next come from one persisted curriculum order, while
Exercise completion comes from user-owned correct submissions and survives return/reload/new session
without cross-user leakage. Full local gates and review pass; progress semantics and schema are
unchanged, and no commit occurred.

`TASK-098` is verified locally: the Lesson → Exercise listing now uses the existing dark semantic
surface/foreground tokens instead of a light-only card utility plus inherited dark text. Chromium,
installed Chrome, and installed Edge computed-style regressions pass at 1920×1080 and 1366×768;
Firefox is unavailable. Full local gates and review pass; no commit occurred.

`TASK-097` is done and released to `production-test-2` in
`4a4fa6c3eb9fe23e028f14b1a3ded37b209bb510`. The programming-only Lesson Exercise model is replaced by a strict
subject-agnostic discriminated contract across generation, moderation, learner rendering, and
server-side evaluation while existing coding Exercises remain compatible. The provider owns `type`;
application request metadata owns `difficulty`. Provider prompt/schema and request types are aligned;
parser/validator and persistence boundaries match the intended ownership. Targeted tests (52/52),
the full Vitest suite (1,211 passed, 1 skipped), lint, typecheck, build, diff, and secret checks pass.

`TASK-096` is done and included in `production-test-2` commit
`4a4fa6c3eb9fe23e028f14b1a3ded37b209bb510`: successful Course/content/review mutations reconcile with uncached,
latest-response server truth, completed transient Course-import creation state resets without losing
failed input, and the public landing uses the existing server-resolved Supabase session. Focused/full
tests, Playwright auth/workflow smoke, accessibility, lint, typecheck, build, diff and secret checks
pass; no auth semantic, RBAC, AI, database, publication, visual-system, or application deployment change.

`TASK-095` is verified locally: UI/UX Pro Max drives a visual-only redesign of the public landing,
subject-neutral brand mark, authenticated navigation, and Course catalog/detail surfaces. Product
behavior and data contracts stay unchanged; browser screenshots and all local gates pass.

`TASK-094` is verified locally: production platform branding, landing/auth copy, catalog metadata,
and Course presentation are course-agnostic while persisted Python Course/Lesson content remains
intact. Focused/full tests, lint, typecheck, build, automated Chromium/SSR smoke, regression search,
diff check, and review pass; no database, AI pipeline, deploy, push, or commit occurred.

`TASK-093` is verified locally: the active Exercise provider explicitly requests a non-streaming
JSON response with `stream: false` and `Accept: application/json`, while preserving the existing
Authorization, Content-Type, model, schema, prompt, parser, validation, persistence, routing, and
TASK-092 diagnostics. Focused tests, lint, typecheck, diff check, and review pass; no live call or commit.

`TASK-092` is verified locally: safe metadata-only diagnostics now distinguish provider transport,
HTTP, envelope, parser field, semantic, and persistence failures in the active one-Lesson Exercise
generation path. Prompt/schema/model/router/frontend/database contracts remain unchanged; 43 focused
mock tests, lint, typecheck, diff check, and review pass without a real provider call or commit.

`TASK-091` is verified locally: one bounded semantic repair retry handles HTTP-successful but
application-invalid responses from synthesis/blueprint, sections, and initial quality review while
preserving schemas, prior-stage results, provider/network behavior, correction/re-review, and
TASK-090 checkpointing. Required focused tests, lint, typecheck, build, diff check, and review pass;
no commit is authorized before this report.

`TASK-090` is verified locally: persisted ready Lesson drafts are durable retry checkpoints, the
the approved outline and completed Lessons across a failed job, resume generation at the first
missing Lesson in outline order, and make all-complete retries perform zero model calls. Focused
tests, lint, typecheck, diff check, and review pass. The function-only migration is not applied;
the existing uncommitted TASK-089 changes are preserved and no commit is authorized.

`TASK-089` is in progress: active AI provider response abort timers are raised from 45 seconds to
180 seconds, with metadata-only Course-outline response/parse diagnostics and temporary safe
diagnostics for all five pedagogical Lesson stages. Focused tests, focused lint, and typecheck pass
with provider calls mocked; the change remains uncommitted by user request.

`TASK-088` is verified: the hard-coded pedagogical Gemini model is removed, and Course outline plus
Lesson generation use the configured server-only 9Router endpoint and route model. Router-selected
upstream model reporting, focused/full tests, lint, typecheck, and build pass.

`TASK-087` is verified: stabilize Gemini 3.7 Lesson generation after job 24 failed at 59.914 seconds
by removing unsupported sampling parameters, lowering documented reasoning effort, eliminating
redundant queued Lesson workers, and aligning the Admin timeout with the server scheduling window.
Full local gates pass.

`TASK-086` is verified: the complete pedagogical Lesson model lock migrated from
`gemini-3.6-flash` to the official GA `gemini-3.7-flash` identifier without changing endpoint,
call budgets, pacing, persistence, citations, or public API behavior. Full local gates pass.

`TASK-085` is verified: pedagogical provider requests are serialized to prevent Gemini quota bursts,
and confirmed upstream HTTP 429 responses map to the recoverable rate-limit API contract. Full local
gates pass without database mutation, push, or deployment.

`TASK-084` is verified: Gemini one-based blueprint section order is normalized to the unchanged
internal zero-based contract, repairing the deterministic `AI_RESPONSE_INVALID` behind job 25's
Lesson-generation 502. Full local gates pass without database mutation, push, or deployment.

`TASK-083` is verified for only T026–T036 of pedagogical Lesson generation: active Continue and
Lesson-wide regeneration integration, bounded three-pipeline scheduling, deadline/partial-failure retry,
and compatibility verification without migrations or external contract changes.

`TASK-082` is verified for only T017–T025 of pedagogical Lesson generation: independent semantic
Quality Review, one targeted correction, independent re-review, and exact three/five-call budgets.
Focused tests, lint, typecheck, diff review, and protected-scope checks pass. Phase D, persistence,
scheduling, migrations, push, and deployment remain out of scope.

`TASK-081` is verified for only T009–T016 of pedagogical Lesson generation: purpose-aware
all-section generation, exact blueprint adherence, structural citation ownership, and transient
normalization to the unchanged final draft contract. Quality review/correction, integration,
persistence, migration, push, and deployment are out of scope. The focused Phase A/B gate, lint,
typecheck, diff review, and protected-scope checks pass.

`TASK-080` is verified for only T001–T008 of pedagogical Lesson generation: transient approved
evidence, synthesis and blueprint contracts plus the single locked-model first stage. No final prose,
quality review, integration, persistence, migration, push, or deployment is in scope.

`TASK-079` is verified: failed Lesson-content generation now refreshes persisted job state, supports
safe retry, bounds the browser wait, and can reset into a new local workflow without mutating stored
jobs or evidence. No database, deployment, push, or remote-data change occurred.

`TASK-078` is verified: the T039 failure was isolated to a Vitest `jsdom`/native-fetch
`AbortSignal` realm mismatch, the server-only smoke now runs under Node, and one final real Basic
Markdown Extract passed normalization/snapshot/chunk checks. T001–T047 are complete and T047's
final non-live gate passes. Deployment readiness is CONDITIONAL GO: Vercel Production still
requires the server-only key, redeploy, and production smoke under separate authorization; no
push, deployment, migration, or remote mutation occurred.

`TASK-077` is verified: Phase C proves stored evidence and file/PDF workflows remain independent
of Tavily after acquisition, locks security/privacy boundaries, and verifies the retained legacy
direct-fetch code is inactive without starting Phase D.

`TASK-076` is verified: Phase B switches confirmed discovered/manual URL acquisition to the
verified Tavily Extract provider boundary and reuses the existing snapshot/source/chunk/Course-import
lifecycle without database changes.

`TASK-074` is verified: the Phase 3 connection-bound safe-fetch runtime callback is repaired
without weakening SSRF/TLS controls or changing database state.
`TASK-073` remains verified: Brave was replaced by optional Tavily Search as the default Phase 4 provider.
`TASK-066` remains in progress on its prior external verification. `TASK-072` and `TASK-071` are
verified locally; they were not pushed or deployed.

Recently verified supporting hotfixes:

| Task ID | Title | Status | Phase | Dependency |
|---|---|---|---|---|
| `TASK-079` | Recover Failed Lesson Content Generation | VERIFIED | Content operations hotfix | Existing retryable Course-import state machine |
| `TASK-075` | Tavily Web Ingestion Phase A Provider Boundary | VERIFIED | Tavily web ingestion Phase A | T001–T009 and Phase A gate pass |
| `TASK-045` | Reduce Page Navigation Latency | VERIFIED | Performance hotfix | None |
| `TASK-046` | Stabilize AI Content Pipeline and New Lesson Targets | VERIFIED | Content operations hotfix | `TASK-043` |

`TASK-045` and `TASK-046` passed review and all required local gates. The prior task below remains externally blocked.

`TASK-044` — Fix Supabase Auth Email Redirects on Preview (`BLOCKED`). Code, tests,
push and Preview deployment pass; final email-link verification requires the
Supabase Auth Redirect URLs wildcard and a fresh confirmation email.

## Verified and Completed Tasks

| Task ID | Title | Status | Phase | Evidence |
|---|---|---|---|---|
| `TASK-087` | Stabilize Gemini 3.7 Lesson Generation Latency | VERIFIED | Content operations hotfix | `reports/TASK-087-implementation.md`, `reports/TASK-087-review.md`, `reports/TASK-087-test.md` |
| `TASK-086` | Migrate Pedagogical Lessons to Gemini 3.7 Flash | VERIFIED | Content operations hotfix | `reports/TASK-086-implementation.md`, `reports/TASK-086-review.md`, `reports/TASK-086-test.md` |
| `TASK-085` | Handle Gemini Lesson Generation Quota | VERIFIED | Content operations hotfix | `reports/TASK-085-implementation.md`, `reports/TASK-085-review.md`, `reports/TASK-085-test.md` |
| `TASK-084` | Repair Live Pedagogical Lesson Generation | VERIFIED | Content operations hotfix | `reports/TASK-084-implementation.md`, `reports/TASK-084-review.md`, `reports/TASK-084-test.md` |
| `TASK-083` | Pedagogical Lesson Generation Phase D | VERIFIED | Feature 003 Phase D | `reports/TASK-083-implementation.md`, `reports/TASK-083-review.md`, `reports/TASK-083-test.md` |
| `TASK-082` | Pedagogical Lesson Generation Phase C | VERIFIED | Feature 003 Phase C | `reports/TASK-082-implementation.md`, `reports/TASK-082-review.md`, `reports/TASK-082-test.md` |
| `TASK-080` | Pedagogical Lesson Generation Phase A | VERIFIED | Feature 003 Phase A | `reports/TASK-080-implementation.md`, `reports/TASK-080-review.md`, `reports/TASK-080-test.md` |
| `TASK-078` | Tavily Web Ingestion Phase D Readiness | VERIFIED | Tavily web ingestion Phase D | `reports/TASK-078-implementation.md`, `reports/TASK-078-review.md`, `reports/TASK-078-test.md` |
| `TASK-077` | Tavily Web Ingestion Phase C Hardening | VERIFIED | Tavily web ingestion Phase C | `reports/TASK-077-implementation.md`, `reports/TASK-077-review.md`, `reports/TASK-077-test.md` |
| `TASK-076` | Tavily Web Ingestion Phase B Active Path | VERIFIED | Tavily web ingestion Phase B | `reports/TASK-076-implementation.md`, `reports/TASK-076-review.md`, `reports/TASK-076-test.md` |
| `TASK-074` | Repair URL Safe-Fetch Runtime Compatibility | VERIFIED | Course research Phase 3 hotfix | `reports/TASK-074-implementation.md`, `reports/TASK-074-review.md`, `reports/TASK-074-test.md` |
| `TASK-073` | Replace Default Brave Search with Tavily | VERIFIED | Course research Phase 4 provider | `reports/TASK-073-implementation.md`, `reports/TASK-073-review.md`, `reports/TASK-073-test.md` |
| `TASK-072` | Clear Completed Course Source Workflow | VERIFIED | Content operations hotfix | `reports/TASK-072-implementation.md`, `reports/TASK-072-review.md`, `reports/TASK-072-test.md` |
| `TASK-071` | Topic-Based Multi-Source Course Creation: Phase 5 | VERIFIED | Course research Phase 5 | `reports/TASK-071-implementation.md`, `reports/TASK-071-review.md`, `reports/TASK-071-test.md` |
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
| `TASK-071` | Topic-Based Multi-Source Course Creation: Phase 5 | IN_PROGRESS | Course research Phase 5 | Verified Phases 1–4 |
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
