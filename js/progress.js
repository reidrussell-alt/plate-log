import { state } from './data.js';
import { MUSCLE_GROUPS } from './program.js';
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_META } from './exerciseLibrary.js';
import { formatDate, readJSON, writeJSON } from './utils.js';
import { drawSingleLineChart, cssVar } from './charts.js';
import { buildProfileChip } from './profilePhoto.js';
import { renderCalendar } from './calendar.js';

const CHART_RANGES_KEY = 'liftTrackerChartRanges';
const RANGE_OPTIONS = [10, 20, 30, 'all'];

// Populated on every renderProgress call — used by setChartRange and updateMuscleGroupExercise without a full re-render
let _exerciseDataCache = {};
let _muscleGroupStatsCache = {};
let _chartRanges = {};

function _loadChartRanges() {
  const stored = readJSON(CHART_RANGES_KEY, undefined);
  if (stored !== undefined) _chartRanges = stored;
}

function _saveChartRanges() {
  writeJSON(CHART_RANGES_KEY, _chartRanges);
}

function _getRange(exId) {
  return _chartRanges[exId] ?? 10;
}

function _subtitleText(loadType, visibleCount, totalCount) {
  const metric = loadType === 'bw' ? 'Rep growth' : 'Weight growth';
  if (visibleCount >= totalCount) return `${metric} · all ${totalCount} sessions`;
  return `${metric} · last ${visibleCount} of ${totalCount} sessions`;
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

// Per exercise id: name, load type and every session it appears in (history order),
// with the indexes the Edit buttons need. Pure: reads only its argument.
export function _collectExerciseStats(history) {
  const exerciseStats = {};
  history.forEach((sess, sessionIdx) => {
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
  return exerciseStats;
}

// Exercise stats keyed by muscle group: every MUSCLE_GROUP_ORDER group (maybe empty),
// plus 'other' (or any unlisted group) when an exercise maps there. Pure.
export function _groupByMuscle(exerciseStats) {
  const muscleGroupStats = {};
  MUSCLE_GROUP_ORDER.forEach(mg => muscleGroupStats[mg] = {});
  Object.entries(exerciseStats).forEach(([id, data]) => {
    const mg = MUSCLE_GROUPS[id] || 'other';
    if (!muscleGroupStats[mg]) muscleGroupStats[mg] = {};
    muscleGroupStats[mg][id] = data;
  });
  return muscleGroupStats;
}

export function renderProgress() {
  _loadChartRanges();
  const el = document.getElementById('progressPage');

  if (state.history.length === 0) {
    el.innerHTML = `
      <div class="me-chip-row">${buildProfileChip()}</div>
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

  const mostRecent = [...state.history].reverse().find(h => h.bw);
  const currentBw = mostRecent?.bw || '—';

  const exerciseStats = _collectExerciseStats(state.history);

  let html = `
    <div class="me-chip-row">${buildProfileChip()}</div>
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

  const muscleGroupStats = _groupByMuscle(exerciseStats);

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
  drawSingleLineChart(canvas, dataPoints, 'sets', cssVar('--accent', '#bd552f'));
}

export function renderBwChart(bwData) {
  const canvas = document.getElementById('bwChart');
  if (!canvas) return;
  const dataPoints = bwData.map(s => ({ date: s.date, bw: parseFloat(s.bw) }));
  drawSingleLineChart(canvas, dataPoints, 'bw', cssVar('--text-secondary', '#3f454b'));
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
