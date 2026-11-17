import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../js/data.js';
import { analyzeTrend, _collectExerciseStats, _groupByMuscle } from '../js/progress.js';
import { _liveSessionIdx } from '../js/calendar.js';
import { resetState, session, ex } from './helpers.js';

beforeEach(resetState);

const sets = (...pairs) => ({ sets: pairs.map(([w, r]) => ({ weight: String(w), reps: String(r) })) });

describe('analyzeTrend — weighted', () => {
  const data = (...sessions) => ({ loadType: 'weight', sessions });

  it('one session is "New"', () => {
    expect(analyzeTrend(data(sets([90, 8])))).toEqual({ label: 'New', cls: 'trend-new', summary: 'First time logged' });
  });

  it('compares the top weight of the first and last session', () => {
    expect(analyzeTrend(data(sets([80, 10], [85, 8]), sets([60, 5]), sets([90, 8], [95, 6])))).toEqual(
      { label: '+10 lb', cls: 'trend-up', summary: '85 → 95 lb top set' });
    expect(analyzeTrend(data(sets([90, 8]), sets([90, 9])))).toEqual(
      { label: 'Steady', cls: 'trend-flat', summary: '90 lb top set' });
  });

  it('PINNED: a drop uses the "flat" style, not a down style', () => {
    expect(analyzeTrend(data(sets([100, 5]), sets([95, 5])))).toEqual(
      { label: '-5 lb', cls: 'trend-flat', summary: '100 → 95 lb top set' });
  });
});

describe('analyzeTrend — bodyweight', () => {
  const data = (...sessions) => ({ loadType: 'bw', sessions });
  it('compares top reps', () => {
    expect(analyzeTrend(data(sets(['', 8]), sets(['', 11])))).toEqual({ label: '+3 reps', cls: 'trend-up', summary: '8 → 11 reps' });
    expect(analyzeTrend(data(sets(['', 8]), sets(['', 6])))).toEqual({ label: '-2 reps', cls: 'trend-flat', summary: '8 → 6 reps' });
    expect(analyzeTrend(data(sets(['', 8]), sets(['', 8])))).toEqual({ label: 'Steady', cls: 'trend-flat', summary: '8 reps top set' });
  });
});

describe('_liveSessionIdx', () => {
  it('finds a session by date and dayId; PINNED: the first wins on duplicates', () => {
    state.history = [
      session({ date: '2026-04-01T12:00:00Z', dayId: 'upperA' }),
      session({ date: '2026-04-02T12:00:00Z', dayId: 'lowerA' }),
      session({ date: '2026-04-02T12:00:00Z', dayId: 'lowerA' }),
    ];
    expect(_liveSessionIdx('2026-04-02', 'lowerA')).toBe(1);
    expect(_liveSessionIdx('2026-04-03', 'lowerA')).toBe(-1);
  });
});

describe('_collectExerciseStats', () => {
  it('lists every session per exercise in history order, with its indexes', () => {
    const a = session({ date: '2026-04-01T12:00:00Z', dayTitle: 'Day 1', exercises: [ex('x', [[100, 8]], { note: 'n1' }), ex('y', [['', 10]], { loadType: 'bw', name: 'Y' })] });
    const b = session({ date: '2026-04-03T12:00:00Z', dayTitle: 'Day 2', exercises: [ex('x', [[105, 8]], { name: 'Renamed' })] });
    const stats = _collectExerciseStats([a, b]);
    expect(Object.keys(stats)).toEqual(['x', 'y']);
    expect(stats.x.name).toBe('x'); // first name seen wins
    expect(stats.x.loadType).toBe('weight');
    expect(stats.x.sessions).toEqual([
      { date: a.date, sets: a.exercises[0].sets, note: 'n1', dayTitle: 'Day 1', sessionIdx: 0, exerciseIdx: 0 },
      { date: b.date, sets: b.exercises[0].sets, note: '', dayTitle: 'Day 2', sessionIdx: 1, exerciseIdx: 0 },
    ]);
    expect(stats.x.sessions[0].sets).toBe(a.exercises[0].sets); // same array, not a copy
    expect(stats.y).toMatchObject({ name: 'Y', loadType: 'bw' });
    expect(stats.y.sessions[0]).toMatchObject({ sessionIdx: 0, exerciseIdx: 1 });
  });

  it('returns {} for no history', () => {
    expect(_collectExerciseStats([])).toEqual({});
  });
});

describe('_groupByMuscle', () => {
  it('has every display group, and puts unmapped exercises under "other"', () => {
    const stats = { db_press: { sessions: [] }, mystery_move: { sessions: [] } };
    const groups = _groupByMuscle(stats);
    expect(Object.keys(groups)).toEqual(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'other']);
    expect(groups.chest.db_press).toBe(stats.db_press);
    expect(groups.other.mystery_move).toBe(stats.mystery_move);
    expect(groups.back).toEqual({});
  });

  it('has no "other" key when everything is mapped', () => {
    expect(Object.keys(_groupByMuscle({}))).toEqual(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core']);
  });
});
