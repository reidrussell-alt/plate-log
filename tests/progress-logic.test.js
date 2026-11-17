import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../js/data.js';
import { analyzeTrend, getMostTrainedDay, _liveSessionIdx } from '../js/progress.js';
import { resetState, session } from './helpers.js';

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

describe('getMostTrainedDay', () => {
  it('returns the title with the most sessions; first wins a tie', () => {
    expect(getMostTrainedDay({})).toBe('—');
    expect(getMostTrainedDay({ a: { count: 2, title: 'A' }, b: { count: 5, title: 'B' } })).toBe('B');
    expect(getMostTrainedDay({ a: { count: 3, title: 'A' }, b: { count: 3, title: 'B' } })).toBe('A');
    expect(getMostTrainedDay({ a: { count: 0, title: 'A' } })).toBe('—');
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
