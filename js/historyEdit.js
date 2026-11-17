import { state, saveData } from './data.js';
import { formatDateShort, isoDateOnly, todayDateString, showToast, showConfirm } from './utils.js';
import { renderProgress } from './progress.js';
import { closeCalendarDay } from './calendar.js';

// Draft state for session edit modal
let _seDraft = null;
let _seIdx = null;

export function openEditModal(sessionIdx, exerciseIdx) {
  state.editing = { sessionIdx, exerciseIdx };
  const session = state.history[sessionIdx];
  const exercise = session.exercises[exerciseIdx];
  const dateStr = isoDateOnly(session.date);

  let html = `
    <div class="edit-section">
      <div class="edit-label">Workout Date</div>
      <input type="date" id="editDateInput" value="${dateStr}" class="edit-date-input">
      <div class="edit-helper">Date applies to the whole workout session.</div>
    </div>
    <div class="edit-label" style="margin-bottom: 8px;">${exercise.name}: sets</div>
  `;

  exercise.sets.forEach((set, i) => {
    if (exercise.loadType === 'bw') {
      html += `
        <div class="edit-set-row">
          <div class="edit-set-inputs">
            <div class="edit-set-num">#${i + 1}</div>
            <input type="number" inputmode="numeric" class="edit-reps edit-input" data-idx="${i}" value="${set.reps}" placeholder="reps">
          </div>
          <textarea class="edit-note" data-idx="${i}" placeholder="Note..." rows="1">${set.note || ''}</textarea>
        </div>
      `;
    } else {
      html += `
        <div class="edit-set-row">
          <div class="edit-set-inputs">
            <div class="edit-set-num">#${i + 1}</div>
            <input type="number" inputmode="decimal" class="edit-weight edit-input" data-idx="${i}" value="${set.weight}" placeholder="lb">
            <span class="edit-sep">×</span>
            <input type="number" inputmode="numeric" class="edit-reps edit-input" data-idx="${i}" value="${set.reps}" placeholder="reps">
          </div>
          <textarea class="edit-note" data-idx="${i}" placeholder="Note..." rows="1">${set.note || ''}</textarea>
        </div>
      `;
    }
  });

  document.getElementById('editModalBody').innerHTML = html;
  document.getElementById('editModal').classList.add('active');
}

export function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  state.editing = null;
}

export function saveEdit() {
  if (!state.editing) return;
  const { sessionIdx, exerciseIdx } = state.editing;
  const session = state.history[sessionIdx];
  const exercise = session.exercises[exerciseIdx];

  const newDateStr = document.getElementById('editDateInput').value;
  if (newDateStr) {
    session.date = new Date(newDateStr + 'T12:00:00').toISOString();
  }

  exercise.sets.forEach((set, i) => {
    const weightEl = document.querySelector(`.edit-weight[data-idx="${i}"]`);
    const repsEl = document.querySelector(`.edit-reps[data-idx="${i}"]`);
    const noteEl = document.querySelector(`.edit-note[data-idx="${i}"]`);
    if (weightEl) set.weight = weightEl.value;
    if (repsEl) set.reps = repsEl.value;
    if (noteEl) set.note = noteEl.value;
  });

  saveData();
  closeEditModal();
  showToast('Workout updated', 'success');
  renderProgress();
}

export function deleteEditSession() {
  if (!state.editing) return;
  showConfirm('Delete this exercise from the workout? If it was the only exercise in the session, the whole session will be removed.', () => {
    const { sessionIdx, exerciseIdx } = state.editing;
    const session = state.history[sessionIdx];
    session.exercises.splice(exerciseIdx, 1);
    if (session.exercises.length === 0) {
      state.history.splice(sessionIdx, 1);
    }
    saveData();
    closeEditModal();
    showToast('Deleted');
    renderProgress();
  }, 'Delete');
}

function _renderSessionEditBody() {
  let html = `
    <div class="modal-title" style="text-align:left;">Edit Workout</div>
    <div class="edit-section">
      <div class="edit-label">Date</div>
      <input type="date" id="seDate" class="edit-date-input" value="${isoDateOnly(_seDraft.date)}" max="${todayDateString()}">
      <div class="edit-helper">Changing the date moves this workout on the calendar.</div>
    </div>
    <div class="edit-section">
      <div class="edit-label">Bodyweight (lb)</div>
      <input type="number" inputmode="decimal" id="seBw" class="edit-date-input" value="${_seDraft.bw || ''}" placeholder="—">
    </div>
  `;

  _seDraft.exercises.forEach((ex, exIdx) => {
    html += `
      <div class="edit-section" style="padding-bottom:4px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div class="edit-label" style="margin-bottom:0;">${ex.name}</div>
          <button onclick="sessionEditDeleteExercise(${exIdx})" style="background:transparent;border:none;color:var(--text-dimmer);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;" title="Remove exercise">×</button>
        </div>
    `;
    ex.sets.forEach((set, setIdx) => {
      html += `
        <div class="edit-set-row">
          <div class="edit-set-inputs">
            <div class="edit-set-num">#${setIdx + 1}</div>
            ${ex.loadType === 'bw' ? `
              <input type="number" inputmode="numeric" class="se-reps edit-input"
                     data-ex="${exIdx}" data-set="${setIdx}" value="${set.reps}" placeholder="reps">
            ` : `
              <input type="number" inputmode="decimal" class="se-weight edit-input"
                     data-ex="${exIdx}" data-set="${setIdx}" value="${set.weight}" placeholder="lb">
              <span class="edit-sep">×</span>
              <input type="number" inputmode="numeric" class="se-reps edit-input"
                     data-ex="${exIdx}" data-set="${setIdx}" value="${set.reps}" placeholder="reps">
            `}
            <button onclick="sessionEditDeleteSet(${exIdx}, ${setIdx})" style="background:transparent;border:none;color:var(--text-dimmer);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;flex-shrink:0;" title="Remove set">×</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  document.getElementById('sessionEditBody').innerHTML = html;
}

function _flushDraftInputs() {
  _seDraft.exercises.forEach((ex, exIdx) => {
    ex.sets.forEach((set, setIdx) => {
      const wEl = document.querySelector(`.se-weight[data-ex="${exIdx}"][data-set="${setIdx}"]`);
      const rEl = document.querySelector(`.se-reps[data-ex="${exIdx}"][data-set="${setIdx}"]`);
      if (wEl) set.weight = wEl.value;
      if (rEl) set.reps = rEl.value;
    });
  });
  const dateEl = document.getElementById('seDate');
  const bwEl = document.getElementById('seBw');
  if (dateEl) _seDraft._pendingDate = dateEl.value;
  if (bwEl) _seDraft.bw = bwEl.value || '';
}

export function openSessionEdit(sessionIdx) {
  const session = state.history[sessionIdx];
  if (!session) return;
  _seIdx = sessionIdx;
  _seDraft = JSON.parse(JSON.stringify(session));
  _seDraft._pendingDate = isoDateOnly(session.date);

  const modal = document.getElementById('sessionEditModal');
  _renderSessionEditBody();
  modal.classList.add('active');
}

export function closeSessionEdit() {
  _seDraft = null;
  _seIdx = null;
  document.getElementById('sessionEditModal').classList.remove('active');
}

export function sessionEditDeleteExercise(exIdx) {
  _flushDraftInputs();
  const ex = _seDraft.exercises[exIdx];
  showConfirm(`Remove "${ex.name}" from this workout?`, () => {
    _seDraft.exercises.splice(exIdx, 1);
    _renderSessionEditBody();
  }, 'Remove');
}

export function sessionEditDeleteSet(exIdx, setIdx) {
  _flushDraftInputs();
  const ex = _seDraft.exercises[exIdx];
  if (ex.sets.length <= 1) {
    showConfirm(`Remove the only set of "${ex.name}"? This will remove the exercise entirely.`, () => {
      _seDraft.exercises.splice(exIdx, 1);
      _renderSessionEditBody();
    }, 'Remove');
    return;
  }
  ex.sets.splice(setIdx, 1);
  _renderSessionEditBody();
}

export function saveSessionEdit() {
  if (!_seDraft || _seIdx === null) return;
  _flushDraftInputs();

  const newDate = _seDraft._pendingDate;
  if (newDate) {
    if (newDate > todayDateString()) { showToast('Date cannot be in the future'); return; }
    _seDraft.date = new Date(newDate + 'T12:00:00').toISOString();
  }
  delete _seDraft._pendingDate;

  Object.assign(state.history[_seIdx], _seDraft);

  // Keep history in chronological order after a potential date change
  state.history.sort((a, b) => new Date(a.date) - new Date(b.date));

  saveData();
  closeSessionEdit();
  showToast('Workout updated', 'success');
  renderProgress();
}

export function deleteSession(sessionIdx) {
  const session = state.history[sessionIdx];
  if (!session) return;
  showConfirm(
    `Delete "${session.dayTitle}" on ${formatDateShort(session.date)}? This cannot be undone.`,
    () => {
      state.history.splice(sessionIdx, 1);
      saveData();
      closeCalendarDay();
      showToast('Workout deleted');
      renderProgress();
    },
    'Delete'
  );
}
