# TASK-099 Test Report

## Final results

- Focused Lesson repository/service/component, Exercise component, and Lesson API regressions:
  `60 passed`.
- Full Vitest: `122` files passed; `1,216 passed`, `1 skipped` (`1,217` total).
- Playwright T022 Chromium: `8 passed`, including first/final navigation, correct completion return,
  reload, new session, second learner isolation, incorrect-only attempt, 375×667 portrait, and
  667×375 landscape overflow/touch checks.
- `npm run lint`: pass, zero warnings.
- `npm run typecheck`: pass.
- `npm run build`: pass (Next.js 15.5.22 production build).
- `git diff --check`: pass; only repository line-ending notices.
- Secret scan: pass; no candidate key/private-key material found.

## Commands

```text
npx vitest run <TASK-099 focused test files>
npm test
npx playwright test --config playwright.task-099.config.ts --project=chromium
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Diagnostic iterations

- The default Playwright attempt could not start because port 3000 was already occupied by an existing
  Node process. No process was stopped. TASK-099 uses isolated ports 3115/54325 instead.
- The first isolated run exposed a hardcoded mock reset port; the fixture was made environment-driven.
- The next run proved browser History Back could restore stale pre-start UI. A visible Exercise → Lesson
  return link with prefetch disabled was added; the final server-truth return/reload flows pass.
- Dev-server `NO_COLOR` and future `allowedDevOrigins` warnings were non-blocking and did not occur in
  the production build.

No real AI calls or live database mutations were made.
