import { state } from './data.js';
import { todayDateString } from './utils.js';
import { cssVar } from './charts.js';
import { renderProgress } from './progress.js'; // circular with progress.js; safe, only called inside functions

const FALLBACK_COLORS = ['#9c3587','#0fa678','#1a8fe0','#7c4dff','#687078','#db2777','#0b7f8c','#0891b2'];

function dayColor(dayId) {
  const known = {   // follow the workout-type tokens in main.css
    upperA: cssVar('--push', '#9c3587'), lowerA: cssVar('--legs', '#0fa678'),
    upperB: cssVar('--pull', '#1a8fe0'), lowerB: cssVar('--recovery', '#7c4dff')
  };
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

export function renderCalendar() {
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
