import { state, saveData, saveCurrentSession } from './data.js';
import { todayDateString, formatDate, showToast, showConfirm } from './utils.js';
import { startRestTimer, stopRestTimer } from './restTimer.js';
import { isHealthKitAvailable, getCachedWeight } from './healthkit.js';
import { openExerciseSelector } from './exerciseSelector.js';
import { getExerciseById } from './exerciseLibrary.js';

let _reorderMode = false;

export function getLastPerformance(exerciseId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const sess = state.history[i];
    const ex = sess.exercises.find(e => e.id === exerciseId);
    if (ex && ex.sets.some(s => s.weight !== '' || s.reps !== '')) {
      return { session: sess, exercise: ex };
    }
  }
  return null;
}

export function getSuggestion(exercise, last = getLastPerformance(exercise.id)) {
  if (!last) return null;
  const validSets = last.exercise.sets.filter(s => s.reps !== '' && (s.weight !== '' || exercise.loadType === 'bw'));
  if (validSets.length === 0) return null;

  let topRep = 10;
  if (exercise.repRange) {
    const m = exercise.repRange.match(/(\d+)-(\d+)/);
    if (m) topRep = parseInt(m[2]);
  }

  const sortedByWeight = [...validSets].sort((a, b) => parseFloat(b.weight || 0) - parseFloat(a.weight || 0));
  const topSet = sortedByWeight[0];

  if (exercise.loadType === 'bw') {
    const bestReps = Math.max(...validSets.map(s => parseInt(s.reps) || 0));
    if (bestReps >= topRep) return { msg: `Try for ${topRep + 1}+ reps` };
    return { msg: `Match ${bestReps} reps` };
  }

  const lastWeight = parseFloat(topSet.weight);
  const lastTopReps = parseInt(topSet.reps);
  const allHitTop = validSets.every(s => parseInt(s.reps) >= topRep);
  const targetSets = exercise.targetSets || 3;

  if (allHitTop && validSets.length >= targetSets - 1) {
    return { msg: `Bump up: ${lastWeight} → ${lastWeight + 5} lb` };
  }
  return { msg: `Last: ${lastWeight} × ${lastTopReps}` };
}

export function getLastSetsString(exerciseId, last = getLastPerformance(exerciseId)) {
  if (!last) return null;
  const dateStr = formatDate(last.session.date);
  const setsStr = last.exercise.sets
    .filter(s => s.reps !== '')
    .map(s => s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)
    .join(' · ');
  return { date: dateStr, sets: setsStr };
}

export function getLastExerciseNote(exerciseId, last = getLastPerformance(exerciseId)) {
  if (!last) return null;
  const { session, exercise: ex } = last;
  if (ex.note) return { date: formatDate(session.date), note: ex.note };
  const setNotes = ex.sets
    .map((s, i) => s.note ? `Set ${i + 1}: ${s.note}` : null)
    .filter(Boolean);
  if (setNotes.length > 0) return { date: formatDate(session.date), note: setNotes.join(' | ') };
  return null;
}

function getLastBw() {
  // Bodyweight isn't entered during a workout any more. Only record it when Apple Health
  // has a reading — copying the last session's value forward would make the Progress
  // bodyweight chart look flat. It can still be set when editing a past workout.
  if (isHealthKitAvailable()) {
    const hw = getCachedWeight();
    if (hw?.value) return Math.round(hw.value).toString();
  }

  return '';
}

export function startSession(dayId) {
  // Resume same session without dialog
  if (state.currentSession && state.currentSession.dayId === dayId) {
    window.switchTab('session');
    return;
  }

  // Conflict: different session already active — confirm before discarding
  if (state.currentSession) {
    showConfirm(
      `Abandon "${state.currentSession.dayTitle}" and start a new workout?`,
      () => _doStartSession(dayId),
      'Start New'
    );
    return;
  }

  _doStartSession(dayId);
}

function _buildStructuredSession(dayId, date) {
  const activeProgram = state.programs.find(p => p.isActive);
  if (!activeProgram) { window.switchTab('myPlans'); return null; }
  const day = activeProgram.days.find(d => d.id === dayId);
  if (!day) return null;
  return {
    programId: activeProgram.id,
    programName: activeProgram.name,
    dayId,
    dayTitle: day.name,
    tag: day.type || 'LIFT',
    bw: getLastBw(),
    date,
    startedAt: new Date().toISOString(),
    isTrackAsYouGo: false,
    exercises: day.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      loadType: ex.loadType,
      repRange: ex.repRange || '',
      targetSets: ex.sets,
      note: '',
      sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '', logged: false, note: '', noteOpen: false }))
    }))
  };
}

function _buildTrackAsYouGoSession(date) {
  const d = new Date(date + 'T12:00:00');
  return {
    programId: null,
    programName: 'Track As You Go',
    dayId: `workout_${Date.now()}`,
    dayTitle: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    tag: 'TRACK',
    bw: getLastBw(),
    date,
    startedAt: new Date().toISOString(),
    isTrackAsYouGo: true,
    exercises: []
  };
}

function _doStartSession(dayId) {
  const session = _buildStructuredSession(dayId, todayDateString());
  if (!session) return;
  state.currentSession = session;
  saveCurrentSession();
  window.switchTab('session');
}

export function startTrackAsYouGoWorkout() {
  if (state.currentSession) {
    showConfirm(
      `Abandon "${state.currentSession.dayTitle}" and start a new workout?`,
      _doStartTrackAsYouGo,
      'Start New'
    );
    return;
  }
  _doStartTrackAsYouGo();
}

function _doStartTrackAsYouGo() {
  state.currentSession = _buildTrackAsYouGoSession(todayDateString());
  saveCurrentSession();
  window.switchTab('session');
}

export function leaveSession() {
  _reorderMode = false;
  stopRestTimer();
  window.switchTab('home');
}

export function startManualEntry(dayId, dateKey) {
  if (state.currentSession) {
    showConfirm(
      `Abandon "${state.currentSession.dayTitle}" and start manual entry?`,
      () => _doStartManualEntry(dayId, dateKey),
      'Start Entry'
    );
    return;
  }
  _doStartManualEntry(dayId, dateKey);
}

function _doStartManualEntry(dayId, dateKey) {
  const session = dayId
    ? _buildStructuredSession(dayId, dateKey)
    : _buildTrackAsYouGoSession(dateKey);
  if (!session) return;
  state.currentSession = session;
  saveCurrentSession();
  window.switchTab('session');
}

export function renderSession() {
  const sess = state.currentSession;
  const el = document.getElementById('sessionPage');
  const metaTag = (sess.tag || 'LIFT').toUpperCase();
  const canReorder = sess.exercises.length >= 2;

  let html = `
    <div class="session-header">
      <div class="session-header-top">
        <div>
          <div class="session-day-name">${sess.dayTitle}</div>
          <div class="session-meta-row">${metaTag} · ${sess.exercises.length} EXERCISE${sess.exercises.length !== 1 ? 'S' : ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${canReorder ? `
            <button class="reorder-toggle-btn${_reorderMode ? ' active' : ''}" onclick="toggleReorderMode()">
              ${_reorderMode ? 'Done' : '⇅'}
            </button>
          ` : ''}
          <button class="back-btn" onclick="leaveSession()">←</button>
        </div>
      </div>
      <div class="bw-input-wrap">
        <span class="bw-label">Workout Date</span>
        <input type="date" class="bw-input" id="sessionDateInput" value="${sess.date}"
               style="width:150px;font-size:12px;" onchange="updateSessionDate(this.value)">
      </div>
      <div class="bw-input-wrap">
        <span class="bw-label">Bodyweight (lb)</span>
        <input type="number" inputmode="decimal" class="bw-input" id="bwInput" value="${sess.bw}"
               placeholder="196" onchange="updateBw(this.value)">
      </div>
    </div>
  `;

  if (_reorderMode) {
    // Simplified drag-and-drop reorder cards
    html += `<div id="exerciseList">`;
    sess.exercises.forEach((ex) => {
      const loggedSets = ex.sets.filter(s => s.logged).length;
      const targetSets = ex.targetSets || ex.sets.length;
      const allLogged = ex.sets.length > 0 && ex.sets.every(s => s.logged);
      html += `
        <div class="exercise-reorder-card${allLogged ? ' complete' : ''}">
          <div class="reorder-handle">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
          </div>
          <div class="reorder-info">
            <div class="reorder-name">${ex.name}</div>
            <div class="reorder-meta">${loggedSets} / ${targetSets} sets logged</div>
          </div>
          ${allLogged ? `
            <div class="reorder-check">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ` : ''}
        </div>
      `;
    });
    html += `</div>`;
  } else {
    // Normal mode — full exercise blocks
    sess.exercises.forEach((ex, exIdx) => {
      const allLogged = ex.sets.every(s => s.logged);
      const last = getLastPerformance(ex.id);
      const suggestion = getSuggestion(ex, last);
      const lastInfo = getLastSetsString(ex.id, last);
      const lastNote = getLastExerciseNote(ex.id, last);
      const targetSets = ex.targetSets || ex.sets.length;
      const pillLabel = ex.repRange ? `${targetSets}×${ex.repRange}` : `${targetSets} sets`;

      html += `
        <div class="exercise-block ${allLogged && ex.sets.length >= targetSets ? 'complete' : ''}">
          <div class="exercise-header">
            <div class="exercise-name">
              <span>${ex.name}</span>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="target-pill">${pillLabel}</span>
                <button onclick="showExerciseOptions(${exIdx})" style="background:transparent;border:none;color:var(--text-dimmer);cursor:pointer;padding:4px 6px;" title="Exercise options">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
              </div>
            </div>
            ${suggestion ? `
              <div class="suggestion">
                <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Suggestion: <strong>${suggestion.msg}</strong></span>
              </div>
            ` : `
              <div class="suggestion" style="background:color-mix(in srgb, var(--accent) 5%, transparent);color:var(--text-dimmer);">
                <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>First time — start at a comfortable weight</span>
              </div>
            `}
            ${lastNote ? `
              <div class="ex-last-note">
                <span class="ex-last-note-label">📝 Last note (${lastNote.date})</span>
                <span class="ex-last-note-text">${lastNote.note}</span>
              </div>
            ` : ''}
          </div>
          <div class="sets-list">
      `;

      ex.sets.forEach((set, setIdx) => {
        const isExtra = setIdx >= targetSets;
        const rowCls = `set-row ${set.logged ? 'logged' : ''} ${ex.loadType === 'bw' ? 'bw-row' : ''} ${isExtra ? 'extra' : ''}`;
        const setNumLabel = isExtra ? `+${setIdx - targetSets + 1}` : (setIdx + 1);
        const noteBtnCls = `icon-btn ${set.note ? 'has-note' : ''}`;

        html += `
          <div class="${rowCls}" data-ex="${exIdx}" data-set="${setIdx}">
            <div class="set-num">${setNumLabel}</div>
            ${ex.loadType === 'bw' ? `
              <div class="set-input-wrap">
                <span class="set-input-label">Reps</span>
                <input type="number" inputmode="numeric" class="set-input" value="${set.reps}" placeholder="—"
                       onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
              </div>
            ` : `
              <div class="set-input-wrap">
                <span class="set-input-label">Lb</span>
                <input type="number" inputmode="decimal" class="set-input" value="${set.weight}" placeholder="—"
                       onchange="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
              </div>
              <div class="set-input-wrap">
                <span class="set-input-label">Reps</span>
                <input type="number" inputmode="numeric" class="set-input" value="${set.reps}" placeholder="—"
                       onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
              </div>
            `}
            <button class="${noteBtnCls} icon-btn--note" onclick="toggleNote(${exIdx}, ${setIdx})" title="Note">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            </button>
            <button class="icon-btn icon-btn--check ${set.logged ? 'logged' : ''}" onclick="toggleSetLogged(${exIdx}, ${setIdx})">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="icon-btn remove-set-btn" onclick="removeSet(${exIdx}, ${setIdx})" title="Remove set">
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          ${(set.noteOpen || set.note) ? `
            <div class="note-row">
              <textarea class="note-input" placeholder="Note for set ${setNumLabel}..."
                        oninput="updateSet(${exIdx}, ${setIdx}, 'note', this.value)"
                        rows="1">${set.note}</textarea>
            </div>
          ` : ''}
        `;
      });

      html += `<button class="add-set-btn" onclick="addSet(${exIdx})">+ Add Set</button>`;

      if (lastInfo) {
        html += `
          <div class="last-time-row">
            <span><strong>Last (${lastInfo.date}):</strong></span>
            <span>${lastInfo.sets}</span>
          </div>
        `;
      }
      html += `
        <div class="ex-note-wrap">
          <textarea class="ex-note-input"
                    placeholder="Notes for next time (technique, soreness, etc.)"
                    oninput="updateExerciseNote(${exIdx}, this.value)"
                    rows="2">${ex.note}</textarea>
        </div>
      </div></div>`;
    });

    html += `<button class="add-exercise-fab" onclick="showExercisePicker()">+ Add Exercise</button>`;

    html += `
      <button class="finish-btn" onclick="finishSession()">Finish & Save Session</button>
      <button class="abandon-link" onclick="abandonSession()">Discard Session</button>
    `;
  }

  el.innerHTML = html;

  if (_reorderMode) {
    _initSortable();
  }
}

export function toggleReorderMode() {
  _reorderMode = !_reorderMode;
  renderSession();
}

function _initSortable() {
  const list = document.getElementById('exerciseList');
  if (!list || typeof Sortable === 'undefined') return;

  new Sortable(list, {
    handle: '.reorder-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex === newIndex) return;
      const moved = state.currentSession.exercises.splice(oldIndex, 1)[0];
      state.currentSession.exercises.splice(newIndex, 0, moved);
      saveCurrentSession();
      // DOM already updated by Sortable — no re-render needed
    }
  });
}

export function updateBw(val) { state.currentSession.bw = val; saveCurrentSession(); }

export function updateSessionDate(val) {
  state.currentSession.date = val || todayDateString();
  saveCurrentSession();
}

export function updateSet(exIdx, setIdx, field, value) {
  state.currentSession.exercises[exIdx].sets[setIdx][field] = value;
  if (field === 'note') return;

  const set = state.currentSession.exercises[exIdx].sets[setIdx];
  const ex = state.currentSession.exercises[exIdx];
  const hasWeight = ex.loadType === 'bw' || (set.weight !== '' && set.weight !== null);
  const hasReps = set.reps !== '' && set.reps !== null;

  if (hasWeight && hasReps && !set.logged) {
    set.logged = true;
    const row = document.querySelector(`.set-row[data-ex="${exIdx}"][data-set="${setIdx}"]`);
    if (row) {
      row.classList.add('logged');
      const checkBtn = row.querySelector('.icon-btn--check');
      if (checkBtn) checkBtn.classList.add('logged');
    }
    startRestTimer(exIdx, setIdx);
  }
  saveCurrentSession();
}

export function toggleNote(exIdx, setIdx) {
  state.currentSession.exercises[exIdx].sets[setIdx].noteOpen ^= true;
  renderSession();
}

export function toggleSetLogged(exIdx, setIdx) {
  const ex = state.currentSession.exercises[exIdx];
  const set = ex.sets[setIdx];
  set.logged ^= true;

  const row = document.querySelector(`.set-row[data-ex="${exIdx}"][data-set="${setIdx}"]`);
  if (!row) { renderSession(); return; }

  row.classList.toggle('logged', set.logged);
  const checkBtn = row.querySelector('.icon-btn--check');
  if (checkBtn) checkBtn.classList.toggle('logged', set.logged);

  const targetSets = ex.targetSets || ex.sets.length;
  const allLogged = ex.sets.every(s => s.logged);
  const block = row.closest('.exercise-block');
  if (block) block.classList.toggle('complete', allLogged && ex.sets.length >= targetSets);

  if (set.logged) startRestTimer(exIdx, setIdx);
  saveCurrentSession();
}

export function addSet(exIdx) {
  state.currentSession.exercises[exIdx].sets.push({ weight: '', reps: '', logged: false, note: '', noteOpen: false });
  saveCurrentSession();
  renderSession();
}

export function removeExercise(exIdx) {
  const ex = state.currentSession.exercises[exIdx];
  const msg = state.currentSession.exercises.length <= 1
    ? `Remove "${ex.name}"? This is the only exercise in this session.`
    : `Remove "${ex.name}" from this session?`;
  showConfirm(msg, () => {
    state.currentSession.exercises.splice(exIdx, 1);
    saveCurrentSession();
    renderSession();
  }, 'Remove');
}

export function showExerciseOptions(exIdx) {
  closeExerciseOptions();
  const ex = state.currentSession.exercises[exIdx];
  const hasStarted = ex.sets.some(s => s.logged);

  const backdrop = document.createElement('div');
  backdrop.id = 'exOptionsBackdrop';
  backdrop.className = 'ex-options-backdrop';
  backdrop.onclick = (e) => { if (e.target === backdrop) closeExerciseOptions(); };

  backdrop.innerHTML = `
    <div class="ex-options-sheet">
      <div class="ex-options-name">${ex.name}</div>
      ${!hasStarted ? `
        <button class="ex-options-btn ex-options-btn--replace" onclick="replaceExercise(${exIdx})">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;flex-shrink:0"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
          Replace Exercise
        </button>
      ` : ''}
      <button class="ex-options-btn ex-options-btn--remove" onclick="closeExerciseOptions(); removeExercise(${exIdx})">
        Remove Exercise
      </button>
      <button class="ex-options-btn ex-options-btn--cancel" onclick="closeExerciseOptions()">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(backdrop);
}

export function closeExerciseOptions() {
  document.getElementById('exOptionsBackdrop')?.remove();
}

export function replaceExercise(exIdx) {
  closeExerciseOptions();
  const ex = state.currentSession.exercises[exIdx];
  const libEx = getExerciseById(ex.id);
  const customEx = !libEx ? (state.customExercises || []).find(e => e.id === ex.id) : null;
  const initialFilter = (libEx || customEx)?.muscleGroup || 'All';

  openExerciseSelector(newEx => {
    state.currentSession.exercises[exIdx] = {
      id: newEx.id,
      name: newEx.name,
      loadType: newEx.loadType,
      repRange: '',
      targetSets: 3,
      note: '',
      sets: Array.from({ length: 3 }, () => ({ weight: '', reps: '', logged: false, note: '', noteOpen: false }))
    };
    saveCurrentSession();
    renderSession();
  }, initialFilter);
}

export function removeSet(exIdx, setIdx) {
  const ex = state.currentSession.exercises[exIdx];
  if (ex.sets.length === 1) {
    showConfirm(
      'You are about to remove the entire exercise from this workout. Are you sure?',
      () => {
        state.currentSession.exercises.splice(exIdx, 1);
        saveCurrentSession();
        renderSession();
      },
      'Remove Exercise'
    );
    return;
  }
  ex.sets.splice(setIdx, 1);
  saveCurrentSession();
  renderSession();
}

export function showExercisePicker() {
  openExerciseSelector(ex => {
    state.currentSession.exercises.push({
      id: ex.id,
      name: ex.name,
      loadType: ex.loadType,
      repRange: '',
      targetSets: 3,
      note: '',
      sets: Array.from({ length: 3 }, () => ({ weight: '', reps: '', logged: false, note: '', noteOpen: false }))
    });
    saveCurrentSession();
    renderSession();
  });
}

export function abandonSession() {
  showConfirm('Discard this session?', () => {
    stopRestTimer();
    state.currentSession = null;
    saveCurrentSession();
    window.switchTab('home');
  }, 'Discard');
}

export function finishSession() {
  const sess = state.currentSession;
  if (sess.exercises.length === 0) { showToast('No exercises added yet'); return; }

  const totalSets = sess.exercises.reduce((s, e) => s + (e.targetSets || e.sets.length), 0);
  const loggedSets = sess.exercises.reduce((s, e) => s + e.sets.filter(set => set.logged).length, 0);

  if (loggedSets === 0) { showToast('No sets logged yet'); return; }

  if (loggedSets < totalSets) {
    document.getElementById('finishModalText').textContent =
      `${loggedSets} of ${totalSets} sets logged. Save anyway?`;
    document.getElementById('finishModal').classList.add('active');
  } else {
    confirmFinishSession();
  }
}

export function confirmFinishSession() {
  closeModal();
  stopRestTimer();
  const sess = state.currentSession;
  const dateStr = sess.date || todayDateString();
  const record = {
    date: new Date(dateStr + 'T12:00:00').toISOString(),
    dayId: sess.dayId,
    dayTitle: sess.dayTitle,
    tag: sess.tag,
    programId: sess.programId || null,
    programName: sess.programName || null,
    bw: sess.bw,
    exercises: sess.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      loadType: ex.loadType,
      repRange: ex.repRange || '',
      note: ex.note || '',
      sets: ex.sets.filter(s => s.logged).map(s => ({
        weight: s.weight,
        reps: s.reps,
        note: s.note || ''
      }))
    })).filter(ex => ex.sets.length > 0)
  };

  state.history.push(record);
  saveData();
  state.currentSession = null;
  saveCurrentSession();
  showToast('Session saved 💪', 'success');
  window.switchTab('progress');
}

export function updateExerciseNote(exIdx, value) {
  state.currentSession.exercises[exIdx].note = value;
  saveCurrentSession();
}

export function closeModal() {
  document.getElementById('finishModal').classList.remove('active');
}
