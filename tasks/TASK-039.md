# TASK-039 — Critical-flow E2E and Accessibility

## Status
`PLANNED`

## Phase
Phase 7

## Objective
Thay placeholder Playwright bằng regression suite cho critical learner flows và xác minh accessibility trên các màn hình chính.

## Dependencies
- `TASK-038` verified.
- Deterministic local seed/fixtures and mock AI provider.

## Required Context
- `docs/testing.md` — three required E2E flows
- `docs/ui.md`
- `docs/coding_standards.md`
- `playwright.config.ts`

## In Scope
- E2E: register/login and dashboard.
- E2E: catalog → enroll → roadmap → lesson → correct submission → next lesson unlock.
- E2E: wrong submission → AI explanation loading/success using mock provider.
- Role-route smoke coverage for Moderator/Admin.
- Keyboard-only navigation, focus visibility/order, labels, headings, landmarks, error/status announcements and contrast review.
- Stable fixtures/selectors; no skipped/flaky retries used to hide defects.

## Out of Scope
- Calling a paid/real AI provider.
- Visual redesign unrelated to accessibility findings.
- Cross-browser expansion beyond Chromium until the baseline suite is stable.

## Acceptance Criteria
- Placeholder-only E2E is replaced or supplemented by all three required flows.
- E2E data is isolated and repeatable.
- No Critical/Serious automated accessibility violations on scoped pages; manual keyboard checklist passes.
- Failure artifacts preserve trace/screenshot without exposing secrets.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
