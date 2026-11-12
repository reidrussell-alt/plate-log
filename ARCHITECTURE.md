# Lift Tracker — Architecture Documentation

> **Living document.** Update this file alongside every structural code change.  
> See the bottom section for update instructions.

---

## 1. Overview

Lift Tracker is a personal workout tracking PWA. It is a **vanilla JS, no-build, no-framework** app using ES modules, CSS custom properties, and localStorage for persistence. It is deployed to GitHub Pages and installed as a home screen app on iOS.

- Single HTML shell (`index.html`) — all content rendered by JS
- Modular JS files with a single entry point (`app.js`)
- All event handlers bound to `window` in `app.js` to support inline `onclick` in dynamic HTML
- Service worker provides offline support and PWA installability

---

## 2. High-Level App Flow

```mermaid
graph TD
    Launch([App Launch]) --> SW{Service Worker\nActive?}
    SW -->|Yes| Cache[Serve from Cache]
    SW -->|No / localhost| Network[Serve from Network]
    Cache --> LoadData
    Network --> LoadData

    LoadData[loadData\nv2→v5 migrations] --> HasProfile{state.profile\nexists?}
    HasProfile -->|No| Onboarding[Onboarding Flow\nNew User Setup]
    HasProfile -->|Yes| Welcome

    Onboarding --> NameStep[Enter Name]
    NameStep --> ModeStep[Choose Mode]
    ModeStep -->|Structured| TemplateStep[Choose Template]
    ModeStep -->|Track As You Go| TrackConfirm[Track Confirm]
    ModeStep -->|Import| ImportStep[Import Backup]
    TemplateStep --> SaveProfile[Save Profile + Program]
    TrackConfirm --> SaveProfile
    ImportStep --> SaveProfile
    SaveProfile --> Welcome

    Welcome[Welcome Screen\nGreeting + Next Workout] -->|Tap| Main

    Main{Main App} --> HomeTab[Home Tab]
    Main --> MyPlansTab[My Plans Tab]
    Main --> ProgressTab[Progress Tab]
    Main --> ProfileTab[Profile Tab]

    HomeTab --> Readiness[Readiness Strip\nReady · Day · ex · min]
    HomeTab --> StartBtn[Start Workout CTA]
    HomeTab --> SplitGrid[Split Progress Grid\n3 cell states]
    HomeTab --> Momentum[Momentum Row\nPR card + Coaching card]
    HomeTab --> Yesterday[Yesterday Summary Card]
    StartBtn -->|Structured| StartSheet[Day Picker Sheet]
    StartBtn -->|Track As You Go| StartTAYG[Start TAYG Session]
    StartSheet --> StartSession[Start Structured Session]

    MyPlansTab -->|Structured| ActiveSection[Active Program\nDay cards — no Start button]
    MyPlansTab --> LibrarySection[Your Library\nInactive programs + Set Active]
    ActiveSection -->|Chevron| ProgramBuilder[Program Builder\nFull editor, focused to day]
    LibrarySection -->|Set Active| ConfirmSwitch[Confirm Modal → switch]
    LibrarySection -->|···| SecondaryActions[Duplicate / Delete]

    StartSession --> ActiveSession[Active Session\nLog sets, notes, BW]
    StartTAYG --> ActiveSession
    ActiveSession -->|Add / Replace Exercise| ExercisePicker[Exercise Picker Modal]
    ActiveSession -->|Set logged| RestTimer[Rest Timer Pill]
    ActiveSession -->|Switch tab| Banner[Session-in-progress Banner\nTap to resume]
    ActiveSession -->|Abandon| HomeTab
    ActiveSession -->|Finish| ConfirmModal[Confirm Finish Modal]
    ConfirmModal -->|Save| SaveSession[Save to localStorage]
    SaveSession --> HomeTab

    ProgressTab --> Stats[Stats Overview]
    ProgressTab --> Calendar[Monthly Calendar]
    ProgressTab --> Charts[Per-muscle Charts\n10 / 20 / 30 / All range]
    Charts --> EditModal[Edit Past Session Modal]

    ProfileTab --> ProfileSection[Profile: name, mode]
    ProfileTab --> TimerSection[Workout: rest timer, duration, vibrate]
    ProfileTab --> DataSection[Data: export, import, reset]
    ProfileTab --> HealthSection[HealthKit — iOS only]
```

---

## 3. Module Architecture

```mermaid
graph LR
    subgraph Entry
        app.js
    end

    subgraph UI Modules
        home.js
        myplans.js
        session.js
        progress.js
        welcome.js
        settings.js
        onboarding.js
        programBuilder.js
        exerciseSelector.js
        restTimer.js
        sessionBanner.js
        healthkit.js
    end

    subgraph Shared
        data.js
        program.js
        utils.js
        charts.js
        exerciseLibrary.js
        programTemplates.js
    end

    app.js --> home.js
    app.js --> myplans.js
    app.js --> session.js
    app.js --> progress.js
    app.js --> welcome.js
    app.js --> settings.js
    app.js --> onboarding.js
    app.js --> programBuilder.js
    app.js --> exerciseSelector.js
    app.js --> restTimer.js
    app.js --> sessionBanner.js
    app.js --> healthkit.js
    app.js --> data.js

    home.js --> data.js
    home.js --> session.js

    myplans.js --> data.js
    myplans.js --> programTemplates.js

    session.js --> data.js
    session.js --> exerciseLibrary.js
    session.js --> exerciseSelector.js
    session.js --> restTimer.js
    session.js --> healthkit.js
    session.js --> utils.js

    sessionBanner.js --> data.js

    progress.js --> data.js
    progress.js --> program.js
    progress.js --> exerciseLibrary.js
    progress.js --> utils.js
    progress.js --> charts.js

    welcome.js --> data.js

    settings.js --> data.js
    settings.js --> programTemplates.js
    settings.js --> myplans.js
    settings.js --> restTimer.js
    settings.js --> healthkit.js
    settings.js --> utils.js

    onboarding.js --> data.js
    onboarding.js --> programTemplates.js
    onboarding.js --> utils.js

    programBuilder.js --> data.js
    programBuilder.js --> exerciseSelector.js
    programBuilder.js --> utils.js
    exerciseSelector.js --> exerciseLibrary.js
    exerciseSelector.js --> data.js
    exerciseSelector.js --> utils.js

    data.js --> utils.js
    data.js --> program.js
    program.js --> exerciseLibrary.js
    programTemplates.js --> exerciseLibrary.js
    charts.js --> utils.js
```

---

## 4. Module Dependencies & Responsibilities

| Module | Imports | Responsibilities |
|--------|---------|-----------------|
| `app.js` | All modules | Entry point. Binds all `window.*` handlers. Calls `loadData()`, shows onboarding if new user, otherwise `switchTab('home')` + `showWelcomeScreen()`. Registers service worker (non-localhost only). |
| `home.js` | `data.js`, `session.js` | Home tab. Week streak, readiness strip (48h rule), split progress grid (3 cell states: completed/today/future), momentum row (most recent PR computed from history + coaching via `getSuggestion`), yesterday card with volume, stat footer. |
| `myplans.js` | `data.js`, `programTemplates.js` | My Plans tab — program management workshop only (no Start buttons). Active program day cards with exercise preview + chevron → program builder. Library section with Set Active / Duplicate / Delete overflow. |
| `program.js` | `exerciseLibrary.js` | Static data: original 4-day split, `MUSCLE_GROUPS` mapping (covers all exercise library IDs), display metadata. |
| `data.js` | `utils.js`, `program.js` | `state` object (profile, programs, history, customExercises, currentSession). `loadData()` with v2→v3→v4→v5 migrations, `saveData()`, `saveCurrentSession()`, `exportData()`, `importData()`. |
| `utils.js` | _(none)_ | `todayDateString()`, `isoDateOnly()`, `formatDate()`, `formatDateShort()`, `showToast()`, `showConfirm()`, `showPrompt()`. |
| `exerciseLibrary.js` | _(none)_ | 127 exercises with id, name, muscleGroup, loadType. `MUSCLE_GROUP_ORDER`, `MUSCLE_GROUP_META`, `getExerciseById()` and search helpers. |
| `programTemplates.js` | `exerciseLibrary.js` | 6 program templates (3-day full body, 4-day upper/lower, 4-day PPL, 5-day PPL, 6-day PPL 2×, 5-day bro split). `getTemplateById()`. |
| `onboarding.js` | `data.js`, `programTemplates.js`, `utils.js` | Multi-step new-user onboarding: welcome → name → mode → template/track-as-you-go → save. Also handles backup import during onboarding. |
| `settings.js` | `data.js`, `programTemplates.js`, `myplans.js`, `restTimer.js`, `healthkit.js`, `utils.js` | Profile tab: stats card, profile editing, rest timer settings, HealthKit toggles, data backup/restore. Also holds program activate/duplicate/delete actions used by My Plans. |
| `session.js` | `data.js`, `exerciseLibrary.js`, `exerciseSelector.js`, `restTimer.js`, `healthkit.js`, `utils.js` | Structured and TAYG session lifecycle. `startSession()`, `startTrackAsYouGoWorkout()`, `renderSession()`, add/replace/remove exercise, add/remove set, reorder, `getSuggestion()` (progressive overload), `getLastPerformance()`. In-progress session persisted separately so it survives app close. |
| `programBuilder.js` | `data.js`, `exerciseSelector.js`, `utils.js` | Full-screen program editor overlay. `showProgramBuilder(editingId, focusDayId?)` — optional `focusDayId` pre-expands and scrolls to the target day. Drag-to-reorder via Sortable.js. Per-exercise sets and rep type (range / fixed / AMRAP). |
| `exerciseSelector.js` | `exerciseLibrary.js`, `data.js`, `utils.js` | Modal for picking exercises (search, muscle filter) or creating custom ones (saved to `customExercises`). |
| `restTimer.js` | _(none)_ | Floating rest timer pill. Auto-starts after set logged; stays accurate in the background (`reconcileTimer()`); traffic-light states; optional vibrate. |
| `sessionBanner.js` | `data.js` | Persistent banner shown on non-session tabs when a session is in progress. |
| `healthkit.js` | _(none)_ | iOS Capacitor HealthKit integration (steps, weight). No-ops on non-iOS. |
| `progress.js` | `data.js`, `program.js`, `exerciseLibrary.js`, `utils.js`, `charts.js` | Stats, calendar (dynamic colors by dayId hash), per-muscle charts with 10/20/30/All range (re-renders only the changed chart), sets-per-session and bodyweight charts, session history, edit modals. |
| `charts.js` | `utils.js` | `drawSingleLineChart()` — canvas-based line chart. |
| `welcome.js` | `data.js` | Splash screen using `state.profile.name` and active program's next workout. |

---

## 5. Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant session.js
    participant data.js
    participant localStorage

    Note over User,localStorage: Starting and completing a session

    User->>UI: Tap "Start Workout" on Home, pick a day
    UI->>session.js: startSession(dayId)
    session.js->>data.js: Read state.history for last performance
    session.js->>data.js: Set state.currentSession
    data.js->>localStorage: saveCurrentSession() (liftTrackerSession)
    session.js->>UI: renderSession() — show exercise cards

    User->>UI: Log sets, enter weight/reps
    UI->>session.js: updateSet(exIdx, setIdx, field, value)
    session.js->>data.js: Mutate state.currentSession + saveCurrentSession()
    session.js->>UI: Start rest timer when a set is logged

    User->>UI: Tap "Finish Session"
    UI->>session.js: finishSession()
    session.js->>UI: Show confirmation modal

    User->>UI: Confirm
    UI->>session.js: confirmFinishSession()
    session.js->>data.js: Push session to state.history
    data.js->>localStorage: saveData() (liftTrackerData), clear liftTrackerSession
    session.js->>UI: window.switchTab('home')
```

---

## 6. Data Schema

```mermaid
erDiagram
    APP_STATE {
        object profile
        array programs
        array history
        object currentSession
        object chartExerciseByGroup
        object editing
        array customExercises
    }

    PROFILE {
        string name
        string createdAt
        string trainingMode
    }

    PROGRAM {
        string id
        string name
        boolean isActive
        string createdAt
    }

    DAY {
        string id
        string name
        string type
    }

    PROGRAM_EXERCISE {
        string id
        string name
        number sets
        string loadType
        string muscleGroup
        string repType
        number repRangeMin
        number repRangeMax
    }

    SESSION {
        string programId
        string programName
        string dayId
        string dayTitle
        string date
        string bw
    }

    SESSION_EXERCISE {
        string id
        string name
        string loadType
        string note
    }

    SET {
        string weight
        string reps
        string note
        boolean logged
    }

    APP_STATE ||--|| PROFILE : "profile"
    APP_STATE ||--o{ PROGRAM : "programs[]"
    PROGRAM ||--o{ DAY : "days[]"
    DAY ||--o{ PROGRAM_EXERCISE : "exercises[]"
    APP_STATE ||--o{ SESSION : "history[]"
    SESSION ||--o{ SESSION_EXERCISE : "exercises[]"
    SESSION_EXERCISE ||--o{ SET : "sets[]"
```

**localStorage key:** `liftTrackerData`  
**Schema version:** `5`  
**loadType values:** `'weight'` (barbell/dumbbell) | `'bw'` (bodyweight)  
**trainingMode values:** `'structured'` | `'trackAsYouGo'`  
**repType values:** `'range'` | `'fixed'` | `'amrap'`  
**Migrations** (run in order by `loadData()` and `importData()`):
- v2 → v3: builds default program from program.js, tags history with programId, creates profile with name "Reid"
- v3 → v4: `leg_ext_a` / `leg_ext_b` → `leg_extension`
- v4 → v5: old split-specific exercise IDs remapped to exercise-library IDs in programs and history

**Other localStorage keys:** `liftTrackerSession` (in-progress workout), `liftTimerSettings`, `liftHealthSettings`, `liftTrackerChartRanges`.  
**Personal records** are not stored — Home computes the most recent PR from history each render.

---

## 7. Key User Workflows

### Workflow 1 — Logging a Workout Session

```mermaid
flowchart TD
    A[Open App] --> B[Welcome Screen]
    B -->|Tap| C[Home Tab]
    C --> D[Tap Start Workout\npick a day]
    D --> E[Active Session View]
    E --> F{For each exercise}
    F --> G[View last performance\nand suggestion]
    G --> H[Enter weight & reps\nfor each set]
    H --> I[Toggle set as logged ✓\nrest timer starts]
    I --> J{More sets?}
    J -->|Yes| H
    J -->|No, next exercise| F
    F -->|Done| K[Tap Finish Session]
    K --> L{All sets logged?}
    L -->|No| M[Warning modal\nSave anyway?]
    L -->|Yes| N[Confirm modal]
    M --> N
    N -->|Confirm| O[Session saved\nto localStorage]
    O --> P[Return to Home Tab]
```

### Workflow 2 — Reviewing Progress and Editing History

```mermaid
flowchart TD
    A[Switch to Progress Tab] --> B[View Stats\nSessions / Sets / BW / Most Trained]
    B --> C[View Monthly Calendar\nColor-coded workout dots]
    C --> D[Navigate months\nwith arrow buttons]
    B --> E[Scroll to muscle group charts]
    E --> F[Select exercise from dropdown]
    F --> G[View line chart + trend pill]
    G --> H[Expand session history]
    H --> I[Tap Edit on a session]
    I --> J[Edit Modal\nDate + Sets + Notes]
    J --> K{Action}
    K -->|Save| L[Update localStorage\nRe-render progress]
    K -->|Delete| M[Remove exercise\nor whole session]
    K -->|Cancel| E
```

### Workflow 3 — Backup, Restore, and Reset

```mermaid
flowchart TD
    A[Profile Tab\nData section] --> B{Action}
    B -->|Export| C[Generate JSON blob]
    C --> D[Download lift-tracker-backup-DATE.json]
    B -->|Import| E[File picker opens]
    E --> F[Parse JSON]
    F --> G{Valid?}
    G -->|No| H[Toast: Invalid backup file]
    G -->|Yes| I[Confirm modal\nShow session counts]
    I -->|Confirm| J[Replace history,\nprofile and programs]
    J --> K[saveData to localStorage]
    K --> L[Re-render current tab]
    B -->|Reset| M[Confirm modal\nDestructive warning]
    M -->|Confirm| N[Clear state.history]
    N --> K
```

---

## 8. Progressive Overload Logic

Defined in `session.js`:

```
getLastPerformance(exerciseId)
  → finds most recent session in state.history containing that exercise

getSuggestion(exercise, last?)
  → top rep = upper end of the exercise's rep range (default 10)
  → if loadType === 'bw':
      best reps ≥ top rep  → "Try for <top+1>+ reps"
      otherwise            → "Match <best> reps"
  → if loadType === 'weight':
      every set hit the top rep (and enough sets were done)
                           → "Bump up: <w> → <w+5> lb"
      otherwise            → "Last: <w> × <reps>"

getLastExerciseNote(exerciseId)
  → returns { date, note } from most recent session
  → backward-compat: if no ex.note, assembles from set-level notes
    e.g. "Set 1: felt strong | Set 3: form broke"
```

These are displayed in the session view as "Last session" hints above each exercise card, and the suggestion for the next workout is surfaced on the Home tab's coaching card.

**PR detection** (`home.js`, `detectMostRecentPr()`): walks history oldest → newest keeping each exercise's best (top weight, or top reps for bodyweight); the last time any exercise beat its previous best is shown on the Home PR card.

---

## 9. Styling & Theming

All design tokens live in `:root` in `css/main.css`. **Never hardcode colors** — always use variables.

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#0a0a0a` | Page background |
| `--surface` | `#141414` | Cards |
| `--surface-2` | `#1c1c1c` | Inputs, nested cards |
| `--surface-3` | `#242424` | Deeply nested elements |
| `--border` | `#262626` | Default borders |
| `--border-bright` | `#383838` | Highlighted borders |
| `--text` | `#fafafa` | Primary text |
| `--text-secondary` | `#c0c0c0` | Secondary emphasis |
| `--text-dim` | `#888` | Supporting labels |
| `--text-dimmer` | `#555` | Muted/disabled text |
| `--text-faint` | `#333` | Near-invisible chrome |
| `--accent` | `#d4ff3a` | Neon lime — primary CTAs, key highlights |
| `--accent-dim` | `#a8c82a` | Supporting accent — pills, badges, section labels |
| `--push` | `#ff6b35` | Upper A / push day |
| `--pull` | `#3a9eff` | Upper B / pull day |
| `--legs` | `#22d3ee` | Lower days (cyan) |
| `--warm` | `#ff8833` | Home: "recovering" readiness, PR tag |
| `--cool` | `#66cc88` | Home: "ready" readiness dot, coaching tag |
| `--recovery` | `#b86bff` | Lower B / posterior |
| `--success` | `#4ade80` | Confirmation states |

**Typography:**
- `Archivo Black` — display headings, large text
- `JetBrains Mono` — labels, stats, monospace UI
- `Inter Tight` — body text, secondary copy

---

## 10. Deployment & Updates

```mermaid
flowchart TD
    A[Make code changes locally] --> B[Test at localhost:8082]
    B --> C{Changes correct?}
    C -->|No| A
    C -->|Yes| D[Bump CACHE_NAME in service-worker.js\ne.g. v21 → v22\nupdate ASSETS if files added/removed]
    D --> E[git add changed files]
    E --> F[git commit]
    F --> G[git push origin main\nuse PAT for password]
    G --> H[GitHub Pages deploys\n~1-5 minutes]
    H --> I{Device}
    I -->|Desktop browser| J[Hard reload with\nDisable Cache checked]
    I -->|iOS home screen PWA| K[Delete app from home screen]
    K --> L[Open in Safari\nre-add to home screen]
```

**Remote:** `https://github.com/reidrussell-alt/lifting-tracker-Application.git`  
**Auth:** Personal Access Token (GitHub no longer accepts passwords)  
**Current SW cache version:** `lift-tracker-v21`  
**Auto-update:** when a new service worker takes control, the app reloads itself. On iOS a delete + re-add is still the reliable way to force fresh code.

---

## 11. Future Roadmap

**Open**
- [ ] Show welcome screen only once per day (not every open)
- [ ] Rate difficulty (RPE) after each set — gym idea, 13 May
- [ ] Weekly/monthly volume summary on Progress tab (today: sets-per-session chart only)
- [ ] Filter Progress charts by program
- [ ] "Create plan from history" wizard for track-as-you-go users
- [ ] Swipe gestures on session cards
- [ ] Dark/light mode toggle
- [ ] Push notification reminders

**Done**
- [x] Rest timer between sets, with vibrate alert (May 2026)
- [x] Workout streak tracking — week streak on Home (May 2026)
- [x] Custom program builder (May 2026)
- [x] PR detection — most recent PR on Home (May 2026)
- [x] Chart range quick filters (May 2026)
- [x] Exercise library expanded to 100–150 (127 exercises)

---

## 12. Change Log

| Date | Change |
|------|--------|
| 2026-11-11 | App icon added (red weight plate stamped "LBS", on white): iOS home-screen icon, manifest icons, favicon; home-screen name "Lift"; SW bumped to v21 |
| 2026-11-11 | Docs refresh: ARCHITECTURE.md and CLAUDE.md brought in line with the code (schema v5, SW v20, current modules, roadmap) |
| 2026-06-05 | Fixed edit-set row overflowing on mobile; SW at v20 |
| 2026-05-30 | Refactor; PR detection on Home; per-chart re-render on range change; v4→v5 exercise-ID migration; removed `plan.js` |
| 2026-05-25 | Background-accurate rest timer; add exercise to any session (including past ones) |
| 2026-05-22 | Replace exercise and remove set mid-session; auto-reload when a new service worker takes control |
| 2026-05-15 | Home redesigned as workout launchpad (readiness, split grid, PR + coaching cards, yesterday card); My Plans as program workshop |
| 2026-05-14 | 4-tab navigation: Home, My Plans, Progress, Profile |
| 2026-05-11 | UI/UX polish: bottom nav, safe areas, touch targets |
| 2026-05-09 | Delete exercise/set in active session and past-workout edit; code-quality refactor; rest timer fixes |
| 2026-05-08 | Apple Health (Capacitor) integration groundwork |
| 2026-05-07 | Exercise library, exercise selector, program builder; rest timer with traffic-light states; chart range quick filters |
| 2026-05-04 | Multi-program support: onboarding, exercise library, 6 templates, Settings tab, track-as-you-go mode, v2→v3 data migration; SW bumped to v5 |
| 2026-05-04 | Added `ARCHITECTURE.md` and updated `CLAUDE.md` with architecture section |
| 2026-05-04 | Added welcome screen (`welcome.js`) with dynamic greeting, workout label, staggered animations, tap-to-dismiss |
| 2026-05-03 | Initial modular rebuild deployed to GitHub Pages; bumped SW to v4 |
| 2026-05-03 | Added monthly calendar view to Progress tab with color-coded workout dots |
| 2026-04-xx | Added per-exercise notes with backward compatibility for set-level notes |
| 2026-04-xx | Initial modular rebuild from single-file `preview.html` |

---

## 13. Updating This Document

**Update this file whenever you:**
- Add or remove a JS module
- Change cross-module dependencies
- Modify localStorage schema or add new fields
- Add new tabs, pages, or major UI sections
- Change the deployment process
- Complete a roadmap item

**Which section to update:**

| Change type | Section |
|-------------|---------|
| New tab or navigation | §2 High-Level App Flow |
| New JS file or import | §3 Module Architecture + §4 Dependencies |
| localStorage schema change | §6 Data Schema |
| New feature workflow | §7 Key User Workflows |
| New overload logic | §8 Progressive Overload Logic |
| New CSS variable | §9 Styling & Theming |
| Deployment process change | §10 Deployment |
| Completed or new planned feature | §11 Future Roadmap |
| Any change | §12 Change Log — add dated entry |
