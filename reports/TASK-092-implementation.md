# TASK-092 Implementation Report

## Outcome

`VERIFIED` locally and intentionally uncommitted. The active Lesson-scoped Exercise generation path
now exposes the exact safe failure boundary while preserving the existing public API behavior,
prompt, request schema, provider/model/router, parser rules, persistence contract, and frontend.

## Active production flow

`/moderation/lessons/[lessonId]/exercises/new` renders `ExerciseGenerationForm`
→ `POST /api/ai/exercises/generate`
→ `generateExercise`
→ `OpenAIApiProvider.generateExercise`
→ OpenAI-compatible `POST` with `response_format.json_schema`
→ `choices[0].message.content`
→ `parseGeneratedExerciseContent`
→ `validateGeneratedExerciseContent`
→ `createGeneratedExerciseRecord`
→ Supabase RPC `create_generated_exercise_draft`
→ one `generated_exercises` row with the selected `lesson_id` and `status = 'pending'`.

The independent Course/Lesson generation pipelines are not part of this path.

## Provider envelope and request

The actual serialized fetch body contains `model`, two `messages`, `temperature: 0.4`, and:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "lesson_exercise_draft",
      "strict": true,
      "schema": {}
    }
  }
}
```

The populated schema is the existing `EXERCISE_SCHEMA`; it was not changed. The response envelope
expects one or more `choices`, a first `message`, and string `message.content`. Diagnostics now
distinguish invalid HTTP response, transport failure, timeout, invalid JSON envelope, missing
choices, missing message, missing content, non-string content, empty content, and invalid Exercise
JSON without logging response content.

## Authoritative Exercise output contract

- Root: exactly one object, not an array; no question-count field or wrapper.
- Required fields: `title`, `description`, `codeSnippet`, `options`, `correctAnswer`, `explanation`.
- Optional fields: none. Additional properties are rejected.
- `title`: trimmed non-empty string, maximum 150 characters.
- `description`: trimmed non-empty string, maximum 2,000 characters.
- `codeSnippet`: string, empty allowed, maximum 10,000 characters; returned trimmed.
- `options`: array of 2–6 strings. Each trimmed option is non-empty and at most 500 characters.
- Options must be unique after trimming.
- `correctAnswer`: trimmed non-empty string and must exactly equal one normalized option.
- `explanation`: trimmed non-empty string, maximum 5,000 characters.
- Exercise type is request/persistence metadata, not provider-output content. Allowed input values are
  `predict_output` and `fix_the_bug`.
- Difficulty is request/persistence metadata, not provider-output content. Allowed input values are
  `easy`, `medium`, and `hard`.
- There are no points, citations/evidence references, rationale separate from `explanation`, option
  objects, or separate answer-key object in the active provider output contract.

The editable moderation wrapper additionally requires exactly `title`, `description`,
`exerciseType`, `difficulty`, and `content`; wrapper title/description must equal normalized content.

## Existing JSON Schema versus parser

Matches: root object, six required fields, primitive/array types, and `additionalProperties: false`.

Parser-only constraints absent from the unchanged schema:

- non-empty trimmed `title`, `description`, `correctAnswer`, and `explanation`;
- maximum lengths 150/2,000/10,000/500/5,000;
- `options` minimum 2 and maximum 6;
- option non-empty rules;
- option uniqueness after trimming;
- `correctAnswer` membership in normalized `options`.

The schema has no free-string mismatch for Exercise type/difficulty because those fields are not in
the provider output; they are fixed by the validated request and persistence arguments.

## Diagnostics added

- Provider HTTP response: status, HTTP content type, selected model, choice count, runtime content
  type, and content length only.
- Provider failure: upstream status, provider host, duration, timeout flag, and stable error code.
- Envelope/parser codes: `INVALID_HTTP_RESPONSE`, `PROVIDER_REQUEST_FAILED`, `PROVIDER_TIMEOUT`,
  `INVALID_PROVIDER_JSON_ENVELOPE`, `MISSING_CHOICES`, `MISSING_MESSAGE`, `MISSING_CONTENT`,
  `CONTENT_NOT_STRING`, `EMPTY_CONTENT`, `INVALID_EXERCISE_JSON`.
- Exercise validation codes: `INVALID_EXERCISE_ROOT`, `UNEXPECTED_EXERCISE_FIELD`, `INVALID_TITLE`,
  `INVALID_DESCRIPTION`, `INVALID_CODE_SNIPPET`, `INVALID_OPTIONS`, `INVALID_OPTION`,
  `DUPLICATE_OPTION`, `INVALID_CORRECT_ANSWER`, `ANSWER_NOT_IN_OPTIONS`, `INVALID_EXPLANATION`,
  plus wrapper-only `INVALID_QUESTION_TYPE`, `INVALID_DIFFICULTY`, `INVALID_EXERCISE_CONTENT`.
- Safe shape metadata: field path, top-level keys, and option count.
- Persistence events: `exercise_parse_complete`, `exercise_persistence_started`,
  `exercise_persistence_success`, and `exercise_persistence_failure`. Failure logs contain only RPC
  name plus Supabase/Postgres code, message, details, and hint.

## Behavior statement

No generation behavior changed. Existing valid output is normalized and persisted as before;
existing invalid output remains rejected; transport errors and invalid responses preserve their
previous public `AI_PROVIDER_ERROR` mapping and user-safe messages. No real AI call, database
mutation, migration, frontend change, commit, push, or deployment occurred.

## Files changed

- Exercise provider, validator, service, and persistence repository.
- Focused provider, validator, service, and repository tests.
- `TASK-092` packet, active-task registry, task registry, and TASK-092 reports.
