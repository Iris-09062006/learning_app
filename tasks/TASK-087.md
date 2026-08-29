# TASK-087 — Stabilize Gemini 3.7 Lesson Generation Latency

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Type:** Content operations hotfix

## Objective

Repair the `AI_PROVIDER_ERROR` observed for job 24 at 59.914 seconds after migrating pedagogical
Lesson generation to `gemini-3.7-flash`.

## Scope

- Set documented OpenAI-compatible `reasoning_effort: "low"` on every pedagogical request.
- Remove `temperature`, which the official Gemini 3.7 migration checklist marks unsupported.
- Run one Lesson pipeline worker because provider requests are already serialized and paced.
- Prevent queued Lesson work from consuming provider calls after the first failure.
- Align the Admin request timeout with the 240-second server scheduling window.
- Preserve model lock, schemas, exact per-Lesson 3/5-call budget, pacing, citation ownership,
  persistence, rate-limit mapping, and API envelope.
- No migration, live provider request, push, deployment, or database mutation.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```
