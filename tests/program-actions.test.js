// settings.js program actions (REFACTOR_PLAN.md 0.3). Each one asks through
// showConfirm(); the tests click the real OK / Cancel buttons and then check
// state.programs and what was written to localStorage (liftTrackerData).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../js/data.js';
import { setActiveProgram, deleteProgram, duplicateProgram, activateTemplate, duplicateTemplate } from '../js/settings.js';
import { PROGRAM_TEMPLATES } from '../js/programTemplates.js';
import { resetState, setNow, mountAppChrome } from './helpers.js';

const NOW = '2026-11-18T15:00:00.000Z';
const NOW_MS = Date.parse(NOW);

const program = (id, name, extra = {}) => ({
  id, name, isActive: false, createdAt: '2026-05-04T10:00:00.000Z',
  days: [{ id: 'd1', name: 'Day 1', exercises: [{ id: 'squat', name: 'Barbell Back Squat', sets: 3, loadType: 'weight' }] }],
  ...extra,
});

const $ = id => document.getElementById(id);
const confirmOpen = () => $('confirmModal').classList.contains('active');
const clickOk = () => $('confirmModalOk').click();
const clickCancel = () => $('confirmModalCancel').click();
const saved = () => JSON.parse(localStorage.getItem('liftTrackerData'));
const ids = progs => progs.map(p => p.id);

beforeEach(() => {
  setNow(NOW);
  resetState();
  mountAppChrome(); // new buttons each test, so listeners left by earlier tests are gone
  window.renderMyPlans = vi.fn();
  state.profile = { name: 'Reid', trainingMode: 'structured' };
  state.programs = [
    program('program_default', 'Default', { isActive: true }),
    program('program_custom', 'Summer Cut', { isCustom: true }),
    program('program_tpl', '3-Day Full Body', { isCustom: false, templateId: 'template_3day_fullbody' }),
  ];
});

describe('setActiveProgram', () => {
  it('asks first, naming the program it replaces; OK switches and saves', () => {
    setActiveProgram('program_custom');
    expect(confirmOpen()).toBe(true);
    expect($('confirmModalText').textContent).toBe(
      'Switch to "Summer Cut"?\n\nThis will replace "Default" on the Plan tab.\n\nYour workout history will be preserved.');
    expect($('confirmModalOk').textContent).toBe('Activate');
    expect($('confirmModalOk').classList.contains('danger')).toBe(false);
    expect(localStorage.getItem('liftTrackerData')).toBeNull();

    clickOk();
    expect(confirmOpen()).toBe(false);
    expect(state.programs.filter(p => p.isActive).map(p => p.id)).toEqual(['program_custom']);
    expect(saved().programs.filter(p => p.isActive).map(p => p.id)).toEqual(['program_custom']);
    expect(window.renderMyPlans).toHaveBeenCalled();
    expect($('toast').textContent).toBe('Activated: Summer Cut');
  });

  it('with no active program the message is just "Activate …?"', () => {
    state.programs[0].isActive = false;
    setActiveProgram('program_custom');
    expect($('confirmModalText').textContent).toBe('Activate "Summer Cut"?');
  });

  it('Cancel changes nothing', () => {
    setActiveProgram('program_custom');
    clickCancel();
    expect(confirmOpen()).toBe(false);
    expect(state.programs.find(p => p.isActive).id).toBe('program_default');
    expect(localStorage.getItem('liftTrackerData')).toBeNull();
  });

  it('an unknown id does nothing', () => {
    setActiveProgram('nope');
    expect(confirmOpen()).toBe(false);
  });
});

describe('deleteProgram', () => {
  it('refuses the active program with a toast, without asking', () => {
    deleteProgram('program_default');
    expect(confirmOpen()).toBe(false);
    expect($('toast').textContent).toBe('Cannot delete active program. Switch to another first.');
    expect(ids(state.programs)).toEqual(['program_default', 'program_custom', 'program_tpl']);
  });

  it('asks with a red Delete button; OK removes and saves', () => {
    deleteProgram('program_custom');
    expect($('confirmModalText').textContent).toBe(
      'Delete "Summer Cut"?\n\nThis will permanently delete the program and all its workout days.\n\nYour workout history will NOT be deleted.\n\nThis cannot be undone.');
    expect($('confirmModalOk').textContent).toBe('Delete');
    expect($('confirmModalOk').classList.contains('danger')).toBe(true);

    clickOk();
    expect(ids(state.programs)).toEqual(['program_default', 'program_tpl']);
    expect(ids(saved().programs)).toEqual(['program_default', 'program_tpl']);
    expect($('toast').textContent).toBe('Deleted: Summer Cut');
  });

  it('Cancel keeps the program', () => {
    deleteProgram('program_custom');
    clickCancel();
    expect(ids(state.programs)).toEqual(['program_default', 'program_custom', 'program_tpl']);
    expect(localStorage.getItem('liftTrackerData')).toBeNull();
  });
});

describe('duplicateProgram', () => {
  it('OK adds an inactive custom deep copy named "(Copy)" and saves', () => {
    duplicateProgram('program_tpl');
    expect($('confirmModalText').textContent).toBe(
      'Create a copy of "3-Day Full Body"?\n\nThe copy will be saved as "3-Day Full Body (Copy)".\n\nYou can rename it after creation.');
    expect($('confirmModalOk').textContent).toBe('Duplicate');
    clickOk();

    const copy = state.programs[3];
    expect(copy).toMatchObject({
      id: `program_${NOW_MS}`, name: '3-Day Full Body (Copy)', isActive: false, isCustom: true,
      templateId: null, createdAt: NOW,
    });
    expect(copy.days).toEqual(state.programs[2].days);
    copy.days[0].exercises[0].sets = 9;
    expect(state.programs[2].days[0].exercises[0].sets).toBe(3); // not shared
    expect(saved().programs[3].name).toBe('3-Day Full Body (Copy)');
    expect($('toast').textContent).toBe('Duplicated: 3-Day Full Body (Copy)');
  });

  it('copying the active program gives an inactive copy', () => {
    duplicateProgram('program_default');
    clickOk();
    expect(state.programs.filter(p => p.isActive).map(p => p.id)).toEqual(['program_default']);
  });

  it('at 5 custom programs it refuses with a toast, without asking', () => {
    for (let n = 2; n <= 5; n++) state.programs.push(program(`c${n}`, `C${n}`, { isCustom: true }));
    duplicateProgram('program_default');
    expect(confirmOpen()).toBe(false);
    expect($('toast').textContent).toBe('Max 5 custom programs. Delete one first.');
    expect(state.programs).toHaveLength(7);
  });
});

describe('activateTemplate', () => {
  const tpl = id => PROGRAM_TEMPLATES.find(t => t.id === id);

  it('OK builds a new active, non-custom program from the template and saves', () => {
    const t = tpl('template_4day_upper_lower');
    activateTemplate(t.id);
    expect($('confirmModalText').textContent).toBe(
      `Switch to "${t.name}"?\n\nThis will replace "Default" on the Plan tab.\n\nYour workout history will be preserved.`);
    clickOk();

    expect(state.programs).toHaveLength(4);
    const created = state.programs[3];
    expect(created).toMatchObject({
      id: `program_${NOW_MS}`, name: t.name, isActive: true, isCustom: false, templateId: t.id, createdAt: NOW,
    });
    expect(created.days.map(d => d.id)).toEqual(t.days.map(d => d.id));
    expect(state.programs.filter(p => p.isActive)).toHaveLength(1);
    expect(saved().programs[3].templateId).toBe(t.id);
    expect($('toast').textContent).toBe(`Activated: ${t.name}`);
  });

  it('reuses an existing non-custom program from the same template instead of adding one', () => {
    activateTemplate('template_3day_fullbody');
    clickOk();
    expect(ids(state.programs)).toEqual(['program_default', 'program_custom', 'program_tpl']);
    expect(state.programs.filter(p => p.isActive).map(p => p.id)).toEqual(['program_tpl']);
  });

  it('a custom program with that templateId is not reused', () => {
    state.programs[2].isCustom = true;
    activateTemplate('template_3day_fullbody');
    clickOk();
    expect(state.programs).toHaveLength(4);
    expect(state.programs[3].isActive).toBe(true);
  });

  it('an unknown template id does nothing', () => {
    activateTemplate('nope');
    expect(confirmOpen()).toBe(false);
  });
});

describe('duplicateTemplate', () => {
  it('OK adds an inactive custom copy with no templateId and saves', () => {
    const t = PROGRAM_TEMPLATES[0];
    duplicateTemplate(t.id);
    expect($('confirmModalText').textContent).toBe(
      `Create a copy of "${t.name}"?\n\nThe copy will be saved as "${t.name} (Copy)" and added to your custom programs.`);
    clickOk();
    expect(state.programs[3]).toMatchObject({
      id: `program_${NOW_MS}`, name: `${t.name} (Copy)`, isActive: false, isCustom: true, templateId: null,
    });
    expect(state.programs.find(p => p.isActive).id).toBe('program_default');
    expect(saved().programs).toHaveLength(4);
    expect($('toast').textContent).toBe(`Duplicated: ${t.name} (Copy)`);
  });

  it('at 5 custom programs it refuses with a toast, without asking', () => {
    for (let n = 2; n <= 5; n++) state.programs.push(program(`c${n}`, `C${n}`, { isCustom: true }));
    duplicateTemplate(PROGRAM_TEMPLATES[0].id);
    expect(confirmOpen()).toBe(false);
    expect($('toast').textContent).toBe('Max 5 custom programs. Delete one first.');
  });
});

// showConfirm() (utils.js) adds its OK listener with { once: true }, but Cancel
// doesn't remove it. The cancelled action stays armed and runs on the next OK,
// whatever that confirm was for. Logged in the Batch 0 handoff as a new suspected bug.
it('PINNED BUG: a cancelled confirm still runs when a later confirm is OK\'d', () => {
  deleteProgram('program_custom');
  clickCancel();
  setActiveProgram('program_tpl');
  clickOk();
  expect(state.programs.find(p => p.isActive).id).toBe('program_tpl');
  expect(ids(state.programs)).toEqual(['program_default', 'program_tpl']); // Summer Cut deleted too
});
