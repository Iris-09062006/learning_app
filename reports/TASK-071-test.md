# TASK-071 Test Report

## Database and contract verification

- Supabase PostgreSQL 17.6 rehearsal: migrations 001-029 applied cleanly, then migration 030
  applied to a production-like historical import fixture.
- Pre/post checksums: Course draft, outline Lesson, Lesson content, citations, and document chunk
  remained unchanged; job status/revisions remained `content_review` / 1 / 1.
- Backfill: exactly one metadata row and one order-zero anchor bridge; exclusive ownership held.
- Integration assertions: Admin RLS visibility, learner non-visibility, anon grants, hardened
  security-definer search paths, retry idempotency, and cross-job ownership rejection passed.
- Generated Supabase TypeScript types: PASS, 2,039 lines and all 10 required Phase 5 symbols.
- OpenAPI YAML parse and local `$ref` resolution: PASS, 10 paths / 97 references.

## Focused regression gates

- Final content-pipeline service/API: PASS, 2 files / 84 tests.
- Migration/repository/service/route plus learner non-leakage suite: PASS.
- Enrollment/progress and Exercise protected-domain smoke: PASS, 6 files / 34 tests.
- Full dependency audit and production dependency audit: PASS, zero vulnerabilities.
- High-confidence tracked-secret scan and client namespace scan: PASS.

## Repository quality gates

- `npm run lint` - PASS, zero warnings.
- `npm run typecheck` - PASS.
- `npm run test` - PASS, 103 files / 671 tests.
- `npm run build` - PASS, Next.js 15.5.22 production build, 32 static pages generated.
- `npm run test:e2e` - PASS, 15 Chromium scenarios.
- Axe checks in required flows - PASS, zero serious violations after the moderation contrast fix.
- `git diff --check` - PASS.

## Environment notes

The first sandboxed Vitest attempt hit Windows `spawn EPERM`; the approved rerun passed. The
pre-existing Next.js `allowedDevOrigins` future warning remains non-blocking and unchanged. The
shared remote Supabase project was inspected read-only and currently lists migrations only through
029; migration 030 remains an explicit future rollout step.
