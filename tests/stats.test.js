// Direct unit tests for the stats/rotation helpers that moved out of home.js
// (REFACTOR_PLAN 3.2). home.test.js still covers them through renderHome().
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state } from '../js/data.js';
import { _weekStart, detectMostRecentPr, calcWeekStreak, getDayType, abbreviateTitle, abbreviateDay } from '../js/stats.js';
import { resetState, session, ex, setNow } from './helpers.js';

beforeEach(() => resetState());
afterEach(() => vi.useRealTimers());

describe('_weekStart', () => {
  it('returns Sunday 00:00 local of the same week and leaves the input alone', () => {
    const d = new Date('2026-11-18T15:00:00Z'); // Wednesday
    const start = _weekStart(d);
    expect(start.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(d.toISOString()).toBe('2026-11-18T15:00:00.000Z');
    expect(_weekStart(new Date('2026-11-15T09:00:00Z')).toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });
});

describe('detectMostRecentPr', () => {
  it('needs at least two sessions', () => {
    state.history = [session({ date: '2026-11-01T12:00:00Z', exercises: [ex('db_press', [[90, 8]])] })];
    expect(detectMostRecentPr()).toBeNull();
  });

  it('returns the last time an exercise beat its previous best, with the previous best', () => {
    state.history = [
      session({ date: '2026-11-01T12:00:00Z', exercises: [ex('db_press', [[90, 8]], { name: 'Dumbbell Press' })] }),
      session({ date: '2026-11-04T12:00:00Z', exercises: [ex('db_press', [[95, 8], [90, 9]], { name: 'Dumbbell Press' })] }),
      session({ date: '2026-11-07T12:00:00Z', exercises: [ex('db_press', [[95, 9]], { name: 'Dumbbell Press' })] }),
    ];
    expect(detectMostRecentPr()).toEqual({ name: 'Dumbbell Press', value: 95, loadType: 'weight', date: '2026-11-04T12:00:00Z', prev: 90 });
  });

  it('uses top reps for bodyweight exercises', () => {
    state.history = [
      session({ date: '2026-11-01T12:00:00Z', exercises: [ex('pullup', [{ weight: '', reps: '8' }], { loadType: 'bw' })] }),
      session({ date: '2026-11-04T12:00:00Z', exercises: [ex('pullup', [{ weight: '', reps: '10' }], { loadType: 'bw' })] }),
    ];
    expect(detectMostRecentPr()).toMatchObject({ value: 10, loadType: 'bw', prev: 8 });
  });

  it('PINNED: a first-ever exercise counts as a PR with prev null (BUGS.md M3)', () => {
    state.history = [
      session({ date: '2026-11-01T12:00:00Z', exercises: [ex('db_press', [[90, 8]])] }),
      session({ date: '2026-11-04T12:00:00Z', exercises: [ex('db_press', [[90, 8]]), ex('leg_extension', [[100, 12]])] }),
    ];
    expect(detectMostRecentPr()).toMatchObject({ name: 'leg_extension', value: 100, prev: null });
  });
});

describe('calcWeekStreak', () => {
  it('counts consecutive weeks with a session, back from this week', () => {
    setNow('2026-11-18T15:00:00Z'); // Wed; weeks start Sun 15, 8, 1 Nov
    state.history = [
      session({ date: '2026-11-03T12:00:00Z' }),
      session({ date: '2026-11-10T12:00:00Z' }),
      session({ date: '2026-11-16T12:00:00Z' }),
    ];
    expect(calcWeekStreak()).toBe(3);
  });

  it('PINNED: is 0 until you train this week, even after a long run (BUGS.md M4)', () => {
    setNow('2026-11-18T15:00:00Z');
    state.history = [session({ date: '2026-11-03T12:00:00Z' }), session({ date: '2026-11-10T12:00:00Z' })];
    expect(calcWeekStreak()).toBe(0);
  });
});

describe('getDayType', () => {
  it('uses the program day type when a day id matches', () => {
    state.programs = [{ id: 'p', days: [{ id: 'upperA', type: 'pull' }] }];
    expect(getDayType({ dayId: 'upperA', dayTitle: 'Upper A - Push' })).toBe('pull');
  });

  it('falls back to the title', () => {
    expect(getDayType({ dayId: 'x', dayTitle: 'Push Day' })).toBe('push');
    expect(getDayType({ dayId: 'x', dayTitle: 'Pull Day' })).toBe('pull');
    expect(getDayType({ dayId: 'x', dayTitle: 'Lower B' })).toBe('legs');
    expect(getDayType({ dayId: 'x', dayTitle: 'Core' })).toBe('default');
  });

  it('PINNED: any title with "upper" and an "a" counts as push (BUGS.md M6)', () => {
    expect(getDayType({ dayId: 'x', dayTitle: 'Upper Back' })).toBe('push');
  });
});

describe('abbreviateTitle / abbreviateDay', () => {
  it('keeps the part before " - " / turns it into initials', () => {
    expect(abbreviateTitle('Upper A - Push')).toBe('Upper A');
    expect(abbreviateTitle(undefined)).toBe('');
    expect(abbreviateDay('Upper A - Push')).toBe('UA');
    expect(abbreviateDay('full body')).toBe('FB');
    expect(abbreviateDay('')).toBe('·');
  });
});
