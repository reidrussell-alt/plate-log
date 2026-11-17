// Home's helpers (PR detection, week streak, day type) are private, so these
// tests pin them through renderHome()'s output.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { state } from '../js/data.js';
import { renderHome } from '../js/home.js';
import { getSuggestedDay } from '../js/stats.js';
import { resetState, session, ex, setNow, mountAppChrome } from './helpers.js';

const exercises = n => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, name: `E${i}`, sets: 4, loadType: 'weight' }));
const PROGRAM = {
  id: 'program_default', name: 'P', isActive: true,
  days: [
    { id: 'upperA', name: 'Upper A - Push', type: 'push', exercises: exercises(5) },
    { id: 'lowerA', name: 'Lower A - Quads', type: 'legs', exercises: exercises(5) },
    { id: 'upperB', name: 'Upper B - Pull', type: 'pull', exercises: exercises(5) },
    { id: 'lowerB', name: 'Lower B - Posterior', type: 'legs', exercises: exercises(5) },
  ],
};

beforeEach(() => {
  resetState();
  mountAppChrome();
  state.profile = { name: 'Reid', trainingMode: 'structured' };
  state.programs = [structuredClone(PROGRAM)];
});

const $ = sel => document.querySelector(sel);
const text = sel => $(sel)?.textContent.replace(/\s+/g, ' ').trim();

describe('getSuggestedDay', () => {
  it('starts with day 1, then follows the last session of this program, wrapping round', () => {
    const p = state.programs[0];
    expect(getSuggestedDay(p).id).toBe('upperA');
    state.history = [
      session({ date: '2026-04-02T12:00:00Z', dayId: 'lowerB' }),
      session({ date: '2026-04-01T12:00:00Z', dayId: 'upperB' }),
      session({ date: '2026-04-05T12:00:00Z', dayId: 'upperA', programId: 'other' }),
    ];
    expect(getSuggestedDay(p).id).toBe('upperA'); // after lowerB
    state.history.push(session({ date: '2026-04-03T12:00:00Z', dayId: 'nope' }));
    expect(getSuggestedDay(p).id).toBe('upperA'); // unknown day → day 1
  });
});

describe('renderHome', () => {
  it('new user with no history', () => {
    setNow('2026-11-18T15:00:00Z'); // Wednesday
    renderHome();
    expect(text('.home-start-btn')).toBe('Start Upper A');
    expect(text('.home-start-meta')).toBe('5 exercises · about 50 min');
    expect($('.home-streak-badge')).toBeNull();
    expect(text('.home-split-status')).toBe('0 of 4 done');
    expect(text('.home-momentum-card--warm')).toContain('Shows up after a few sessions');
    expect(text('.home-momentum-card--cool')).toContain('Stick with current weights');
    expect($('.home-yesterday-card')).toBeNull();
    expect($('.home-stat-footer')).toBeNull();
  });

  it('track-as-you-go users get a plain Start workout button', () => {
    setNow('2026-11-18T15:00:00Z');
    state.profile.trainingMode = 'trackAsYouGo';
    renderHome();
    expect(text('.home-start-btn')).toBe('Start workout');
  });

  it('streak, week grid, yesterday card, PR card, coaching card, footer', () => {
    setNow('2026-11-18T15:00:00Z'); // Wed; week starts Sun 15 Nov
    state.history = [
      session({ date: '2026-11-10T12:00:00Z', dayId: 'lowerB', dayTitle: 'Lower B - Posterior', exercises: [ex('e0', [[90, 10], [90, 10]], { name: 'E0' })] }),
      session({ date: '2026-11-17T12:00:00Z', dayId: 'upperA', dayTitle: 'Upper A - Push', exercises: [ex('e0', [[95, 10], [95, 10]], { name: 'E0' })] }),
    ];
    renderHome();
    expect(text('.home-streak-badge')).toBe('2weeks in a row');
    expect(text('.home-start-btn')).toBe('Start Lower A');
    expect(text('.home-start-meta')).toBe('5 exercises · about 50 min · last trained yesterday');
    expect(text('.home-split-status')).toBe('1 of 4 done');
    const badge = $('.home-week-badge--push');
    expect(badge.textContent).toBe('UA');
    expect(badge.getAttribute('onclick')).toContain("'2026-11-17'");
    expect(text('.home-week-badge--today')).toBe('LA');
    expect(text('.home-yesterday-summary')).toBe('Upper A - Push · 1,900 lb moved');
    expect(text('.home-momentum-card--warm')).toBe('Personal best E0 95 lb Up from 90 lb');
    expect(text('.home-stat-footer')).toBe('2 sessions total');
  });

  it('PINNED: streak is 0 until you train this week, even after a long run', () => {
    setNow('2026-11-16T09:00:00Z'); // Monday, nothing yet this week
    state.history = [
      session({ date: '2026-11-03T12:00:00Z' }),
      session({ date: '2026-11-10T12:00:00Z' }),
    ];
    renderHome();
    expect($('.home-streak-badge')).toBeNull();
  });

  it('PINNED: a first-ever exercise counts as the newest "personal best"', () => {
    setNow('2026-11-18T15:00:00Z');
    state.history = [
      session({ date: '2026-11-10T12:00:00Z', exercises: [ex('e0', [[90, 10]], { name: 'E0' })] }),
      session({ date: '2026-11-12T12:00:00Z', exercises: [ex('e0', [[95, 10]], { name: 'E0' }), ex('e1', [[40, 10]], { name: 'E1' })] }),
    ];
    renderHome();
    expect(text('.home-momentum-card--warm')).toBe('Personal best E1 40 lb First time logged');
  });

  it('coaching card uses the next day\'s first exercise with a bump', () => {
    setNow('2026-11-18T15:00:00Z');
    state.history = [
      session({ date: '2026-11-16T12:00:00Z', dayId: 'lowerB', exercises: [ex('e1', [[60, 10], [60, 10]], { name: 'E1' })] }),
    ];
    renderHome(); // next day is upperA; e1 hit 10 (default top rep) on 2 sets
    expect(text('.home-momentum-card--cool')).toBe('Next session E1 65 lb Every set hit 10 last time');
  });

  it('day type falls back to the title when no program day matches', () => {
    setNow('2026-11-20T15:00:00Z'); // Friday; Sun 15 → Thu 19 below
    const titles = ['Pull Day', 'Upper B', 'Upper Back', 'Lower Body', 'Cardio'];
    state.history = titles.map((dayTitle, i) =>
      session({ date: `2026-11-${15 + i}T12:00:00Z`, dayId: `x${i}`, dayTitle }));
    renderHome();
    const types = [...document.querySelectorAll('.home-week-badge')].slice(0, 5)
      .map(b => [...b.classList].find(c => c.startsWith('home-week-badge--')).replace('home-week-badge--', ''));
    // PINNED: "Upper Back" reads as push because it contains "upper" and an "a"
    expect(types).toEqual(['pull', 'pull', 'push', 'legs', 'default']);
  });
});

describe('renderHome — time zone east of UTC', () => {
  let tz;
  beforeEach(() => { tz = process.env.TZ; process.env.TZ = 'Europe/Paris'; });
  afterEach(() => { process.env.TZ = tz; });

  it('PINNED BUG: yesterday card and week-grid date are a day off in UTC+1', () => {
    // Wed 18 Nov, 16:00 in Paris. Yesterday's workout saved the way the app saves it:
    // local noon → ISO, i.e. 2026-11-17T11:00:00.000Z.
    setNow('2026-11-18T15:00:00Z');
    const savedDate = new Date('2026-11-17T12:00:00').toISOString();
    expect(savedDate).toBe('2026-11-17T11:00:00.000Z');
    state.history = [session({ date: savedDate, exercises: [ex('e0', [[95, 10]], { name: 'E0' })] })];
    renderHome();
    expect($('.home-yesterday-card')).toBeNull(); // looks for "2026-11-16" instead
    expect($('.home-week-badge--push').getAttribute('onclick')).toContain("'2026-11-16'"); // opens the wrong day
  });
});
