// Screen markup snapshots (REFACTOR_PLAN.md 0.2). Each screen renderer runs in
// jsdom with fixture state, and its innerHTML is compared with one HTML file per
// screen state in __snapshots__/screens/. Whitespace is normalised and each tag
// starts a new line, so a diff shows exactly which markup changed.
//
// These pin today's markup, including wording and inline styles. A later batch
// that restructures a renderer must leave them unchanged; any snapshot update is
// listed in that batch's handoff with its reason. Never run `vitest -u` across
// the suite.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { setNow, resetState, session, ex } from './helpers.js';

// Canvas drawing is stubbed: jsdom has no 2D context. The chart <canvas> elements
// are still in the markup.
vi.mock('../js/charts.js', async importOriginal => ({
  ...(await importOriginal()),
  drawSingleLineChart: vi.fn(),
}));

const NOW = '2026-11-18T15:00:00Z'; // Wednesday; week starts Sun 15 Nov

// progress.js reads the calendar month from the clock when it loads, so every app
// module is imported after the clock is frozen.
let state, renderHome, renderMyPlans, renderProgress, renderSettings;
let renderSession, openExercise, toggleReorderMode, leaveSession;
let setTimerEnabled, setTimerDuration, setTimerAlertEnabled;
beforeAll(async () => {
  setNow(NOW);
  ({ state } = await import('../js/data.js'));
  ({ renderHome } = await import('../js/home.js'));
  ({ renderMyPlans } = await import('../js/myplans.js'));
  ({ renderProgress } = await import('../js/progress.js'));
  ({ renderSettings } = await import('../js/settings.js'));
  ({ renderSession, openExercise, toggleReorderMode, leaveSession } = await import('../js/session.js'));
  ({ setTimerEnabled, setTimerDuration, setTimerAlertEnabled } = await import('../js/restTimer.js'));
});

const PAGES = ['homePage', 'myPlansPage', 'progressPage', 'settingsPage', 'sessionPage'];

beforeEach(() => {
  setNow(NOW);
  resetState();
  document.body.innerHTML = PAGES.map(id => `<div id="${id}" class="page"></div>`).join('');
  window.switchTab = vi.fn();
  setTimerEnabled(true);
  setTimerDuration(90);
  setTimerAlertEnabled(true);
});

afterEach(() => {
  // Clears session.js's module state (open exercise, reorder mode)
  if (state.currentSession) leaveSession();
});

function normalise(html) {
  return html.replace(/\s+/g, ' ').replace(/>\s*</g, '>\n<').trim() + '\n';
}

async function expectScreen(pageId, name) {
  const html = document.getElementById(pageId).innerHTML;
  await expect(normalise(html)).toMatchFileSnapshot(`./__snapshots__/screens/${name}.html`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const pe = (id, name, sets, loadType = 'weight', extra = {}) =>
  ({ id, name, sets, loadType, repType: 'range', repRangeMin: 8, repRangeMax: 12, ...extra });

const DEFAULT_PROGRAM = {
  id: 'program_default',
  name: "Reid's 4-Day Push/Pull/Legs",
  isActive: true,
  createdAt: '2026-05-04T10:00:00.000Z',
  days: [
    { id: 'upperA', name: 'Upper A - Push', type: 'push', exercises: [
      pe('db_press', 'Dumbbell Bench Press', 3),
      pe('lat_pulldown', 'Lat Pulldown', 3),
      pe('pushups', 'Push-Ups', 3, 'bw'),
      pe('leg_extension', 'Leg Extension', 3),
      pe('cable_fly', 'Cable Fly', 2),
    ] },
    { id: 'lowerA', name: 'Lower A - Quads', type: 'legs', exercises: [
      pe('squat', 'Barbell Back Squat', 4, 'weight', { repRangeMin: 5, repRangeMax: 5, repType: 'fixed' }),
      pe('leg_extension', 'Leg Extension', 3),
    ] },
    { id: 'upperB', name: 'Upper B - Pull', type: 'pull', exercises: [pe('lat_pulldown', 'Lat Pulldown', 4)] },
    { id: 'lowerB', name: 'Lower B - Posterior', type: 'legs', exercises: [] },
  ],
};

const libraryProgram = (id, name, isCustom = true) => ({
  id, name, isActive: false, isCustom, createdAt: '2026-06-01T10:00:00.000Z',
  days: [{ id: 'd1', name: 'Full Body', exercises: [pe('squat', 'Barbell Back Squat', 3)] }],
});

const HISTORY = [
  { ...session({ date: '2026-11-10T12:00:00.000Z', dayId: 'lowerB', dayTitle: 'Lower B - Posterior', exercises: [
    ex('squat', [[225, 5], [225, 5], [225, 5]], { name: 'Barbell Back Squat' }),
  ] }), bw: '196' },
  session({ date: '2026-11-12T12:00:00.000Z', dayId: 'upperA', dayTitle: 'Upper A - Push', exercises: [
    ex('db_press', [[70, 12], [70, 12], { weight: '70', reps: '11', note: 'last rep slow' }], { name: 'Dumbbell Bench Press', note: 'Go up next time' }),
    ex('lat_pulldown', [[100, 10], [100, 10], [100, 9]], { name: 'Lat Pulldown' }),
    ex('pushups', [{ weight: '', reps: '20', note: '' }, { weight: '', reps: '18', note: '' }], { name: 'Push-Ups', loadType: 'bw' }),
    ex('leg_extension', [[90, 12], [90, 12], [90, 12]], { name: 'Leg Extension' }),
  ] }),
  { ...session({ date: '2026-11-17T12:00:00.000Z', dayId: 'lowerA', dayTitle: 'Lower A - Quads', exercises: [
    ex('squat', [[235, 5], [235, 5], [235, 4]], { name: 'Barbell Back Squat' }),
    ex('leg_extension', [[100, 12], [100, 11], [100, 10]], { name: 'Leg Extension' }),
  ] }), bw: '195.5' },
];

function structuredUser({ history = true } = {}) {
  state.profile = { name: 'Reid', createdAt: '2026-05-04T10:00:00.000Z', trainingMode: 'structured' };
  state.programs = [structuredClone(DEFAULT_PROGRAM), libraryProgram('program_custom_1', 'Summer Cut')];
  state.history = history ? structuredClone(HISTORY) : [];
}

function trackAsYouGoUser({ history = false } = {}) {
  state.profile = { name: 'Sam', createdAt: '2026-11-01T10:00:00.000Z', trainingMode: 'trackAsYouGo' };
  state.programs = [];
  state.history = history ? structuredClone(HISTORY) : [];
}

const blankSet = () => ({ weight: '', reps: '', logged: false, note: '', noteOpen: false });
const loggedSet = (weight, reps, note = '') => ({ weight: String(weight), reps: String(reps), logged: true, note, noteOpen: false });

// Upper A in progress: exercise 1 done, exercise 2 part-done with a note and an
// extra set, exercise 3 (bodyweight) started, 4 not started, 5 never logged before.
function inProgressSession() {
  return {
    programId: 'program_default', programName: DEFAULT_PROGRAM.name,
    dayId: 'upperA', dayTitle: 'Upper A - Push', tag: 'push', bw: '',
    date: '2026-11-18', startedAt: '2026-11-18T14:30:00.000Z', isTrackAsYouGo: false,
    exercises: [
      { id: 'db_press', name: 'Dumbbell Bench Press', loadType: 'weight', repRange: '8-12', targetSets: 3, note: '',
        sets: [loggedSet(75, 10), loggedSet(75, 9), loggedSet(75, 8)] },
      { id: 'lat_pulldown', name: 'Lat Pulldown', loadType: 'weight', repRange: '8-12', targetSets: 3, note: 'Try straps',
        sets: [loggedSet(105, 10), { ...loggedSet(105, 9, 'grip slipped'), noteOpen: true }, blankSet(), loggedSet(95, 12)] },
      { id: 'pushups', name: 'Push-Ups', loadType: 'bw', repRange: '8-12', targetSets: 3, note: '',
        sets: [loggedSet('', 21), blankSet(), blankSet()] },
      { id: 'leg_extension', name: 'Leg Extension', loadType: 'weight', repRange: '8-12', targetSets: 3, note: '',
        sets: [blankSet(), blankSet(), blankSet()] },
      { id: 'cable_fly', name: 'Cable Fly', loadType: 'weight', repRange: '', targetSets: 2, note: '',
        sets: [blankSet(), blankSet()] },
    ],
  };
}

// ─── Home ────────────────────────────────────────────────────────────────────

describe('Home', () => {
  it('structured, no history', async () => {
    structuredUser({ history: false });
    renderHome();
    await expectScreen('homePage', 'home-structured-empty');
  });

  it('structured, with history', async () => {
    structuredUser();
    renderHome();
    await expectScreen('homePage', 'home-structured-history');
  });

  it('track as you go, with history', async () => {
    trackAsYouGoUser({ history: true });
    renderHome();
    await expectScreen('homePage', 'home-tayg-history');
  });
});

// ─── My Plans ────────────────────────────────────────────────────────────────

describe('My Plans', () => {
  it('structured: active program (next day marked) and a library card', async () => {
    structuredUser();
    renderMyPlans();
    await expectScreen('myPlansPage', 'myplans-structured');
  });

  it('structured with no active program and 5 custom plans (at the limit)', async () => {
    structuredUser({ history: false });
    state.programs = [1, 2, 3, 4, 5].map(n => libraryProgram(`program_custom_${n}`, `Custom ${n}`));
    renderMyPlans();
    await expectScreen('myPlansPage', 'myplans-no-active-at-limit');
  });

  it('track as you go, empty library', async () => {
    trackAsYouGoUser({ history: true });
    renderMyPlans();
    await expectScreen('myPlansPage', 'myplans-tayg-empty-library');
  });
});

// ─── Progress ────────────────────────────────────────────────────────────────

describe('Progress', () => {
  it('no history', async () => {
    structuredUser({ history: false });
    renderProgress();
    await expectScreen('progressPage', 'progress-empty');
  });

  it('with history (stats, calendar, muscle charts, a saved "All" range, bodyweight chart)', async () => {
    structuredUser();
    localStorage.setItem('liftTrackerChartRanges', JSON.stringify({ squat: 'all' }));
    renderProgress();
    await expectScreen('progressPage', 'progress-history');
  });
});

// ─── Profile (settings) ──────────────────────────────────────────────────────

describe('Profile', () => {
  it('structured, with history, cover photo, rest timer on', async () => {
    structuredUser();
    state.profile.background = 'london';
    renderSettings();
    await expectScreen('settingsPage', 'profile-structured-history');
  });

  it('track as you go, no history, no cover, rest timer off', async () => {
    trackAsYouGoUser();
    setTimerEnabled(false);
    renderSettings();
    await expectScreen('settingsPage', 'profile-tayg-empty');
  });

  it('no profile at all', async () => {
    renderSettings();
    await expectScreen('settingsPage', 'profile-none');
  });
});

// ─── Workout session ─────────────────────────────────────────────────────────

describe('Workout session', () => {
  beforeEach(() => {
    structuredUser();
    state.currentSession = inProgressSession();
  });

  it('in progress: first unfinished exercise open, logged/extra sets, notes, collapsed rows', async () => {
    renderSession();
    await expectScreen('sessionPage', 'session-in-progress');
  });

  it('a finished exercise opened again', async () => {
    openExercise(0);
    await expectScreen('sessionPage', 'session-finished-exercise-open');
  });

  it('a bodyweight exercise open', async () => {
    openExercise(2);
    await expectScreen('sessionPage', 'session-bodyweight-open');
  });

  it('a never-logged exercise open (first-time hint)', async () => {
    openExercise(4);
    await expectScreen('sessionPage', 'session-first-time-open');
  });

  it('reorder mode', async () => {
    toggleReorderMode();
    await expectScreen('sessionPage', 'session-reorder');
    toggleReorderMode();
  });

  it('track as you go, no exercises yet', async () => {
    state.currentSession = {
      programId: null, programName: 'Track As You Go', dayId: 'workout_1', dayTitle: 'Wednesday, November 18',
      tag: 'TRACK', bw: '', date: '2026-11-18', startedAt: '2026-11-18T14:30:00.000Z', isTrackAsYouGo: true, exercises: [],
    };
    renderSession();
    await expectScreen('sessionPage', 'session-tayg-empty');
  });
});

// ─── Overlays (REFACTOR_PLAN.md 0.5) ─────────────────────────────────────────
// The sheets and modals Batch 5 restructures (5.1, 5.5, 5.6). Same fixtures and
// clock as the screens above. Only the JS-built part is snapshotted: the body
// element each function fills (the static shell around it lives in index.html),
// or the whole #pbOverlay for the program builder.

describe('Overlays', () => {
  let openCalendarDay, openManualWorkoutSelect, openEditModal, openSessionEdit;
  let showProgramBuilder, closeProgramBuilder, pbToggleDay;
  beforeAll(async () => {
    ({ openCalendarDay, openManualWorkoutSelect } = await import('../js/calendar.js'));
    ({ openEditModal, openSessionEdit } = await import('../js/historyEdit.js'));
    ({ showProgramBuilder, closeProgramBuilder, pbToggleDay } = await import('../js/programBuilder.js'));
  });

  beforeEach(() => {
    structuredUser();
    document.body.insertAdjacentHTML('beforeend', `
      <div id="editModal"><div id="editModalBody"></div></div>
      <div id="calendarDayModal"><div id="calendarDayBody"></div></div>
      <div id="sessionEditModal"><div id="sessionEditBody"></div></div>
    `);
    // jsdom has no scrollIntoView; the builder calls it 120 ms after opening on a day.
    Element.prototype.scrollIntoView = vi.fn();
  });

  async function expectOverlay(el, name) {
    await expect(normalise(el.innerHTML)).toMatchFileSnapshot(`./__snapshots__/screens/${name}.html`);
  }

  it('calendar day sheet: a day with a workout', async () => {
    openCalendarDay('2026-11-17');
    await expectOverlay(document.getElementById('calendarDayBody'), 'overlay-calendar-day-workout');
  });

  it('calendar day sheet: a day with no workout', async () => {
    openCalendarDay('2026-11-16');
    await expectOverlay(document.getElementById('calendarDayBody'), 'overlay-calendar-day-empty');
  });

  it('manual workout picker (structured: program days + track as you go)', async () => {
    openManualWorkoutSelect('2026-11-16');
    await expectOverlay(document.getElementById('calendarDayBody'), 'overlay-manual-workout-select');
  });

  it('exercise edit modal: weighted exercise with a set note', async () => {
    openEditModal(1, 0);
    await expectOverlay(document.getElementById('editModalBody'), 'overlay-edit-exercise-weight');
  });

  it('exercise edit modal: bodyweight exercise', async () => {
    openEditModal(1, 2);
    await expectOverlay(document.getElementById('editModalBody'), 'overlay-edit-exercise-bw');
  });

  it('whole-workout edit modal (weighted and bodyweight exercises)', async () => {
    openSessionEdit(1);
    await expectOverlay(document.getElementById('sessionEditBody'), 'overlay-edit-session');
  });

  describe('program builder', () => {
    afterEach(() => closeProgramBuilder());

    it('editing a program, opened on a day: one open card, the rest collapsed', async () => {
      showProgramBuilder('program_default', 'upperA');
      await expectOverlay(document.getElementById('pbOverlay'), 'overlay-program-builder');
    });

    it('an empty day opened as well (empty hint)', async () => {
      showProgramBuilder('program_default', 'upperA');
      pbToggleDay('lowerB');
      await expectOverlay(document.getElementById('pbOverlay'), 'overlay-program-builder-empty-day-open');
    });
  });
});
