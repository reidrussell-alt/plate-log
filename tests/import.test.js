// Backup import paths (REFACTOR_PLAN.md 0.4): Profile → Data → Import
// (data.js importData) and the onboarding import step (onboarding.js
// obProcessImport). Both read a real jsdom File through FileReader, which is
// async, so each test waits for the toast or confirm that every path ends in.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, importData } from '../js/data.js';
import { obGoTo, obProcessImport } from '../js/onboarding.js';
import { resetState, setNow, session, ex, mountAppChrome } from './helpers.js';

const NOW = '2026-11-18T15:00:00.000Z';

const $ = id => document.getElementById(id);
const toast = () => $('toast').textContent;
const confirmOpen = () => $('confirmModal').classList.contains('active');
const saved = () => JSON.parse(localStorage.getItem('liftTrackerData'));
const file = (content, name = 'backup.json') =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], name, { type: 'application/json' });

const V5_BACKUP = () => ({
  version: 5,
  profile: { name: 'Backup Name', createdAt: '2026-05-04T10:00:00.000Z', trainingMode: 'structured' },
  programs: [{ id: 'program_b', name: 'From Backup', isActive: true, days: [] }],
  customExercises: [{ id: 'custom_1', name: 'My Lift', muscleGroup: 'Chest', loadType: 'weight', isCustom: true }],
  history: [
    session({ date: '2026-11-01T12:00:00.000Z', programId: 'program_b', exercises: [ex('squat', [[200, 5]])] }),
    session({ date: '2026-11-03T12:00:00.000Z', programId: 'program_b', exercises: [ex('squat', [[205, 5]])] }),
  ],
});

// Old v2 shape: no programs, old exercise ids
const V2_BACKUP = () => ({
  version: 2,
  profile: { name: 'Old Reid' },
  history: [{
    dayId: 'upperA', dayTitle: 'Upper A', date: '2026-04-15T12:00:00.000Z', bw: '196',
    exercises: [{ id: 'db_press_b', name: 'DB Press', loadType: 'weight', sets: [{ weight: '50', reps: '10' }] }],
  }],
});

const EXISTING = () => {
  state.profile = { name: 'Reid', createdAt: '2026-01-01T00:00:00.000Z', trainingMode: 'trackAsYouGo' };
  state.programs = [{ id: 'program_mine', name: 'Mine', isActive: true, days: [] }];
  state.history = [1, 2, 3].map(d => session({ date: `2026-10-0${d}T12:00:00.000Z`, exercises: [ex('squat', [[100, 5]])] }));
};

beforeEach(() => {
  setNow(NOW);
  resetState();
  mountAppChrome();
  document.body.insertAdjacentHTML('beforeend',
    '<div id="onboardingContainer" class="active"><div id="onboardingBody"></div></div>');
  window.switchTab = vi.fn();
});

// ─── Profile → Data → Import ─────────────────────────────────────────────────

describe('importData (Profile → Data)', () => {
  // The <input type="file"> as the change event sees it. A plain object, so the
  // test can see whether importData clears `value` afterwards.
  const pick = content => ({ target: { files: content === undefined ? [] : [file(content)], value: 'C:\\fakepath\\backup.json' } });

  it('valid v5 backup, no history yet: asks "Import N sessions?", OK replaces and saves', async () => {
    const onSuccess = vi.fn();
    const event = pick(V5_BACKUP());
    importData(event, onSuccess);
    await vi.waitFor(() => expect(confirmOpen()).toBe(true));
    expect($('confirmModalText').textContent).toBe('Import 2 sessions?');
    expect($('confirmModalOk').textContent).toBe('Import');
    expect(event.target.value).toBe('');
    expect(state.history).toEqual([]); // nothing applied before OK

    $('confirmModalOk').click();
    expect(state.history).toHaveLength(2);
    expect(state.profile.name).toBe('Backup Name');
    expect(state.programs.map(p => p.id)).toEqual(['program_b']);
    expect(state.customExercises.map(e => e.id)).toEqual(['custom_1']);
    expect(saved()).toMatchObject({ version: 5, profile: { name: 'Backup Name' } });
    expect(saved().history).toHaveLength(2);
    expect(toast()).toBe('Imported 2 sessions');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('with existing history it asks to replace; Cancel changes nothing', async () => {
    EXISTING();
    const onSuccess = vi.fn();
    importData(pick(V5_BACKUP()), onSuccess);
    await vi.waitFor(() => expect(confirmOpen()).toBe(true));
    expect($('confirmModalText').textContent).toBe('You have 3 sessions. Replace with 2 imported sessions?');

    $('confirmModalCancel').click();
    expect(state.history).toHaveLength(3);
    expect(state.profile.name).toBe('Reid');
    expect(localStorage.getItem('liftTrackerData')).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('valid v2 backup is migrated to v5 before it is applied', async () => {
    importData(pick(V2_BACKUP()));
    await vi.waitFor(() => expect(confirmOpen()).toBe(true));
    expect($('confirmModalText').textContent).toBe('Import 1 sessions?');
    $('confirmModalOk').click();

    expect(state.history[0]).toMatchObject({ programId: 'program_default', dayId: 'upperA' });
    expect(state.history[0].exercises[0].id).toBe('db_shoulder_press');
    expect(state.programs.map(p => p.id)).toEqual(['program_default']);
    expect(state.profile).toMatchObject({ name: 'Old Reid', trainingMode: 'structured' });
    expect(saved().version).toBe(5);
  });

  it('a backup with no history is rejected with a toast; nothing changes', async () => {
    EXISTING();
    const { history, ...noHistory } = V5_BACKUP();
    importData(pick(noHistory));
    await vi.waitFor(() => expect(toast()).toBe('Invalid backup file'));
    expect(confirmOpen()).toBe(false);
    expect(state.history).toHaveLength(3);
    expect(localStorage.getItem('liftTrackerData')).toBeNull();
  });

  it('history that is not a list is rejected the same way', async () => {
    importData(pick({ version: 5, history: { a: 1 } }));
    await vi.waitFor(() => expect(toast()).toBe('Invalid backup file'));
    expect(confirmOpen()).toBe(false);
  });

  // The early return skips `event.target.value = ''`, so picking the same file
  // again fires no change event. New suspected bug, logged in the Batch 0 handoff.
  it('PINNED BUG: an invalid backup leaves the file input value set', async () => {
    const event = pick({ version: 5 });
    importData(event);
    await vi.waitFor(() => expect(toast()).toBe('Invalid backup file'));
    expect(event.target.value).toBe('C:\\fakepath\\backup.json');
  });

  it('invalid JSON shows "Could not read backup file" and clears the input', async () => {
    EXISTING();
    const event = pick('{ not json');
    importData(event);
    await vi.waitFor(() => expect(toast()).toBe('Could not read backup file'));
    expect(confirmOpen()).toBe(false);
    expect(event.target.value).toBe('');
    expect(state.history).toHaveLength(3);
  });

  it('no file chosen: does nothing', () => {
    importData(pick(undefined));
    expect(toast()).toBe('');
    expect(confirmOpen()).toBe(false);
  });
});

// ─── Onboarding import step ──────────────────────────────────────────────────

describe('obProcessImport (onboarding)', () => {
  // Opens the import step and puts a File on its <input type="file">.
  function chooseFile(content) {
    obGoTo('import');
    const input = $('obImportFile');
    if (content !== undefined) Object.defineProperty(input, 'files', { value: [file(content)] });
    return input;
  }

  // Runs the name step, as the user would before reaching import.
  function enterName(name) {
    obGoTo('name');
    $('obNameInput').value = name;
    obGoTo('mode');
  }

  // onboarding.js keeps the entered name in module state for the whole file, so
  // this test runs first, before any name has been entered.
  it('with no name entered, keeps the name from the backup', async () => {
    chooseFile(V5_BACKUP());
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Imported 2 sessions'));
    expect(state.profile.name).toBe('Backup Name');
  });

  it('no file chosen: toast, stays on the step', () => {
    chooseFile(undefined);
    obProcessImport();
    expect(toast()).toBe('Please choose a file first');
    expect($('onboardingContainer').classList.contains('active')).toBe(true);
  });

  it('valid v5 backup: applied without asking, saved, onboarding closed, Home opened; the entered name wins', async () => {
    enterName('Alex');
    chooseFile(V5_BACKUP());
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Imported 2 sessions'));
    expect(confirmOpen()).toBe(false);
    expect(state.history).toHaveLength(2);
    expect(state.programs.map(p => p.id)).toEqual(['program_b']);
    expect(state.profile).toMatchObject({ name: 'Alex', trainingMode: 'structured' });
    expect(saved().profile.name).toBe('Alex');
    expect($('onboardingContainer').classList.contains('active')).toBe(false);
    expect(window.switchTab).toHaveBeenCalledWith('home');
  });

  it('valid v2 backup is migrated; the entered name replaces the migrated one', async () => {
    enterName('Alex');
    chooseFile(V2_BACKUP());
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Imported 1 sessions'));
    expect(state.history[0].exercises[0].id).toBe('db_shoulder_press');
    expect(state.programs.map(p => p.id)).toEqual(['program_default']);
    expect(state.profile.name).toBe('Alex');
    expect(saved().version).toBe(5);
  });

  it('a v5 backup with no profile leaves state.profile empty', async () => {
    const { profile, ...noProfile } = V5_BACKUP();
    chooseFile(noProfile);
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Imported 2 sessions'));
    expect(state.profile).toBeNull();
    expect(window.switchTab).toHaveBeenCalledWith('home');
  });

  it('a backup with no history: "Invalid backup file", onboarding stays open', async () => {
    const { history, ...noHistory } = V5_BACKUP();
    chooseFile(noHistory);
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Invalid backup file'));
    expect(state.history).toEqual([]);
    expect($('onboardingContainer').classList.contains('active')).toBe(true);
    expect(window.switchTab).not.toHaveBeenCalled();
    expect(localStorage.getItem('liftTrackerData')).toBeNull();
  });

  it('invalid JSON: "Error reading file. Check the format."', async () => {
    chooseFile('{ not json');
    obProcessImport();
    await vi.waitFor(() => expect(toast()).toBe('Error reading file. Check the format.'));
    expect($('onboardingContainer').classList.contains('active')).toBe(true);
    expect(window.switchTab).not.toHaveBeenCalled();
  });
});
