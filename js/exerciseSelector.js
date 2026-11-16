import { EXERCISE_LIBRARY, SELECTOR_MUSCLE_GROUPS } from './exerciseLibrary.js';
import { state, saveData } from './data.js';
import { showToast } from './utils.js';

let _onSelect = null;
let _search = '';
let _filter = 'All';
let _showCreate = false;

// ─── Public API ──────────────────────────────────────────────────────────────

export function openExerciseSelector(onSelect, initialFilter) {
  _onSelect = onSelect;
  _search = '';
  _filter = initialFilter || 'All';
  _showCreate = false;
  _mount();
}

export function closeExerciseSelector() {
  document.getElementById('exSelBackdrop')?.remove();
  _onSelect = null;
}

export function exSelFilterMuscle(group) {
  _filter = group;
  _refreshList();
  document.querySelectorAll('.ex-sel-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.group === group);
  });
}

export function exSelSearch(query) {
  _search = query;
  _refreshList();
}

export function exSelPickExercise(id) {
  const ex = _getAllExercises().find(e => e.id === id);
  if (!ex || !_onSelect) return;
  _onSelect({ ...ex });
  closeExerciseSelector();
}

export function exSelShowCreate() {
  _showCreate = true;
  const body = document.getElementById('exSelBody');
  if (body) body.innerHTML = _createFormHtml();
}

export function exSelCancelCreate() {
  _showCreate = false;
  const body = document.getElementById('exSelBody');
  if (body) body.innerHTML = _selectorBodyHtml();
}

export function exSelConfirmCreate() {
  const nameEl = document.getElementById('exSelCustomName');
  const groupEl = document.getElementById('exSelCustomGroup');
  const name = nameEl?.value.trim() ?? '';
  const muscleGroup = groupEl?.value ?? '';

  if (!name) { _showFormError('Exercise name is required'); return; }
  if (name.length > 50) { _showFormError('Name must be 50 characters or less'); return; }
  if (!muscleGroup) { _showFormError('Please select a muscle group'); return; }

  const existingNames = _getAllExercises().map(e => e.name.toLowerCase());
  if (existingNames.includes(name.toLowerCase())) {
    _showFormError('An exercise with this name already exists');
    return;
  }

  const custom = {
    id: `custom_${Date.now()}`,
    name,
    muscleGroup,
    loadType: 'weight',
    isCustom: true,
    createdAt: new Date().toISOString()
  };

  if (!state.customExercises) state.customExercises = [];
  state.customExercises.push(custom);
  saveData();
  showToast(`Created "${name}"`, 'success');

  if (_onSelect) _onSelect({ ...custom });
  closeExerciseSelector();
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _getAllExercises() {
  return [
    ...EXERCISE_LIBRARY,
    ...(state.customExercises || []).map(e => ({ ...e, isCustom: true }))
  ];
}

function _getFiltered() {
  let list = _getAllExercises();
  if (_filter !== 'All') list = list.filter(e => e.muscleGroup === _filter);
  if (_search.trim()) {
    const q = _search.toLowerCase().trim();
    list = list.filter(e => e.name.toLowerCase().includes(q));
  }
  const customs = list.filter(e => e.isCustom).sort((a, b) => a.name.localeCompare(b.name));
  const library = list.filter(e => !e.isCustom).sort((a, b) => a.name.localeCompare(b.name));
  return { customs, library };
}

function _exerciseRowHtml(ex) {
  return `
    <div class="ex-sel-item" onclick="exSelPickExercise('${ex.id}')">
      <span class="ex-sel-name">${ex.name}</span>
      ${ex.isCustom ? '<span class="ex-sel-custom-badge">Custom</span>' : ''}
    </div>`;
}

function _exerciseListHtml() {
  const { customs, library } = _getFiltered();
  let html = '';

  if (customs.length > 0) {
    html += `<div class="ex-sel-section-label">YOUR CUSTOM EXERCISES</div>`;
    html += customs.map(_exerciseRowHtml).join('');
  }

  if (library.length > 0) {
    html += `<div class="ex-sel-section-label">EXERCISE LIBRARY</div>`;
    html += library.map(_exerciseRowHtml).join('');
  }

  if (customs.length === 0 && library.length === 0) {
    const msg = _filter !== 'All' && !_search.trim()
      ? 'No exercises in this category'
      : 'No exercises found';
    html += `<div class="ex-sel-empty">${msg}</div>`;
  }

  return html;
}

function _pillsHtml() {
  const groups = ['All', ...SELECTOR_MUSCLE_GROUPS];
  return groups.map(g =>
    `<button class="ex-sel-pill${_filter === g ? ' active' : ''}" data-group="${g}" onclick="exSelFilterMuscle('${g}')">${g}</button>`
  ).join('');
}

function _selectorBodyHtml() {
  return `
    <div class="ex-sel-header">
      <div class="ex-sel-title">Select Exercise</div>
      <button class="ex-sel-close" onclick="closeExerciseSelector()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="ex-sel-search-wrap">
      <svg class="ex-sel-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        class="ex-sel-search"
        id="exSelSearchInput"
        placeholder="Search exercises..."
        value="${_search}"
        oninput="exSelSearch(this.value)"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      >
    </div>

    <div class="ex-sel-pills">${_pillsHtml()}</div>

    <div class="ex-sel-list" id="exSelList">${_exerciseListHtml()}</div>

    <div class="ex-sel-footer">
      <button class="ex-sel-create-btn" onclick="exSelShowCreate()">+ Create Custom Exercise</button>
    </div>`;
}

function _createFormHtml() {
  const groupOptions = SELECTOR_MUSCLE_GROUPS.map(g =>
    `<option value="${g}">${g}</option>`
  ).join('');

  return `
    <div class="ex-sel-header">
      <div class="ex-sel-title">Create Custom Exercise</div>
      <button class="ex-sel-close" onclick="closeExerciseSelector()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="ex-sel-form">
      <div class="ex-sel-field">
        <label class="ex-sel-label">Exercise Name</label>
        <input
          type="text"
          id="exSelCustomName"
          class="ex-sel-input"
          placeholder="e.g., Cable Crossover High to Low"
          maxlength="50"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="words"
        >
      </div>
      <div class="ex-sel-field">
        <label class="ex-sel-label">Muscle Group <span style="color:var(--danger)">*</span></label>
        <select id="exSelCustomGroup" class="ex-sel-select">
          <option value="">Select muscle group</option>
          ${groupOptions}
        </select>
      </div>
      <div class="ex-sel-form-error" id="exSelFormError"></div>
    </div>

    <div class="ex-sel-footer ex-sel-footer-two">
      <button class="ex-sel-cancel-btn" onclick="exSelCancelCreate()">Cancel</button>
      <button class="ex-sel-confirm-btn" onclick="exSelConfirmCreate()">Create Exercise</button>
    </div>`;
}

function _showFormError(msg) {
  const el = document.getElementById('exSelFormError');
  if (el) el.textContent = msg;
}

function _refreshList() {
  const listEl = document.getElementById('exSelList');
  if (listEl) listEl.innerHTML = _exerciseListHtml();
}

function _mount() {
  document.getElementById('exSelBackdrop')?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'exSelBackdrop';
  wrapper.className = 'ex-sel-backdrop';
  wrapper.onclick = (e) => { if (e.target === wrapper) closeExerciseSelector(); };

  const modal = document.createElement('div');
  modal.className = 'ex-sel-modal';
  modal.id = 'exSelBody';
  modal.onclick = (e) => e.stopPropagation();
  modal.innerHTML = _selectorBodyHtml();

  wrapper.appendChild(modal);
  document.body.appendChild(wrapper);

  // Focus search after animation
  setTimeout(() => document.getElementById('exSelSearchInput')?.focus(), 300);

  // ESC to close
  const onKey = (e) => { if (e.key === 'Escape') { closeExerciseSelector(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}
