# Active Task Queue

- **Active task:** `TASK-106` — Exercise Completion Return Flow and Review Mode
- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Deferred design task:** `TASK-047` (`DRAFT`)
- **Previous blocked task:** `TASK-044` — external Supabase Redirect URL verification

## Current objective

TASK-106 separates incomplete Exercise attempts from persisted read-only review. Correct completion
must show a clear return-to-Lesson CTA; `Xem lại` must restore the current learner's latest successful
answer across refresh without exposing solutions or another learner's state. Existing grading,
completion semantics, generation, auth/RLS, and schema remain unchanged; no deploy, push, or commit
occurred. All supported answer-shape tests, persistence/user-isolation Playwright, full unit suite,
lint, typecheck, build, diff, secret, and final review gates pass.

## Previous verified objective

TASK-100 fixes the layout-only regression where a Next-only Lesson navigation card is forced into a
narrow second grid column by an empty placeholder. Single adjacent cards use the full row; the
two-card state remains balanced. Resolver, URLs, completion, progress, and database behavior are
unchanged. Nine first/middle/last screenshots at 375px, 1366px, and 1920px plus all required gates
pass. Review verdict is `PASS`; no deploy, push, or commit occurred.

## Previous verified objective

TASK-099 adds bidirectional Lesson navigation from the existing persisted curriculum order and shows
per-learner Exercise completion from correct persisted submissions. Correct completion survives
return, reload, and a new session without leaking to a second learner; incorrect-only attempts stay
incomplete. Focused/full tests, 8 Chromium Playwright flows, lint, typecheck, build, diff, secret, and
final review pass. No migration, AI call, deploy, push, or commit occurred.

## Previous verified objective

TASK-098 makes `/moderation/lessons` use the existing TASK-095 dark semantic surface and foreground
tokens. Computed-style regressions pass in Chromium, installed Chrome, and installed Edge at
1920×1080 and 1366×768 with title contrast 16.96:1 and no horizontal overflow. Firefox is not
installed. Lint, typecheck, the full Vitest suite, build, diff check, and final review pass; no
Exercise behavior, provider, database, auth, Supabase, deploy, push, or commit changed.

## Previous completed objective

TASK-097 is done and pushed to `production-test-2` at
`4a4fa6c3eb9fe23e028f14b1a3ded37b209bb510`.

TASK-097 replaces the programming-only Lesson Exercise contract with a subject-agnostic,
type-discriminated contract selected from actual Lesson title, summary, objectives, and content.
Generic moderation, learner rendering, and server-side evaluation are in scope while existing coding
Exercises remain compatible. The backward-compatible migration was separately authorized and applied
through Supabase MCP as `20260828054832_subject_agnostic_exercises`; no live AI request, deploy, push,
or commit occurred before the current release request. The targeted provider prompt/schema ownership
follow-up is complete and all focused/full tests, lint, typecheck, build, diff, and secret gates pass.

## Previous verified objective

TASK-096 is verified locally. Successful Course/Content/Review mutations reconcile with uncached,
latest-response server truth; completed Course-import creation resets transient inputs while failed
mutations preserve them; and `/` renders guest/authenticated navigation from the existing server-side
Supabase session. Focused/full tests, Playwright auth/workflow smoke, accessibility checks, lint,
typecheck, build, diff/secret review pass. No migration, AI call, deploy, push, or commit occurred.

## Previous verified objective

TASK-095 applies a verified visual-only, dark-first redesign to LearningApp: a new subject-neutral geometric
brand mark, a more balanced landing hero and product preview, a coherent authenticated shell, and
denser Course catalog/detail surfaces. Product behavior, real Course data, auth, Supabase, AI,
database, permissions, publication, and progress semantics remain unchanged. Browser screenshots
and local quality gates pass; no live AI call, deploy, push, or commit occurred.

## Previous verified objective

TASK-094 removes Python-only platform branding, copy, hero/demo, catalog badges, and SEO assumptions
from the production learning UI. Platform chrome uses the established generic `LearningApp` name,
while Course/Lesson identity continues to come from persisted server data. No database, AI pipeline,
auth, publication, progress, deploy, push, or commit is in scope. Focused/full tests, lint, typecheck,
build, automated Chromium smoke, SSR smoke, regression search, diff check, and final review pass.

## Previous verified objective

TASK-093 applies the smallest targeted fix for the proven Exercise-generation SSE mismatch: the
active provider request explicitly sends `stream: false` and `Accept: application/json`. All
TASK-092 diagnostics, prompt/schema/parser/validation/persistence/routing behavior, DB/frontend,
and Lesson/Course generation remain unchanged; no live provider call or commit is authorized.

## Previous verified objective

TASK-092 adds metadata-only diagnostics to the active one-Lesson Exercise generation path so the
next separately authorized real request identifies the precise provider-envelope, parser field, or
persistence boundary. Prompt, schema, validation rules, retry behavior, provider/router/model,
frontend, database schema, Lesson/Course generation, live provider calls, and commits are excluded.

## Previous verified objective

TASK-091 adds exactly one application-validation repair retry inside each of the three primary
Lesson stages (`synthesis_blueprint`, `sections`, and `quality_review`). It preserves original stage
inputs/schema, completed prior-stage results, provider/network behavior, correction/re-review, and
TASK-090 checkpointing. No real provider call, migration, commit, push, or deployment is authorized.

## Previous verified objective

TASK-090 makes every persisted ready Lesson draft a durable server-side retry checkpoint. Retry
must preserve and reload the approved outline, skip ready Lessons with zero model calls, resume at
the first missing Lesson in outline order, and reconcile an all-complete retry without regeneration.
Focused service/repository/migration tests, lint, typecheck, diff check, and final review pass. The
overlapping uncommitted TASK-089 work remains preserved; no commit is authorized and the new
migration has not been applied.

## Previous in-progress objective

TASK-089 raises active AI provider response abort timers from 45 seconds to 180 seconds for
pedagogical Lesson and Exercise generation, adds metadata-only Course-outline response/parse
diagnostics, and adds temporary safe diagnostics to every multi-call pedagogical Lesson stage.
Focused tests, focused lint, and typecheck pass with mocked provider responses; no build, live AI
request, commit, push, deployment, or database/frontend change was performed.

## Previous verified objective

TASK-088 removes the hard-coded pedagogical Gemini model and routes Course outline plus Lesson
generation through the server-only 9Router configuration. Provider schemas, call budgets, pacing,
citations, persistence, and public APIs remain unchanged. All local quality gates pass.

## Previous verified objective

TASK-087 addresses the observed job 24 failure at 59.914 seconds after the Gemini 3.7 migration:
remove unsupported sampling parameters, use documented low reasoning effort, prevent queued Lesson
workers from continuing after a failure, and align the Admin request timeout with the server
scheduling window. All local quality gates pass.

## Previous verified objective

TASK-086 migrates the complete pedagogical Lesson model lock from `gemini-3.6-flash` to the GA
`gemini-3.7-flash` identifier requested by the user. Endpoint, structured schemas, exact stage call
budget, pacing, timeout, persistence, citations, and public API behavior remain unchanged. All local
quality gates pass without a live AI request, database mutation, push, or deployment.

## Previous verified objective

TASK-085 handles the confirmed Gemini HTTP 429 behind local Course Lesson generation: pedagogical
provider requests are serialized to prevent quota bursts, and upstream quota exhaustion maps to the
existing recoverable `RATE_LIMITED` contract instead of a misleading 502. All local gates pass.

## Previous verified objective

TASK-084 repairs the live `502 AI_PROVIDER_ERROR` from
`POST /api/admin/course-drafts/25/lessons/generate`: Gemini's one-based blueprint section order is
now normalized to the unchanged internal zero-based contract. All local quality gates pass; the
retryable job was not mutated, and no public/database contract, push, or deployment occurred.

## Previous verified objective

TASK-083 implements and verifies only T026–T036 of feature `003-pedagogical-lesson-generation`: the verified pedagogical runner is active for Continue and Lesson-wide regeneration, Course generation uses bounded three-pipeline scheduling with a 240-second deadline and partial-success retry semantics, and persistence plus downstream compatibility pass without migrations or external contract changes.

## Previous verified objective

TASK-082 implements and verifies only T017–T025 of feature `003-pedagogical-lesson-generation`: independent
semantic Quality Review, exactly one targeted correction, one independent re-review, and the
bounded three/five-call transient runner. Focused tests, lint, typecheck, diff review, and
protected-scope checks pass. Phase D integration, persistence, scheduling, migrations, push,
and deploy remain out of scope.

## Previous verified objective

TASK-081 implements and verifies only T009–T016 of feature `003-pedagogical-lesson-generation`: one locked-model
all-section request driven by the validated blueprint, purpose-aware instructions, deterministic
blueprint/citation validation, and transient normalization to the unchanged `StructuredLessonDraft`.
Quality Review, correction, Continue integration, persistence, migrations, push, and deploy remain
out of scope. Focused Phase A/B tests, lint, typecheck, diff review, citation/security review, and
zero-migration/feature-002 checks pass.

## Previous verified objective

TASK-080 implements and verifies only T001–T008 of feature `003-pedagogical-lesson-generation`: immutable
approved-Lesson evidence identity, transient synthesis/blueprint contracts, strict structural
validation, and one combined provider request locked to `gemini-3.6-flash`. Phase B–D, final
Lesson prose, quality review, Continue integration, persistence, migrations, push, and deploy are
out of scope.

Focused/full tests, lint, typecheck, build, diff review, security review, and the zero-migration
check pass. No live AI request, push, or deployment was performed.

## Previous verified objective

TASK-079 repairs only the Admin browser recovery path after Lesson-content generation failure:
bounded waiting, persisted-state refresh before retry, and a local start-new-workflow reset. The
Supabase state machine already accepts retry from `failed`; no schema, RPC, provider, publication,
deployment, push, or remote-data mutation is in scope.

Implementation, focused/full tests, lint, typecheck, build, diff review, and security review pass.
No production job was retried and no deployment or push was performed.

## Previous verified objective

TASK-078 implements only T036–T047 from `specs/002-tavily-web-ingestion/tasks.md`: contract
validation, one explicitly gated real Tavily Basic Extract smoke, full feature/browser regression,
security/secret and migration readiness checks, deployment/rollback documentation, and the final
GO/NO-GO assessment. Deployment, push, remote migration application, production-data mutation,
provider expansion, direct-fetch fallback, and feature-002 database changes are forbidden.

T039 is verified. The earlier live smoke failed before HTTP dispatch because the repository-wide
Vitest `jsdom` environment supplied a cross-realm `AbortSignal` that native Node `fetch` rejected.
The server-only smoke now runs in the Node environment; its one final Basic Markdown request passed
normalization, deterministic snapshot, and chunk checks. All Phase D gates pass. Vercel Production
still requires `TAVILY_API_KEY` before a separately authorized deployment; no push, deployment, or
remote mutation was performed. Evidence is recorded in `reports/TASK-078-*.md`.

TASK-077 is verified. T026–T035 from `specs/002-tavily-web-ingestion/tasks.md` harden immutable
stored-evidence generation, provider-outage isolation, file/PDF independence, URL security,
untrusted-content framing, privacy, and inactive legacy direct-fetch classification.

Phase D is closed and verified under TASK-078: T001–T047 are complete, including T039 and T047.
Implementation verdict is VERIFIED. Deployment readiness is CONDITIONAL GO pending the server-only
Vercel `TAVILY_API_KEY`, redeploy, and production smoke; configuration, deployment, push, and
remote Supabase mutation remain separate and out of scope.

TASK-076 is verified. T010–T025 from `specs/002-tavily-web-ingestion/tasks.md` switch confirmed
discovered/manual URL acquisition to the verified provider-backed extraction boundary while
preserving immutable snapshots, existing
materialization/chunking, atomic Course-import ownership, partial settlement, and retry/idempotency.
Phase C/D, migrations, deployment, push, and remote Supabase operations remain out of scope.

TASK-075 is verified. T001–T009 from `specs/002-tavily-web-ingestion/tasks.md` add the
vendor-neutral extraction contract, server-only Tavily Basic Extract adapter, deterministic
normalization/eligibility, and provider-neutral error mapping. The Phase A gate, focused
URL/Search/PDF regressions, lint, typecheck, full unit suite, and keyless build pass. Active URL
ingestion remains unchanged; no migration, deployment, push, or Supabase operation was performed.

TASK-074 is verified. The connection-bound safe fetcher now returns Node's required address-array
shape when the runtime requests `all: true`; real `https://example.com` capture, the complete
Phase 3 focused gates, full unit/build gates, and URL/Phase 4/PDF browser regressions pass. The
approved SSRF/TLS design is preserved, with no search-provider, schema, migration, deployment, or
Supabase changes.

TASK-073 is verified: Brave is replaced by optional, server-only Tavily Search as the default Phase 4 provider.
The change preserves the verified vendor-neutral research and selected-only ingestion flow, does
not modify migration 030 or any database state, and will not be pushed or deployed.

TASK-072 is verified locally: a resolved Course import now starts the next Admin source session
cleanly while published source evidence remains in the database. Phase 5 task `TASK-071` remains
verified locally. No deployment or push was performed.

Phase 1 T001–T031 is verified. Migration, PostgreSQL concurrency/invariant checks, focused and
full tests, legacy PDF browser E2E, lint, typecheck, and build pass. Evidence is recorded in
`reports/TASK-067-implementation.md`, `reports/TASK-067-test.md`, and
`reports/TASK-067-review.md`.

Phase 2 T032–T049 is verified. Source-qualified provider/DTO contracts, deterministic job-wide
generation, Admin provenance/editor compatibility, and both new plus legacy browser gates pass.
Phase 3 T050–T073 is verified. Phase 4 T074–T091 is verified: stateless research, Brave search,
deterministic candidate review/ranking, selected-only Phase 3 handoff, accessibility, and all
required browser regressions pass. Phase 5 T092–T103 is verified: production-like migration,
RLS/RPC, API/OpenAPI, observability, security, full regression/E2E/accessibility, documentation,
and rollout/rollback readiness gates pass. Evidence is in `reports/TASK-071-*.md`.

## Previous active external verification

Normalize provider Lesson-section citations when the server has exactly one possible source chunk,
while preserving strict multi-chunk ownership validation and generic client errors.

Commit `6d6b03c` is pushed, but three Vercel production deployments remain `UNKNOWN` before build
initialization. The production alias therefore still serves the previous deployment and final
Playwright verification cannot yet test the hotfix.

GitHub Actions identified the upstream release blocker: its build job lacked the public Supabase
variables required by Next.js at build time. A Context7-verified workflow fix now passes the
quality-gates job. The newly unblocked E2E job exposed an outdated learner flow; the deterministic
mock and test now perform the required `start_lesson` transition and pass locally.

## Previous verified objective

TASK-065 is verified in production. Course import job 7 persisted an approved three-Lesson outline
using the sole source chunk after the retry and citation-normalization deployments.

TASK-064 is verified in production. Sources 23 and 24 each persisted 2,392 extracted characters,
confirming the Vercel Node 22/native Linux PDF packaging fix before the separate outline failure.

TASK-063 is verified. Learners can use “Tiếp theo” to start the immediately following published
Lesson without waiting for completion, while exercise-based completion remains truthful. Migration
029 is applied and verified on hosted Supabase as version `20260811153651`.

## Previous verified work

TASK-061 is verified locally and on hosted Supabase. `POST /api/lessons/:lessonId/start` now writes
through a hardened, authenticated `start_lesson` RPC instead of a forbidden direct
`user_progress` upsert. Hosted migration `20260811133320` is applied; transactional smoke testing
passed and rolled back without changing learner progress.

TASK-060 is verified. Hosted migration `20260811102054` fixes Markdown/JSON operator
precedence; Course import job #5 published Course 17 and six visible Lessons atomically.

TASK-059 is verified. Provider schemas now use the Gemini-compatible structural subset while
strict server-side validation continues to enforce every business constraint.

TASK-058 is verified locally. The Lesson-specific flow now generates strict pending Exercise
drafts, preserves immutable atomic review history, and publishes approved drafts idempotently.
Migrations `024`, `025`, and `026` were applied through Supabase MCP to project
`yzucdzlgaucmduoghjft` on 2026-08-10 and verified against the remote catalog.

## Current state

TASK-057 is verified locally. The Admin PDF-to-Course flow now persists an outline review
checkpoint, generates/revises Lesson content independently, and publishes official
curriculum atomically. Migration `025` is intentionally not applied to shared Supabase,
and no deployment was performed.

TASK-055 is verified locally. PDF-to-Course batch generation, persistent review
resolution, per-Lesson exercise generation, authorization hardening, focused/full
unit tests, E2E, lint, typecheck, build, and diff review pass. Migration `023` is
intentionally not applied to shared Supabase, and no deployment was performed.
