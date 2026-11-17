import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../js/data.js';
import { getLastPerformance, getSuggestion, getLastExerciseNote } from '../js/overload.js';
import { resetState, session, ex, setNow } from './helpers.js';

beforeEach(resetState);

describe('getLastPerformance', () => {
  it('returns null with no history', () => {
    expect(getLastPerformance('db_press')).toBeNull();
  });

  it('finds the latest session that has the exercise with any value entered', () => {
    const a = session({ date: '2026-04-01T12:00:00Z', exercises: [ex('db_press', [[80, 10]])] });
    const b = session({ date: '2026-04-05T12:00:00Z', exercises: [ex('squat', [[200, 5]])] });
    const c = session({ date: '2026-04-08T12:00:00Z', exercises: [ex('db_press', [{ weight: '', reps: '', note: '' }])] });
    state.history = [a, b, c];
    const last = getLastPerformance('db_press');
    expect(last.session).toBe(a);
    expect(last.exercise).toBe(a.exercises[0]);
  });

  it('PINNED BUG: uses array order, not date — a backfilled older workout counts as "last"', () => {
    const recent = session({ date: '2026-04-10T12:00:00Z', exercises: [ex('db_press', [[90, 8]])] });
    const backfilled = session({ date: '2026-03-01T12:00:00Z', exercises: [ex('db_press', [[60, 12]])] });
    state.history = [recent, backfilled]; // confirmFinishSession pushes; only saveSessionEdit sorts
    expect(getLastPerformance('db_press').session).toBe(backfilled);
  });
});

describe('getSuggestion — weighted', () => {
  const last = sets => ({ session: {}, exercise: ex('db_press', sets) });

  it('returns null with no last performance or no complete sets', () => {
    expect(getSuggestion({ id: 'db_press', loadType: 'weight' }, null)).toBeNull();
    expect(getSuggestion({ id: 'db_press', loadType: 'weight' }, last([{ weight: '90', reps: '', note: '' }]))).toBeNull();
  });

  it('bumps 5 lb when every set hit the top of the range', () => {
    const s = getSuggestion({ loadType: 'weight', repRange: '8-12', targetSets: 3 }, last([[90, 12], [90, 12], [90, 13]]));
    expect(s).toEqual({ msg: 'Go up to 95 lb', bump: true, value: '95 lb', why: 'Every set hit 12 last time' });
  });

  it('otherwise repeats the heaviest weight and its reps', () => {
    const s = getSuggestion({ loadType: 'weight', repRange: '8-12', targetSets: 3 }, last([[85, 12], [90, 9], [90, 8]]));
    expect(s).toEqual({ msg: 'Repeat 90 lb, beat 9 reps', value: '90 lb', why: 'Beat 9 reps this time' });
  });

  it('defaults the top rep to 10 with no rep range', () => {
    expect(getSuggestion({ loadType: 'weight' }, last([[50, 10], [50, 10]])).bump).toBe(true);
    expect(getSuggestion({ loadType: 'weight' }, last([[50, 10], [50, 9]])).bump).toBeUndefined();
  });

  it('uses repRangeMax (program exercises) when there is no repRange string', () => {
    const s = getSuggestion({ loadType: 'weight', repRangeMax: 6 }, last([[100, 6], [100, 6]]));
    expect(s.msg).toBe('Go up to 105 lb');
  });

  it('a repRange string wins over repRangeMax', () => {
    const s = getSuggestion({ loadType: 'weight', repRange: '6-8', repRangeMax: 15 }, last([[100, 8], [100, 8]]));
    expect(s.bump).toBe(true);
  });

  it('PINNED: needs at least targetSets − 1 sets to bump (targetSets defaults to 3)', () => {
    expect(getSuggestion({ loadType: 'weight' }, last([[50, 12]])).bump).toBeUndefined();
    expect(getSuggestion({ loadType: 'weight', targetSets: 2 }, last([[50, 12]])).bump).toBe(true);
  });

  it('PINNED: decimal weights add 5 without rounding', () => {
    expect(getSuggestion({ loadType: 'weight' }, last([[22.5, 10], [22.5, 10]])).value).toBe('27.5 lb');
  });
});

describe('getSuggestion — bodyweight', () => {
  const last = reps => ({ session: {}, exercise: ex('pullups', reps.map(r => ({ weight: '', reps: String(r), note: '' })), { loadType: 'bw' }) });

  it('asks for top+1 when the best set reached the top rep', () => {
    expect(getSuggestion({ loadType: 'bw', repRange: '6-10' }, last([8, 10]))).toEqual(
      { msg: 'Try for 11+ reps', bump: true, value: '11+ reps', why: 'You hit 10 last time' });
  });

  it('otherwise asks to beat the best set', () => {
    expect(getSuggestion({ loadType: 'bw', repRange: '6-10' }, last([7, 6]))).toEqual(
      { msg: 'Beat 7 reps', value: '8 reps', why: 'Best last time was 7' });
  });
});

describe('getLastExerciseNote', () => {
  it('prefers the exercise note, else joins set notes, else null', () => {
    setNow('2026-04-20T12:00:00Z');
    state.history = [session({ date: '2026-04-15T12:00:00Z', exercises: [ex('db_press', [[90, 8]], { note: 'elbows in' })] })];
    expect(getLastExerciseNote('db_press')).toEqual({ date: '5d ago', note: 'elbows in' });

    state.history = [session({ date: '2026-04-15T12:00:00Z', exercises: [ex('db_press', [
      { weight: '90', reps: '8', note: 'felt strong' }, { weight: '90', reps: '7', note: '' }, { weight: '90', reps: '6', note: 'form broke' },
    ])] })];
    expect(getLastExerciseNote('db_press').note).toBe('Set 1: felt strong | Set 3: form broke');

    state.history = [session({ date: '2026-04-15T12:00:00Z', exercises: [ex('db_press', [[90, 8]])] })];
    expect(getLastExerciseNote('db_press')).toBeNull();
    expect(getLastExerciseNote('unknown')).toBeNull();
  });
});
