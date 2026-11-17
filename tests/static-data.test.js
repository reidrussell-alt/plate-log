// Data-only modules: exercise library, muscle-group mapping, templates, backgrounds.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXERCISE_LIBRARY, MUSCLE_GROUP_ORDER, MUSCLE_GROUP_META, getExerciseById, searchExercises, getExercisesByMuscleGroup } from '../js/exerciseLibrary.js';
import { MUSCLE_GROUPS, program } from '../js/program.js';
import { PROGRAM_TEMPLATES, buildProgramFromTemplate } from '../js/programTemplates.js';
import { BACKGROUNDS, getBackgroundById, backgroundFullUrl, backgroundThumbUrl } from '../js/backgrounds.js';
import { setNow } from './helpers.js';

const ROOT = resolve(__dirname, '..');

describe('exercise library', () => {
  it('has 127 exercises with unique ids and a valid loadType', () => {
    expect(EXERCISE_LIBRARY).toHaveLength(127);
    expect(new Set(EXERCISE_LIBRARY.map(e => e.id)).size).toBe(127);
    expect(EXERCISE_LIBRARY.every(e => ['weight', 'bw'].includes(e.loadType))).toBe(true);
  });

  it('lookup helpers', () => {
    expect(getExerciseById('db_press')).toMatchObject({ name: 'Dumbbell Bench Press', muscleGroup: 'Chest', loadType: 'weight' });
    expect(getExerciseById('nope')).toBeUndefined();
    expect(searchExercises('CALF RAISE').map(e => e.id)).toContain('standing_calf_raise');
    expect(getExercisesByMuscleGroup('Calves').length).toBeGreaterThan(0);
  });

  it('chart groups', () => {
    expect(MUSCLE_GROUP_ORDER).toEqual(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core']);
    expect(Object.keys(MUSCLE_GROUP_META)).toEqual([...MUSCLE_GROUP_ORDER, 'other']);
  });
});

describe('MUSCLE_GROUPS (exercise id → chart group)', () => {
  it('maps every library exercise to a chart group', () => {
    const groups = new Set([...MUSCLE_GROUP_ORDER, 'other']);
    const unmapped = EXERCISE_LIBRARY.filter(e => !groups.has(MUSCLE_GROUPS[e.id]));
    expect(unmapped.map(e => `${e.id}:${MUSCLE_GROUPS[e.id]}`)).toEqual([]);
  });

  it('pins a few mappings, including program overrides', () => {
    expect(MUSCLE_GROUPS.db_press).toBe('chest');
    expect(MUSCLE_GROUPS.leg_extension).toBe('legs');
    expect(MUSCLE_GROUPS.face_pulls).toBe('shoulders');
    expect(MUSCLE_GROUPS.pullups).toBe('back');
  });

  it('the original 4-day program keeps its rotation order', () => {
    expect(program.days.map(d => d.id)).toEqual(['upperA', 'lowerA', 'upperB', 'lowerB']);
  });
});

describe('program templates', () => {
  it('6 templates, every exercise resolved from the library', () => {
    expect(PROGRAM_TEMPLATES.map(t => t.id)).toEqual([
      'template_3day_fullbody', 'template_4day_upper_lower', 'template_4day_ppl_upper',
      'template_5day_ppl', 'template_6day_ppl_2x', 'template_5day_bro_split',
    ]);
    for (const t of PROGRAM_TEMPLATES) {
      for (const d of t.days) expect(d.exercises).toHaveLength(6);
    }
  });

  it('buildProgramFromTemplate copies days and exercises, keeping only listed fields', () => {
    setNow('2026-05-04T10:00:00Z');
    const t = PROGRAM_TEMPLATES[0];
    const p = buildProgramFromTemplate('Mine', t, true);
    expect(p).toMatchObject({ id: `program_${Date.parse('2026-05-04T10:00:00Z')}`, name: 'Mine', isActive: true, isCustom: false, templateId: t.id, createdAt: '2026-05-04T10:00:00.000Z' });
    expect(Object.keys(p.days[0]).sort()).toEqual(['exercises', 'id', 'name']);
    expect(Object.keys(p.days[0].exercises[0]).sort()).toEqual(['id', 'loadType', 'muscleGroup', 'name', 'sets']);
    expect(buildProgramFromTemplate('C', t, false, true).templateId).toBeNull();
  });

  it('PINNED: two programs built in the same millisecond get the same id', () => {
    setNow('2026-05-04T10:00:00Z');
    const t = PROGRAM_TEMPLATES[0];
    expect(buildProgramFromTemplate('A', t).id).toBe(buildProgramFromTemplate('B', t).id);
  });
});

describe('backgrounds', () => {
  it('36 photos, 18 cities + 18 nature, unique ids, files on disk', () => {
    expect(BACKGROUNDS).toHaveLength(36);
    expect(BACKGROUNDS.filter(b => b.category === 'cities')).toHaveLength(18);
    expect(BACKGROUNDS.filter(b => b.category === 'nature')).toHaveLength(18);
    expect(new Set(BACKGROUNDS.map(b => b.id)).size).toBe(36);
    const missing = BACKGROUNDS.flatMap(b => [backgroundFullUrl(b), backgroundThumbUrl(b)]).filter(p => !existsSync(resolve(ROOT, p)));
    expect(missing).toEqual([]);
  });

  it('lookup', () => {
    expect(getBackgroundById('london')).toMatchObject({ label: 'London' });
    expect(getBackgroundById('nope')).toBeNull();
    expect(getBackgroundById(null)).toBeNull();
    expect(backgroundFullUrl({ id: 'x' })).toBe('img/backgrounds/full/x.jpg');
    expect(backgroundThumbUrl({ id: 'x' })).toBe('img/backgrounds/thumbs/x.jpg');
  });
});
