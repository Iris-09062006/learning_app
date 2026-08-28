# TASK-098 Test Report

## Computed-style evidence

Before the fix, Chromium and Edge both reported:

- Card: background `rgb(255, 255, 255)`, color `rgb(248, 250, 252)`, opacity `1`.
- Course label: color `rgb(67, 56, 202)`, opacity `1`.
- Lesson title: color `rgb(248, 250, 252)`, opacity `1` (approximately `1.04:1`).
- Create Exercise CTA: background `rgb(15, 23, 42)`, color `rgb(255, 255, 255)`, opacity `1`.

After the fix, Chromium, Google Chrome, and Microsoft Edge all reported at 1920×1080 and 1366×768:

- Card: background `rgb(17, 24, 39)`, color `rgb(248, 250, 252)`, opacity `1`.
- Course label: color `rgb(165, 180, 252)`, contrast `8.90:1`, opacity `1`.
- Lesson title: color `rgb(248, 250, 252)`, contrast `16.96:1`, opacity `1`.
- CTA: background `rgb(165, 180, 252)`, color `rgb(23, 26, 53)`, contrast `8.53:1`, opacity `1`.
- CTA hover: background `rgb(199, 210, 254)`, color `rgb(23, 26, 53)`.
- Focus indicator visible; document scroll width did not exceed client width.

Firefox was unavailable: neither a system Firefox executable nor the Playwright Firefox bundle exists.

## Quality gates

- TASK-098 Playwright: **PASS** — Chromium 1/1, Chrome 1/1, Edge 1/1; two viewports each.
- `npm run lint`: **PASS** — zero warnings.
- `npm run typecheck`: **PASS**.
- `npm run test`: **PASS** — 122 files; 1,211 passed, 1 skipped.
- `npm run build`: **PASS** — Next.js 15.5.22 production build.
- `git diff --check`: **PASS** — no whitespace errors; Windows LF→CRLF notices only.

The first full cross-browser Playwright run had a Chromium dev-server warm-up timeout before the
login fields rendered. The isolated Chromium retry passed both viewports; Chrome and Edge passed in
the original post-fix run.
