import { vi } from 'vitest';
import { state } from '../js/data.js';

// Freeze "now" without faking setTimeout/setInterval.
export function setNow(iso) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

export function resetState() {
  state.profile = null;
  state.programs = [];
  state.history = [];
  state.currentSession = null;
  state.chartExerciseByGroup = {};
  state.editing = null;
  state.customExercises = [];
}

// A saved workout as confirmFinishSession() writes it.
export function session({ date, dayId = 'upperA', dayTitle = 'Upper A - Push', programId = 'program_default', exercises = [] }) {
  return { date, dayId, dayTitle, programId, programName: 'P', bw: '', exercises };
}

export function ex(id, sets, { loadType = 'weight', name = id, note = '' } = {}) {
  return {
    id, name, loadType, note,
    sets: sets.map(s => (Array.isArray(s) ? { weight: String(s[0]), reps: String(s[1]), note: '' } : s)),
  };
}

// The DOM elements utils.showToast / showConfirm expect.
export function mountAppChrome() {
  document.body.innerHTML = `
    <div id="toast"></div>
    <div id="confirmModal"><p id="confirmModalText"></p>
      <button id="confirmModalOk"></button><button id="confirmModalCancel"></button></div>
    <div id="resetModal" class="active"></div>
    <div id="homePage"></div>
  `;
}
