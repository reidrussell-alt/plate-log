# Lift Tracker — Project Context

## Architecture Documentation

A detailed architecture doc with Mermaid diagrams lives at `ARCHITECTURE.md` in this directory. It covers app flow, module dependency graph, data schema ER diagram, key user workflow flowcharts, progressive overload logic, deployment process, and a change log.

**Keep it in sync.** After any structural code change, update the relevant sections in `ARCHITECTURE.md` and include it in the same commit.

## Design reference

`design-reference/` holds designs extracted from other apps that we plan to bring into Plate Log (reference only — not loaded by the app, not in the service worker).
- `design-reference/patterns.md` — the catalog: each pattern, its capture, target screen, Daylight mapping and status. **Read it before UI work** and check for a matching pattern.
- `design-reference/captures/` — raw screenshots (`<source-app>_<screen>_<what>.png`).
- When building a pattern, restyle it with the Daylight tokens (never copy another app's colours, icons or wording) and update its status in `patterns.md`.

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
├── scripts/backgrounds/    # Finds, downloads and resizes the cover photos (Wikimedia Commons)
├── img/backgrounds/        # Cover photos: full/ (1200px) and thumbs/ (480×300)
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
    ├── profilePhoto.js     # Profile photo sheet (take / choose / remove) + crop step
    ├── media.js            # Profile photo storage in IndexedDB (no DOM)
    ├── backgroundPicker.js # Profile cover background sheet (Cities / Nature / None)
    ├── backgrounds.js      # 36 curated cover photos + credits (no DOM)
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

The profile photo is **not** in localStorage: `media.js` keeps it in IndexedDB (`plateLogMedia` → `images` → `avatar`, a 400×400 JPEG). Export adds it to the backup as `avatar` (a data URL); import restores it; Reset removes it.

```js
{
  version: 5,
  customExercises: [],           // user-created exercises from the exercise selector
  profile: {
    name: "Reid",
    createdAt: "2026-05-04T...",
    trainingMode: "structured",  // "structured" | "trackAsYouGo"
    background: "london"         // optional: Profile cover photo id from backgrounds.js; null/missing = orange fade
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

New users (no localStorage) see the same welcome screen; its button opens the onboarding steps (name → training mode → template / track as you go / import) instead of Home.

**Backup/restore:** Export downloads a JSON file (profile, programs, history, custom exercises, profile photo). Both import paths (onboarding and Profile → Data) migrate it, then `applyImportedData()` replaces history, profile and programs and merges custom exercises (the backup wins on matching IDs).

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

## Theme — "Warm Daylight" (CSS variables in :root)

White-first, warm and grounded: white page, warm off-white cards with light neutral borders, ink text, one burnt-orange accent. Chosen 16 Nov 2026, replacing the cool-grey + cobalt Daylight of 11 Nov. No large colour fades, with one deliberate exception: the top of Home (below).

```css
/* Surfaces */
--bg: #ffffff            /* page */
--surface: #f7f6f3       /* cards, grouped sections, tab bar */
--surface-2: #efede9     /* inputs, nested cards */
--surface-3: #e7e5e1     /* deeply nested / pressed */
--border: #e7e5e1
--border-bright: #d6d3cd

/* Text (dark → light) */
--text: #202326  --text-secondary: #3f454b  --text-dim: #687078  --text-dimmer: #8c939a  --text-faint: #c9cdd1

/* Accent — burnt orange, used selectively */
--accent: #bd552f        /* primary actions, active-workout progress (bar, ticks, logged sets), logo */
--accent-ink: #a84a27    /* small orange text on cards (4.5:1+ on --surface) */
--on-accent: #ffffff     /* text on orange (4.66:1) */
--accent-dim: #3f454b    /* supporting labels, pills, badges — neutral ink, not a second accent */

/* Selection — neutral */
--select: #202326  --on-select: #ffffff   /* active tab, active pill/segment, toggles, focus, today marker */
--home-fade: accent at 50% on white      /* top colour of the Home fade */

/* Workout types & states */
--push: #9c3587 (plum)  --pull: #1a8fe0  --legs: #0fa678  --recovery: #7c4dff
--success: #0fa678  --success-ink: #0b7a58   /* "improved" signals only (trend up, PR delta) */
--danger: #cc3339  --on-danger: #ffffff      /* errors and destructive actions — never orange */
--cool: #0f9f72   /* --warm (amber) removed 16 Nov — too close to the orange */

/* Shape & type */
--radius-card: 12px  --shadow-card (unused on cards)  --shadow-raised
--font-display: Bricolage Grotesque   --font-body / --font-mono: Manrope (tabular figures on body)
--font-welcome: IBM Plex Sans (welcome headline only)

/* Brand mark */
--plate: var(--accent)  --plate-ink: #ffffff   /* weight-plate logo — same orange as the interface */
```

**Rules:**
- Never hard-code colours. For tints use `color-mix(in srgb, var(--token) N%, transparent)`.
- Text on an `--accent` background uses `--on-accent`, never `--bg`.
- Orange (`--accent`) only for: the primary action on a screen, active-workout progress (progress bar, logged-set ticks and numbers, finished exercises, the session banner), and the logo. Selected/active states in secondary controls use `--select` (ink). Destructive confirms use `--danger`: `showConfirm()` turns its OK button red when the label starts with Delete/Discard/Remove/Reset.
- Workout-type colours are for workout types only (calendar dots, week badges, day cards, Chest chart). Never use `--push` for delete/remove/errors — that's `--danger`. Muscle-chart colours live in `MUSCLE_GROUP_META` (`exerciseLibrary.js`); keep them off the orange (Chest = push plum, Core = teal `#0b7f8c`).
- Home top fade: `body:has(#homePage.active)` paints `--home-fade` at the top, fading to white by ~420px (the "This week" card); it scrolls with the page and only Home has it. On Home the date stays black, the line under the button uses `--text-secondary`, and the Start button is white with `--accent-ink` text (an orange button would blend into the fade). Rules are in the `WARM DAYLIGHT — Home top fade` block at the end of `main.css`.
- Small orange text on a card uses `--accent-ink` (plain `--accent` is only 4.3:1 on `--surface`).
- Cards: flat warm off-white (`--surface`), 1px `--border` hairline, no drop shadow, 12px radius. Pop-ups and sheets: `--shadow-raised`.
- Labels are sentence case with normal letter spacing; no ALL-CAPS eyebrows, tinted pills, emoji or italic helper text. Overrides live in the `SHARPEN —` block at the end of `main.css`.
- Charts read colours at runtime with `cssVar()` from `charts.js`, so they follow the theme.
- Daylight overrides (card shadows, set rows, calendar, page titles) live in labelled `DAYLIGHT —` blocks at the end of `main.css`.
- Set logged: `_celebrateSet()` in `session.js` pops the tick, bursts dots and shows a 2-second pill (`.set-toast`); reduced motion turns the animation off.
- `html, body` use `overflow-x: clip` (after a `hidden` fallback) so `position: sticky` works — the workout header (`.session-sticky`) relies on it.
- Rest timer: red (resting) → amber (last third) → green "READY", via `--timer-red/amber/green` on `.rest-timer-pill` (a status signal, deliberately not the brand orange).
- App icons: `scripts/make_icons.py` draws the plate in the same burnt orange; rerun it (`python3 scripts/make_icons.py icons`) if `--accent` changes.

---

## Key module responsibilities

### `home.js`
- `renderHome()` — week streak, readiness strip, split progress grid, momentum row, yesterday card, stat footer
- `detectMostRecentPr()` — walks history and finds the latest session that beat an exercise's previous best (top weight, or top reps for bodyweight). PRs are computed on the fly, not stored.
- Coaching card surfaces `getSuggestion()` from `session.js`
- `homeStartWorkout()` — opens the day-picker sheet (structured) or starts track-as-you-go

### `welcome.js`
Welcome screen shown on every app open (design: `design-reference/patterns.md`, patterns 1–2).
- Plate logo alone for 1.2s, then a slowly turning canvas disc of dots shaped like a weight plate, the headline "Welcome in, {name}" (`--font-welcome`) and a green "Let's get moving" button
- Only the button dismisses it: switches to Home (or, for a new user with no profile, opens onboarding via the optional `onStart` callback), fades out, stops the animation and empties `#welcomeScreen` (the element stays, so it can be shown again)
- Name comes from `state.profile.name` (escaped); without one the headline is just "Welcome in"
- Reduced motion: no logo pop, dots drawn once and still

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
- Currently: `lift-tracker-v30`
- Every JS file must be listed in the `ASSETS` array — add new modules there, remove deleted ones
- Cover photos (`img/backgrounds/`) are **not** in `ASSETS`: they go in a separate `plate-log-backgrounds-v1` cache when first viewed, kept across versions
- Cover photos are from Wikimedia Commons (CC BY / BY-SA / CC0); their licences require the credit line shown in the picker and under the Profile page — keep it
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
- `IBM Plex Sans` (`--font-welcome`, weight 700) — the welcome screen headline only

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
