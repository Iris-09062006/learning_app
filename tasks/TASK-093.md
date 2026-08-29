# TASK-093 — Force Non-Streaming Exercise Generation Response

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `f0ca2f5f1747da75781cd1520c4d99e48c06cea5`

## Objective

Make the active Lesson Exercise provider explicitly request one complete JSON response from 9Router
after production diagnostics proved an HTTP 200 `text/event-stream` response cannot be consumed by
the existing non-streaming OpenAI-compatible parser.

## Scope

- Add `stream: false` to the serialized Exercise request body.
- Add `Accept: application/json` to the Exercise request headers.
- Add focused serialization regression coverage.
- Preserve all TASK-092 diagnostics and existing generation behavior/contracts.

## Files allowed to change

- `src/features/ai/providers/ai-provider.ts`
- `src/features/ai/providers/__tests__/ai-provider.test.ts`
- `tasks/TASK-093.md`
- `reports/TASK-093-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Active Exercise provider request serializes `stream === false`.
- Request sends `Accept: application/json` while preserving Authorization and Content-Type.
- Model and existing `response_format.json_schema` are unchanged.
- Prompt, parser, semantic validation, persistence, retries, routing, DB, frontend, Lesson/Course
  generation, and public API remain unchanged.
- Focused Exercise provider tests, ESLint, typecheck, and `git diff --check` pass.
- No real provider call and no commit.

## Explicit exclusions

No SSE parsing, Exercise contract/schema changes, validation weakening, fallback/retry changes,
provider/model/router changes, DB/frontend changes, Lesson generation, live calls, commit, or deploy.
