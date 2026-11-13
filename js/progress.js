import { state, saveData } from './data.js';
import { MUSCLE_GROUPS } from './program.js';
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_META } from './exerciseLibrary.js';
import { formatDate, formatDateShort, isoDateOnly, todayDateString, showToast, showConfirm } from './utils.js';
import { drawSingleLineChart, cssVar } from './charts.js';

const FALLBACK_COLORS = ['#e8572a','#0fa678','#1a8fe0','#7c4dff','#2453ff','#db2777','#e07a14','#0891b2'];

const CHART_RANGES_KEY = 'liftTrackerChartRanges';
const RANGE_OPTIONS = [10, 20, 30, 'all'];

// Populated on every renderProgress call — used by setChartRange and updateMuscleGroupExercise without a full re-render
let _exerciseDataCache = {};
let _muscleGroupStatsCache = {};
let _chartRanges = {};

// Draft state for session edit modal
let _seDraft = null;
let _seIdx = null;

function _loadChartRanges() {
  try {
    const raw = localStorage.getItem(CHART_RANGES_KEY);
    if (raw) _chartRanges = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load chart ranges', e);
  }
}

function _saveChartRanges() {
  try {
    localStorage.setItem(CHART_RANGES_KEY, JSON.stringify(_chartRanges));
  } catch (e) {
    console.warn('Failed to save chart ranges', e);
  }
}

function _getRange(exId) {
  return _chartRanges[exId] ?? 10;
}

function _subtitleText(loadType, visibleCount, totalCount) {
  const metric = loadType === 'bw' ? 'Rep growth' : 'Weight growth';
  if (visibleCount >= totalCount) return `${metric} · all ${totalCount} sessions`;
  return `${metric} · last ${visibleCount} of ${totalCount} sessions`;
}

function dayColor(dayId) {
  const known = { upperA:'#e8572a', lowerA:'#0fa678', upperB:'#1a8fe0', lowerB:'#7c4dff' };  // push, legs, pull, posterior
  if (known[dayId]) return known[dayId];
  let h = 0;
  for (const c of dayId) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

export function navigateCalendar(dir) {
  calendarMonth += dir;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }
  const el = document.getElementById('calendarSection');
  if (el) {
    el.outerHTML = renderCalendar();
  } else {
    renderProgress();
  }
}

function renderCalendar() {
  const today = new Date();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay  = new Date(calendarYear, calendarMonth + 1, 0);
  const startDow = firstDay.getDay();

  const sessionsByDate = {};
  state.history.forEach(sess => {
    const key = sess.date.split('T')[0];
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(sess);
  });

  // Build legend from days that actually appear this month
  const monthLegend = {};
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    (sessionsByDate[key] || []).forEach(s => {
      if (!monthLegend[s.dayId]) {
        monthLegend[s.dayId] = { color: dayColor(s.dayId), label: s.dayTitle || s.dayId };
      }
    });
  }

  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const legendHtml = Object.values(monthLegend).map(({ color, label }) => `
    <span class="cal-legend-item">
      <span class="cal-legend-dot" style="background:${color};"></span>
      <span>${label}</span>
    </span>
  `).join('');

  let html = `
    <div class="chart-card calendar-card" id="calendarSection">
      <div class="calendar-nav">
        <button class="cal-nav-btn" onclick="navigateCalendar(-1)">&#8592;</button>
        <div class="calendar-month-label">${monthLabel}</div>
        <button class="cal-nav-btn" onclick="navigateCalendar(1)">&#8594;</button>
      </div>
      ${legendHtml ? `<div class="calendar-legend">${legendHtml}</div>` : ''}
      <div class="calendar-grid">
        ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
  `;

  for (let i = 0; i < startDow; i++) {
    html += `<div class="cal-day cal-day--empty"></div>`;
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sessions = sessionsByDate[key] || [];
    const isToday = today.getFullYear() === calendarYear &&
                    today.getMonth() === calendarMonth &&
                    today.getDate() === d;

    html += `
      <div class="cal-day${isToday ? ' cal-day--today' : ''}" onclick="openCalendarDay('${key}')">
        <span class="cal-day-num">${d}</span>
        <div class="cal-dots">
          ${sessions.map(s =>
            `<span class="cal-dot" style="background:${dayColor(s.dayId)};" title="${s.dayTitle || s.dayId}"></span>`
          ).join('')}
        </div>
      </div>
    `;
  }

  html += `</div></div>`;
  return html;
}

function _buildChartCardHtml(mg, exercisesInGroup) {
  const meta = MUSCLE_GROUP_META[mg];
  const selectedId = state.chartExerciseByGroup[mg];
  const selectedData = exercisesInGroup[selectedId];
  const trend = analyzeTrend(selectedData);

  const opts = Object.entries(exercisesInGroup)
    .sort((a, b) => b[1].sessions.length - a[1].sessions.length)
    .map(([id, data]) => `<option value="${id}" ${id === selectedId ? 'selected' : ''}>${data.name} (${data.sessions.length})</option>`)
    .join('');

  const range = _getRange(selectedId);
  const visibleCount = range === 'all' ? selectedData.sessions.length : Math.min(range, selectedData.sessions.length);
  const rangeBtns = RANGE_OPTIONS.map(r => `
    <button class="range-btn${range === r ? ' active' : ''}"
            onclick="window.setChartRange('${mg}', '${selectedId}', ${r === 'all' ? "'all'" : r})"
            aria-label="Show last ${r === 'all' ? 'all' : r} workouts">
      ${r === 'all' ? 'All' : r}
    </button>
  `).join('');

  return `
    <div class="chart-card" id="chartCard_${mg}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div class="chart-title">${meta.label}</div>
        <div class="trend-pill ${trend.cls}">${trend.label}</div>
      </div>
      <div class="chart-subtitle" id="chartSubtitle_${mg}">${_subtitleText(selectedData.loadType, visibleCount, selectedData.sessions.length)}</div>
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <select class="chart-select" style="flex:1;margin-bottom:0;" onchange="updateMuscleGroupExercise('${mg}', this.value)">
          ${opts}
        </select>
        <div class="range-selector" id="rangeSelector_${mg}">${rangeBtns}</div>
      </div>
      <div class="chart-canvas-wrap" id="chartWrap_${mg}"><canvas id="chart_${mg}"></canvas></div>
      <div class="chart-legend">
        <span><span class="legend-dot" style="background: ${meta.color};"></span>${selectedData.loadType === 'bw' ? 'Max Reps' : 'Top Weight (lb)'}</span>
      </div>
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border);">
        <div style="font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 10px;">History</div>
        <div class="exercise-history-block" style="margin-bottom: 0; border: 1px solid var(--border);">
          <div class="exercise-history-header" onclick="toggleHistoryBlock(this)">
            <div>
              <div class="ex-history-name">${selectedData.name}</div>
              <div class="ex-history-meta">${trend.summary}</div>
            </div>
            <div style="color: var(--text-dim); font-size: 16px;">▾</div>
          </div>
          <div class="history-detail">
            ${selectedData.sessions.slice().reverse().map(s => `
              <div class="history-session">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div class="history-date" style="margin-bottom: 0;">${formatDate(s.date)} · ${s.dayTitle}</div>
                  <button onclick="event.stopPropagation(); openEditModal(${s.sessionIdx}, ${s.exerciseIdx})"
                          style="background: none; border: 0; color: var(--accent); font-family: var(--font-body); font-size: 13px; font-weight: 600; padding: 4px 0; cursor: pointer;">
                    Edit
                  </button>
                </div>
                <div class="history-sets">
                  ${s.sets.map(set => {
                    if (selectedData.loadType === 'bw') return `<span class="history-set-tag">${set.reps} reps</span>`;
                    return `<span class="history-set-tag">${set.weight}lb × ${set.reps}</span>`;
                  }).join('')}
                </div>
                ${s.sets.filter(set => set.note).map(set => `
                  <div class="history-note">"${set.note}"</div>
                `).join('')}
                ${s.note ? `<div class="history-ex-note">${s.note}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProgress() {
  _loadChartRanges();
  const el = document.getElementById('progressPage');

  if (state.history.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
                <p><strong>No workouts logged yet.</strong><br>Complete a session to see your progress here.</p>
      </div>
      ${renderCalendar()}
    `;
    return;
  }

  const totalSessions = state.history.length;
  const totalSets = state.history.reduce((s, h) =>
    s + h.exercises.reduce((es, ex) => es + ex.sets.length, 0), 0);

  const sessionsByDay = {};
  state.history.forEach(h => {
    if (!sessionsByDay[h.dayId]) sessionsByDay[h.dayId] = { count: 0, title: h.dayTitle || h.dayId };
    sessionsByDay[h.dayId].count++;
  });

  const mostRecent = [...state.history].reverse().find(h => h.bw);
  const currentBw = mostRecent?.bw || '—';

  const exerciseStats = {};
  state.history.forEach((sess, sessionIdx) => {
    sess.exercises.forEach((ex, exerciseIdx) => {
      if (!exerciseStats[ex.id]) {
        exerciseStats[ex.id] = { name: ex.name, loadType: ex.loadType, sessions: [] };
      }
      exerciseStats[ex.id].sessions.push({
        date: sess.date,
        sets: ex.sets,
        note: ex.note || '',
        dayTitle: sess.dayTitle,
        sessionIdx,
        exerciseIdx
      });
    });
  });

  let html = `
    <div class="progress-title">Progress</div>
    <div class="stat-row" aria-label="All time">
      <div class="stat-cell">
        <div class="stat-value">${totalSessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat-cell">
        <div class="stat-value">${totalSets}</div>
        <div class="stat-label">Sets logged</div>
      </div>
      <div class="stat-cell">
        <div class="stat-value">${currentBw}${currentBw !== '—' ? '<span class="stat-unit"> lb</span>' : ''}</div>
        <div class="stat-label">Bodyweight</div>
      </div>
    </div>
  `;

  html += renderCalendar();

  // Cache exercise data for range-change updates without full re-render
  _exerciseDataCache = exerciseStats;

  // Group exercises by muscle group
  const muscleGroupStats = {};
  MUSCLE_GROUP_ORDER.forEach(mg => muscleGroupStats[mg] = {});
  Object.entries(exerciseStats).forEach(([id, data]) => {
    const mg = MUSCLE_GROUPS[id] || 'other';
    if (!muscleGroupStats[mg]) muscleGroupStats[mg] = {};
    muscleGroupStats[mg][id] = data;
  });

  // Default selected exercise per group to most-trained
  MUSCLE_GROUP_ORDER.forEach(mg => {
    const exercisesInGroup = muscleGroupStats[mg] || {};
    const exIds = Object.keys(exercisesInGroup);
    if (exIds.length === 0) return;
    if (!state.chartExerciseByGroup[mg] || !exercisesInGroup[state.chartExerciseByGroup[mg]]) {
      const sorted = Object.entries(exercisesInGroup).sort((a, b) => b[1].sessions.length - a[1].sessions.length);
      state.chartExerciseByGroup[mg] = sorted[0][0];
    }
  });

  // Cache for targeted single-card re-renders (updateMuscleGroupExercise)
  _muscleGroupStatsCache = muscleGroupStats;

  MUSCLE_GROUP_ORDER.forEach(mg => {
    const exercisesInGroup = muscleGroupStats[mg] || {};
    if (Object.keys(exercisesInGroup).length === 0) return;
    html += _buildChartCardHtml(mg, exercisesInGroup);
  });

  html += `
    <div class="chart-card">
      <div class="chart-title">Total Sets Per Session</div>
      <div class="chart-subtitle">All exercises combined</div>
      <div class="chart-canvas-wrap"><canvas id="volumeChart"></canvas></div>
    </div>
  `;

  const bwData = state.history.filter(h => h.bw && parseFloat(h.bw) > 0);
  if (bwData.length > 0) {
    html += `
      <div class="chart-card">
        <div class="chart-title">Bodyweight</div>
        <div class="chart-subtitle">Tracked across sessions</div>
        <div class="chart-canvas-wrap"><canvas id="bwChart"></canvas></div>
      </div>
    `;
  }

  el.innerHTML = html;

  setTimeout(() => {
    MUSCLE_GROUP_ORDER.forEach(mg => {
      const exercisesInGroup = muscleGroupStats[mg] || {};
      const selectedId = state.chartExerciseByGroup[mg];
      if (selectedId && exercisesInGroup[selectedId]) {
        renderMuscleGroupChart(mg, exercisesInGroup[selectedId], _getRange(selectedId));
      }
    });
    renderVolumeChart();
    if (bwData.length > 0) renderBwChart(bwData);
  }, 50);
}

export function updateMuscleGroupExercise(mg, id) {
  state.chartExerciseByGroup[mg] = id;

  const exercisesInGroup = _muscleGroupStatsCache[mg];
  const card = document.getElementById('chartCard_' + mg);

  if (!exercisesInGroup || !exercisesInGroup[id] || !card) {
    renderProgress();
    return;
  }

  card.outerHTML = _buildChartCardHtml(mg, exercisesInGroup);
  _exerciseDataCache[id] = exercisesInGroup[id];

  setTimeout(() => {
    renderMuscleGroupChart(mg, exercisesInGroup[id], _getRange(id));
  }, 50);
}

export function setChartRange(mg, exId, range) {
  _chartRanges[exId] = range;
  _saveChartRanges();

  const exerciseData = _exerciseDataCache[exId];
  if (!exerciseData) return;

  // Update range button active states
  const selector = document.getElementById('rangeSelector_' + mg);
  if (selector) {
    selector.querySelectorAll('.range-btn').forEach(btn => {
      const btnRange = btn.textContent.trim() === 'All' ? 'all' : parseInt(btn.textContent.trim(), 10);
      btn.classList.toggle('active', btnRange === range);
    });
  }

  // Update subtitle
  const visibleCount = range === 'all' ? exerciseData.sessions.length : Math.min(range, exerciseData.sessions.length);
  const subtitle = document.getElementById('chartSubtitle_' + mg);
  if (subtitle) subtitle.textContent = _subtitleText(exerciseData.loadType, visibleCount, exerciseData.sessions.length);

  // Fade canvas out → redraw → fade in
  const wrap = document.getElementById('chartWrap_' + mg);
  if (wrap) {
    wrap.style.opacity = '0';
    setTimeout(() => {
      renderMuscleGroupChart(mg, exerciseData, range);
      wrap.style.opacity = '1';
    }, 150);
  } else {
    renderMuscleGroupChart(mg, exerciseData, range);
  }
}

export function renderMuscleGroupChart(mg, exerciseData, range) {
  if (!exerciseData) return;
  const canvas = document.getElementById('chart_' + mg);
  if (!canvas) return;
  const color = MUSCLE_GROUP_META[mg].color;

  const allPoints = exerciseData.sessions.map(s => {
    const validSets = s.sets.filter(set => set.reps !== '');
    const topWeight = exerciseData.loadType === 'bw'
      ? Math.max(...validSets.map(set => parseInt(set.reps) || 0), 0)
      : Math.max(...validSets.map(set => parseFloat(set.weight) || 0), 0);
    return { date: s.date, topWeight };
  });

  const dataPoints = (range === 'all' || range == null) ? allPoints : allPoints.slice(-range);
  drawSingleLineChart(canvas, dataPoints, 'topWeight', color);
}

export function renderVolumeChart() {
  const canvas = document.getElementById('volumeChart');
  if (!canvas) return;
  const dataPoints = state.history.map(s => ({
    date: s.date,
    sets: s.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  }));
  drawSingleLineChart(canvas, dataPoints, 'sets', cssVar('--accent', '#2453ff'));
}

export function renderBwChart(bwData) {
  const canvas = document.getElementById('bwChart');
  if (!canvas) return;
  const dataPoints = bwData.map(s => ({ date: s.date, bw: parseFloat(s.bw) }));
  drawSingleLineChart(canvas, dataPoints, 'bw', cssVar('--push', '#e8572a'));
}

export function getMostTrainedDay(sessionsByDay) {
  if (!Object.keys(sessionsByDay).length) return '—';
  const best = Object.values(sessionsByDay).reduce((a, b) => b.count > a.count ? b : a);
  return best.count > 0 ? best.title : '—';
}

export function analyzeTrend(exerciseData) {
  const sessions = exerciseData.sessions;
  if (sessions.length < 2) return { label: 'New', cls: 'trend-new', summary: 'First time logged' };

  const first = sessions[0];
  const last = sessions[sessions.length - 1];

  if (exerciseData.loadType === 'bw') {
    const firstReps = Math.max(...first.sets.map(s => parseInt(s.reps) || 0));
    const lastReps = Math.max(...last.sets.map(s => parseInt(s.reps) || 0));
    const diff = lastReps - firstReps;
    if (diff > 0) return { label: `+${diff} reps`, cls: 'trend-up', summary: `${firstReps} → ${lastReps} reps` };
    if (diff < 0) return { label: `${diff} reps`, cls: 'trend-flat', summary: `${firstReps} → ${lastReps} reps` };
    return { label: 'Steady', cls: 'trend-flat', summary: `${lastReps} reps top set` };
  }

  const firstTop = Math.max(...first.sets.map(s => parseFloat(s.weight) || 0));
  const lastTop = Math.max(...last.sets.map(s => parseFloat(s.weight) || 0));
  const diff = lastTop - firstTop;
  if (diff > 0) return { label: `+${diff} lb`, cls: 'trend-up', summary: `${firstTop} → ${lastTop} lb top set` };
  if (diff < 0) return { label: `${diff} lb`, cls: 'trend-flat', summary: `${firstTop} → ${lastTop} lb top set` };
  return { label: 'Steady', cls: 'trend-flat', summary: `${lastTop} lb top set` };
}

export function toggleHistoryBlock(header) {
  header.parentElement.classList.toggle('expanded');
}

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

// ===== CALENDAR DAY INTERACTION =====

export function _liveSessionIdx(dateKey, dayId) {
  return state.history.findIndex(s => s.date.split('T')[0] === dateKey && s.dayId === dayId);
}

export function openCalendarDay(dateKey) {
  const sessionsOnDay = state.history.filter(s => s.date.split('T')[0] === dateKey);

  const d = new Date(dateKey + 'T12:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isFuture = dateKey > todayDateString();

  let html = `
    <div class="cday-header">
      <div class="cday-title">${dateLabel}</div>
      <button class="cday-close" onclick="closeCalendarDay()">✕</button>
    </div>
  `;

  if (sessionsOnDay.length > 0) {
    sessionsOnDay.forEach(sess => {
      const totalSets = sess.exercises.reduce((s, e) => s + e.sets.length, 0);
      html += `
        <div class="cday-session">
          <div class="cday-session-name">${sess.dayTitle}</div>
          <div class="cday-session-meta">
            ${sess.exercises.length} exercise${sess.exercises.length !== 1 ? 's' : ''} ·
            ${totalSets} sets${sess.bw ? ` · ${sess.bw} lb BW` : ''}
          </div>
          <div class="cday-exercises">
            ${sess.exercises.map(ex => {
              const topVal = ex.loadType === 'bw'
                ? `${Math.max(0, ...ex.sets.map(s => parseInt(s.reps) || 0))} reps`
                : `${Math.max(0, ...ex.sets.map(s => parseFloat(s.weight) || 0))} lb`;
              return `
                <div class="cday-ex">
                  <span class="cday-ex-name">${ex.name}</span>
                  <span class="cday-ex-sets">${ex.sets.length}× · top ${topVal}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="cday-actions">
            <button class="modal-btn" onclick="closeCalendarDay(); openSessionEdit(_liveSessionIdx('${dateKey}', '${sess.dayId}'))">Edit</button>
            <button class="modal-btn cday-delete-btn" onclick="deleteSession(_liveSessionIdx('${dateKey}', '${sess.dayId}'))">Delete</button>
          </div>
        </div>
      `;
    });
  } else {
    html += `<div class="cday-empty"><p>No workout logged for this date.</p></div>`;
  }

  if (!isFuture) {
    html += `
      <button class="finish-btn" style="margin-top:8px;" onclick="openManualWorkoutSelect('${dateKey}')">
        + Add Workout
      </button>
    `;
  }

  document.getElementById('calendarDayBody').innerHTML = html;
  document.getElementById('calendarDayModal').classList.add('active');
}

export function closeCalendarDay() {
  document.getElementById('calendarDayModal').classList.remove('active');
}

export function openManualWorkoutSelect(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const isTrackAsYouGo = state.profile?.trainingMode === 'trackAsYouGo';
  const activeProgram = state.programs.find(p => p.isActive);

  let html = `
    <div class="cday-header">
      <div class="cday-title">Add Workout</div>
      <button class="cday-close" onclick="closeCalendarDay()">✕</button>
    </div>
    <div class="cday-sub">${dateLabel}</div>
    <div class="cday-sub-label">Select a workout:</div>
  `;

  if (!isTrackAsYouGo && activeProgram) {
    activeProgram.days.forEach(day => {
      const totalSets = day.exercises.reduce((s, e) => s + e.sets, 0);
      html += `
        <div class="manual-day-card" onclick="closeCalendarDay(); startManualEntry('${day.id}', '${dateKey}')">
          <div class="manual-day-name">${day.name}</div>
          <div class="manual-day-meta">${day.exercises.length} exercises · ${totalSets} sets</div>
        </div>
      `;
    });
  }

  html += `
    <div class="manual-day-card" onclick="closeCalendarDay(); startManualEntry(null, '${dateKey}')">
      <div class="manual-day-name">Track As You Go</div>
      <div class="manual-day-meta">Add exercises as you go</div>
    </div>
    <button class="modal-btn" style="width:100%;margin-top:8px;" onclick="closeCalendarDay()">Cancel</button>
  `;

  document.getElementById('calendarDayBody').innerHTML = html;
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
