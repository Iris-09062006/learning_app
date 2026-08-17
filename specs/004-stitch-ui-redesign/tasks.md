# Tasks: Stitch UI Redesign (004-stitch-ui-redesign)

**Input**: Design documents from `/specs/004-stitch-ui-redesign/` — `spec.md` (43 FRs / 13 SCs), `plan.md` (**authoritative**), `research.md` (decisions D1–D18), `data-model.md` (gate **NO**), `quickstart.md`, `checklists/requirements.md`, and the Stitch UI audit `tmp/stitch-screens/audit-notes.md`.

**Purpose**: Implementation-only task list. **No implementation is performed by this command.** Tasks are small, bounded, and independently verifiable; each fits one focused agent session.

**Branch/delivery**: implement on `feature/004-stitch-ui-redesign` (created in T001 off a clean HEAD). Per-phase Conventional Commits: A → B → C → **acceptance gate** → D → E → F. Never a single massive UI commit.

**Quality gates** (defaults): `npm run lint` (max-warnings 0), `npm run typecheck`, `npm run test` (focused pattern first), `npm run build`; `npm run ci` = lint + typecheck + test + build; `npm run test:e2e` = full Playwright. Run gates sequentially (PowerShell `;`). Per `AGENTS.md`: never claim a gate passed unless it actually ran; no skipped/weakened tests.

---

## Global ground rules (apply to every task)

1. **Presentation layer only.** Any task that unexpectedly requires touching `src/app/api/**`, server actions, services/repositories, Supabase migrations, or database schema is a **spec error → STOP and report BLOCKED** (data-model gate NO, FR-043). Tasks never modify these.
2. **Feature-003 isolation.** 003 Phase D WIP lives on `agent/update-project-guidance` (`src/app/api/admin/**`, `src/features/content-pipeline/services/**`, `repositories/**`, their tests). 004 never stages those. Phase E may edit only `content-pipeline-admin.tsx` component markup (T031). Probe/user files (`.codex-sync-learning-app/`, `account.txt`, `gitstatus.tmp`, `probe_*.txt`) are never committed.
3. **Controlled color migration (A/B/C/D classification).** For every legacy `indigo-*`/`slate-*`/other-hardcoded occurrence classify: **A** = brand-primary → orange token classes; **B** = semantic status (`success/warning/danger/info/ai`, soft chips) → unchanged status tokens; **C** = neutral layout (surfaces/borders/text) → `background/surface/border/text-*` tokens; **D** = intentional feature-specific (code-block palette, AI accent) → preserved unless justified. **No task performs a global regex replacement.** Preserve semantic colors; do not turn every colored state orange.
4. **Stitch usage loop** (each screen task): 1) inspect the Stitch screen via Stitch MCP/screenshots; 2) extract visual intent; 3) inspect existing component; 4) adapt the existing component; 5) run the page in browser; 6) compare vs the reference PNG; 7) correct discrepancies; 8) verify existing behavior. **Never paste exported Stitch HTML wholesale** (FR-041).
5. **Locked decisions (do not reopen)**: orange `#a23f00`/`#f76b1c`; Be Vietnam Pro; warm neutrals; no timed fast-quiz functionality; no Stitch-only destinations; no permanent top nav (C-SHELL); dark mode derived centrally (C-DARK); auth pages receive only global token inheritance (C-AUTH); admin workflows functionally authoritative.
6. **UI UX Pro Max** = review gate only (hierarchy, readability, keyboard/focus, contrast, mobile, affordance). Cannot override the Stitch brand language, existing behavior, or current IA.
7. **Context7** lookup is allowed only where current docs are needed (e.g. `next/font` for Next 15, Tailwind 3.4 config syntax). No dependency upgrades.
8. **Test strategy**: foundation/shared-primitive task → focused tests + lint/typecheck; screen task → focused tests + browser verification; Phase C → focused regression + browser visual checkpoint; Phase E → Admin/moderation regression + E2E where appropriate; Phase F → full lint + typecheck + unit/integration + build + full E2E. Preserved behavior is a gate, not just appearance.
9. **Phase C is a HARD VISUAL CHECKPOINT**: Phase D MUST NOT start until the acceptance gate (T023) is accepted. Tasks T024–T029 depend on T023.
10. **Class-assertion tests**: any test asserting legacy tokens is updated **in the same commit** as the component (assert new tokens; never weaken).

---

## Phase 0 — Setup

**Purpose**: Branch + baseline preconditions for all phases. No source changes.

- [x] **T001** Setup: create `feature/004-stitch-ui-redesign` off a clean HEAD; capture baseline inventory + screenshots
  - **Phase**: 0 (Setup) · **Story**: — · **[P]**: no · **Prereq**: none
  - **Objective**: Prepare the isolated branch and baseline evidence. Create `feature/004-stitch-ui-redesign` off current HEAD *after* feature-003 Phase D WIP is committed to its own branch or stashed (never staged by 004). Verify `git status` clean for `src/**`; record pre-change token inventory; capture a pre-edit Lesson-page baseline screenshot (light + dark, desktop) into `tmp/stitch-screens/`.
  - **Files likely to change**: none in `src/` (git ops only). Artifacts: `tmp/stitch-screens/baseline-lesson-*.png`, inventory appended here.
  - **Implementation boundary**: no source edits; no commit of probe/user files (`.codex-sync-learning-app/`, `account.txt`, `gitstatus.tmp`, `probe_*.txt`).
  - **Must remain unchanged**: all feature-003 WIP, current auth/API behavior, current branch layout.
  - **Stitch reference**: n/a (baseline capture only).
  - **Verification**: `git branch --show-current` = `feature/004-stitch-ui-redesign`; `git status --short` shows no `src/` diffs; `git grep -nE "indigo-|slate-"` count recorded (audit baseline 102 `indigo-*` / 332 `slate-*` in live `src/`); baseline screenshots saved.
  - **Completion**: branch exists off clean HEAD; baseline evidence saved; no source diff.

---

## Phase A — Design Foundation

**Purpose**: Stitch token system + Be Vietnam Pro + token-native primitives so every later phase is pure composition. **No page redesign; no repository-wide color sweep** (lands opportunistically in D–F).
### A1 — Font integration

- [x] **T002** [A1] Add Be Vietnam Pro + JetBrains Mono via `next/font` in `src/app/layout.tsx`; wire `--font-sans`/`--font-mono`
  - **Phase**: A · **Story**: — · **[P]**: no · **Prereq**: T001
  - **Objective**: Load **Be Vietnam Pro** 400/500/600/700 (`latin` + `vietnamese`) and **JetBrains Mono** 400/500 via `next/font/google` in `src/app/layout.tsx`; expose `variable:"--font-sans"` / `variable:"--font-mono"`; apply variable classes on `<body>`; set `body { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }` and route mono usages to `var(--font-mono)` in `globals.css`; map `fontFamily.sans/mono` to the CSS vars in `tailwind.config.ts`.
  - **Files likely to change**: `src/app/layout.tsx`, `src/app/globals.css` (body font rules only), `tailwind.config.ts` (fontFamily keys only).
  - **Implementation boundary**: fonts + CSS-var wiring only. **No color/radius/spacing token changes** (T003/T004/T005). Build-time network unavailable → vendor woff2 under `src/app/fonts/` + `next/font/local` with identical CSS variables (quickstart fallback).
  - **Must remain unchanged**: `lang="vi"`, metadata/viewport, globals import, all layout children, every existing behavior; no page redesign.
  - **Stitch reference**: audit §1 type scale (Be Vietnam Pro family); informational.
  - **Verification**: `npm run lint`; `npm run typecheck`; `npm run build`; dev smoke `/login` + `/courses` — computed `font-family` on `body` resolves through `var(--font-sans)`, Vietnamese glyphs render Be Vietnam Pro, zero console errors; `git diff --stat` limited to the A-file list.
  - **Completion**: fonts load in dev + build via CSS vars; no behavior change; lint/typecheck/build green.

### A2 — Light semantic design tokens

- [x] **T003** [A2] Rewrite `:root` tokens in `src/app/globals.css` to the Stitch warm palette
  - **Phase**: A · **Story**: — · **[P]**: no · **Prereq**: T002
  - **Objective**: Redraw light tokens per plan Phase A + audit §1/§2 (sanctioned ranges): `--primary #a23f00`, `--primary-hover #8a3400`, `--primary-active #7a2d00`, `--primary-soft #ffdbcd`, `--primary-container #f76b1c`, `--on-primary #ffffff`, `--on-primary-container #541d00`, `--primary-fixed-dim #ffb595`; warm neutrals `--background #fcf9f8`, `--surface #ffffff`, `--surface-subtle #f6f3f2`, surface-container family (`low/lowest/highest`), text `--text-primary #1b1c1c` / `--text-secondary #594137` / `--text-muted #8c8c8c`; borders `--border #e8e8e8`, `--border-strong`, `--outline`, `--outline-variant`; keep `success/warning/danger/info/ai` semantic families; add status **container** tokens (error-container `#ffdad6`, success tag `#52c41a`, tertiary/info-container); keep `code-*` layers; add `--focus-ring`.
  - **Files likely to change**: `src/app/globals.css` (`:root` block).
  - **Implementation boundary**: token values only. Change **values, never existing key names** (compat with components + `tailwind.config.ts`). No Tailwind mapping (T005), no `.dark` (T004), no component edits.
  - **Must remain unchanged**: every existing token consumable by current components; semantic status meaning; class API.
  - **Stitch reference**: audit §1 tokens.
  - **Verification**: `npm run lint`; `npm run test` (full unit suite still green — token names intact); browser smoke `/courses` — warm off-white page, orange primary wherever `bg-primary` is used.
  - **Completion**: light tokens fully defined; components referencing existing tokens render warm/orange; unit suite green.

### A3 — Derived dark semantic tokens

- [x] **T004** [A3] Add derived warm-dark `.dark` tokens in `src/app/globals.css` (centralized only)
  - **Phase**: A · **Story**: — · **[P]**: no · **Prereq**: T003
  - **Objective**: Derive `.dark` semantics from plan Phase A: warm-dark surface family (`#171210`→`#2e2722`), `--primary #ffb595`, `--primary-hover #ffceb4`, `--primary-active #ff9666`, `--primary-soft #4a2a15`, `--primary-container #8a3400`, `--on-primary-container #ffdbcd`; status + code families rebased warm; `--focus-ring`/outline visible in dark. C-DARK: semantics over pixel parity, centralized only.
  - **Files likely to change**: `src/app/globals.css` (`.dark` block).
  - **Implementation boundary**: `.dark` variables only; **no component-level dark-orange values or new `dark:` overrides** (git-grep guard); contrast validated via axe + UI UX Pro Max (record WCAG-AA pairs); dark never blocks light parity.
  - **Must remain unchanged**: class-based dark-mode wiring (`html.dark`), dark legibility, status semantics in dark.
  - **Stitch reference**: none (Stitch is light-only); derive per C-DARK.
  - **Verification**: `npm run lint`; dev dark toggle on `/lessons/[lessonId]` renders coherent palette; `git grep -nE "dark:(bg|text|border)-" src` shows no new component-level dark-orange introduced by this phase; contrast pairs recorded.
  - **Completion**: `.dark` central tokens complete; dark smoke passes; zero component dark-orange hardcodes.

### A4 — Tailwind token mapping

- [x] **T005** [A4] Extend `tailwind.config.ts` color map + `fontFamily`; preserve the existing class API
  - **Phase**: A · **Story**: — · **[P]**: no · **Prereq**: T003, T004
  - **Objective**: Add Tailwind color keys backing the new vars: `primary-container`, `on-primary`, `on-primary-container`, `primary-fixed-dim`, `primary-soft` (if absent), surface-container family (`surface-container-low/lowest/highest`, `surface-subtle`), `border.light`, outline tokens (`outline`, `outline-variant`), status container tokens (`danger-container`, `success-container`, `warning-container`, `info-container` per existing naming), `focus-ring`; ensure `fontFamily.sans/mono` = CSS vars (if not already in T002).
  - **Files likely to change**: `tailwind.config.ts`.
  - **Implementation boundary**: config mapping only; **no component edits**. No existing key removed (class-API compat); `content` glob list untouched.
  - **Must remain unchanged**: every utility class already used in `src/**` (e.g. `bg-primary`, `text-text-muted`, `border-border`, `success-soft`) resolves to new values.
  - **Stitch reference**: audit §1 token table.
  - **Verification**: `npm run typecheck`; `npm run build`; spot-check compiled CSS / computed styles for one class per new key; `npm run test` green.
  - **Completion**: new keys resolvable; old keys untouched; build + typecheck green.
- **T005 record**: implemented + committed at `29f5e5b` (`feat(ui): map Stitch semantic tokens to Tailwind`; files = `tailwind.config.ts` + `tasks.md` only). Mapping verified complete vs T005's key list: `primary` family (DEFAULT/hover/active/soft/`container`/`fixed`/`fixed-dim`), `on-primary`, `on-primary-container`, `on-surface`/`on-surface-variant` (documented aliases → `text-primary`/`text-secondary`); `surface` family (`subtle`/`elevated`/`container` + `container-low/lowest/highest`/`dim`); `text` (`primary`/`secondary`/`muted`/`inverse`); `border` (DEFAULT/`light`/`strong`); `outline` + `outline-variant`; status (`success|danger|info` with `soft` + `container`, `on-danger-container`, `on-info-container`); `ai` (DEFAULT/hover/soft); `code` layers; `focus-ring`; `fontFamily.sans/mono` → CSS vars (per T002). **`warning-container` intentionally absent**: `globals.css` (T003/A2) defines no `--warning-container` — Stitch audit has no warning container (`error-container #ffdad6`, `tertiary-container #3997ff`, success tag `#52c41a`, not warning), so A4 mapped "per existing naming" exactly. Cross-check: every `var(--*)` referenced by the config exists in `:root` + `.dark`; every pre-existing legacy key kept (class-API compat), `content` globs untouched, no component edits. No drift `29f5e5b..HEAD` (`git diff` for `tailwind.config.ts` = empty). Verification re-run (this session): `npm run typecheck` exit 0; `npm run build` exit 0; `npm run test` → **947 passed | 3 failed | 1 skipped** (identical known feature-003 CRLF migration baseline, zero new); compiled-CSS spot-check — all used new-key classes emit: `.bg-surface-container-lowest`, `.bg-surface-container`, `.bg-surface-subtle`, `.bg-primary-container`, `.bg-primary-soft`, `.bg-danger-container`, `.text-on-primary`, `.text-on-danger-container`, `.border-border-strong`, `.text-text-muted`, `.bg-background`, plus `.focus-visible\:ring-focus-ring:focus-visible{--tw-ring-color:var(--focus-ring)}` and `font-sans`/`font-mono` — resolving to the T003 warm tokens. Used-key inventory in `src/**` (config-dependent classes): `bg-primary-soft` 15, `bg-surface-subtle` 21, `ring-focus-ring` 14, `text-on-primary` 6, `bg-danger-container` 2, `bg-primary-container` 2, `bg-surface-container` 2, `bg-surface-container-lowest` 2, `border-border-strong` 1, `text-on-danger-container` 1 — all resolvable. Follow-on classes (`-container-low`, `-container-highest`, `-dim`, `border-light`, `outline*`, `primary-fixed*`) generate on demand from Phase C/D; no dangling references.

- **T005 re-verified (2026-08-16, `feature/004-stitch-ui-redesign` @ `c6760b5`, Phase C WIP in tree but nothing staged)**: gates freshly re-run — `npm run typecheck` exit 0, `npm run lint` exit 0 (max-warnings 0), `npm run build` exit 0, `npm run test` → **960 passed | 3 failed | 1 skipped** (identical known feature-003 CRLF migration-SQL baseline; zero new failures). Evidence notes: the full suite shows **one extra transient `ai-provider` failure only when the calling shell exports `AI_PROVIDER_URL` / `AI_PROVIDER_MODEL`** (leftover mock/E2E-session env; that test's `originalEnv` snapshot mechanism re-persists pre-polluted env); with a clean shell the file passes 13/13 in isolation and the full suite returns to the 3-failure baseline — environmental, not a code regression. Audit vs `globals.css`: **48/48** `--var` definitions in `:root` + `.dark` have a Tailwind key and **0 config refs are dangling** (excluding `--font-sans`/`--font-mono`, which are provided at runtime by `next/font` in `layout.tsx` — T002-owned); `git diff 29f5e5b..HEAD -- tailwind.config.ts` = empty (zero drift). Compiled-CSS spot-check on a fresh `next build`: `.bg-primary-soft`, `.text-on-primary`, `.text-on-primary-container`, `.border-border-strong`, `.bg-danger-container`, `.bg-surface-container-lowest`, `.bg-surface-subtle`, `.text-text-muted`, `.bg-background`, `.focus-visible\:ring-focus-ring` all emit `var(--…)` rules resolving to the warm tokens. **Known pre-existing limitation (out of T005 scope — no config-only fix exists):** Tailwind 3.4 cannot apply slash-opacity modifiers to colors backed by plain-hex CSS variables — `bg-primary-soft/70` / `ring-primary/40` compile to invalid/transparent, because palette colors emit `rgb(.../var(--tw-bg-opacity))` while var-backed colors emit bare `var(...)`. Affected usages are component-level (T006+/T017, e.g. `lesson-markdown.tsx:178` `bg-primary-soft/70`); if a translucent warm-orange treatment is later required, use full-opacity tint tokens (`bg-primary-soft`) or RGB-triplet CSS vars.
### A5 — Existing shared primitives (Button / Badge / Card / Input)

- [x] **T006** [A5, P] Extend `src/components/ui/{button,badge,card,input}.tsx` to tokens in place (APIs unchanged)
  - **Phase**: A · **Story**: — · **[P]**: yes (parallel with T007; disjoint files) · **Prereq**: T005
  - **Objective**: Tokenize in place, no public API change (forwardRef, variants, sizes, `isLoading`, label/error/helperText preserved): **Button** primary `bg-primary text-text-inverse hover:bg-primary-hover`, secondary `bg-surface-subtle text-text-primary`, outline `border-border bg-surface`, ghost `hover:bg-surface-subtle`, danger `bg-danger text-text-inverse`, focus `ring-primary/40`; **Badge** variants → token softs (`success-soft text-success`, `danger-soft text-danger`, `warning-soft text-warning`, `ai-soft text-ai`, `surface-subtle text-text-secondary`, `outline border-border`); **Card** `border-border bg-surface text-text-primary rounded-xl` (12px Stitch card radius); **Input** `border-border bg-surface text-text-primary placeholder:text-text-muted`, focus `ring-primary/40`, error `border-danger`, tokenized label/helper/error text.
  - **Files likely to change**: `src/components/ui/{button,badge,card,input}.tsx` + their `*.test.tsx`.
  - **Implementation boundary**: className/state strings only; JSX structure, props, exported names unchanged. Tests updated **in the same commit** asserting the new token classes (no weakening).
  - **Must remain unchanged**: all public props + behavior (disabled/loading/focus order), call sites.
  - **Stitch reference**: audit §1 controls (buttons `rounded-lg`, primary/on-primary).
  - **Verification**: `npm run test -- src/components/ui`; `npm run lint`; `npm run typecheck`; `npm run build`.
  - **Completion**: primitives render warm/orange tokens; UI tests green with new assertions.

### A6 — Small missing primitives (Textarea / Select / PageContainer / PageHeader)

- [x] **T007** [A6, P] Add `src/components/ui/{textarea,select}.tsx` and `src/components/layout/{page-container,page-header}.tsx` (+ tests)
  - **Phase**: A · **Story**: — · **[P]**: yes (parallel with T006; disjoint files) · **Prereq**: T005
  - **Objective**: Add small siblings mirroring the Input contract (label, error, helperText, disabled) using Input surface/focus tokens: `textarea.tsx` (raw `<textarea>`) and `select.tsx` (raw `<select>`); add minimal `page-container.tsx` (mx-auto, ~75rem/1200px max-width, gutter padding) and `page-header.tsx` (title at headline scale + optional eyebrow/description) in `components/layout`. Each with a colocated test.
  - **Files likely to change**: `src/components/ui/{textarea,select}.tsx` (+tests), `src/components/layout/{page-container,page-header}.tsx` (+tests).
  - **Implementation boundary**: new small components only; follow existing conventions (`cn`, forwardRef); **no parallel design system**; pages adopt them from Phase C onward (no adoption in this task).
  - **Must remain unchanged**: (new) — accessibility labeling semantics; no impact on existing components.
  - **Stitch reference**: audit §1 controls/containers.
  - **Verification**: `npm run test -- src/components/ui src/components/layout`; `npm run lint`; `npm run typecheck`; `npm run build`.
  - **Completion**: primitives implemented + tested + exported consistently; zero page adoptions yet.

### A7 — Foundation regression & verification

- [x] **T008** [A7] Foundation gates: full suite, browser smoke, dark smoke, A-file diff guard; commit Phase A
  - **Phase**: A · **Story**: — · **[P]**: no · **Prereq**: T002–T007
  - **Objective**: Prove the foundation did not redesign any page and left behavior intact. Dev smoke `/login`, `/courses` (guest), `/lessons/[lessonId]` light + dark; no console errors; `git diff --stat` limited to the A-file list; conventional commit (e.g. `refactor(ui): phase A design foundation`).
  - **Files likely to change**: none new (verification + fixes strictly within the A-file list).
  - **Implementation boundary**: no Page components changed; if a regression appears, fix inside the A-file list only.
  - **Must remain unchanged**: all routes, behavior, full unit suite (`npm run test`).
  - **Stitch reference**: n/a (foundation milestone).
  - **Verification**: `npm run ci`; browser smoke + dark toggle; `git diff --stat` restricted to A files; no new `indigo-*` under `src/` introduced by A (grep delta recorded); commit logged with hash.
  - **Completion**: all A gates pass; smoke pages clean; diff scoped; commit recorded.
    - **T008 record**: focused ui+layout 42/42; lint/typecheck/build exit 0; full suite 3 known CRLF migration failures only (unchanged baseline); browser smoke /login + /courses light/dark desktop+mobile clean (fonts loaded, focus ring visible, no overflow, 0 new console errors); A diff = 20 files, 0 backend/route/IA changes, 0 added indigo/slate/dark lines in src; contrast matrix recorded — light-mode soft-badge pairs (2.5–3.9:1) and text-muted (3.2–3.4:1) below AA due to locked Stitch/legacy tokens → NON-BLOCKING, Phase F token refinement with product sign-off (T037).
---

## Phase B — Application Shell

**Purpose**: Restyle the existing shell to the Stitch visual language. **Strictly preserve**: routes, nav destinations, permissions, grouping, interaction behavior (C-SHELL, FR-012/013/014). No Stitch-only destinations; no permanent top-nav addition. Story: foundational for US1/US2/US4.

- [x] **T009** [B1] Desktop sidebar visual restyle in `src/components/layout/app-navigation.tsx` (surfaces, brand tile, typography, icons)
  - **Phase**: B · **Story**: — · **[P]**: no · **Prereq**: T008
  - **Objective**: Sidebar to Stitch: `bg-surface-container-lowest` (white), warm `border` treatment, brand tile `bg-primary-container text-on-primary-container`, Be Vietnam Pro/label-scale nav text, icon styling, numbering markers where the Stitch sidebar shows them. **Do not** change width (T011) or active-state (T010) yet.
  - **Files likely to change**: `src/components/layout/app-navigation.tsx`.
  - **Implementation boundary**: className/JSX styling on the desktop sidebar only. Item list, destinations, grouping, roles, `isActivePath`, permission predicates, sign-out handler kept **byte-for-byte**.
  - **Must remain unchanged**: routes/nav destinations/role visibility/grouping order; mobile bars untouched in this task; no Stitch-only destinations; no new IA groups.
  - **Stitch reference**: audit §1 shell (sidebar `surface-container-lowest`, `w-72` visual) + sidebar visuals on `lesson-render.png`.
  - **Verification**: browser desktop at 1280×800 — synthetic target; `app-navigation.test.tsx` still green (assertions on destinations unchanged; update only if it asserted colors); `npm run lint`, `typecheck`, `build`.
  - **Completion**: desktop sidebar visually warm + orange-branded; tests + gates green.
    - **T009 record**: desktop sidebar restyled to Stitch tokens (class-only, `app-navigation.tsx`): `bg-surface-container-lowest` warm-white sidebar, `border-border` warm separator, brand tile `bg-primary-container text-on-primary-container`, brand/tagline `text-text-primary`/`text-text-secondary`, marker numerals `text-text-secondary`, auth-footer tokenized (register CTA `bg-primary text-on-primary hover:bg-primary-hover`, outline login/sign-out `border-border` + `hover:bg-surface-subtle`, error `text-danger`). Width `w-64` kept (T011); active/hover ternary byte-identical (T010); mobile bars untouched (T012); routes, destinations, grouping order, role visibility, `isActivePath`, sign-out handler byte-identical; 0 Stitch-only destinations. Added `app-navigation.test.tsx` contract case (semantic tokens + no-Stitch-destination guard); suite 4 tests. Gates: focused `src/components/layout` 10/10; lint/typecheck/build exit 0; `git diff --check` clean. Browser (dev server, /courses, 1440×900 light+dark then 390×844 mobile): aside 256px `surface-container-lowest` (#ffffff light / #1b1612 dark), warm border both modes (#e8e8e8 / #544940), brand tile + register CTA orange in both modes, content offset `lg:pl-64` (256px) === sidebar width, 0 horizontal overflow at 1440 and 390, mobile bars render unchanged, guest destinations + `aria-current` unchanged, register CTA navigates to /register, 0 console errors (pre-existing guest refresh-token warnings only). Guarded backend/API/supabase diff: 0.

- [x] **T010** [B2] Active-navigation treatment in `src/components/layout/app-navigation.tsx`
  - **Phase**: B · **Story**: — · **[P]**: no · **Prereq**: T009
  - **Objective**: Active route item → `bg-primary-soft text-primary` (icon + label), hover `bg-surface-subtle`, visible `:focus-visible` ring (component ring or global outline), preserved `aria-current` semantics (FR-015).
  - **Files likely to change**: `src/components/layout/app-navigation.tsx`.
  - **Implementation boundary**: active/hover/focus styling only; `isActivePath` logic unchanged.
  - **Must remain unchanged**: active-route detection, keyboard activation, focus order, destination mapping.
  - **Stitch reference**: audit §1 (active nav orange) + `lesson-render.png` sidebar.
  - **Verification**: browser click through routes — active item orange with visible focus when tabbing; `npm run test -- src/components/layout`; lint/typecheck/build.
  - **Completion**: active + focus states per tokens; keyboard walk-through clean.

- [x] **T011** [B3] Sidebar width/spacing + content-offset sync (`w-64`→`w-72`, `(main)/layout.tsx`)
  - **Phase**: B · **Story**: — · **[P]**: no · **Prereq**: T009, T010
  - **Objective**: Desktop sidebar `w-64`→`w-72` (288px) with safe internal spacing/gutter per Stitch (16/24 rhythm); update the `src/app/(main)/layout.tsx` content offset so content starts exactly after the sidebar — no overlay/gap; page padding per Stitch gutter.
  - **Files likely to change**: `src/components/layout/app-navigation.tsx`, `src/app/(main)/layout.tsx`.
  - **Implementation boundary**: width/spacing only; mobile breakpoint behavior unchanged; **width and offset must land in the same commit** (drift guard).
  - **Must remain unchanged**: fixed-sidebar behavior, content scrolling, no horizontal page scroll at desktop.
  - **Stitch reference**: audit §1 shell — `w-72`.
  - **Verification**: browser 1280×800 — sidebar 288px, content begins exactly beside it; resize 1440 ok; at <1024px the mobile breakpoint renders unchanged.
  - **Completion**: desktop shell offset correct; no overlap/scroll gap.

- [x] **T012** [B4] Mobile navigation visual restyle (top bar + bottom tab bar, in place)
  - **Phase**: B · **Story**: — · **[P]**: no · **Prereq**: T010, T011
  - **Objective**: Restyle mobile top bar and bottom tab bar in place: warm surfaces, orange active tab, warm borders, Be Vietnam Pro labels, preserved `env(safe-area-inset-*)` padding and z-index/overlay behavior.
  - **Files likely to change**: `src/components/layout/app-navigation.tsx` (mobile bars).
  - **Implementation boundary**: styling only. Sign-out flow, login/register links, bottom-tab destinations, safe-area handling unchanged.
  - **Must remain unchanged**: mobile top bar + bottom nav functionality; touch targets ≥44px; no permanent top nav introduced (C-SHELL).
  - **Stitch reference**: audit §1 shell (top nav visual) — pattern only; app mobile arrangement stays authoritative.
  - **Verification**: browser 390×844 — bars render, links/tabs work, active tab orange, safe-area padding intact; `app-navigation.test.tsx` green; lint/typecheck/build.
  - **Completion**: mobile shell restyled with behavior unchanged.
- **T012 record**: mobile bars restyled in place (`app-navigation.tsx` class/JSX only): top bar → `bg-surface` + `border-border` (opaque — Tailwind 3.4.17 drops `/95` alpha on `var()` colors; verified compiled CSS contains no `bg-surface/95`/color-mix), brand link `text-text-primary`, username `text-text-secondary`, guest login CTA `text-primary`; bottom nav → `bg-surface` + `border-border` with `gap-1` tab rhythm, active tab `bg-primary-soft text-primary` pill (`rounded-xl`) + preserved `aria-current`, inactive `text-text-muted` with `hover:bg-surface-subtle`/`active:bg-surface-container`; `:focus-visible` inset ring (`ring-focus-ring`) added to top-bar links and bottom tabs. Preserved byte-identical: h-14 top bar, `min-h-16` + `pb-[env(safe-area-inset-bottom)]`, z-order, `lg:hidden` breakpoints, routes, nav order, `shortLabel` markers, `isActivePath`, login/user display, sign-out handler, desktop sidebar/`w-72`/`lg:pl-72`. No raw hex or `dark:*` classes added; dark mode follows tokens (top bar `#28221d`, active pill `#4a2a15`/`#ffb595`). Tests: `app-navigation.test.tsx` 13/13 green (new: top-bar tokens, signed-in username, bottom-nav tokens, active pill, inactive hover, single mobile `aria-current`); layout dir 19/19. Gates: lint/typecheck/build exit 0; `git diff --check` clean. Browser 390×844 + 375×667 light/dark: sidebar hidden, top bar 56px, bottom nav 64px, `/courses` tab orange pill active, 0 horizontal overflow, links navigate, content not covered; desktop 1440×900 regression clean (288px sidebar, `lg:pl-72` offset, desktop active pill, register CTA). Guarded backend/API/supabase diff: 0.

- [x] **T013** [B5] Shell functional regression + responsive verification; commit Phase B
  - **Phase**: B · **Story**: — · **[P]**: no · **Prereq**: T009–T012
  - **Objective**: Full shell gate. **Permission inventory**: log in as learner, moderator, admin → destination sets identical to pre-change (per `app-navigation.test.tsx` expectations, recorded before B). Confirm no Stitch-only destinations render and no permanent top nav was added. Responsive pass at 1280/768/390, light + dark. Axe the shell. Conventional commit for Phase B.
  - **Files likely to change**: none new (verification + fixes within B-file list).
  - **Implementation boundary**: no IA/routing/permission changes; nav items' destinations untouched.
  - **Must remain unchanged**: navigation/IA/permission visibility per the functional-gate table (plan: "Navigation/IA/permission visibility — B, F").
  - **Stitch reference**: `lesson-render.png` shell alignment.
  - **Verification**: `npm run ci`; per-role destination inventory matches baseline; responsive + dark passes at 3 widths; axe no serious/critical; `npm run test:e2e` shell-relevant specs only (do **not** touch 003-owned `playwright.phase-d.config.ts`); commit recorded with hash.
  - **Completion**: shell restyle verified **behavior-equal + Stitch visual language**; B commit logged.
- **T013 record**: Phase B verified **behavior-equal + Stitch visual language**; **PASS** (commit `7d26830` + this record). Scope audit `03f8ff9..HEAD` = shell/layout/test/task files only (T009 `2990ab0`, T010 `b31abbd`, T011 `2a8df51`, T012 `7d26830`); package.json diff 0; guarded backend/API/schema count 0; no new routes/deps. Functional immutability: baseline `03f8ff9` vs HEAD — NAVIGATION_ITEMS rows (href/label/shortLabel/marker/roles/authenticated), `canSeeItem`, `isActivePath` prefix matching, `aria-current="page"`, logout fetch `/api/auth/logout` + `router.replace("/login")`, breakpoints, nav order identical. Tests: app-navigation 13/13 + layout 19/19; full vitest 947 passed | 3 failed = known CRLF feature-003 migration baseline | 1 skipped (no new); e2e shell-relevant (registers/enrolls/mock-AI/role-route): 3 passed, 1 failed = **pre-existing** `/register` axe contrast (`#register-username-helper` `text-text-muted` #8c8c8c, identical token at 03f8ff9; auth page, shell scope N/A). Lint/typecheck/build exit 0; `git diff --check` clean. Browser (supabase `.env.local` backend): desktop 1440×900 + 1024×768 ✓ sidebar 288px fixed `bg-surface-container-lowest` + `border-border`, content offset 288px `lg:pl-72`, Be Vietnam Pro, active pill `bg-primary-soft text-primary`, inactive `text-text-secondary`, keyboard focus ring `var(--primary)`; mobile 390×844 + 375×667 ✓ aside hidden, top bar 56px, bottom nav min-h-64 fixed + `pb-[env(safe-area-inset-bottom)]`, active pill + `aria-current` on `/courses` and nested `/courses/17`, guest login CTA, 0 horizontal overflow, no content covered; `/login` nav ok. Dark desktop + mobile ✓ derived warm-dark tokens (sidebar #1b1612/border #544940, active #4a2a15/#ffb595, top-bar/nav #28221d), focus ring #ffb595. Console: no shell errors (baseline: guest 401 `/api/courses/*/recommendations`, Next 15 `data-scroll-behavior` notice). Stitch refs: shared tokens 1:1 (`surface-container-lowest` sidebar, `border-border-light`, gap-1 nav, `primary-container` brand, orange active). UI UX Pro Max: 0 BLOCKING; NON-BLOCKING (inactive mobile tab `text-text-muted` 3.36:1 < AA 4.5 — shared token, Phase F contrast pass; 8-tab bottom overflow-x-auto = preserved IA; 40px link/button targets); OUT-OF-SCOPE ((main) layout wrapper legacy `bg-slate-50`/`dark:bg-slate-950` base + page `<main>` slate = Phase D/F sweep; register-page contrast = C-AUTH). **No source fixes required.** T014+ untouched.

---

## Phase C — Lesson Visual Proof of Concept (US1)

**Purpose**: `/lessons/[lessonId]` becomes the first representative screen vs `lesson-render.png`. This phase is a **HARD VISUAL CHECKPOINT**. `LessonContentView` is already token-based — this is surgical visual alignment, **not a rewrite**. **Preserved**: learner DTO, status model, start/advance API calls + error handling, focus management (`shouldFocusContent`/`contentRef`), Markdown parser semantics, action labels and flows.

- [x] **T014** [C1] Lesson page/container/header visual structure
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T013
  - **Objective**: `src/app/(main)/lessons/[lessonId]/page.tsx` swaps `max-w-6xl` for `PageContainer` (~75rem/1200px), keeps `bg-background`, Stitch page padding. `lesson-content-view.tsx` header → Stitch header card (`bg-surface border-border rounded-xl`): chapter tag pill (`bg-primary-container text-on-primary-container`), title at `headline-lg` scale (Be Vietnam Pro), description, status badge, progress text + bar, primary start/continue action using shared `Button`.
  - **Files likely to change**: `src/app/(main)/lessons/[lessonId]/page.tsx`, `src/features/lessons/components/lesson-content-view.tsx`.
  - **Implementation boundary**: visual structure for container/header only; no behavior/logic/parser changes.
  - **Must remain unchanged**: learner DTO usage, status model, start/continue API calls + error handling, focus management (`shouldFocusContent`/contentRef), action labels/flows.
  - **Stitch reference**: `lesson-render.png` header + audit §4.1.
  - **Verification**: browser 1280×800 — header matches ref (chapter pill, title, progress, action); functional start still flips status and moves focus; lint/typecheck/build.
  - **Completion**: header/container per Stitch; no functional change.
- **T014 record**: page.tsx `max-w-6xl` → `PageContainer` (75rem/1200px cap); keeps `bg-background` + top padding. Header → Stitch card `bg-surface border-border rounded-xl shadow-sm p-6 sm:p-8` (dropped `rounded-[2rem]`, indigo rgba shadow, blur blob); chapter pill `bg-primary-container text-on-primary-container`; title `text-2xl sm:text-[2rem] sm:leading-10 font-bold` (headline-lg Be Vietnam Pro); start/continue action → shared `Button` (size lg, `isLoading`, labels/icons/aria kept). No fake data: no lesson-level % exists → no progress bar added. Tests: lesson-content-view 9/9. Gates: lint/typecheck/build exit 0, `git diff --check` clean. Browser (e2e mock backend, real `/lessons/101`): desktop 1440×900 container 1200px, card 12px radius + #E8E8E8 border + shadow-sm, title 32px/700, pill #F76B1C on #541D00, Button 48px `rounded-lg` #A23F00; start flips unlocked→inProgress + focuses content; no overflow. Dark (`html.dark`) + mobile 390×844 light/dark OK (derived tokens only, no overflow). Console: only pre-existing 403 recommendations. Evidence: `tmp/t014-lesson-{desktop-1440,desktop-dark,mobile-dark,mobile-light}.png`. Deferred T015+: markdown/body typography, exercise cards, next-lesson nav, aside radius, breadcrumbs (no data on route — back-link kept). Guarded feature-003 diff = 0.

- [x] **T015** [C2] Lesson typography/content sections
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T014
  - **Objective**: Section-level typography in `lesson-content-view.tsx`: Be Vietnam Pro heading scale (`headline-lg` section titles, `title-md` card titles, `body-lg`/`body-sm` body), 8/16/24/32 spacing stacks and section distances per audit stacking (stack-sm/md/lg, gutter 24).
  - **Files likely to change**: `src/features/lessons/components/lesson-content-view.tsx`.
  - **Implementation boundary**: typography/spacing classes only.
  - **Must remain unchanged**: block order, content queries/data wiring, status semantics.
  - **Stitch reference**: `lesson-render.png` (10-point checklist items 2 & 5).
  - **Verification**: browser comparison — type hierarchy + spacing rhythm match ref; `npm run lint`, `typecheck`, `build`.
  - **Completion**: type hierarchy + spacing aligned.
- **T015 record**: Section-level typography/spacing in `lesson-content-view.tsx` ONLY (typography/spacing classes; block order, queries, status semantics untouched). Section headers → Be Vietnam Pro `title-md` (20px/28px/600) for both `Bài học` + `Bài tập của bài học` (was `text-xl font-bold`, `text-2xl font-bold`); exercise card titles → `body-lg` semibold (16px/24px/600); eyebrow→title `mt-2` (8px stack-sm); article header row `gap-4 pb-4` (16px stack-md, Stitch `mb-8 border-b pb-4`); content grid gutter `gap-8`→`gap-6` (Stitch 24px gutter); stacks 8/16/24/32 per audit (stack-sm/md/gutter, `space-y-8` stack-lg retained); article + exercise section cards `rounded-[2rem]`→`rounded-xl`, article padding `p-6 sm:p-8` (matches T014 header card; header→body transition); exercise cards `rounded-2xl bg-background/50`→`rounded-xl bg-surface` (checklist item 5 warm surface + border). T014 header preserved verbatim (pill/title/desc/button); lesson text, Markdown parsing, code/list/quote/callout, prev/next nav, aside `rounded-2xl`, status chips unchanged. Tests: lesson-content-view 9/9. Gates: lint/typecheck/build exit 0, `git diff --check` clean. Browser (e2e mock backend, real `/lessons/101`): desktop 1440×900 container 1200px, gutter 24, content 824/240 columns, h1 32px/700→h2 20px/600→h3 16px/600 hierarchy, article `.rounded-xl` 12px + `#E8E8E8` border + white surface, exercise card 12px radius, no overflow; mobile 390×844 single-column, no horizontal scroll, h1 24px/32px (headline-lg-mobile), section headers 20px/600; dark (`html.dark`) derived tokens only (surface #28221d, bg #171210, text #f5efe9), exercise card `bg-surface` resolves dark; console 0 errors. Evidence: `tmp/t015-lesson-{desktop-1440,desktop-dark,mobile-dark,mobile-light}.png` + `tmp/t015-before-desktop-{unlocked,content}.png`. Deferred T016+: markdown-renderer typography/lists/links (T016), code/list/blockquote/callout (T017), controls/progress/next-nav `rounded-2xl`/aside (T018), responsive/dark detail axe (T019/T021). Guarded feature-003 diff = 0.

- [x] **T016** [C3] Markdown renderer visual treatment (`src/features/lessons/components/lesson-markdown.tsx`)
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T014, T015
  - **Objective**: Typography layer only (**parser untouched**): headings on Be Vietnam Pro scale + `text-text-primary`, body `text-text-secondary`, links orange underline, list markers `marker:text-primary`, consistent block spacing rhythm.
  - **Files likely to change**: `src/features/lessons/components/lesson-markdown.tsx` (+ markdown render tests).
  - **Implementation boundary**: className/typography only; Markdown parser/semantics unchanged.
  - **Must remain unchanged**: rendering semantics, heading structure (`<h2>/<h3>`), link targets, block-tree parity.
  - **Stitch reference**: `lesson-render.png` content region.
  - **Verification**: focused markdown render tests (block semantics); browser — headings/lists/links per ref; `npm run lint`, `typecheck`, `build`.
  - **Completion**: markdown typography aligned; parser unchanged.
- **T016 record**: Markdown typography layer in `lesson-markdown.tsx` ONLY (className/typography; parser `parseBlocks`, AST, heading semantics `<h2>/<h2>/<h3>`, `safeHref`, href/rel/target, code/list/table structure, sanitization untouched) + new focused suite `lesson-markdown.test.tsx`. Body: prose container `space-y-5 text-[1.02rem] leading-8` → `space-y-4 text-base leading-6 text-text-secondary` (body-lg 16px/24px, secondary `#594137`); generic h2 (markdown `#`/`##`) `pt-3 text-3xl/2xl font-bold tracking-tight` → `pt-2 text-xl font-semibold leading-7` (title-md 20/28/600), h3+ `pt-2 text-xl` → `pt-2 text-base font-semibold leading-6` (Stitch body-lg-semibold 16/24/600), both `text-text-primary` (oversized blog-style headings removed, `tracking-tight` dropped); links keep `text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary` + added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` (Phase-A ring, href/rel/target unchanged); list markers unified `marker:text-primary` on both `list-disc` (ul) and `list-decimal` (ol) — spacing/indent (`space-y-2 pl-6`, `li pl-1`) untouched (T017); `hr` `my-8` → `border-border` only (rhythm via `space-y-4` = 16px blocks, 8px heading pt ⇒ 24px before heading text = 8/16/24 ramp); strong `font-semibold text-text-primary` + em plain italic unchanged. T017-specialized surfaces NOT redesigned: fenced code block `bg-code-background rounded-2xl overflow-x-auto`, blockquote `rounded-r-xl border-l-4 border-primary bg-primary-soft/70`, inline code `bg-primary-soft font-mono`, list indentation. Boundary note: tasks.md T016 Objective assigns `marker:text-primary` (prompt boundary listed lists under T017) — followed tasks.md; list spacing/marker layout remains T017. Stitch ref: `lesson.html` content region (content headings body-lg-semibold, card/section headers title-md, body-sm prose). Tests: lesson-markdown 10/10 (text unchanged, semantics, hrefs, `rel=noreferrer`/`target=_blank`, token classes, marker tokens, sanitize `javascript:` dropped, relative/hash no opener attrs, T017-untouched guard) + lesson-content-view 9/9; gates lint/typecheck/build exit 0, `git diff --check` clean, guarded feature-003 diff 0. Browser (real `/lessons/101`, mock backend, temporarily enriched mock markdown reverted after): desktop 1440 — body p 16px/24px secondary BVP, h2 20px/28px/600 primary, h3 16px/24px/600, links `#a23f00` underline + Tab focus-visible 2px orange ring + white offset, `::marker` `#a23f00` on ul/ol, block gaps 16px (+8 = 24 before headings); mobile 390 single-column no horizontal overflow (375=375); dark `html.dark` token-derived only — bg `#171210`, h2/h3 `#f5efe9`, body `#d3c6bc`, link+marker `#ffb595`; console 0 errors. Evidence: `tmp/t016-{desktop-1440-light,desktop-1440-dark,desktop-1440-light-full,mobile-390-dark,mobile-390-light}.png`. Deferred T017+: fenced/inline code palette, blockquote/callout, list spacing/layout, tables, next-lesson nav, aside/progress controls, responsive/dark detail + axe (T019/T021).
- [x] **T017** [C4] Code / list / blockquote / callout treatment
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T016
  - **Objective**: Blockquote/callout `border-primary bg-primary-soft/70` (+ Stitch quote bar `border-l-*`); code blocks keep `code-*` tokens + `--font-mono` with `overflow-x` inside the block (no page scroll) and rounded treatment; list spacing/markers.
  - **Files likely to change**: `src/features/lessons/components/lesson-markdown.tsx`.
  - **Implementation boundary**: styling only; **D-bucket** code-block palette preserved (intentional).
  - **Must remain unchanged**: code block semantics (language labels, any copy behavior), blockquote content.
  - **Stitch reference**: `lesson-render.png` quote/code regions.
  - **Verification**: browser — orange quote bar, dark code-surface block, long code scrolls internally; `npm run lint`, `typecheck`, `build`.
  - **Completion**: code/list/quote/callout per Stitch without behavior change.
- **T017 record**: T017-owned markdown element styling in `lesson-markdown.tsx` ONLY (parser `parseBlocks`/AST/href-sanitization, block text, T016 heading/body/link surfaces untouched). (1) **Blockquote/callout** → Stitch orange quote bar `rounded-r-xl border-l-4 border-primary bg-primary-soft px-5 py-4` non-italic `text-text-primary`; the verified Tailwind var-opacity defect was fixed here — `bg-primary-soft/70` (slash opacity on a plain-hex CSS var) compiled to invalid transparent, replaced with full-opacity `bg-primary-soft` (no config/token redesign, no raw rgba). (2) **Fenced code** → D-bucket palette preserved on purpose (`bg-code-background bg-code-surface text-code-muted text-code-text` + `--font-mono`), `rounded-2xl`→`rounded-xl` (12px system radius), raw `border-white/10` + `shadow-lg shadow-slate-950/10` removed (flat surface block, tokens-only), language header keeps `bg-code-surface text-code-muted` with `border-b border-border` hairline (the WIP's `border-border/40` had the same hex-var slash-opacity defect and was corrected to full `border-border`), `pre` = `overflow-x-auto font-mono text-sm leading-7 text-code-text` → long lines scroll INSIDE the block (desktop scrollW 1560 > clientW 749), never page scroll. (3) **Inline code** → neutral instructional chip `rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[0.9em] text-text-secondary` (mirrors Stitch lesson reference inline chips `bg-surface-variant … rounded font-mono`; removes the CTA-like `bg-primary-soft` chip and its component-level `dark:text-primary-hover` per C-DARK centralized-only rule). (4) **ul/ol** → `space-y-2`→`space-y-1` (compacted 4px instructional rhythm; measured li gaps 4px both lists), `pl-6`, markers `marker:text-primary`, `li pl-1` all unchanged. Content/parser/behavior untouched (blockquote text byte-identical in tests). Gates: `lesson-markdown.test.tsx` 13/13 (focused guards: tokens-only surfaces — no `border-white/10`, no `shadow-slate`, no `dark:`, no raw hex; blockquote text unchanged; list structure unchanged) + `lesson-content-view.test.tsx` 9/9; `npm run lint` exit 0, `npm run typecheck` exit 0, `npm run build` exit 0 (verified via redirect: webpack big-string cache warning is non-fatal noise), `git diff --check` clean (CRLF warnings only); full `npm run test` = exactly the feature-003 CRLF migration-SQL baseline **3 failed files** (`content-pipeline-migration`/`content-target-migration`/`content-destination-migration`) and **zero new failures** — `ai-provider` green, `lesson-draft-provider` 106/106, guarded diff (`src/app/api`, `supabase`, `src/server`) = 0. Env audit: calling shell had NO `AI_PROVIDER_URL`/`AI_PROVIDER_MODEL` during all gate runs (clean env confirmed). Browser (dev `:3001` → mock backend `:54321`, login `learner@example.com`, real `/lessons/101` with a temporarily enriched mock fixture — reverted to pre-T017 content after): **desktop 1440×900 light** — blockquote computed `background-color: rgb(255,219,205)` (= `--primary-soft` FULL opacity, **not transparent**), 4px `border-left: rgb(162,63,0)` (= `--primary` #a23f00 orange bar), `font-style: normal`, radius `0 12px 12px 0`, text `#1b1c1c`; code block `#151a2b`, radius 12px, header hairline `#e8e8e8` (valid token), pre JetBrains Mono + internal scroll; inline code `#f6f3f2`/`#594137` mono 14.4px, radius 4px; ul/ol gaps 4px; page `scrollWidth==clientWidth` (no horizontal scroll); **desktop dark** — blockquote `rgb(74,42,21)` (= dark `--primary-soft` #4a2a15) full opacity, bar `#ffb595`, text `#f5efe9`; inline `#201b16`/`#d3c6bc`; code tokens derived; body `#171210`; all centralized, zero `dark:` overrides; **mobile 390×844 light+dark** — same token derivation verified; normal (restored) content = 375=375, no horizontal scroll. Evidence: `tmp/t017-{desktop-1440-light,desktop-1440-dark,desktop-1440-light-full,mobile-390-light,mobile-390-dark}.jpg`. **Known T018+ finding (out of T017 file scope — no markdown-only fix exists)**: on mobile the single-column content grid `div.grid.gap-6` in `lesson-content-view.tsx` (T015/T018-owned) uses an implicit `auto` track, so the enriched LONG code line forced the article column to ~1609px and page scroll; fix belongs in T018/T019 (e.g. `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_15rem]` or `min-w-0` on the article grid item). Deferred to T018+: progress/status/next-nav/aside controls; T019: responsive/dark detail axe pass and the mobile code-line overflow above. `mock-supabase-server.mjs` enrichment was TEMP (browser fixture) and reverted before commit; `.specify/feature.json` pointer change and `tmp/` evidence remain out-of-scope/uncommitted.

- [x] **T018** [C5] Lesson progress / status / action / navigation controls
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T015–T017
  - **Objective**: Status badge → existing token chips (`warning/info/success-soft` per status model); progress bar fill + text (`bg-primary`); start/continue/next actions via shared `Button`; next-lesson nav card (`bg-surface border-border rounded-xl`, `bg-primary-soft/50` accent, `text-primary` label); aside "Tổng quan" card (`bg-surface border-border rounded-xl`, secondary link `hover:text-primary`); primary focus rings.
  - **Files likely to change**: `src/features/lessons/components/lesson-content-view.tsx`.
  - **Implementation boundary**: control visuals only; progress read/update calls unchanged.
  - **Must remain unchanged**: persisted-progress data read (FR-028), next-lesson POST routing, status flip semantics, action labels.
  - **Stitch reference**: `lesson-render.png` progress + action regions.
  - **Verification**: browser — progress reflects real data; controls orange; focus visible; functional start/next still work; `npm run lint`, `typecheck`, `build`.
  - **Completion**: controls per Stitch; behavior unchanged.
- **T018 record**: Lesson controls/navigation restyled in `lesson-content-view.tsx` ONLY (JSX/classes; `handleStartLesson`/`handleNextLesson`, labels, fetch routes `/api/lessons/:id/start` + `/api/lessons/:nextId/start`, `router.push('/lessons/:id')`, focus effect `shouldFocusContent`/`contentRef`, status flip semantics) + focused test updates. `express`-side mock enriched only for local browser verification then restored. (1) **Status** — data-driven chips already on token families (`bg-warning-soft text-warning` / `bg-info-soft text-info` / `bg-success-soft text-success`); preserved exactly, new test asserts chips stay data-driven per status. (2) **Progress** — the app exposes **no** numeric lesson-progress value (LessonResponse has none; `/progress` returns only status + timestamps), so per the strict data rule **no fake progress bar was added**; the existing "Tiến độ được lưu tự động" caption retained. The Objective's "progress bar (bg-primary)" is conditional on real data existing and is correctly skipped. (3) **Actions** — start/continue already used the shared `Button`; the raw `<button>` "Tiếp theo" converted to shared `Button` (`size="md"`, `disabled={isAdvancing}`, `aria-describedby` retained, labels "Đang mở..."/"Tiếp theo" + arrow identical) → primary surface + `ring-focus-ring` focus. "Làm bài" + "Xem lộ trình khác" links got `focus-visible:ring-2 ring-focus-ring ring-offset-background` (the Link previously had `focus-visible:outline-none` with **no** replacement ring = invisible focus). (4) **Next-lesson nav** — `rounded-2xl border-primary/20 bg-primary-soft/50` (both slash-opacity utilities compile to **nothing** in Tailwind 3.4 for var-tokens, verified via probe + built CSS) → `rounded-xl border-border bg-surface` card with Stitch left accent bar (`absolute left-0 w-1 rounded-r-md bg-primary`) + `text-primary` label + `text-text-primary` title + `text-text-secondary` body; hrefs/titles/arrows unchanged. (5) **Aside** — `rounded-2xl`→`rounded-xl bg-surface border-border`, data rows (status/time/exercises) byte-identical, "Xem lộ trình khác" `hover:text-primary` + rings. (6) **Related fixed slash-opacity defects in same component** (all compiled to no CSS before): `border-danger/20`→`border-danger` (error alert), `border-primary/30 bg-primary-soft/40`→`border-primary bg-primary-soft` (unlocked preview panel), `bg-surface-subtle/60`→`bg-surface-subtle` (empty exercises), exercise-card hover `hover:border-primary/30 hover:bg-primary-soft/30`→full tokens, "Làm bài" `border-primary/25`→`border-primary`. **T017 responsive finding**: the Lesson grid containing the aside/navigation and its mobile overflow is **T019-owned** ("no horizontal page scroll" is an explicit T019 objective) → not touched, reported for T019. Raw colors: none added; dark via centralized tokens (verified computed `#28221d` surfaces, `#ffb595` primary, info chip `#1c3049/#8db9f2`). Gates: `lesson-content-view.test.tsx` 14/14 (5 new: status chips data-driven, next-nav token surfaces + accent bar + shared Button ring, aside data + tokens + `hover:text-primary`, no fabricated previous nav, no slash-opacity utilities on any control surface), `lesson-markdown.test.tsx` 13/13; lint/typecheck/build exit 0; `git diff --check` clean; guarded API/content-pipeline/supabase diff = 0; mock restored to HEAD (diff 0). Browser 1440×900 + 390×844 light/dark: status hierarchy orange-safe (info learning chip), primary "Bắt đầu"/"Tiếp tục" action prominent, next accent bar + `text-primary` label, aside rounded-xl sticky right column, focus ring visible on next Button, no horizontal overflow, mobile stacks content → next nav → aside below. Remaining T019+ discrepancies: T019 grid overflow + stacking polish, T020 10-point checklist, T021 a11y.

- [x] **T019** [C6] Responsive + dark treatment (Lesson page)
  - **Phase**: C · **Story**: US4 · **[P]**: no · **Prereq**: T014–T018
  - **Objective**: Lesson page at 390×844: single-column stacking, aside below content, bottom-nav visible, **no horizontal page scroll**; `lg:sticky` aside retained; dark mode renders via derived `.dark` tokens only (no component dark-orange).
  - **Files likely to change**: `src/features/lessons/components/lesson-content-view.tsx` (responsive/dark classes).
  - **Implementation boundary**: responsive/dark classes only; C-DARK semantics (dark coherence, not pixel parity).
  - **Must remain unchanged**: mobile stacking order, sticky behavior at lg, status/progress semantics in dark.
  - **Stitch reference**: `lesson-render.png` mobile composition; dark = derived (C-DARK).
  - **Verification**: mobile + dark screenshots recorded; no horizontal overflow at 390; axe contrast spot-check in dark.
  - **Completion**: mobile + dark usable.
- **T019 record**: responsive/dark polish in `lesson-content-view.tsx` + `lesson-markdown.tsx` only. (1) **Long-code overflow root cause** — the content grid column was a plain grid item (`min-width:auto` ⇒ content-based minimum), so an ultra-long unbreakable fenced code line pinned the item wider than its `minmax(0,1fr)` track and stretched the whole page even though `<pre>` already had `overflow-x-auto`. Fix: `min-w-0` on the content column (item now shrinks to the track; the `overflow-hidden` wrapper + `overflow-x-auto` pre scroll internally), `grid grid-cols-1` explicit base (`minmax(0,1fr)` semantics) on the content + header grids, and `min-w-0` on the header title column, aside, and next-lesson flex text block. (2) **Prose wrapping** — a longer-than-column unbreakable inline token (inline `code`) still poked out of the article, so the markdown container got `break-words`; `break-words` also added to `h1` and next-lesson title (does NOT wrap fenced code blocks — `pre` `white-space:pre` + horizontal scroll preserved). (3) **Mobile bottom-nav clearance** — fixed `min-h-16` bottom nav covered the last ~32px of the aside "Xem lộ trình khác" link at full scroll (roadmap bottom 812 > nav top 780 @390×844); added `pb-16 lg:pb-0` to the lesson root div so the lesson clears the nav (roadmap bottom 748 < nav top 780 after). This is a Lesson-scoped page mitigation, not a shell change (`(main)/layout.tsx` bottom-nav padding gap remains a Phase B observation). (4) **Dark mode** — NO component-level dark changes needed: the whole Lesson surface (header/article/exercise/next-nav/aside/code/labels/chips/focus) already uses centralized `--*-*` tokens per T014–T018; audited zero `dark:`/raw-hex in lesson files. Browser stress fixture (long code line, long title/next-title, blockquote, lists, inline-code token) seeded in the e2e mock temporarily for verification only, then **restored** (mock diff 0). Measured `documentElement.scrollWidth === clientWidth` at 1440×900 / 1024×768 / 768×1024 / 390×844 / 375×667, light + dark; `pre.scrollWidth (2022) > pre.clientWidth` everywhere (internal scroll). Gates: focused lesson tests 28/28, lint 0, typecheck 0, build 0. No API/parser/backend/business-logic changes.
- [x] **T020** [C7] Browser screenshot comparison vs `lesson-render.png` (10-point checklist)
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T014–T019
  - **Objective**: **The visual checkpoint.** Capture desktop (1280×800) + mobile (390×844), light + dark; run the explicit **10-point checklist** from plan Phase C: 1) page proportions; 2) shell alignment; 3) content width; 4) typography hierarchy; 5) spacing rhythm; 6) primary orange usage; 7) surface/card treatment; 8) border/radius; 9) progress/actions; 10) responsive behavior. Each item = PASS/CORRECT with evidence, or fix-and-recapture loop. **"Looks similar" is never acceptance.**
  - **Files likely to change**: none new (screenshots + annotation records in `tmp/stitch-screens/`; fixes within C-file list).
  - **Implementation boundary**: visual fixes to C-scope files only; no behavior/logic edits.
  - **Must remain unchanged**: lesson behavior (already verified in T022), zero stray indigo on the page (item 6 gate).
  - **Stitch reference**: `tmp/stitch-screens/lesson-render.png` (only authoritative lesson ref).
  - **Verification**: per-item checklist table recorded with before/after screenshots at 4 viewport×theme combos; item 4 (primary usage) shows zero legacy indigo visible.
  - **Completion**: 10/10 items resolved (PASS or CORRECT with recorded evidence).
- **T020 record**: 10-point visual comparison vs `lesson-render.png` executed in a clean separate verification spec, screenshots + computed metrics recorded in `tmp/stitch-screens/t020/`, notes in `tmp/stitch-screens/t020-visual-notes.md`. (1) **Fixture** — e2e mock lesson 101 content temporarily enriched to Stitch-parity markdown (h2/h3, strong, inline code, ul/ol, blockquote, fenced `python` code, link) and the mock's embedded-`chapters.*` filters temporarily enabled so `nextLesson` resolves; **both restored (mock diff 0)**. (2) **10-point checklist** — all PASS: page proportions (sidebar 288px : content 1152px : aside 240px), shell alignment (w-72 sidebar, orange active row, gutter 288+32), content width (`max-w-[75rem]` cap, code scrolls internally), typography hierarchy (Be Vietnam Pro; pill 12/700 caps; h1 32/40 desktop; body 16/24), spacing rhythm (8/16/24/32), orange usage (buttons/tags/quote/links/lists — orange family only; offender scan proves the only slate values are the covered `(main)/layout` root), surfaces/cards (`bg-surface border-border` everywhere), borders/radii (12px cards / 8px controls), progress/actions (no numeric progress data → caption retained per T018; orange primary actions + `ring-focus-ring`), responsive (scrollWidth===clientWidth asserted at 1440×900 / 1024×768 / 768×1024 / 390×844 / 375×667, light+dark; mobile stacks, bottom nav clears). (3) **Correction** — pre-start preview card `rounded-3xl`→`rounded-xl` + icon `rounded-2xl`→`rounded-xl` (12px system radius; class-only; no test asserts old classes; recaptured). (4) Findings: BLOCKING 0, MAJOR 0, MINOR 1 (corrected), DEFERRED (layout root legacy slate — invisible & out of C-scope; no active sidebar item on `/lessons/*` — D12/D13 course-tree deferred; status chip semantic families kept per T018). No logic/API/parser/routing/progress changes; guarded diff 0.

- [x] **T021** [C8] UI UX Pro Max accessibility/usability review (Lesson page)
  - **Phase**: C · **Story**: US4 · **[P]**: no · **Prereq**: T020
  - **Objective**: Run the UI UX Pro Max/axe review on the lesson page: hierarchy, readability, keyboard tab order, visible focus, contrast (light + dark), control affordance, mobile usability. Fix a11y-blocking findings **within C scope only**. The review cannot override the locked Stitch language or existing behavior.
  - **Files likely to change**: fixes within C-file list (no new design decisions).
  - **Implementation boundary**: a11y/UX fixes only; semantic structure (headings, labels, focus order) preserved or improved.
  - **Must remain unchanged**: existing keyboard activation, screen-reader labels, focus behavior.
  - **Stitch reference**: `lesson-render.png` accepted structure (review is advisory, not a redesign).
  - **Verification**: `@axe-core/playwright` on light + dark — no serious/critical violations; keyboard walk-through recorded; findings triaged (blocking resolved).
  - **Completion**: a11y gate passes; review evidence recorded.
- **T021 record**: UI UX Pro Max/axe review of the lesson page executed and the one a11y-blocking finding fixed within C scope (no new design decisions; no palette change). (1) **Evidence suite** — `tests/e2e/t021-a11y.spec.ts` runs axe (`wcag2a/aa`, `wcag21a/aa`) on `/lessons/101` at 1440×900 + 390×844 × light/dark in BOTH states (pre-start and in-progress after clicking start); `tests/e2e/t021-kb.spec.ts` covers keyboard walk-through (visible focus on the start Button, Enter → article focus, post-start Tab sequence recorded) + mobile touch targets ≥44×44; `tests/e2e/__t021-scan__.spec.ts` is the diagnostic scanner used to locate the offending sampled pixels and regenerate `tmp/real-button.png`/`tmp/real-span.png` + computed CSS for the evidence record (no assertion). (2) **Finding (serious, mobile dark pre-start)** — the lg CTA "Bắt đầu bài học" used `text-on-primary` #3b1a02 on `bg-primary` #ffb595 = 3.66:1 at axe's sampled edge pixel (blended fg #715948 on blended bg #fcb190). Probes proved antialiased Vietnamese-diacritic glyph edges (45–87% ink) cannot reach 4.5:1 by weight/size alone (`font-bold` worst 3.89; `font-bold`+17px worse 1.77) → a structural polarity fix was required. No dark-mode Stitch reference exists (`lesson-render.png` is light-only), so the restyle cannot violate the locked Stitch language. (3) **Fix (`lesson-content-view.tsx` only)** — dark polarity flip to M3 container tokens: `dark:bg-primary-container` #8a3400 + `dark:text-on-primary-container` #ffdbcd ≈ 6.3:1; interaction ramp `dark:hover:bg-primary-fixed-dim` #61361b → `dark:active:bg-primary-soft` #4a2a15 with the #ffdbcd label held constant (≈7.9:1 / ≈10:1), mirroring light-mode darken-on-interaction semantics; all values are existing tokens (zero new hex). Kept `font-bold`; `▶` text glyph → filled `<polygon>` SVG with `shapeRendering="crispEdges"` for solid glyph coverage; two empty-state `rounded-2xl`→`rounded-xl` (12px radius system). Dark "Tiếp theo" md Button (same primary surface) is scanned in-progress at all combos = 0 violations → left as the locked Stitch primary surface; the global dark `on-primary`/`primary` pair (~3.66:1) is a palette-wide caveat explicitly out of C scope. (4) **Gates** — T021 e2e suite 7/7 (axe 4 combos × both states, kb 2, diagnostic scan 1); `lint` / `typecheck` / `build` exit 0; focused lesson suites 28/28; full `vitest` 966 passed / 3 failed, the 3 failures being pre-existing Windows CRLF artifacts (core.autocrlf=true; CRLF in committed `018_create_lesson_content_target.sql`) in content-pipeline SQL snapshot tests — files clean at HEAD, unrelated to this task, recorded not masked. `git diff --check` clean. Evidence: `tmp/t021-final-verify.txt`, `tmp/t021-verify-run.txt` (pre-fix failure), `tmp/real-button.png` (new dark CTA), `tmp/real-span.png`, `tmp/find-pixel.mjs`, `tmp/probe-worst.mjs`, `tmp/stitch-screens/lesson-render.png` (light-only reference).

- [x] **T022** [C9] Functional Lesson regression + Phase C gates
  - **Phase**: C · **Story**: US1 · **[P]**: no · **Prereq**: T014–T021
  - **Objective**: Prove lesson functionality unchanged: start → status flips to in-progress + focus moves to content; "Tiếp theo" → next-lesson flow (POST route identical); progress persists across reload; Markdown headings/lists/quotes/code render with the **same block semantics** (block-tree diff if a snapshot exists). Same APIs/DTOs/error handling.
  - **Files likely to change**: none new (verification; regression fixes only in C-file list). Regression fix requiring API/logic changes → BLOCKED (feature error).
  - **Implementation boundary**: no API/logic edits allowed.
  - **Must remain unchanged**: every lesson interaction listed above.
  - **Stitch reference**: n/a (functional gate).
  - **Verification**: focused `lesson-content-view.test.tsx` (class-agnostic) + markdown render tests; `npm run ci`; E2E lesson specs at the C boundary; commits per C step recorded.
  - **Completion**: lesson behavior verified identical; full C gates green.
### ★ Hard gate — Phase C Acceptance

- [ ] **T023** [G1] ⛔ PHASE C ACCEPTANCE GATE — review & accept before any Phase D work
  - **Phase**: C (Gate) · **Story**: US1/US4 · **[P]**: no · **Prereq**: T020, T021, T022
  - **Objective**: Mandatory **human/visual acceptance checkpoint**. Review all Phase C evidence (10-point checklists, screenshot sets, axe/UI UX Pro Max records, functional regression, gate outputs). **PHASE D MUST NOT begin automatically after C implementation completes. T024–T029 are blocked until this task is ACCEPTED and marked DONE.** If any high/medium Stitch discrepancy remains → findings return to C tasks (fix → re-verify → re-review).
  - **Files likely to change**: none (review record; status updates in this file + project tracking).
  - **Implementation boundary**: review only; no code changes unless findings sent back to C tasks.
  - **Required Phase C exit state (all must be evidenced)**: 1) Lesson functionality unchanged (T022); 2) screenshot/browser comparison completed (T020); 3) major Stitch visual discrepancies resolved (T020 checklist); 4) light mode accepted; 5) dark mode usable; 6) mobile usable (T019); 7) focus/keyboard behavior accepted (T021); 8) lint/typecheck/focused tests passing (T022).
  - **Must remain unchanged**: everything from C — this gate never loosens lesson behavior.
  - **Stitch reference**: `lesson-render.png` (comparison basis).
  - **Verification**: exit-state checklist signed off with artifact links; verdict recorded (ACCEPTED → D unlocked; FIX_REQUIRED → loop back).
  - **Completion**: gate ACCEPTED and recorded; only then do T024–T029 become eligible.

---

## Phase D — Remaining Learner Screens (US2)

**Purpose**: Propagate the VERIFIED Phase A–C patterns to the learner surface **without treating any screen as a fresh design**. Reuse the accepted Lesson-era design system (tokens, shell, primitives, containers). **All D tasks are [P]-eligible after T023 acceptance** (disjoint file sets). Do NOT implement timed fast-quiz functionality (FR-042).

- [ ] **T024** [D1, P] `/courses` catalog adopts the shared system
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `courses/page.tsx` + `course-list.tsx` + `course-search-form.tsx` + `course-card.tsx` adopt Phase A–C patterns: cards `bg-surface border-border rounded-xl`, orange language tag (A-bucket indigo swap), search form → shared `Input`/`Select` tokens, page header → `PageHeader`, pagination borders/buttons tokenized.
  - **Files likely to change**: `src/app/(main)/courses/page.tsx`, `src/features/courses/components/{course-list,course-search-form,course-card}.tsx` (+ `course-card.test.tsx`).
  - **Implementation boundary**: visual classes + shared primitives only; reuse C-era patterns; **no screen redesign**.
  - **Must remain unchanged**: server-side search, `pageSize`/`page` params, pagination links, enroll CTA, statuses/loading.
  - **Stitch reference**: `stitch-explore-roadmap.png` (catalog portion).
  - **Verification**: screenshot vs ref; functional search + pagination + enroll; dark + mobile; axe; `npm run lint`, `typecheck`, `build`.
  - **Completion**: catalog aligned + behavior unchanged.

- [ ] **T025** [D2, P] `/courses/[courseId]` detail adopts the shared system
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `[courseId]/page.tsx` + `course-detail-view.tsx`: header/summary cards `bg-surface border-border rounded-xl`, action buttons → shared `Button`, status accents orange, zero stray indigo primary.
  - **Files likely to change**: `src/app/(main)/courses/[courseId]/page.tsx`, `src/features/courses/components/course-detail-view.tsx`.
  - **Implementation boundary**: visual only; reuse C patterns.
  - **Must remain unchanged**: enroll action, curriculum fetch, not-found handling, loading states.
  - **Stitch reference**: `stitch-explore-roadmap.png` (detail portion).
  - **Verification**: screenshot vs ref; enroll unchanged; dark + mobile; axe; lint/typecheck/build.
  - **Completion**: detail aligned + behavior unchanged.
- [ ] **T026** [D3, P] `/courses/[courseId]/roadmap` adopts the shared system
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `roadmap/page.tsx` + `course-roadmap-view.tsx`: progress bar fill `bg-indigo-600`→`bg-primary` (A); chapter header `bg-slate-50/50`→`surface-subtle` (C); success chip→`success-soft`, in-progress chip→`info-soft` (B); borders→`border` (C); icons completed→`text-success`, in-progress→`text-primary`, locked→`text-text-muted`.
  - **Files likely to change**: `src/app/(main)/courses/[courseId]/roadmap/page.tsx`, `src/features/courses/components/course-roadmap-view.tsx` (+ `course-roadmap-view.test.tsx`).
  - **Implementation boundary**: class/icon changes with A/B/C justification only; reuse C-era chips/cards.
  - **Must remain unchanged**: progress % read (FR-028), chapter/lesson status mapping, locked rows, lesson links, semantics.
  - **Stitch reference**: `roadmap-render.png` + `stitch-roadmap.png`.
  - **Verification**: screenshot vs ref; progress data behavior unchanged; dark + mobile; axe; `npm run lint`, `typecheck`, `build`.
  - **Completion**: roadmap aligned + progress behavior unchanged.

- [ ] **T027** [D4, P] `/exercises/[exerciseId]` adopts the shared system
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `exercises/[exerciseId]/page.tsx` + `exercise-view.tsx` + `fix-the-bug-drag-drop.tsx`: badge→orange container pill; option buttons selected `border-primary bg-primary-soft`; radio dot `bg-primary`; submit via `Button`; result panel `success-soft`/`danger-soft` tokens; code snippet keeps `code-*` tokens; focus rings primary.
  - **Files likely to change**: `src/app/(main)/exercises/[exerciseId]/page.tsx`, `src/features/exercises/components/{exercise-view.tsx,fix-the-bug-drag-drop.tsx}` (+ exercise tests).
  - **Implementation boundary**: visuals only; `quiz-fast.html` informs **visual patterns only** (`option-grid`/chip treatment) — **no timed mode, no new exercise type** (FR-042).
  - **Must remain unchanged**: submit flow, `fix_the_bug` drag/drop behavior, selection states, result/AI-explanation wiring, existing exercise types.
  - **Stitch reference**: `stitch-exercise.png`; patterns from `stitch-quiz-fast.png` only where an existing type maps.
  - **Verification**: screenshot vs ref; functional submit/feedback + drag-drop interaction; dark + mobile; axe; lint/typecheck/build.
  - **Completion**: exercise aligned + all flows unchanged.

- [ ] **T028** [D5, P] `/profile` adopts the shared system
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `profile/page.tsx` + `profile-view.tsx` + `profile-form.tsx`: page container/header tokens (`PageContainer`/`PageHeader`), cards → `Card` token defaults, back-link `text-primary`, form → shared `Input`/`Button`.
  - **Files likely to change**: `src/app/(main)/profile/page.tsx`, `src/features/profile/components/{profile-view,profile-form}.tsx`.
  - **Implementation boundary**: visuals only.
  - **Must remain unchanged**: auth-gated fetch, username update form + validation, profile data.
  - **Stitch reference**: `stitch-profile.png`.
  - **Verification**: screenshot vs ref; profile update flow unchanged; dark + mobile; axe; lint/typecheck/build.
  - **Completion**: profile aligned + update flow unchanged.

- [ ] **T029** [D6, P] `/dashboard` foundation adoption (B/C-bucket sweep, no dedicated redesign)
  - **Phase**: D · **Story**: US2 · **[P]**: yes (after T023) · **Prereq**: T023
  - **Objective**: `dashboard/page.tsx` + `dashboard-view.tsx` + `ai/learning-recommendation-card.tsx` + `ai/course-learning-recommendation.tsx` + `ai/ai-explanation-view.tsx`: **foundation adoption only** — cards/buttons/text to tokens (B/C bucket; A where visible primary branding). No dedicated Stitch reference exists; residual work folds into Phase F.
  - **Files likely to change**: `src/app/(main)/dashboard/page.tsx`, `src/features/profile/components/dashboard-view.tsx`, `src/features/ai/components/{learning-recommendation-card,course-learning-recommendation,ai-explanation-view}.tsx`.
  - **Implementation boundary**: token swapping only (**A/C** changed when justified; **B** semantic preserved; **D** AI accent preserved); no redesign.
  - **Must remain unchanged**: dashboard metrics, recommendation card, AI explanation fetch, all behavior.
  - **Stitch reference**: none (adjacent screen, not in the mapped list).
  - **Verification**: light + dark render clean; functionality unchanged; `npm run lint`, `typecheck`, `build`.
  - **Completion**: dashboard tokenized; residual left for F.

---

## Phase E — Admin / Moderation (US3)

**Purpose**: **Visual-only adaptation.** Stitch Admin screenshots are **visual references only**; existing app workflows stay authoritative. Do **not** simplify a live workflow into a static Stitch mockup. **Protected behaviors**: AI content pipeline, review actions, generation actions, forms, validation, status transitions, moderation behavior, permissions, publish/review actions. **Feature-003 overlap guard**: only `content-pipeline-admin.tsx` (component markup) may be touched (T031); never `src/app/api/**`, `src/features/**/services/**`, `src/features/**/repositories/**` (T035 enforces with a diff guard).

- [ ] **T030** [E1] Add-exercise AI generation flow restyle — `/moderation/lessons/[lessonId]/exercises/new`
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T023 (D may precede; E reuses C patterns)
  - **Objective**: `page.tsx` + `src/features/ai/components/exercise-generation-form.tsx`: form cards/inputs/textareas → shared primitives; code-snippet panel → `code-*` tokens; primary actions orange; form/validation visuals per Stitch while staying the live AI-generate and draft flow.
  - **Files likely to change**: `src/app/(main)/moderation/lessons/[lessonId]/exercises/new/page.tsx`, `src/features/ai/components/exercise-generation-form.tsx` (+ its test file).
  - **Implementation boundary**: className/JSX-attribute-level visual changes only; **no services/repositories/API edits**; no static-mockup simplification.
  - **Must remain unchanged**: generation context fetch, AI prompt form submit, validation, permission redirects, draft state.
  - **Stitch reference**: `stitch-admin-add-exercise.png` (visual only).
  - **Verification**: functional generation + validation; browser vs ref; axe (forms/labels); dark; focused tests; `npm run lint`, `typecheck`, `build`.
  - **Completion**: form restyled, generation flow verified unchanged.

- [ ] **T031** [E2] `/admin/content` content-pipeline visual alignment (component markup only)
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T023
  - **Objective**: `admin/content/page.tsx` + `content-pipeline-admin.tsx`: page bg `bg-slate-50`→`bg-background` (C); step/progress badges → orange chips; cards/inputs/buttons → shared primitives. **No pipeline logic edits.**
  - **Files likely to change**: `src/app/(main)/admin/content/page.tsx`, `src/features/content-pipeline/components/content-pipeline-admin.tsx` (+ component tests).
  - **Implementation boundary**: **this is the only feature-003 shared-adjacent file**. All edits are className/JSX-attribute-level within the client component. Touching `features/content-pipeline/services/content-pipeline-service.ts`, `repositories/*`, or any `api/admin/**` route is a **blocked violation**.
  - **Must remain unchanged**: stepwise doc→lesson pipeline, AI generation, outline/content steps, publish/regenerate actions, validation, RLS-guarded access.
  - **Stitch reference**: `stitch-admin-add-lesson.png` (visual only; the app pipeline is stepwise, not a static form).
  - **Verification**: component tests asserting the pipeline UI still drives identical handlers; pipeline functional regression; `git diff --stat` guard (zero server/API files); browser vs ref; `npm run lint`, `typecheck`, `build`.
  - **Completion**: pipeline restyled; workflow + server files untouched.

- [ ] **T032** [E3] `/moderation` queue + item card restyle
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T023
  - **Objective**: `moderation/page.tsx` + `moderation-queue-view.tsx` + `moderation-queue-item-card.tsx`: status chips → **container tokens** (pending→warning, approved→success, needs_revision→info, rejected→danger, published→primary); filter `select` → shared `Select`; list/table header/row/border treatment per Stitch table rules; surfaces warm.
  - **Files likely to change**: `src/app/(main)/moderation/page.tsx`, `src/features/moderation/components/{moderation-queue-view,moderation-queue-item-card}.tsx` (+ tests).
  - **Implementation boundary**: visuals only; chip **mapping** (not color invention) — each moderation status keeps its semantic meaning (B-family containers).
  - **Must remain unchanged**: status filters + pagination fetch, queue semantics, permissions.
  - **Stitch reference**: `stitch-admin-review-exercises.png` (queue/list portion).
  - **Verification**: filter + pagination functional; screenshot vs ref; dark; axe; `npm run lint`, `typecheck`, `build`.
  - **Completion**: queue restyled; filtering/pagination unchanged.

- [ ] **T033** [E4] `/moderation/[id]` review screen restyle
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T032
  - **Objective**: `moderation/[id]/page.tsx` + `moderation-detail-view.tsx` + `moderation-review-form.tsx`: detail cards `bg-surface border-border rounded-xl`; review form → shared `Input`/`Textarea`/`Select`; publish button → `Button`; status badge → container tokens; confirm/modal surface `rounded-xl` with preserved focus trap.
  - **Files likely to change**: `src/app/(main)/moderation/[id]/page.tsx`, `src/features/moderation/components/{moderation-detail-view,moderation-review-form}.tsx` (+ tests).
  - **Implementation boundary**: visuals + shared primitives only; **request payloads unchanged**.
  - **Must remain unchanged**: review submit (`/reviews`), publish action + success state, edit-draft payload shape, status transitions.
  - **Stitch reference**: `stitch-admin-review-exercises.png` (detail/review portion).
  - **Verification**: tests asserting `/reviews` payload shape still pass; publish + success-state interaction; browser vs ref; dark; axe; `npm run lint`, `typecheck`, `build`.
  - **Completion**: review screen restyled; review/publish flows unchanged.

- [ ] **T034** [E5] `/admin/users` management table restyle
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T032
  - **Objective**: `admin/users/page.tsx` + `user-management-view.tsx`: table/header/row/state treatment per Stitch table rules (warm surfaces, `#E8E8E8` borders); status/role badges → container tokens; search input → shared `Input`; row actions → `Button` variants; keep `window.confirm` guard visuals intact.
  - **Files likely to change**: `src/app/(main)/admin/users/page.tsx`, `src/features/admin/components/user-management-view.tsx` (+ tests).
  - **Implementation boundary**: visuals only; **mutation/recovery logic untouched**.
  - **Must remain unchanged**: user search/filter, role/status PATCH, recovery POST, `window.confirm` guards, audit-log messaging, permission checks, table semantics (`<th scope>` etc.).
  - **Stitch reference**: `stitch-admin-users.png`.
  - **Verification**: table-action regression (role/status switch, recovery confirm); screenshot vs ref; dark; axe (table headers/labels); `npm run lint`, `typecheck`, `build`.
  - **Completion**: users table restyled; data flows + confirms unchanged.

- [ ] **T035** [E6] Admin/moderation functional regression + E2E at E boundary + file-touch guard
  - **Phase**: E · **Story**: US3 · **[P]**: no · **Prereq**: T030–T034
  - **Objective**: **Mandatory functional gate** (beyond screenshots): content pipeline steps + generate/publish; exercise review (approve/needs-revision/reject) with correct request payloads; publish flow; users-table role/status switches + recovery confirm flow; generation-form validation + submission. Enforce the **file-touch guard**: `git diff --stat` shows **zero** changes under `src/app/api/**`, `src/features/**/services/**`, `src/features/**/repositories/**`. Confirm with `git status` before and after E. Commit Phase E.
  - **Files likely to change**: none new (verification; fixes only within the E-file list).
  - **Implementation boundary**: functional verification; **no server/API/service edits under any circumstance** (violation = BLOCKED).
  - **Must remain unchanged**: complete Admin/moderation workflows end-to-end (FR-030…FR-034).
  - **Stitch reference**: `stitch-admin-add-lesson.png`, `stitch-admin-review-exercises.png`, `stitch-admin-users.png`, `stitch-admin-add-exercise.png` (visual verdict per screen).
  - **Verification**: focused component tests + Playwright interactions for each workflow; `npm run ci`; E2E at E boundary; guard output recorded; per-screen visual verdicts recorded; conventional commit logged with hash.
  - **Completion**: all Admin flows verified unchanged; zero guarded-path diffs; E commit recorded.

---

## Phase F — Polish / Regression (US4)

**Purpose**: Cross-cutting quality + the safe remainder of the A/B/C sweep across all mapped screens. Full `npm run ci` + full `npm run test:e2e` at the F boundary. No test weakening; no global regex replacement; D-bucket colors preserved.

- [ ] **T036** [F1] Responsive sweep — all mapped screens
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T023 + D/E progress
  - **Objective**: Desktop/tablet/mobile (1280/768/390) for every mapped screen; tables/forms overflow (users table, moderation forms), long Course/Lesson titles, code blocks — **no horizontal page scroll**; functional navigation + ≥44px touch targets reachable on mobile (FR-035).
  - **Files likely to change**: mapped screens' components (visual classes only).
  - **Implementation boundary**: responsiveness fixes only.
  - **Must remain unchanged**: behavior at every breakpoint.
  - **Stitch reference**: refs per screen (responsive states).
  - **Verification**: viewport sweep recorded per screen; zero horizontal page scroll; `npm run lint`, `typecheck`.
  - **Completion**: all mapped screens usable at 1280/768/390.

- [ ] **T037** [F2] Dark-mode sweep — all mapped screens
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T036
  - **Objective**: Full `.dark` pass on all mapped screens; remove residual component-level `dark:` overrides that contradict the derived token set; validate contrast via axe + UI UX Pro Max (FR-036, FR-040).
  - **Files likely to change**: mapped screens' components (dark class cleanup only).
  - **Implementation boundary**: no new component-local dark-orange values (C-DARK).
  - **Must remain unchanged**: dark-mode semantics (surface/status hierarchy).
  - **Stitch reference**: none (derived; C-DARK).
  - **Verification**: dark screenshots per screen; axe contrast (AA) passes; residual `dark:` overrides audited and removed/justified.
  - **Completion**: dark usable on all mapped screens with centralized tokens.

- [ ] **T038** [F3] Accessibility / focus / contrast sweep
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T037
  - **Objective**: Keyboard/focus: tab order on forms/options/nav; visible `:focus-visible` rings everywhere; semantic structure/labels preserved (FR-037/038); color not the only status signal (FR-039); text contrast no regression (FR-040).
  - **Files likely to change**: mapped screens' components (a11y fixes only).
  - **Implementation boundary**: no new ARIA hacks; keep semantic HTML.
  - **Must remain unchanged**: all existing labels, roles, focus behavior.
  - **Stitch reference**: n/a (accessibility gate).
  - **Verification**: axe scans (light + dark) on all mapped screens; keyboard walk-through recorded; fixes included in F commit.
  - **Completion**: a11y gate green across mapped screens.

- [ ] **T039** [F4] Loading / empty / error states adopt the shared system
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T036–T038
  - **Objective**: Loading, empty, and error states on every mapped screen (catalog, detail, roadmap, exercise, profile, dashboard, queue, admin lists) use the shared tokens/card treatment (FR-022); error announcements announced.
  - **Files likely to change**: list/detail components (state-presentation only).
  - **Implementation boundary**: presentation of existing states only; no new state logic.
  - **Must remain unchanged**: existing loading/error triggers and retry behavior.
  - **Stitch reference**: refs per screen (loading/empty states as shown).
  - **Verification**: force each state (empty list, failed fetch) and compare visuals + announcements; `npm run lint`, `typecheck`.
  - **Completion**: every mapped screen's states adopt the system.
- [ ] **T040** [F5] Long content / overflow resilience
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T039
  - **Objective**: Long course/lesson titles, long code samples, long Vietnamese text must not break layout at any supported breakpoint; truncated-title behavior defined; table/form overflow handled (FR edge cases).
  - **Files likely to change**: mapped screens' components (layout resilience classes).
  - **Implementation boundary**: layout handling only.
  - **Must remain unchanged**: content values, data, semantics.
  - **Stitch reference**: n/a (edge-case gate).
  - **Verification**: seeded long-content checks at 1280/768/390; no overflow/clipping; title truncation consistent; `npm run lint`, `typecheck`.
  - **Completion**: long-content cases clean.

- [ ] **T041** [F6] Safe old-primary hardcoding cleanup (A/B/C/D, no global sed)
  - **Phase**: F · **Story**: — · **[P]**: no · **Prereq**: T036–T040
  - **Objective**: Classify **every** remaining `indigo-*`/`slate-*` occurrence in `src/**` as A/B/C/D. Change **A** (brand-primary) and **C** (neutral layout) to token classes on mapped screens; verify **B** semantic colors already tokenized on those screens; **preserve D** (intentional, e.g. code palette, AI accent) with justification. **No global regex replacement.**
  - **Files likely to change**: residual mapped-screen components + any justified non-mapped fix.
  - **Implementation boundary**: per-occurrence classification recorded; residuals acceptable only where not visible primary branding on mapped screens at feature completion.
  - **Must remain unchanged**: B and D colors; all behavior.
  - **Stitch reference**: orange usage per screen refs (zero stray indigo on mapped screens).
  - **Verification**: `git grep -nE "indigo-" src` residual inventory recorded with bucket + justification per entry; mapped screens show none; `npm run lint`, `typecheck`, `build`.
  - **Completion**: A/C swept on mapped screens; residuals classified and recorded.

- [ ] **T042** [F7] Visual-consistency sweep + token lint
  - **Phase**: F · **Story**: US4 · **[P]**: no · **Prereq**: T041
  - **Objective**: One shared system across surfaces/cards/forms/buttons/badges/tables/modals on all mapped screens (SC-004); per-screen verdict vs its Stitch reference recorded; token lint — no visible `indigo-*` and no non-token `slate-*` utilities on any mapped screen (`git grep -nE "indigo-" src` residual list recorded as acceptable-only-off-screen); final diff review + secret scan.
  - **Files likely to change**: residual class fixes.
  - **Implementation boundary**: consistency fixes only.
  - **Must remain unchanged**: all behavior.
  - **Stitch reference**: all per-screen PNGs.
  - **Verification**: per-screen verdict table; token-lint grep pass; `npm run lint`, `typecheck`, `build`.
  - **Completion**: consistency verdicts recorded; token lint green.

- [ ] **T043** [F8] Full E2E + CI gate + final feature regression
  - **Phase**: F · **Story**: — · **[P]**: no · **Prereq**: T042
  - **Objective**: Full `npm run ci` (lint + typecheck + test + build) and full `npm run test:e2e` green; execute the plan's functional regression table (navigation/auth/permissions, Lesson progress/actions, course navigation, exercise interaction, admin pipeline, moderation actions, forms, dark switching); explicit SC-012 (zero backend/API/schema changes, no migration) and SC-013 (no Stitch-only feature) declarations; final Conventional Commit for the feature.
  - **Files likely to change**: none (verification; fixes only if a regression is found, scoped to F files).
  - **Implementation boundary**: full-suite gate; no scope expansion.
  - **Must remain unchanged**: every existing flow per the regression table.
  - **Stitch reference**: final visual verdicts per screen.
  - **Verification**: `npm run ci` output recorded; `npm run test:e2e` output recorded; regression table each row PASS; secret scan clean; commit hash logged.
  - **Completion**: full gate green; feature complete; report written.

---

## Dependencies & Execution Order

- **Phase dependencies**: T001 → A (T002–T008) → B (T009–T013) → C (T014–T022) → **T023 acceptance gate** → D (T024–T029) → E (T030–T035) → F (T036–T043).
- **Phase D MUST NOT begin before T023 is accepted.** D/E/F screen propagation cannot bypass the Phase C acceptance gate.
- **Within Phase D** (after T023): T024–T029 are [P]-parallelizable (disjoint file sets).
- **Within Phase A**: T006 and T007 are [P]-parallelizable (disjoint files after T005).
- **Phase E is sequential** (shared moderation/admin surface + one guarded file) with the E6 gate (T035) as its compaction point.
- **Commits**: one Conventional Commit per bounded task or logical step; Phase C commits happen before T023; D/E/F follow their gates. Never `git add .` while out-of-scope WIP exists.

---

## Requirement Coverage Matrix

### Functional Requirements (FR-001…FR-043) → tasks

| Req | Covers | Tasks |
|---|---|---|
| FR-001 | primary brand burnt orange `#a23f00` | T003, T005, T006, T020 (item 6), T042 |
| FR-002 | primary-container `#f76b1c` accent | T003, T005, T009, T014, T027 |
| FR-003 | indigo→orange where primary branding | T003, T005, T006, T026, T027, T041 |
| FR-004 | warm neutral surfaces | T003, T006, T009, T042 |
| FR-005 | warm borders/dividers | T003, T006, T009, T042 |
| FR-006 | Stitch 8/16/24/32/64 spacing | T011, T015, T036 |
| FR-007 | 8px controls / 12px cards radius | T006, T007, T042 |
| FR-008 | Be Vietnam Pro + hierarchy + distinct code | T002, T014, T015, T016 |
| FR-009 | semantic status colors preserved | T003, T004, T026, T032, T033, T041 |
| FR-010 | reusable tokens/shared components | T005, T006, T007, T024–T035 |
| FR-011 | dark mode functional + coherent | T004, T019, T037 |
| FR-012 | IA/routes/roles/mobile-nav unchanged | T009, T010, T011, T012, T013 |
| FR-013 | shell structure preserved, restyle only | T009, T010, T011, T012, T013 |
| FR-014 | no Stitch-only destinations | T013, T043 |
| FR-015 | active route visible + focus | T010, T038 |
| FR-016 | button hierarchy + states | T006 |
| FR-017 | input/select/textarea consistency | T006, T007 |
| FR-018 | one chip system for badges/pills | T006, T026, T032 |
| FR-019 | card/surface radius/border/elevation | T006, T042 |
| FR-020 | consistent table treatment | T032, T034, T040, T042 |
| FR-021 | modals shared surface/radius/focus | T033, T042 |
| FR-022 | loading/empty/error states shared | T039 |
| FR-023 | Lesson page per Stitch + unchanged funcs | T014–T019, T020, T022 |
| FR-024 | catalog + detail adopt system | T024, T025 |
| FR-025 | roadmap adopt system | T026 |
| FR-026 | exercise adopt system | T027 |
| FR-027 | profile adopt system | T028 |
| FR-028 | progress reflects persisted data | T018, T022, T026 |
| FR-029 | markdown + code in shared system | T016, T017 |
| FR-030 | content pipeline adopt + flows unchanged | T031 |
| FR-031 | add-exercise AI form adopt + flows unchanged | T030 |
| FR-032 | moderation queue/review adopt | T032, T033 |
| FR-033 | users screen adopt | T034 |
| FR-034 | no backend/API change from Admin | T031, T035 |
| FR-035 | all mapped screens responsive | T013, T019, T036 |
| FR-036 | dark tokens derived centrally | T004, T019, T037 |
| FR-037 | keyboard/focus/tab order preserved | T021, T038 |
| FR-038 | semantic structure preserved | T021, T038 |
| FR-039 | color not the only status signal | T021, T038 |
| FR-040 | contrast not regressed | T021, T037, T038 |
| FR-041 | adapt components, never paste HTML | every screen task (T014–T035), T020 |
| FR-042 | fast-quiz = visual patterns only | T027, T043 |
| FR-043 | zero backend/API/schema/DB change | T035, T043 (+ global gate) |

### Success Criteria (SC-001…SC-013) → tasks

| SC | Covers | Tasks |
|---|---|---|
| SC-001 | visual checklist per screen passes | T020, T024–T035 (per-screen review), T042 |
| SC-002 | orange branding consistent, zero legacy indigo visible | T005, T006, T020 (item 6), T041, T042 |
| SC-003 | Be Vietnam Pro hierarchy + contrast | T002, T014, T015, T016, T020 |
| SC-004 | consistent surfaces/cards/forms/buttons/badges/tables/modals | T006, T007, T042 |
| SC-005 | existing gates pass, no flow change | T008, T022, T035, T043 |
| SC-006 | Lesson close to `lesson-render.png` | T020, T023 |
| SC-007 | learner screens share system + flows pass | T024–T029 |
| SC-008 | admin/moderation share system + workflows intact | T030–T035 |
| SC-009 | desktop/tablet/mobile usable | T013, T036 |
| SC-010 | dark mode coherent + readable on all screens | T004, T037 |
| SC-011 | a11y does not regress | T021, T038 |
| SC-012 | zero backend/API/schema/migration | T035, T043 |
| SC-013 | no Stitch-only/nonfunctional feature added | T013, T027, T043 |

**Coverage gaps**: none — all 43 FRs and 13 SCs map to ≥1 implementation/verification task.

---

## Task Result

- **Total tasks**: 43
- **Phase A count**: 7 (T002–T008)
- **Phase B count**: 5 (T009–T013)
- **Phase C count**: 10 (T014–T023, including the acceptance gate)
- **Phase D count**: 6 (T024–T029)
- **Phase E count**: 6 (T030–T035)
- **Phase F count**: 8 (T036–T043)
- **Setup count**: 1 (T001)
- **Phase C acceptance-gate task ID**: T023 (⛔ hard gate; T024–T029 blocked until accepted)
- **FR coverage**: 43/43 (matrix above, no gaps)
- **SC coverage**: 13/13 (matrix above, no gaps)
- **Tasks touching backend/API**: 0 (T031/T035 enforce the diff guard; no server paths in any file list)
- **Tasks requiring DB migration**: 0 (data-model gate NO)
- **Tasks potentially overlapping feature-003 WIP**: 1 — T031 (single shared-adjacent file `content-pipeline-admin.tsx`, component-markup only, explicitly guarded); T035 verifies zero guarded-path diffs
- **Parallelizable tasks**: T006+T007 (Phase A); T024–T029 (Phase D, after T023 acceptance; disjoint file sets)
- **First implementation task**: T002 (Phase A1 font integration; T001 is setup/baseline with no source edits)
- **Unresolved task-level ambiguity count**: 0 (recorded deferred/operational items — sidebar course-progress block, exact dark-token hexes, `next/font/google` build-time network — are handled inside T001/T002/T004 as documented fallbacks, not task blockers)

*No implementation performed. No source code modified. No commit made. Feature-003 Phase D WIP untouched.*