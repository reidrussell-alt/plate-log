import { describe, it, expect, beforeEach } from 'vitest';
import { state, saveData, loadData, saveCurrentSession, confirmReset } from '../js/data.js';
import { resetState, mountAppChrome } from './helpers.js';

beforeEach(() => {
  resetState();
  mountAppChrome();
});

const KEY = 'liftTrackerData';
const SESSION_KEY = 'liftTrackerSession';

describe('saveData / loadData', () => {
  it('writes exactly version, profile, programs, history, customExercises', () => {
    state.profile = { name: 'Reid', trainingMode: 'structured' };
    state.programs = [{ id: 'p1', days: [] }];
    state.history = [{ dayId: 'upperA', exercises: [] }];
    state.customExercises = [{ id: 'c1' }];
    state.chartExerciseByGroup = { chest: 'db_press' }; // not saved
    saveData();
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      version: 5,
      profile: { name: 'Reid', trainingMode: 'structured' },
      programs: [{ id: 'p1', days: [] }],
      history: [{ dayId: 'upperA', exercises: [] }],
      customExercises: [{ id: 'c1' }],
    });
  });

  it('round-trips through localStorage', () => {
    state.profile = { name: 'Reid', background: 'london' };
    state.programs = [{ id: 'p1', isActive: true, days: [{ id: 'd1', exercises: [] }] }];
    state.history = [{ date: '2026-04-15T12:00:00.000Z', exercises: [{ id: 'db_press', sets: [{ weight: '90', reps: '8', note: '' }] }] }];
    state.customExercises = [{ id: 'c1', name: 'Mine' }];
    saveData();
    const saved = { profile: state.profile, programs: state.programs, history: state.history, customExercises: state.customExercises };
    resetState();
    loadData();
    expect({ profile: state.profile, programs: state.programs, history: state.history, customExercises: state.customExercises }).toEqual(saved);
  });

  it('does nothing when nothing is stored', () => {
    loadData();
    expect(state.profile).toBeNull();
    expect(state.history).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('migrates old stored data and writes the migrated version back', () => {
    localStorage.setItem(KEY, JSON.stringify({
      version: 3,
      profile: { name: 'Reid' },
      programs: [],
      history: [{ exercises: [{ id: 'leg_ext_a', sets: [] }] }],
    }));
    loadData();
    expect(state.history[0].exercises[0].id).toBe('leg_extension');
    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored.version).toBe(5);
    expect(stored.history[0].exercises[0].id).toBe('leg_extension');
  });

  it('leaves v5 data byte-for-byte unchanged in storage', () => {
    const raw = JSON.stringify({ version: 5, profile: { name: 'R' }, programs: [], history: [] });
    localStorage.setItem(KEY, raw);
    loadData();
    expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('survives corrupt JSON: state untouched, warning logged', () => {
    localStorage.setItem(KEY, '{not json');
    loadData();
    expect(state.profile).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('PINNED: fields missing from storage keep whatever is already in state', () => {
    state.customExercises = [{ id: 'kept' }];
    localStorage.setItem(KEY, JSON.stringify({ version: 5, history: [] }));
    loadData();
    expect(state.customExercises).toEqual([{ id: 'kept' }]);
  });
});

describe('in-progress workout (liftTrackerSession)', () => {
  it('saves, restores on load, and is removed when cleared', () => {
    state.profile = { name: 'Reid' };
    saveData();
    state.currentSession = { dayId: 'upperA', exercises: [{ id: 'db_press', sets: [{ weight: '90', reps: '', logged: false, note: '', noteOpen: false }] }] };
    saveCurrentSession();
    const snapshot = JSON.parse(JSON.stringify(state.currentSession));
    state.currentSession = null;
    loadData();
    expect(state.currentSession).toEqual(snapshot);

    state.currentSession = null;
    saveCurrentSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('PINNED BUG: the session is NOT restored when liftTrackerData is empty (early return)', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ dayId: 'lowerA' }));
    loadData();
    expect(state.currentSession).toBeNull();
  });
});

describe('confirmReset', () => {
  it('clears state and storage', () => {
    state.profile = { name: 'Reid' };
    state.history = [{}];
    state.currentSession = { dayId: 'x' };
    saveData();
    saveCurrentSession();
    confirmReset();
    expect(state.profile).toBeNull();
    expect(state.history).toEqual([]);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ version: 5, profile: null, programs: [], history: [], customExercises: [] });
    expect(document.getElementById('resetModal').classList.contains('active')).toBe(false);
    expect(document.getElementById('toast').textContent).toBe('All data cleared');
  });
});
