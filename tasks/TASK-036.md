# TASK-036 — Accessible Fix-the-Bug Drag-and-Drop

## Status
`READY`

## Feature ID
`F-EXERCISE-03`

## Objective
Bổ sung interaction kéo-thả cho bài `fixTheBug` mà vẫn giữ grading server-side và request `selectedOptionId` hiện có.

## Dependencies
- `TASK-026` verified.
- Existing `fixTheBug` option and submission contract.

## Required Context
- `docs/features.md` — F-EXERCISE-02, F-EXERCISE-03, F-EXERCISE-04
- `docs/api_contract.md` — §13.1–13.3 and the `selectedSyntax` restriction
- `docs/ui.md`
- `docs/security.md`

## In Scope
- Render draggable code choices and a drop target for `fixTheBug`.
- Provide equivalent keyboard selection/move controls and clear focus/announcement states.
- Convert the chosen fragment to the existing `selectedOptionId` payload.
- Preserve current radio/selection fallback when drag APIs are unavailable.
- Component tests for pointer-equivalent state, keyboard flow, retry and submission payload.

## Out of Scope
- `selectedSyntax` contract or database changes.
- Free-form code execution.
- New exercise type or solution exposure.

## Acceptance Criteria
- Mouse/touch and keyboard users can complete the same interaction.
- Client submits only `selectedOptionId`; grading remains server-side.
- Drag state, invalid drop, submit loading, feedback and retry are announced accessibly.
- Predict-output behavior does not regress.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
