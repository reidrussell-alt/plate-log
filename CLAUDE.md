# Lift Tracker — Project Context

## Architecture Documentation

A detailed architecture doc with Mermaid diagrams lives at `ARCHITECTURE.md` in this directory. It covers app flow, module dependency graph, data schema ER diagram, key user workflow flowcharts, progressive overload logic, deployment process, and a change log.

**Keep it in sync.** After any structural code change, update the relevant sections in `ARCHITECTURE.md` and include it in the same commit.

---

## What this is
A personal workout tracking PWA (Progressive Web App) for Reid's 4-day push/pull/legs training split. Built as a modular vanilla JS app with no frameworks. Deployed to GitHub Pages and installed as a home screen app on iOS.

**Live URL:** https://reidrussell-alt.github.io/plate-log/
**Old URL (retired Nov 2026):** https://reidrussell-alt.github.io/lifting-tracker-Application/
**Local dev:** `python3 -m http.server 8082 --directory "/Users/reidrussell/Documents/Learning Tools/lift-tracker"`
**Then open:** http://localhost:8082

---

## Project structure

```
lift-tracker/
├── index.html              # Shell — markup only, no inline JS/CSS
├── manifest.json           # PWA manifest (name, colours, icon list)
├── icons/                  # App icon PNGs: apple-touch-icon (iOS), 192/512 + maskable (manifest), favicon
├── scripts/make_icons.py   # Regenerates everything in icons/ (needs Pillow)
├── service-worker.js       # Cache-first SW; bump CACHE_NAME version on every deploy
├── css/
│   └── main.css            # All styles; CSS variables in :root
└── js/
    ├── app.js              # Entry point — imports everything, binds window.* handlers, switchTab
    ├── home.js             # Home tab: streak, readiness strip, split grid, PR + coaching cards, yesterday card
    ├── myplans.js          # My Plans tab: active program day cards, program library, create-plan sheet
    ├── session.js          # Active workout session; structured + track-as-you-go; overload suggestions
    ├── sessionBanner.js    # "Session in progress" banner shown on other tabs
    ├── restTimer.js        # Floating rest timer pill (background-accurate, vibrate alert)
    ├── progress.js         # Progress tab: stats, calendar, per-muscle charts + range filters, edit modals
    ├── charts.js           # Canvas chart drawing utility
    ├── settings.js         # Profile tab: profile, rest timer, HealthKit, data backup; program actions
    ├── onboarding.js       # New-user onboarding flow (name, mode, template, import)
    ├── programBuilder.js   # Full-screen program editor (drag-to-reorder, sets/rep ranges)
    ├── exerciseSelector.js # Exercise picker modal (search, filter by muscle, create custom)
    ├── healthkit.js        # iOS Capacitor HealthKit (steps, weight); no-ops elsewhere
    ├── welcome.js          # Welcome/splash screen shown on every app open
    ├── data.js             # localStorage read/write; state; schema migrations
    ├── program.js          # Original 4-day split data + MUSCLE_GROUPS mapping (no DOM)
    ├── exerciseLibrary.js  # 127 exercises with id/name/muscleGroup/loadType (no DOM)
    ├── programTemplates.js # 6 program templates using exercise library (no DOM)
    └── utils.js            # Date helpers, showToast(), showConfirm(), showPrompt()
```

Tabs: **Home · My Plans · Progress · Profile.** `switchTab()` uses `data-tab` attributes; legacy aliases `'plan'` → `'myPlans'` and `'settings'` → `'profile'` still work.

---

## Tech stack
- Vanilla JS with ES modules (`type="module"`)
- No build step, no bundler, no framework
- CSS custom properties for theming
- Canvas API for charts
- localStorage for all data persistence
- Service worker for offline/PWA support

---

## Naming conventions

### `render*` vs `show*`

- **`render*()`** — writes HTML to the DOM (full or partial re-render). Examples: `renderHome()`, `renderMyPlans()`, `renderProgress()`, `renderSession()`. These are the heavy-lifting functions that build UI from state.
- **`show*()`** — displays something that already exists in the DOM by adding a class or setting visibility. Examples: `showToast()`, `showConfirm()`, `showOnboarding()`, `showWelcomeScreen()`. These never touch innerHTML.

Follow this convention when adding new functions so callsites remain predictable.

---

## Critical architecture pattern — window bindings

Because `index.html` uses inline `onclick="..."` handlers on dynamically generated HTML, every handler function must be bound to `window` in `app.js`. This is the **only** place window bindings should live.

```js
// app.js — all handlers bound once here
window.startSession = startSession;
window.renderProgress = renderProgress;
// etc.
```

Cross-module calls (e.g. session.js calling switchTab) use `window.switchTab` at runtime — safe because all bindings are set before any user interaction.

---

## Data storage

**Key:** `liftTrackerData` in localStorage
**Schema version:** 5 (v2→v3→v4→v5 auto-migration on load and on import)

Other localStorage keys:
- `liftTrackerSession` — the in-progress workout, so it survives the app closing
- `liftTimerSettings` — rest timer on/off, duration, vibrate
- `liftHealthSettings` — HealthKit toggles
- `liftTrackerChartRanges` — chosen range (10/20/30/All) per Progress chart

```js
{
  version: 5,
  customExercises: [],           // user-created exercises from the exercise selector
  profile: {
    name: "Reid",
    createdAt: "2026-05-04T...",
    trainingMode: "structured"   // "structured" | "trackAsYouGo"
  },
  programs: [
    {
      id: "program_default",
      name: "Reid's 4-Day Push/Pull/Legs",
      isActive: true,
      createdAt: "2026-05-04T...",
      days: [
        {
          id: "upperA",
          name: "Upper A - Push",
          type: "push",           // optional, for styling
          exercises: [
            { id: "db_press", name: "Dumbbell Press", sets: 4, loadType: "weight", muscleGroup: "chest",
              repType: "range", repRangeMin: 8, repRangeMax: 12 }   // repType: "range" | "fixed" | "amrap"
          ]
        }
      ]
    }
  ],
  history: [
    {
      programId: "program_default",   // NEW in v3
      programName: "Reid's 4-Day...", // NEW in v3
      dayId: 'upperA',
      dayTitle: 'Upper A - Push',
      date: '2026-04-15T12:00:00.000Z',
      bw: '196',
      exercises: [
        {
          id: 'db_press',
          name: 'Dumbbell Press',
          loadType: 'weight',
          note: '',
          sets: [{ weight: '90', reps: '8', note: '', logged: true }]
        }
      ]
    }
  ]
}
```

**Migration:** `migrateToLatest()` runs each step in order; `loadData()`, `importData()` and the onboarding import all use it:
- v2→v3: creates default program, tags history with programId, normalizes set notes
- v3→v4: remaps `leg_ext_a`/`leg_ext_b` → `leg_extension`
- v4→v5: remaps the old split-specific exercise IDs (e.g. `db_press_b` → `db_shoulder_press`, `machine_t` → `chest_supported_row`) to their exercise-library IDs, in both programs and history

New users (no localStorage) see onboarding instead.

**Backup/restore:** Export downloads a JSON file (profile, programs, history, custom exercises). Both import paths (onboarding and Profile → Data) migrate it, then `applyImportedData()` replaces history, profile and programs and merges custom exercises (the backup wins on matching IDs).

---

## The 4-day program

Defined in `program.js`. Rotation order: `upperA → lowerA → upperB → lowerB → repeat`.

| dayId   | Title   | Focus           |
|---------|---------|-----------------|
| upperA  | Upper A | Push            |
| lowerA  | Lower A | Quads           |
| upperB  | Upper B | Pull            |
| lowerB  | Lower B | Posterior chain |

This is Reid's original default program. New users pick from 6 templates in `programTemplates.js` or build their own; any program can be active.

`MUSCLE_GROUPS` (in `program.js`) maps exercise IDs to muscle group keys. `MUSCLE_GROUP_ORDER` and `MUSCLE_GROUP_META` (in `exerciseLibrary.js`) control display order and labels on the Progress tab.

---

## Theme — "Daylight" (CSS variables in :root)

Light theme: white cards with soft shadows on a cool grey page, ink text, one cobalt accent. Chosen 11 Nov 2026 from four options (Graphite, Daylight, Chalk & Iron, Matchday).

```css
/* Surfaces */
--bg: #f2f4f8            /* page */
--surface: #ffffff       /* cards */
--surface-2: #f3f5f9     /* inputs, nested cards */
--surface-3: #e9edf3     /* deeply nested / pressed */
--border: #e3e8ef
--border-bright: #cdd5e1

/* Text (dark → light) */
--text: #0f1a2b  --text-secondary: #34405a  --text-dim: #5f6b7d  --text-dimmer: #8792a3  --text-faint: #c5ccd8

/* Accent */
--accent: #2453ff        /* cobalt — primary buttons, active tab, key numbers */
--accent-dim: #4a63d8    /* supporting — pills, badges, section labels */
--on-accent: #ffffff     /* text/icons on accent backgrounds */

/* Workout types & states */
--push: #e8572a  --pull: #1a8fe0  --legs: #0fa678  --recovery: #7c4dff
--success: #0fa678  --success-ink: #0b7a58 (small green text)  --danger: #e5484d  --warm: #e07a14  --cool: #0f9f72

/* Shape & type */
--radius-card: 12px  --shadow-card (unused on cards)  --shadow-raised
--font-display: Bricolage Grotesque   --font-body / --font-mono: Manrope (tabular figures on body)
```

**Rules:**
- Never hard-code colours. For tints use `color-mix(in srgb, var(--token) N%, transparent)`.
- Text on an `--accent` background uses `--on-accent`, never `--bg`.
- Cards: flat white surface, 1px `--border` hairline, no drop shadow, 12px radius. Pop-ups and sheets: `--shadow-raised`.
- Labels are sentence case with normal letter spacing; no ALL-CAPS eyebrows, tinted pills, emoji or italic helper text. Overrides live in the `SHARPEN —` block at the end of `main.css`.
- Charts read colours at runtime with `cssVar()` from `charts.js`, so they follow the theme.
- Daylight overrides (card shadows, set rows, calendar, page titles) live in labelled `DAYLIGHT —` blocks at the end of `main.css`.
- Set logged: `_celebrateSet()` in `session.js` pops the tick, bursts dots and shows a 2-second pill (`.set-toast`); reduced motion turns the animation off.
- `html, body` use `overflow-x: clip` (after a `hidden` fallback) so `position: sticky` works — the workout header (`.session-sticky`) relies on it.
- Rest timer: red (resting) → amber (last third) → green "READY", via `--timer-red/amber/green` on `.rest-timer-pill`.

---

## Key module responsibilities

### `home.js`
- `renderHome()` — week streak, readiness strip, split progress grid, momentum row, yesterday card, stat footer
- `detectMostRecentPr()` — walks history and finds the latest session that beat an exercise's previous best (top weight, or top reps for bodyweight). PRs are computed on the fly, not stored.
- Coaching card surfaces `getSuggestion()` from `session.js`
- `homeStartWorkout()` — opens the day-picker sheet (structured) or starts track-as-you-go

### `welcome.js`
Splash screen shown on every app open. Tap to dismiss (no auto-dismiss).
- `getGreeting()` — time-based "Good morning/afternoon/evening"
- `getWelcomeWorkoutLabel()` — next workout from the active program's rotation; falls back to "TODAY'S SESSION"
- Name comes from `state.profile.name`
- Dismissal: fades out, then removes the element from DOM

### `session.js`
- `getLastPerformance(exerciseId)` — finds most recent session containing that exercise
- `getLastExerciseNote(exerciseId)` — returns last note, with backward-compat fallback to set-level notes
- `getSuggestion(exercise, last?)` — progressive overload suggestion shown during session and on Home
- In-session: add/replace/remove exercise, add/remove set, reorder mode
- Calls `window.switchTab('home')` after finishing a session

### `progress.js`
- Module-level `calendarYear` / `calendarMonth` state for calendar navigation
- `renderCalendar()` — private; monthly grid with workout dots, colors derived from the day
- `navigateCalendar(dir)` — exported, bound to window, called by calendar arrow buttons
- `setChartRange()` — 10/20/30/All quick filter per chart; re-renders only that chart

### `data.js`
- `importData(event, onSuccess)` — calls optional `onSuccess` callback after a successful import; the caller (`app.js`) is responsible for any UI updates
- `confirmReset()` — clears state and closes the reset modal; the caller (`app.js`) handles tab navigation

---

## Service worker

- Cache name must be bumped (v1 → v2 → v3...) on **every deploy** that changes JS/CSS files
- Currently: `lift-tracker-v26`
- Every JS file must be listed in the `ASSETS` array — add new modules there, remove deleted ones
- SW is **disabled on localhost** — the hostname check in `app.js` prevents re-registration during development
- When a new SW takes control, `app.js` reloads the page automatically (`controllerchange`)
- On iOS, updating the PWA requires deleting the home screen app and re-adding it from Safari

---

## Deployment

```bash
# From the lift-tracker directory:
git add <changed files>
git commit -m "description"
git push origin main
```

- Hosted on GitHub Pages from the `main` branch
- GitHub Pages takes 1–5 minutes to deploy after push
- After deploy, phone users must delete + re-add the home screen app to get new code
- Git remote `origin`: `https://github.com/reidrussell-alt/plate-log.git` (full history moved here Nov 2026)
- Old repository kept as remote `old-origin`: `https://github.com/reidrussell-alt/lifting-tracker-Application.git`
- Auth: Personal Access Token required (password auth disabled by GitHub)

---

## Fonts

Loaded from Google Fonts (link in `index.html`), always referenced through the font tokens:
- `Bricolage Grotesque` (`--font-display`, weight 800) — page titles, big numbers
- `Manrope` (`--font-body`, `--font-mono`) — everything else, including labels and numbers

---

## Documentation Guidelines

### Business Analyst Lens for Design Docs

When updating the high-level design document or CHANGELOG.md, ALWAYS use a business analyst lens:

**DO:**
- Focus on user benefits and outcomes
- Describe what users can do, not how it's coded
- Use plain English a non-developer can understand
- Structure: What It Does → User Experience → Business Value → Key Features
- Emphasize user workflows and journeys

**DON'T:**
- Include code snippets or function signatures
- Discuss implementation details or architecture
- Use technical jargon (API, schema, state management, etc.)
- Mention file structures or module dependencies

**Example Structure:**

```markdown
## [Feature Name]

### What It Does
[One-sentence plain-English description]

### User Experience
[Step-by-step what the user does and sees]

### Business Value
[Why this matters - motivation, convenience, insights, etc.]

### Key Features
[Bullet list of user-facing capabilities]
```

This lens helps stakeholders, product managers, and future team members
understand the app without needing to read code.

---

## Known constraints

- **Preview tool can't serve this project** — the Claude Code preview sandbox lacks filesystem access to `~/Documents`. Always test at `localhost:8082` using the user's own Python server.
- **No build step** — ES module imports use relative paths. No bundling, no transpilation.
- **iOS PWA cache** — service workers on iOS are aggressive. Bumping the SW cache version forces a re-fetch, but the user still needs to delete/re-add the home screen app for changes to take effect immediately.
