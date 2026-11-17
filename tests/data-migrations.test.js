import { describe, it, expect, beforeEach } from 'vitest';
import {
  state, migrateV2ToV3, migrateV3ToV4, migrateV4ToV5, migrateToLatest, applyImportedData,
} from '../js/data.js';
import { program } from '../js/program.js';
import { resetState, setNow } from './helpers.js';

beforeEach(resetState);

const v2Backup = () => ({
  profile: { name: 'Reid' },
  history: [
    {
      dayId: 'upperA', dayTitle: 'Upper A', date: '2026-04-15T12:00:00.000Z', bw: '196',
      exercises: [
        { id: 'db_press_b', name: 'DB Press', loadType: 'weight', sets: [{ weight: '50', reps: '10' }, { weight: '50', reps: '9', note: 'hard' }] },
        { id: 'leg_ext_a', name: 'Leg Ext', loadType: 'weight', sets: [{ weight: '100', reps: '12' }] },
      ],
    },
  ],
});

describe('migrateV2ToV3', () => {
  it('builds the default 4-day program from program.js', () => {
    setNow('2026-05-04T10:00:00Z');
    const out = migrateV2ToV3(v2Backup());
    expect(out.version).toBe(3);
    expect(out.programs).toHaveLength(1);
    const p = out.programs[0];
    expect(p).toMatchObject({ id: 'program_default', name: "Reid's 4-Day Push/Pull/Legs", isActive: true, createdAt: '2026-05-04T10:00:00.000Z' });
    expect(p.days.map(d => d.id)).toEqual(['upperA', 'lowerA', 'upperB', 'lowerB']);
    expect(p.days.map(d => d.name)).toEqual(program.days.map(d => d.title));
    expect(p.days[0].exercises[0]).toEqual({ id: 'incline_bench', name: 'Incline Bench Press', sets: 3, loadType: 'weight', muscleGroup: 'chest' });
  });

  it('tags history with the default program and fills in missing set notes', () => {
    const out = migrateV2ToV3(v2Backup());
    const s = out.history[0];
    expect(s.programId).toBe('program_default');
    expect(s.programName).toBe("Reid's 4-Day Push/Pull/Legs");
    expect(s.exercises[0].sets).toEqual([
      { note: '', weight: '50', reps: '10' },
      { note: 'hard', weight: '50', reps: '9' },
    ]);
  });

  it('keeps the profile name, sets structured mode', () => {
    expect(migrateV2ToV3(v2Backup()).profile).toMatchObject({ name: 'Reid', trainingMode: 'structured' });
  });

  it('PINNED: with no profile the name is empty (docs say "Reid")', () => {
    expect(migrateV2ToV3({ history: [] }).profile.name).toBe('');
  });

  it('PINNED: drops any other top-level fields (e.g. customExercises)', () => {
    const out = migrateV2ToV3({ history: [], customExercises: [{ id: 'x' }] });
    expect(Object.keys(out).sort()).toEqual(['history', 'profile', 'programs', 'version']);
  });
});

describe('migrateV3ToV4', () => {
  it('remaps leg_ext_a / leg_ext_b to leg_extension in programs and history', () => {
    const out = migrateV3ToV4({
      version: 3,
      programs: [{ id: 'p', days: [{ id: 'd', exercises: [{ id: 'leg_ext_a' }, { id: 'leg_ext_b' }, { id: 'squat' }] }] }],
      history: [{ exercises: [{ id: 'leg_ext_b' }] }],
    });
    expect(out.version).toBe(4);
    expect(out.programs[0].days[0].exercises.map(e => e.id)).toEqual(['leg_extension', 'leg_extension', 'squat']);
    expect(out.history[0].exercises[0].id).toBe('leg_extension');
  });
});

describe('migrateV4ToV5', () => {
  it('remaps the old split IDs to library IDs and leaves others alone', () => {
    const ids = ['pull_ups', 't_bar', 'shoulder_db_press', 'lateral_raises_a', 'barbell_curl_a', 'tricep_ext_a',
      'bulgarian_split', 'leg_curls_a', 'standing_calf', 'machine_t', 'db_press_b', 'cable_crossover',
      'lateral_raises_b', 'barbell_curl_b', 'overhead_tri', 'seated_calf', 'db_press', 'back_extension'];
    const out = migrateV4ToV5({
      version: 4,
      programs: [{ days: [{ exercises: ids.map(id => ({ id })) }] }],
      history: [{ exercises: ids.map(id => ({ id })) }],
    });
    const expected = ['pullups', 'tbar_row', 'db_shoulder_press', 'lateral_raise', 'barbell_curl', 'overhead_tricep_ext',
      'bulgarian_split_squat', 'leg_curl', 'standing_calf_raise', 'chest_supported_row', 'db_shoulder_press', 'cable_fly',
      'machine_lateral_raise', 'barbell_curl', 'overhead_tricep_ext', 'seated_calf_raise', 'db_press', 'back_extension'];
    expect(out.version).toBe(5);
    expect(out.programs[0].days[0].exercises.map(e => e.id)).toEqual(expected);
    expect(out.history[0].exercises.map(e => e.id)).toEqual(expected);
  });
});

describe('migrateToLatest', () => {
  it('runs v2 → v5 in one go', () => {
    const out = migrateToLatest(v2Backup());
    expect(out.version).toBe(5);
    expect(out.history[0].exercises.map(e => e.id)).toEqual(['db_shoulder_press', 'leg_extension']);
    // The default program is remapped too (pull_ups → pullups)
    const upperA = out.programs[0].days.find(d => d.id === 'upperA');
    expect(upperA.exercises.map(e => e.id)).toContain('pullups');
    expect(upperA.exercises.map(e => e.id)).not.toContain('pull_ups');
  });

  it('returns the same object when already at v5', () => {
    const data = { version: 5, history: [] };
    expect(migrateToLatest(data)).toBe(data);
  });

  it('PINNED: a backup with no version is treated as v2 (programs rebuilt)', () => {
    const out = migrateToLatest({ history: [], programs: [{ id: 'mine', days: [] }] });
    expect(out.programs.map(p => p.id)).toEqual(['program_default']);
  });
});

describe('applyImportedData', () => {
  it('replaces history, profile and programs and saves', () => {
    state.history = [{ old: true }];
    state.profile = { name: 'Old' };
    state.programs = [{ id: 'old' }];
    applyImportedData({ history: [{ new: true }], profile: { name: 'New' }, programs: [{ id: 'new' }] });
    expect(state.history).toEqual([{ new: true }]);
    expect(state.profile).toEqual({ name: 'New' });
    expect(state.programs).toEqual([{ id: 'new' }]);
    expect(JSON.parse(localStorage.getItem('liftTrackerData')).history).toEqual([{ new: true }]);
  });

  it('keeps current profile and programs when the backup has none', () => {
    state.profile = { name: 'Keep' };
    state.programs = [{ id: 'keep' }];
    applyImportedData({ history: [] });
    expect(state.profile).toEqual({ name: 'Keep' });
    expect(state.programs).toEqual([{ id: 'keep' }]);
  });

  it('merges custom exercises; the backup wins on matching IDs', () => {
    state.customExercises = [{ id: 'a', name: 'A local' }, { id: 'b', name: 'B local' }];
    applyImportedData({ history: [], customExercises: [{ id: 'b', name: 'B backup' }, { id: 'c', name: 'C backup' }] });
    expect(state.customExercises).toEqual([
      { id: 'a', name: 'A local' }, { id: 'b', name: 'B backup' }, { id: 'c', name: 'C backup' },
    ]);
  });

  it('PINNED: leaves an in-progress workout alone', () => {
    state.currentSession = { dayId: 'upperA' };
    applyImportedData({ history: [] });
    expect(state.currentSession).toEqual({ dayId: 'upperA' });
  });
});
