# Refactor plan

Audit of `js/` (23 modules, ~6,700 lines), `index.html` and `css/main.css` on branch
`refactor/initial`, 17 Nov 2026. Read-only audit; nothing below has been done yet. Amended 17 Nov after review: decisions on 1.8 and 6.2, items 1.5, 2.5 and 6.5 removed (numbers kept stable, so gaps are intentional).

## Ground rules (apply to every batch)

- **Storage:** no change to localStorage keys, the IndexedDB database/store/key, stored data shapes, or migration logic (`migrate*` in `data.js`).
- **Service worker:** any file added, renamed, moved or deleted updates `ASSETS` in `service-worker.js` **and** bumps `lift-tracker-vN` in the same commit. `tests/service-worker.test.js` checks the list.
- **Off limits:** `capacitor.config.json`, root `package.json`.
- **No bug fixes.** `BUGS.md` items stay as they are; every `PINNED` test stays green. Behaviour, markup and wording stay identical unless a row says otherwise.
- **Snapshots:** never update snapshots in bulk (no `vitest -u` across the suite). Every snapshot change is listed in the handoff with its reason.
- **Out of scope:** `js/healthkit.js`, until `BUGS.md` S1 (missing HealthKit package) is resolved.
- **Commits: one per plan item** (0.1, 0.2, …), not one per batch. Run the full suite (`npm --prefix tests test`) after each item; it must be green before that item's commit. Each commit names its item, e.g. `(REFACTOR_PLAN 1.2)`, and carries any `ARCHITECTURE.md`/`CLAUDE.md` updates the item needs.
- **Each batch:** every item committed with the suite green, then the relevant `MANUAL_TEST_CHECKLIST.md` steps, then the handoff. Items are ticked (✓ plus commit hash) in their table as they land.

**Columns:** Risk L/M/H · Effort S/M/L · Coverage = **T** covered by tests, **C** manual checklist only (step numbers), **N** none · Constraint touched.
**⚠ new tests first** = write characterization tests for that code before changing it.

---

## Batch 0 — Safety nets (tests only, no app code)

Adds coverage that later batches rely on. No constraint touched. **Done** (5 commits, suite 91 → 152 tests; 0.5 added 17 Nov after review).

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 0.1 ✓ `d6d035f` | Inline `onclick`/`oninput`/`onchange` strings in `js/*.js` and `index.html`; bindings in `app.js` | ~130 handlers are reached only by name through `window`. A rename or move that misses one fails silently until clicked. | Static test: collect every function name called from inline handlers and assert each has a `window.<name> =` binding in `app.js` (and vice versa, listing bindings with no caller). | L | S | — (new) | — |
| 0.2 ✓ `dc7ac26` | `renderMyPlans`, `renderSettings`, `renderProgress`, `renderSession`, `renderHome` | Screen markup is untested except Home. Batches 4–6 restructure these renderers. | jsdom render tests with fixture state: whitespace-normalised `innerHTML` snapshots per screen (structured + track-as-you-go, empty + with history, an in-progress session with logged/extra sets). Canvas drawing stubbed. | L | M | — (new) | — |
| 0.3 ✓ `616bdbd` | `settings.js` program actions (`setActiveProgram`, `deleteProgram`, `duplicateProgram`, `activateTemplate`, `duplicateTemplate`) | Change saved programs; no tests. | Tests that drive `showConfirm` (click OK) and assert `state.programs` + `liftTrackerData` afterwards. | L | S | — (new) | — |
| 0.4 ✓ `7dc91ac` | `data.js` `importData()`, `onboarding.js` `obProcessImport()` | Backup parse/validate paths untested (FileReader). | Tests with a jsdom `File`: valid v2/v5 backup, missing `history`, invalid JSON; assert toasts and state. | L | S | — (new) | — |
| 0.5 ✓ `84358e3` | `progress.js` `openCalendarDay`, `openManualWorkoutSelect`, `openEditModal`, `openSessionEdit`; `programBuilder.js` `showProgramBuilder`, `pbToggleDay` | Overlays that Batch 5 (5.1, 5.5, 5.6) moves or restructures have no markup tests; 0.2 covers screens only. | File snapshots in `screens.test.js`, same fixtures and clock as 0.2: calendar day sheet (a day with a workout, an empty day), manual workout picker, per-exercise edit modal (weighted, bodyweight), whole-workout edit modal, program builder (one open day card + collapsed cards; an empty day opened too). Only the JS-filled body element (or `#pbOverlay`) is snapshotted. | L | S | — (new) | — |

## Batch 1 — Dead code removal

No files added or removed, so no SW change. `healthkit.js` dead code (formerly 1.5) is left alone: out of scope until BUGS.md S1 is resolved. Verified with `grep` over `js/` and `index.html`: each item is only defined (or only bound to `window`) and never called. **Done** (7 commits, suite 152 → 151 tests: 1.8 removed the `getMostTrainedDay` test). 1.1 left `activateTemplate` with no caller (its only one was the deleted template card); its function and binding are kept and it is on the 0.1 pinned list. 1.6 found three doubled calls, not four: the fourth was in `editProgram`, deleted by 1.3.

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 1.1 ✓ `2f1cb12` | `settings.js` `renderProgramsListHtml`, `renderProgramCard`, `renderTemplateCard`, `getTotalExercises` | Old Settings program list; nothing renders it. | Delete. | L | S | N (dead) | — |
| 1.2 ✓ `601975d` | `settings.js` `showCreateProgram`, `closeCreateProgram`, `confirmCreateProgram`; bindings in `app.js` | Old "Create Program" modal; nothing opens it. `confirmCreateProgram` calls `refreshProgramsList()`, which doesn't exist. | Delete functions and their 3 `window` bindings. | L | S | N (dead; 0.1 confirms no callers) | — |
| 1.3 ✓ `bf40b48` | `settings.js` `editProgram` + binding | Rename-program prompt; no caller. | Delete. | L | S | N | — |
| 1.4 ✓ `4757ba7` | `app.js` `window.renderPlan` alias; `session.js` `updateBw` + binding | Alias unused; bodyweight input was removed from the workout screen. | Delete. (`switchTab('plan')` alias stays — documented.) | L | S | N | — |
| 1.6 ✓ `d55cce7` | `settings.js` lines 361–362, 379–380, 438–439, 476–477 | `window.renderMyPlans()` called twice in a row. | Call once. | L | S | C 12 | — |
| 1.7 ✓ `4a776ce` | `settings.js:108` | `${isStructured ? 'Switch' : 'Switch'}` | Plain `Switch`. | L | S | T (0.2) | — |
| 1.8 ✓ `f25606e` | `progress.js` `getMostTrainedDay`; the `sessionsByDay` tally in `renderProgress` that only fed it | Unused by the app; only `progress-logic.test.js` calls it. | **Decided:** delete the function, its `getMostTrainedDay` test block and its import in that test file, and the unused `sessionsByDay` block in `renderProgress` (output unchanged). `searchExercises` and `getExercisesByMuscleGroup` stay (decided: keep). | L | S | T | — |

## Batch 2 — Shared helpers inside existing files

No new files. Output must stay byte-identical.

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 2.1 | `escapeHtml` (`settings.js`, `welcome.js`), `_esc` (`profilePhoto.js`, `programBuilder.js`), `_escape` (`backgroundPicker.js`) | Five copies, three identical. Variants: `programBuilder`'s does not escape `'`; `welcome.js` uses `String(s)` so `null` becomes `"null"` (others give `''`). | One `escapeHtml` (the `String(s ?? '')` version) in `utils.js`, imported by all five. **Only replace existing calls — add no new escaping** (that's BUGS.md L1). `programBuilder` would start escaping `'` as `&#39;` inside double-quoted attributes: renders identically, but markup differs, so its snapshot updates. `welcome.js:44` only calls it when `name` is truthy, so its output is unchanged. **Precondition:** verify every `programBuilder` `_esc` call site is in text content or a double-quoted attribute; report any that aren't. (Checked 17 Nov: all 6 OK — lines 378, 549, 550 text; 405, 431, 470 `value="…"`. Re-check at batch time.) | L | S | T (0.2 + direct unit test) ⚠ | — |
| 2.2 | `session.js:236, 608, 675, 710` | Blank set object `{ weight:'', reps:'', logged:false, note:'', noteOpen:false }` written out 4×; new-exercise object (3 sets) 2×. | `_blankSet()` / `_newSessionExercise(ex)` private helpers. Same keys, same order. | L | S | C 4, 8 (+0.2) | Session shape — unchanged |
| 2.3 | `home.js:12–16, 87–94, 330–332` | Week-start (Sunday 00:00 local) computed three ways. | `_weekStart(date)` helper in `home.js`. Must keep the `toISOString()` date keys exactly (BUGS M1). | L | S | T (`home.test.js` incl. pinned TZ test) | — |
| 2.4 | `home.js` `abbreviateTitle`; `myplans.js:51`; `settings.js:65` | "Title before ` - `" done three ways (Home trims, others don't). | Shared `dayTitleBase(title)` that does **not** trim; Home keeps its `.trim()` at the call site. | L | S | T (home) / C 12–13 | — |
| 2.6 | `settings.js` `duplicateProgram`, `duplicateTemplate`, (dead) `showCreateProgram` | Custom-program limit check copied. | `_atCustomLimit()` helper. | L | S | T (0.3) ⚠ | — |

## Batch 3 — Extract pure logic into its own modules

New files: **update `ASSETS` and bump the cache version in the same commit** (one bump for the batch).

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 3.1 | `session.js` `getLastPerformance`, `getSuggestion`, `getLastExerciseNote` | Pure overload logic inside the 786-line workout UI module; Home imports the whole session module for it. | Move to new `js/overload.js`. `session.js` and `home.js` import from it; `session.js` re-exports for one batch so tests keep passing, then tests switch imports. | L | S | T (`session-logic.test.js`) | SW |
| 3.2 | `home.js` `detectMostRecentPr`, `calcWeekStreak`, `getDayType`, `abbreviateTitle`, `abbreviateDay`, `getSuggestedDay` | Pure stats/rotation logic mixed with Home markup. `myplans.js` imports `home.js` only for `getSuggestedDay`. | Move to new `js/stats.js` (exported); add direct unit tests alongside the existing render tests. Breaks the My Plans → Home dependency. | L | M | T (`home.test.js` via `renderHome`) | SW |
| 3.3 | `settings.js` program actions + `myplans.js` `MAX_CUSTOM_PROGRAMS` | Program management lives in the Profile module but is used by My Plans; `settings.js` imports a constant from `myplans.js`. | Move actions and the constant to new `js/programActions.js`. Window bindings unchanged. | M | M | T (0.3) ⚠ | SW |

## Batch 4 — Storage and import plumbing (keys and shapes unchanged)

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 4.1 | `restTimer.js` load/save, `progress.js` chart ranges | Same JSON read/write pattern in several places with different error handling: timer save swallows errors silently, others `console.warn`. (`healthkit.js` has the same pattern but is out of scope until S1.) | `readJSON(key, fallback)` / `writeJSON(key, value)` in `utils.js` (always `console.warn` on failure). Same keys, same `Object.assign` merge (keeps BUGS L3). **Leave `data.js` as is** (its failures also show a toast). Only change: the timer save failure, silent today, now logs a warning. | M | S | T (`settings-storage.test.js`) | Storage — keys/shapes unchanged |
| 4.2 | `data.js` `importData`, `onboarding.js` `obProcessImport` | Duplicate parse → check `history` → `migrateToLatest` steps. | `parseBackup(text)` in `data.js` returning `{ data }` or `{ error }`; each caller keeps its own toast wording and flow. `migrateToLatest` untouched. | M | S | T (0.4) ⚠ | Storage — migration logic unchanged |

## Batch 5 — Break up oversized files and functions

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 5.1 | `progress.js` (817 lines) | Stats/charts, calendar, calendar-day sheet, manual-entry picker, per-exercise edit modal and whole-workout edit modal in one file. | Split: `calendar.js` (calendar state, `renderCalendar`, `navigateCalendar`, `openCalendarDay`, `closeCalendarDay`, `openManualWorkoutSelect`, `_liveSessionIdx`), `historyEdit.js` (both edit modals, `deleteSession`). `progress.js` keeps stats and charts. **Precondition:** H5 (`_liveSessionIdx`) must have a pinning test before it moves; if not, add one to Batch 0. (Met 17 Nov: `progress-logic.test.js › _liveSessionIdx … PINNED: the first wins on duplicates`.) | M | M | T (0.2, 0.5, `progress-logic`) + C 2, 9–11 ⚠ | SW |
| 5.2 | `session.js` `renderSession` (~200 lines) | One function builds header, reorder list, collapsed rows, open exercise, set rows and footer. | Private builders in the same file: `_headerHtml`, `_reorderListHtml`, `_collapsedRowHtml`, `_openExerciseHtml`, `_setRowHtml`, `_footerHtml`. | M | M | T (0.2) + C 4–8 ⚠ | — |
| 5.3 | `settings.js` `renderSettings` (~140 lines) | Profile, timer, Health and Data sections in one template. | Section builders in the same file. | L | S | T (0.2) + C 13 ⚠ | — |
| 5.4 | `progress.js` `renderProgress` (~130 lines) | Computes exercise stats, groups by muscle, picks defaults and renders. | Split into `_collectExerciseStats()` (pure, unit-testable), `_groupByMuscle()`, render. | M | S | T (0.2) ⚠ | — |
| 5.5 | `progress.js` `openEditModal` / `_renderSessionEditBody` | Near-identical set-row markup (weight × reps inputs) in two edit modals. | Shared `_editSetRowHtml()`; class names and attributes kept per modal. | M | S | T (0.5) + C 10 ⚠ | — |
| 5.6 | `programBuilder.js` `_dayCardHtml` | Collapsed and open variants repeat the day-name input; `_rerenderAll` vs `_rerenderDayCards` near-duplicates. | Shared `_dayNameInputHtml(day, open)`; one re-render function. | L | S | T (0.5) + C 12 | — |

## Batch 6 — Consistency of UI patterns (optional, decide after Batch 5)

Highest-churn batch. **Optional: decide after Batch 5 whether to do any of it.** If done, small commits, and 0.1 must be in place.

| # | Location | Problem | Proposed change | Risk | Effort | Coverage | Constraint |
|---|----------|---------|-----------------|------|--------|----------|------------|
| 6.1 | Overlays | Four ways to show a sheet: static modals in `index.html`; `calendarDayModal` borrowed by Home's start sheet, My Plans' create sheet and Progress; `insertAdjacentHTML` overlays (`programBuilder`); `createElement` backdrops (`exerciseSelector`, session options, photo, background). | `openSheet(html)` / `closeSheet()` helper wrapping the shared `calendarDayModal` (same id and classes), used by Home and My Plans instead of reaching into Progress's modal. Leave the other overlay types alone in this pass. | M | M | C 3–4, 12 | — |
| 6.2 | Naming (`CLAUDE.md` render/show convention) | `show*`/`open*` functions build overlay HTML, which the old convention said `show*` never did. | **Decided: Option A, done in the docs commit of 17 Nov.** `CLAUDE.md` now says `render*` re-renders a screen and `show*`/`open*` build and display an overlay. No renames. | L | — | — | — |
| 6.3 | `app.js` lines 56–185 | ~130 `window.x = x` lines. | `Object.assign(window, { … })` grouped per module. Same names. | L | S | T (0.1) | — |
| 6.4 | `programBuilder.js` `pbIncr*`/`pbDecr*` (8 exports) | One-line wrappers per counter. | `pbStep(id, delta)` with min/max table; update inline handlers and bindings. | L | S | T (0.1) + C 12 | — |

## Separate track — not part of the JS refactor

| # | Location | Problem | Note |
|---|----------|---------|------|
| X1 | `css/main.css` (3,697 lines) | Base rules overridden by appended layers (`DAYLIGHT —`, `SHARPEN —`, `WARM DAYLIGHT —`); duplicate selectors (`.set-row` ×3, `.cal-day` ×3, `.suggestion` ×2…). | Visual risk with no automated check. Only with screenshot comparison per screen. H risk, L effort. |
| X2 | 56 inline `style="…"` attributes in JS templates (`progress.js` 22, `settings.js` 15) | Styling spread across JS. | Move to CSS classes alongside X1. Visual check needed. |
| X3 | `exerciseSelector.js` labels `YOUR CUSTOM EXERCISES`, `EXERCISE LIBRARY` | ALL CAPS conflicts with the sentence-case rule in `CLAUDE.md`. | Design change, not a refactor. |

## Explicitly not proposed

- **Unifying the three "total sets" formulas** (`session.js` `_setCounts` uses `max(targetSets, sets.length)`; `sessionBanner.js` and `finishSession` use `targetSets || sets.length`). They give different numbers once extra sets are added, so merging them changes output. Logged as `BUGS.md` M10.
- **`JSON.parse(JSON.stringify())` → `structuredClone`** (`progress.js:744`, `settings.js:401`): `structuredClone` keeps `undefined` fields, which could change what gets saved.
- **Adding escaping where it's missing**, sorting history, time-zone handling, migration cleanup: all are `BUGS.md` fixes.
- **Replacing the `window.*` cross-module calls** (`window.switchTab` 16×, `window.renderMyPlans` 11×): they avoid circular imports and are the documented pattern.

## Suggested order and checkpoints

0 → 1 → 2 → 3 → 4 → 5, then decide on 6. After each item: tests green, one commit. After each batch: the checklist steps listed in that batch, handoff. Batches 3 and 5 change the service worker: the version is bumped in each commit that adds, renames or removes a file (the storage/SW ground rule), so a batch may bump more than once. Any snapshot change is listed in that batch's handoff with its reason.
