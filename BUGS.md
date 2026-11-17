# Suspected bugs

Found while writing the characterization tests (Nov 2026). **None are fixed yet.**
Tests marked `PINNED` lock in today's behaviour, so the refactor can't change it by
accident. When a bug is fixed on purpose, update the test that pins it in the same commit.

Test references are `file › test name` in `tests/`.

## High — data integrity

| # | Where | What happens | Pinned by |
|---|-------|--------------|-----------|
| H1 | `js/data.js` `loadData()` | Returns early when `liftTrackerData` is empty, so an in-progress workout in `liftTrackerSession` is never restored and is effectively lost. | `data-storage.test.js › PINNED BUG: the session is NOT restored when liftTrackerData is empty` |
| H2 | `js/data.js` `migrateToLatest()` / `migrateV2ToV3()` | A backup with no `version` is treated as v2: its programs are replaced with the default 4-day program and other top-level fields (e.g. `customExercises`) are dropped. | `data-migrations.test.js › PINNED: a backup with no version is treated as v2` and `› PINNED: drops any other top-level fields` |
| H3 | `js/data.js` `applyImportedData()` | Importing a backup leaves an in-progress workout in place. It may point at programs or days the import just replaced, and is saved into the new history when finished. | `data-migrations.test.js › PINNED: leaves an in-progress workout alone` |
| H4 | `js/programTemplates.js` `buildProgramFromTemplate()` | Program id is `program_<Date.now()>`, so two programs created in the same millisecond share an id; later edits, activation or deletion can hit the wrong one. | `static-data.test.js › PINNED: two programs built in the same millisecond get the same id` |
| H5 | `js/progress.js` `_liveSessionIdx()` | Finds a workout by date + dayId and returns the first match. With two workouts of the same day on the same date, Edit/Delete on the second card acts on the first. | `progress-logic.test.js › _liveSessionIdx … the first wins on duplicates` |
| H6 | `js/utils.js` `showConfirm()` | OK and Cancel listeners are added with `{ once: true }`, but each removes only itself. Cancel leaves the OK listener armed, so the cancelled action runs on the next OK, whatever that later confirm was for (e.g. cancel "Delete Summer Cut?", then OK "Activate …?" deletes Summer Cut too). OK leaves a stale Cancel listener (harmless, it only closes). `showPrompt()` has the same pattern (not pinned; live caller: the edit-name prompt in Profile). Found in Batch 0, 17 Nov. | `program-actions.test.js › PINNED BUG: a cancelled confirm still runs when a later confirm is OK'd` |

## Medium — wrong output

| # | Where | What happens | Pinned by |
|---|-------|--------------|-----------|
| M1 | `js/home.js` `buildYesterdayCard()`, `buildSplitProgress()` | Local midnight is turned into a date with `toISOString()`. In UTC+1 to about UTC+11 (including UK summer time) the Yesterday card disappears and "This week" badges open the previous day. | `home.test.js › PINNED BUG: yesterday card and week-grid date are a day off in UTC+1` |
| M2 | `js/session.js` `getLastPerformance()`; `js/home.js` `detectMostRecentPr()` | Both walk history in array order, not by date. Finishing a backfilled past workout appends it, so it becomes the "last" performance (wrong suggestions) and can skew PR detection. History is only re-sorted after editing a workout. | `session-logic.test.js › PINNED BUG: uses array order, not date` (PR side not pinned) |
| M3 | `js/home.js` `detectMostRecentPr()` | An exercise logged for the first time counts as a "Personal best", so the card often shows a new exercise rather than a real PR. | `home.test.js › PINNED: a first-ever exercise counts as the newest "personal best"` |
| M4 | `js/home.js` `calcWeekStreak()` | The streak shows 0 (badge hidden) every week until the first workout of that week, even after a long run. | `home.test.js › PINNED: streak is 0 until you train this week` |
| M5 | `js/session.js` `getSuggestion()` | Program exercises carry `sets`, not `targetSets`, so Home's coaching card always assumes 3 target sets; template exercises have no rep range, so the top rep defaults to 10. | `session-logic.test.js › PINNED: needs at least targetSets − 1 sets to bump` and `› defaults the top rep to 10`; `home.test.js › coaching card uses the next day's first exercise` |
| M6 | `js/home.js` `getDayType()` | Title fallback: any title containing "upper" and an "a" counts as push (e.g. "Upper Back"). | `home.test.js › day type falls back to the title` |
| M7 | `js/utils.js` `formatDate()` | Future dates show as "-3d ago". | `utils.test.js › PINNED BUG: a future date shows as a negative "d ago"` |
| M8 | `js/progress.js` `analyzeTrend()` | A drop in weight or reps uses the `trend-flat` style, the same as no change. | `progress-logic.test.js › PINNED: a drop uses the "flat" style` |
| M9 | `js/programBuilder.js` `pbSaveProgram()` | After saving, re-renders Profile (`window.renderSettings()`) but not My Plans, where the builder is opened from, so My Plans likely shows the old program until the next tab switch. Found in the refactor audit, 17 Nov. | Not pinned |
| M10 | `js/session.js` `_setCounts()` vs `js/sessionBanner.js` `showSessionBanner()` and `js/session.js` `finishSession()` | Two "total sets" formulas: the workout header uses `max(targetSets, sets.length)`, the banner and the finish prompt use `targetSets \|\| sets.length`. Once extra sets are added they show different totals. Found in the refactor audit, 17 Nov. | Not pinned |
| M11 | `js/exerciseSelector.js` `_mount()` | The Escape `keydown` listener is removed only when Escape is pressed. Closing by tapping outside or picking an exercise leaves it attached, and every open adds another. Found in the refactor audit, 17 Nov. | Not pinned |

## Low / structural

| # | Where | What happens | Pinned by |
|---|-------|--------------|-----------|
| L1 | Most renderers (`home.js`, `session.js`, `progress.js`, `myplans.js`, `settings.js`, …) | Exercise names, notes, day titles and program names go into `innerHTML` unescaped. A custom exercise or note containing `<` or quotes can break the markup. Only `profilePhoto.js` and `backgroundPicker.js` escape. | Not pinned |
| L2 | `service-worker.js` | Sortable.js loads from a CDN and is never cached, so reordering exercises likely fails offline. `cache.addAll()` fails the whole install if any precached path is missing. | `service-worker.test.js` guards the precache list (paths exist, every `js/` file listed) |
| L3 | `js/restTimer.js`, `js/healthkit.js` | Stored settings are merged with `Object.assign`, so unknown or old keys in storage end up in the settings object. | `settings-storage.test.js › PINNED: unknown keys in storage are merged into settings` (timer only) |
| L4 | `js/data.js` `migrateV2ToV3()` | With no profile in the old data the name becomes `''`; the docs say "Reid". | `data-migrations.test.js › PINNED: with no profile the name is empty` |
| L5 | `js/session.js` `getSuggestion()` | Decimal weights get +5 with no rounding to available plates (e.g. 22.5 → 27.5). Possibly intended. | `session-logic.test.js › PINNED: decimal weights add 5 without rounding` |
| L6 | `ARCHITECTURE.md` | Says finishing a workout returns to Home; the code opens Progress. **During the refactor the code's behaviour (finish → Progress) is the source of truth;** ARCHITECTURE.md may be out of date here and elsewhere. | Not pinned (docs) |
| L7 | `js/settings.js` `confirmCreateProgram()` | Calls `refreshProgramsList()`, which is not defined anywhere. Unreachable: nothing opens the Create Program modal. **Resolved by REFACTOR_PLAN.md item 1.2** (`601975d`, the dead code is deleted). | Not pinned (dead code) |
| L8 | `js/data.js` `importData()` | A backup with no `history` (or history that isn't a list) returns early before `event.target.value = ''`, so picking the same file again fires no change event. Invalid JSON does clear it. Found in Batch 0, 17 Nov. | `import.test.js › PINNED BUG: an invalid backup leaves the file input value set` |
| L9 | `js/onboarding.js` `obProcessImport()` | A v5 backup with no `profile` is applied as is: `state.profile` stays `null` after onboarding, even if a name was entered, so the app finishes setup with no profile. Found in Batch 0, 17 Nov. | `import.test.js › a v5 backup with no profile leaves state.profile empty` |
| L10 | Wording: `js/home.js` start line and start sheet, `js/myplans.js` day cards; `js/progress.js` range buttons; `js/settings.js` stats card | "1 exercises" (no singular); the All range button's label reads "Show last all workouts"; Fav. Workout ties go to whichever day title was logged first (`sort` keeps insertion order), not the most recent. Found in Batch 0, 17 Nov. | `screens.test.js` snapshots: `home-structured-history.html` and `myplans-structured.html` ("1 exercises"), `progress-history.html` ("Show last all workouts"), `profile-structured-history.html` (three titles tied at 1 → "Lower B") |

## Separate track — build and iOS

| # | Where | What happens | Pinned by |
|---|-------|--------------|-----------|
| S1 | `package.json` | `@capacitor-community/health@^3.0.0` does not exist on npm, so `npm install` in the repo root fails and the iOS build can't be set up as documented. Test tooling lives in `tests/package.json` to avoid this. Candidates: `@capgo/capacitor-health`, `capacitor-health`. Related, in `js/healthkit.js`: `initHealthKit()` fetches today's steps at startup but nothing uses the result (`app.js` discards it), and several private helpers are never called. `healthkit.js` is out of scope for the refactor until S1 is resolved. | Not pinned |
| S2 | `capacitor.config.json` | `webDir: "."` copies the whole repo into the iOS app on `cap sync`, including `tests/` (and `tests/node_modules/` once installed), `scripts/`, `design-reference/` and docs. | Not pinned |
