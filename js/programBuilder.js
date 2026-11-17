import { state, saveData } from './data.js';
import { showToast, showConfirm, escapeHtml } from './utils.js';
import { openExerciseSelector } from './exerciseSelector.js';

// ─── Builder state ────────────────────────────────────────────────────────────

let _bs = null;      // builder working state
let _sr = null;      // sets/reps modal state

function _fresh(count = 4) {
  return {
    editingId: null,
    name: '',
    dayCount: count,
    days: _blankDays(count, [])
  };
}

function _blankDays(count, existing) {
  return Array.from({ length: count }, (_, i) => {
    const e = existing[i];
    return e
      ? { ...e, expanded: false }
      : { id: `day_${Date.now()}_${i}`, dayNumber: i + 1, name: '', exercises: [], expanded: false };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function showProgramBuilder(editingId = null, focusDayId = null) {
  if (editingId) {
    const prog = state.programs.find(p => p.id === editingId);
    if (!prog) return;
    _bs = {
      editingId,
      name: prog.name,
      dayCount: prog.days.length,
      days: prog.days.map((d, i) => ({
        id: d.id || `day_${Date.now()}_${i}`,
        dayNumber: i + 1,
        name: d.name || '',
        exercises: (d.exercises || []).map((ex, j) => ({
          ...ex,
          repType: ex.repType || (ex.repRange === 'AMRAP' ? 'amrap' : 'range'),
          repRangeMin: ex.repRangeMin ?? _parseMin(ex.repRange),
          repRangeMax: ex.repRangeMax ?? _parseMax(ex.repRange),
          order: j
        })),
        expanded: focusDayId ? d.id === focusDayId : false
      }))
    };
  } else {
    _bs = _fresh();
  }
  _mount();
  if (focusDayId) {
    // initSortable runs at 60ms; scroll after it settles
    setTimeout(() => {
      const el = document.getElementById(`pbDay_${focusDayId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }
}

export function closeProgramBuilder() {
  document.getElementById('pbOverlay')?.remove();
  document.getElementById('pbSrBackdrop')?.remove();
  _bs = null;
  _sr = null;
}

export function pbUpdateName(value) {
  if (_bs) _bs.name = value;
  _clearError();
}

export function pbSelectDayCount(n) {
  if (!_bs) return;
  const next = parseInt(n, 10);
  if (next === _bs.dayCount) return;

  if (next < _bs.dayCount) {
    const toRemove = _bs.days.slice(next);
    const withEx = toRemove.filter(d => d.exercises.length > 0);
    if (withEx.length > 0) {
      const labels = withEx.map(d => `Day ${d.dayNumber}${d.name ? ` (${d.name})` : ''}`).join(', ');
      showConfirm(
        `${labels} have exercises. Removing will delete them. Continue?`,
        () => { _applyDayCount(next); },
        'Remove Days'
      );
      return;
    }
  }
  _applyDayCount(next);
}

function _applyDayCount(n) {
  _bs.dayCount = n;
  if (n > _bs.days.length) {
    for (let i = _bs.days.length; i < n; i++) {
      _bs.days.push({ id: `day_${Date.now()}_${i}`, dayNumber: i + 1, name: '', exercises: [], expanded: false });
    }
  } else {
    _bs.days = _bs.days.slice(0, n);
  }
  _rerenderAll();
}

export function pbToggleDay(dayId) {
  const day = _bs?.days.find(d => d.id === dayId);
  if (!day) return;
  day.expanded = !day.expanded;
  _rerenderDayCards();
  if (day.expanded) setTimeout(() => _initSortable(dayId), 60);
}

export function pbSetDayName(dayId, value) {
  const day = _bs?.days.find(d => d.id === dayId);
  if (day) day.name = value;
  _clearError();
}

export function pbAddExercise(dayId) {
  openExerciseSelector(exercise => {
    _sr = { dayId, editIdx: null, exercise, sets: 3, repType: 'range', repMin: 8, repMax: 12, fixedReps: 10 };
    _mountSr();
  });
}

export function pbEditExercise(dayId, idx) {
  const day = _bs?.days.find(d => d.id === dayId);
  const ex = day?.exercises[idx];
  if (!ex) return;
  _sr = {
    dayId, editIdx: idx, exercise: ex,
    sets: ex.sets ?? 3,
    repType: ex.repType ?? 'range',
    repMin: ex.repRangeMin ?? 8,
    repMax: ex.repRangeMax ?? 12,
    fixedReps: ex.repType === 'fixed' ? (ex.repRangeMin ?? 10) : 10
  };
  _mountSr();
}

export function pbRemoveExercise(dayId, idx) {
  const day = _bs?.days.find(d => d.id === dayId);
  if (!day) return;
  const name = day.exercises[idx]?.name || 'this exercise';
  showConfirm(`Remove "${name}"?`, () => {
    day.exercises.splice(idx, 1);
    _rerenderExList(dayId);
  }, 'Remove');
}

export function pbSetRepType(type) {
  if (!_sr) return;
  // save current counter values before switching
  _syncSrCounters();
  _sr.repType = type;
  const sec = document.getElementById('pbRepSection');
  if (sec) sec.innerHTML = `<div class="pb-sr-label">Target Rep Range</div>${_repSectionHtml()}`;
}

export function pbSaveProgram() {
  if (!_bs) return;

  // sync live input values
  const nameEl = document.getElementById('pbNameInput');
  if (nameEl) _bs.name = nameEl.value.trim();
  _bs.days.forEach(d => {
    const el = document.getElementById(`pbDayName_${d.id}`);
    if (el) d.name = el.value.trim();
  });

  // validate
  if (!_bs.name) return _showError('Please enter a program name');
  if (_bs.name.length > 40) return _showError('Program name must be 40 characters or less');

  const dup = state.programs.find(p => p.name.toLowerCase() === _bs.name.toLowerCase() && p.id !== _bs.editingId);
  if (dup) return _showError(`A program named "${_bs.name}" already exists`);

  for (const d of _bs.days) {
    if (!d.name) { _showError(`Day ${d.dayNumber} needs a name`); _openDay(d.id); return; }
    if (d.exercises.length === 0) { _showError(`Day ${d.dayNumber} (${d.name}) has no exercises`); _openDay(d.id); return; }
  }

  const now = new Date().toISOString();

  if (_bs.editingId) {
    const prog = state.programs.find(p => p.id === _bs.editingId);
    if (prog) { prog.name = _bs.name; prog.updatedAt = now; prog.days = _buildDays(); }
  } else {
    state.programs.push({
      id: `program_${Date.now()}`,
      name: _bs.name,
      isCustom: true,
      isActive: false,
      createdAt: now,
      updatedAt: now,
      days: _buildDays()
    });
  }

  saveData();
  showToast(`${_bs.editingId ? 'Updated' : 'Saved'} "${_bs.name}"`, 'success');
  closeProgramBuilder();
  window.renderSettings();
}

// sets/reps counter actions
export function pbIncrSets()    { _incr('pbSetsValue',  10); }
export function pbDecrSets()    { _decr('pbSetsValue',  1); }
export function pbIncrRepMin()  { _incr('pbRepMin',     50); }
export function pbDecrRepMin()  { _decr('pbRepMin',     1); }
export function pbIncrRepMax()  { _incr('pbRepMax',     50); }
export function pbDecrRepMax()  { _decr('pbRepMax',     1); }
export function pbIncrFixed()   { _incr('pbFixedReps',  50); }
export function pbDecrFixed()   { _decr('pbFixedReps',  1); }

export function pbConfirmSetsReps() {
  if (!_sr) return;
  _syncSrCounters();

  const { dayId, editIdx, exercise, sets, repType, repMin, repMax, fixedReps } = _sr;

  if (sets < 1 || sets > 10) return _srError('Sets must be 1–10');

  let rMin, rMax;
  if (repType === 'range') {
    rMin = repMin; rMax = repMax;
    if (rMax < rMin) return _srError('Max reps must be ≥ min reps');
    if (rMin < 1 || rMax > 50) return _srError('Rep range must be 1–50');
  } else if (repType === 'fixed') {
    if (fixedReps < 1 || fixedReps > 50) return _srError('Reps must be 1–50');
    rMin = rMax = fixedReps;
  } else {
    rMin = 0; rMax = 999;
  }

  const day = _bs.days.find(d => d.id === dayId);
  if (!day) return;

  const exObj = {
    id: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup,
    loadType: exercise.loadType ?? 'weight', isCustom: exercise.isCustom ?? false,
    sets, repType, repRangeMin: rMin, repRangeMax: rMax,
    order: editIdx !== null ? editIdx : day.exercises.length
  };

  if (editIdx !== null) {
    day.exercises[editIdx] = { ...day.exercises[editIdx], ...exObj };
  } else {
    day.exercises.push(exObj);
  }

  _closeSr();
  _rerenderExList(dayId);
}

export function pbCancelSetsReps() { _closeSr(); }

// ─── Private helpers ──────────────────────────────────────────────────────────

function _parseMin(repRange) {
  if (!repRange || repRange === 'AMRAP') return 8;
  return parseInt(String(repRange).split('-')[0], 10) || 8;
}
function _parseMax(repRange) {
  if (!repRange || repRange === 'AMRAP') return 12;
  const p = String(repRange).split('-');
  return parseInt(p[p.length - 1], 10) || 12;
}

function _repSummary(ex) {
  const s = ex.sets ?? '?';
  if (ex.repType === 'amrap') return `${s} sets · AMRAP`;
  if (ex.repType === 'fixed' || (ex.repRangeMin != null && ex.repRangeMin === ex.repRangeMax)) {
    return `${s} sets · ${ex.repRangeMin} reps`;
  }
  if (ex.repRangeMin != null && ex.repRangeMax != null) {
    return `${s} sets · ${ex.repRangeMin}–${ex.repRangeMax} reps`;
  }
  if (ex.repRange) return `${s} sets · ${ex.repRange} reps`;
  return `${s} sets`;
}

function _buildDays() {
  return _bs.days.map((d, i) => ({
    id: d.id,
    name: d.name,
    dayNumber: i + 1,
    exercises: d.exercises.map((ex, j) => ({
      id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup,
      loadType: ex.loadType ?? 'weight', isCustom: ex.isCustom ?? false,
      sets: ex.sets, repType: ex.repType ?? 'range',
      repRangeMin: ex.repRangeMin, repRangeMax: ex.repRangeMax, order: j
    }))
  }));
}

function _showError(msg) {
  const el = document.getElementById('pbError');
  if (el) { el.textContent = msg; el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}
function _clearError() {
  const el = document.getElementById('pbError');
  if (el) el.textContent = '';
}

function _srError(msg) {
  const el = document.getElementById('pbSrError');
  if (el) el.textContent = msg;
}

function _openDay(dayId) {
  const day = _bs.days.find(d => d.id === dayId);
  if (day && !day.expanded) { day.expanded = true; _rerenderDayCards(); setTimeout(() => _initSortable(dayId), 60); }
}

function _initSortable(dayId) {
  const el = document.getElementById(`pbExList_${dayId}`);
  if (!el || !window.Sortable) return;
  if (el._sortable) el._sortable.destroy();
  el._sortable = new Sortable(el, {
    handle: '.pb-drag-handle',
    animation: 150,
    onEnd: evt => {
      const day = _bs.days.find(d => d.id === dayId);
      if (!day) return;
      const [moved] = day.exercises.splice(evt.oldIndex, 1);
      day.exercises.splice(evt.newIndex, 0, moved);
      day.exercises.forEach((e, i) => { e.order = i; });
    }
  });
}

function _syncSrCounters() {
  if (!_sr) return;
  const sets = document.getElementById('pbSetsValue');
  const rMin = document.getElementById('pbRepMin');
  const rMax = document.getElementById('pbRepMax');
  const fix  = document.getElementById('pbFixedReps');
  if (sets) _sr.sets    = parseInt(sets.textContent, 10) || _sr.sets;
  if (rMin) _sr.repMin  = parseInt(rMin.textContent,  10) || _sr.repMin;
  if (rMax) _sr.repMax  = parseInt(rMax.textContent,  10) || _sr.repMax;
  if (fix)  _sr.fixedReps = parseInt(fix.textContent, 10) || _sr.fixedReps;
}

function _incr(id, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const v = parseInt(el.textContent, 10);
  if (v < max) el.textContent = v + 1;
}
function _decr(id, min) {
  const el = document.getElementById(id);
  if (!el) return;
  const v = parseInt(el.textContent, 10);
  if (v > min) el.textContent = v - 1;
}

// ─── HTML generators ──────────────────────────────────────────────────────────

function _exerciseItemHtml(dayId, ex, idx) {
  return `
    <div class="pb-ex-item" data-idx="${idx}">
      <div class="pb-drag-handle" title="Drag to reorder">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
        </svg>
      </div>
      <div class="pb-ex-info">
        <div class="pb-ex-name">${escapeHtml(ex.name)}</div>
        <div class="pb-ex-detail">${_repSummary(ex)}</div>
      </div>
      <div class="pb-ex-actions">
        <button class="pb-ex-edit" onclick="pbEditExercise('${dayId}', ${idx})">Edit</button>
        <button class="pb-ex-del" onclick="pbRemoveExercise('${dayId}', ${idx})" aria-label="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>`;
}

function _dayCardHtml(day) {
  const exCount = day.exercises.length;
  const metaText = exCount > 0 ? `${exCount} exercise${exCount !== 1 ? 's' : ''}` : 'Tap to add exercises';
  const dayLabel = `Day ${day.dayNumber}`;

  if (!day.expanded) {
    return `
      <div class="pb-day-card" id="pbDay_${day.id}" onclick="pbToggleDay('${day.id}')">
        <div class="pb-day-top">
          <div class="pb-day-left">
            <div class="pb-day-label">${dayLabel}</div>
            <input type="text" id="pbDayName_${day.id}" class="pb-day-name-input"
              placeholder="e.g., Push, Pull, Legs, Upper"
              value="${escapeHtml(day.name)}" maxlength="30"
              onclick="event.stopPropagation()"
              oninput="pbSetDayName('${day.id}', this.value)">
          </div>
          <div class="pb-day-right">
            <svg class="pb-expand-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="pb-day-meta">${metaText}</span>
          </div>
        </div>
      </div>`;
  }

  const exHtml = day.exercises.map((ex, i) => _exerciseItemHtml(day.id, ex, i)).join('');
  const emptyHtml = day.exercises.length === 0
    ? '<div class="pb-ex-empty">No exercises yet — tap below to add your first</div>'
    : '';

  return `
    <div class="pb-day-card pb-day-card--open" id="pbDay_${day.id}">
      <div class="pb-day-top" onclick="pbToggleDay('${day.id}')" style="cursor:pointer;">
        <div class="pb-day-left">
          <div class="pb-day-label">${dayLabel}</div>
          <input type="text" id="pbDayName_${day.id}" class="pb-day-name-input pb-day-name-input--open"
            placeholder="e.g., Push, Pull, Legs, Upper"
            value="${escapeHtml(day.name)}" maxlength="30"
            onclick="event.stopPropagation()"
            oninput="pbSetDayName('${day.id}', this.value)">
        </div>
        <svg class="pb-expand-chevron pb-expand-chevron--open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
      <div class="pb-ex-list" id="pbExList_${day.id}">${exHtml}</div>
      ${emptyHtml}
      <button class="pb-add-ex-btn" onclick="pbAddExercise('${day.id}')">+ Add Exercise</button>
    </div>`;
}

function _dayPillsHtml() {
  return [3, 4, 5, 6, 7].map(n =>
    `<button class="pb-day-pill${_bs.dayCount === n ? ' active' : ''}" onclick="pbSelectDayCount(${n})">${n}</button>`
  ).join('');
}

function _builderHtml() {
  const isEdit = !!_bs.editingId;
  return `
    <div class="pb-overlay" id="pbOverlay">
      <div class="pb-header">
        <button class="pb-back" onclick="closeProgramBuilder()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="pb-header-title">${isEdit ? 'Edit Program' : 'Create Program'}</span>
        <div style="width:36px"></div>
      </div>

      <div class="pb-body">
        <div class="pb-section-card">
          <div class="pb-section-title">Program Name</div>
          <input type="text" id="pbNameInput" class="pb-name-input"
            placeholder="e.g., My Summer Bulk, Strength Phase, PPL"
            value="${escapeHtml(_bs.name)}" maxlength="40"
            oninput="pbUpdateName(this.value)"
            autocomplete="off" autocorrect="off" autocapitalize="words">
        </div>

        <div class="pb-section-card">
          <div class="pb-section-title">Workout Days</div>
          <div class="pb-section-sub">How many workout days per week?</div>
          <div class="pb-day-pills" id="pbDayPills">${_dayPillsHtml()}</div>
        </div>

        <div id="pbDayCards">${_bs.days.map(_dayCardHtml).join('')}</div>

        <div class="pb-error" id="pbError"></div>

        <button class="pb-save-btn" onclick="pbSaveProgram()">${isEdit ? 'Save Changes' : 'Save Program'}</button>

        <div style="height:48px"></div>
      </div>
    </div>`;
}

// ─── Sets/Reps modal HTML ─────────────────────────────────────────────────────

function _repSectionHtml() {
  const { repType, repMin, repMax, fixedReps } = _sr;
  const typeBtns = ['range', 'fixed', 'amrap'].map(t =>
    `<button class="pb-rep-type${repType === t ? ' active' : ''}" onclick="pbSetRepType('${t}')">${t === 'amrap' ? 'AMRAP' : t.charAt(0).toUpperCase() + t.slice(1)}</button>`
  ).join('');
  const typeRow = `<div class="pb-rep-types">${typeBtns}</div>`;

  if (repType === 'amrap') {
    return `${typeRow}<div class="pb-amrap-note">As many reps as possible</div>`;
  }
  if (repType === 'fixed') {
    return `${typeRow}
      <div class="pb-rep-row">
        <span class="pb-rep-label">Reps</span>
        <div class="pb-counter">
          <button class="pb-cnt-btn" onclick="pbDecrFixed()">−</button>
          <span class="pb-cnt-val" id="pbFixedReps">${fixedReps}</span>
          <button class="pb-cnt-btn" onclick="pbIncrFixed()">+</button>
        </div>
      </div>`;
  }
  return `${typeRow}
    <div class="pb-rep-row">
      <span class="pb-rep-label">Min</span>
      <div class="pb-counter">
        <button class="pb-cnt-btn" onclick="pbDecrRepMin()">−</button>
        <span class="pb-cnt-val" id="pbRepMin">${repMin}</span>
        <button class="pb-cnt-btn" onclick="pbIncrRepMin()">+</button>
      </div>
    </div>
    <div class="pb-rep-row">
      <span class="pb-rep-label">Max</span>
      <div class="pb-counter">
        <button class="pb-cnt-btn" onclick="pbDecrRepMax()">−</button>
        <span class="pb-cnt-val" id="pbRepMax">${repMax}</span>
        <button class="pb-cnt-btn" onclick="pbIncrRepMax()">+</button>
      </div>
    </div>`;
}

function _srHtml() {
  const isEdit = _sr.editIdx !== null;
  return `
    <div class="pb-sr-backdrop" id="pbSrBackdrop" onclick="pbCancelSetsReps()">
      <div class="pb-sr-sheet" onclick="event.stopPropagation()">
        <div class="pb-sr-header">
          <span class="pb-sr-title">${isEdit ? 'Edit Exercise' : 'Add Exercise'}</span>
          <button class="pb-sr-close" onclick="pbCancelSetsReps()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="pb-sr-ex">
          <div class="pb-sr-ex-name">${escapeHtml(_sr.exercise.name)}</div>
          <div class="pb-sr-ex-group">${escapeHtml(_sr.exercise.muscleGroup)}</div>
        </div>

        <div class="pb-sr-divider"></div>

        <div class="pb-sr-section">
          <div class="pb-sr-label">Number of Sets</div>
          <div class="pb-counter">
            <button class="pb-cnt-btn" onclick="pbDecrSets()">−</button>
            <span class="pb-cnt-val" id="pbSetsValue">${_sr.sets}</span>
            <button class="pb-cnt-btn" onclick="pbIncrSets()">+</button>
          </div>
        </div>

        <div class="pb-sr-divider"></div>

        <div class="pb-sr-section" id="pbRepSection">
          <div class="pb-sr-label">Target Rep Range</div>
          ${_repSectionHtml()}
        </div>

        <div class="pb-sr-error" id="pbSrError"></div>

        <div class="pb-sr-footer">
          <button class="pb-sr-cancel" onclick="pbCancelSetsReps()">Cancel</button>
          <button class="pb-sr-confirm" onclick="pbConfirmSetsReps()">${isEdit ? 'Save Changes' : 'Add Exercise'}</button>
        </div>
      </div>
    </div>`;
}

// ─── DOM mount/update ─────────────────────────────────────────────────────────

function _mount() {
  document.getElementById('pbOverlay')?.remove();
  document.body.insertAdjacentHTML('beforeend', _builderHtml());
}

function _rerenderAll() {
  const overlay = document.getElementById('pbOverlay');
  if (!overlay) return;
  const pills = document.getElementById('pbDayPills');
  const cards = document.getElementById('pbDayCards');
  if (pills) pills.innerHTML = _dayPillsHtml();
  if (cards) cards.innerHTML = _bs.days.map(_dayCardHtml).join('');
  _bs.days.filter(d => d.expanded).forEach(d => setTimeout(() => _initSortable(d.id), 60));
}

function _rerenderDayCards() {
  const cards = document.getElementById('pbDayCards');
  if (!cards) return;
  cards.innerHTML = _bs.days.map(_dayCardHtml).join('');
  _bs.days.filter(d => d.expanded).forEach(d => setTimeout(() => _initSortable(d.id), 60));
}

function _rerenderExList(dayId) {
  const day = _bs.days.find(d => d.id === dayId);
  if (!day) return;
  const list = document.getElementById(`pbExList_${dayId}`);
  if (list) {
    list.innerHTML = day.exercises.map((ex, i) => _exerciseItemHtml(dayId, ex, i)).join('');
    setTimeout(() => _initSortable(dayId), 60);
  }
  // update empty-state visibility
  const card = document.getElementById(`pbDay_${dayId}`);
  const empty = card?.querySelector('.pb-ex-empty');
  if (empty) empty.style.display = day.exercises.length === 0 ? '' : 'none';
}

function _mountSr() {
  document.getElementById('pbSrBackdrop')?.remove();
  document.body.insertAdjacentHTML('beforeend', _srHtml());
}

function _closeSr() {
  document.getElementById('pbSrBackdrop')?.remove();
  _sr = null;
}
