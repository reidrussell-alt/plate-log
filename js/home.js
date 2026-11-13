import { state } from './data.js';
import { getSuggestion, getLastPerformance } from './session.js';

export function renderHome() {
  const el = document.getElementById('homePage');
  if (!el) return;

  const streak = calcWeekStreak();
  const activeProgram = (state.programs || []).find(p => p.isActive);

  const today = new Date();
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);
  const sessionsThisWeek = (state.history || []).filter(s => new Date(s.date) >= weekStart).length;

  const suggestedDay = activeProgram ? getSuggestedDay(activeProgram) : null;

  el.innerHTML = `
    ${buildHeader(streak)}
    <button class="home-start-btn" onclick="window.homeStartWorkout()">
      ${suggestedDay && state.profile?.trainingMode === 'structured' ? `Start ${abbreviateTitle(suggestedDay.name)}` : 'Start workout'}
    </button>
    ${buildStartMeta(suggestedDay)}
    ${buildSplitProgress(activeProgram, suggestedDay, sessionsThisWeek, streak)}
    <div class="home-section-label">Lately</div>
    <div class="home-momentum-row">
      ${buildPrCard()}
      ${buildCoachingCard(activeProgram, suggestedDay)}
    </div>
    ${buildYesterdayCard()}
    ${buildStatFooter()}
  `;
}

// ─── Header ───────────────────────────────────────────────────────────────────

function buildHeader(streak) {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  const badgeClass = streak > 0 ? 'home-streak-badge' : 'home-streak-badge home-streak-badge--empty';
  const streakBadge = streak > 0
    ? `<div class="${badgeClass}"><strong>${streak}</strong>${streak === 1 ? 'week' : 'weeks'} in a row</div>`
    : '';

  return `
    <div class="home-header">
      <div class="home-header-left">
        <div class="home-day-label">${date}</div>
        <div class="home-greeting">${weekday}</div>
      </div>
      ${streakBadge}
    </div>
  `;
}

// ─── Start meta (plain line under the Start button) ──────────────────────────

function buildStartMeta(suggestedDay) {
  const parts = [];
  if (suggestedDay) {
    const totalSets = suggestedDay.exercises.reduce((s, e) => s + (e.sets || 0), 0);
    const estMin = Math.max(20, Math.round(totalSets * 2.5 / 5) * 5);
    parts.push(`${suggestedDay.exercises.length} exercises`, `about ${estMin} min`);
  }
  const history = state.history || [];
  if (history.length > 0) {
    const last = history.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
    const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(last.date))) / 86400000);
    parts.push(days <= 0 ? 'trained today' : days === 1 ? 'last trained yesterday' : `last trained ${days} days ago`);
  }
  return parts.length ? `<div class="home-start-meta">${parts.join(' · ')}</div>` : '';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ─── Split Progress ───────────────────────────────────────────────────────────

function buildSplitProgress(activeProgram, suggestedDay, sessionsThisWeek, streak) {
  const today = new Date();
  const dow = today.getDay();

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);

  const byDay = {};
  for (const s of (state.history || [])) {
    const d = new Date(s.date);
    if (d >= weekStart) {
      const idx = d.getDay();
      if (!byDay[idx] || new Date(s.date) > new Date(byDay[idx].date)) byDay[idx] = s;
    }
  }

  const suggested = suggestedDay || null;
  const totalDays = activeProgram ? activeProgram.days.length : 0;

  const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const typesThisWeek = new Set();
  let cells = '';

  for (let i = 0; i < 7; i++) {
    const session = byDay[i];
    const isToday = i === dow;
    const isPast = i < dow;

    const dateObj = new Date(weekStart);
    dateObj.setDate(weekStart.getDate() + i);
    const iso = dateObj.toISOString().split('T')[0];

    let badgeHtml;
    if (session) {
      const type = getDayType(session);
      typesThisWeek.add(type);
      const label = abbreviateDay(session.dayTitle);
      badgeHtml = `<div class="home-week-badge home-week-badge--${type}" onclick="window.openCalendarDay('${iso}')">${label}</div>`;
    } else if (isToday) {
      const todayLabel = suggested ? abbreviateDay(suggested.name) : '·';
      badgeHtml = `<div class="home-week-badge home-week-badge--today">${todayLabel}</div>`;
    } else if (isPast) {
      badgeHtml = `<div class="home-week-badge home-week-badge--skipped"></div>`;
    } else {
      badgeHtml = `<div class="home-week-badge home-week-badge--future"></div>`;
    }

    cells += `
      <div class="home-week-cell">
        <div class="home-week-dow${isToday ? ' home-week-dow--today' : ''}">${DOW_LABELS[i]}</div>
        ${badgeHtml}
      </div>
    `;
  }

  const TYPE_LABELS = { push: 'Push', pull: 'Pull', legs: 'Legs', recovery: 'Recovery', default: 'Workout' };
  let legendHtml = '';
  if (typesThisWeek.size > 0) {
    const items = [...typesThisWeek].map(t =>
      `<div class="home-legend-item">
        <span class="home-legend-dot home-legend-dot--${t}"></span>
        <span>${TYPE_LABELS[t] || t}</span>
      </div>`
    ).join('');
    legendHtml = `<div class="home-week-legend">${items}</div>`;
  }

  let statusHtml = '';
  if (totalDays > 0) {
    const statusText = `${Math.min(sessionsThisWeek, totalDays)} of ${totalDays} done`;
    statusHtml = `<span class="home-split-status">${statusText}</span>`;
  }

  return `
    <div class="home-split-card">
      <div class="home-split-header">
        <span class="home-split-label">This week</span>
        ${statusHtml}
      </div>
      <div class="home-week-grid">${cells}</div>
      ${legendHtml}
    </div>
  `;
}

// ─── Momentum — PR Card ──────────────────────────────────────────────

function detectMostRecentPr() {
  const history = state.history || [];
  if (history.length < 2) return null;

  const runningMax = {}; // exerciseId → best value seen so far
  let mostRecentPr = null;

  for (const sess of history) {
    for (const ex of sess.exercises) {
      if (!ex.sets || ex.sets.length === 0) continue;

      const sessionBest = ex.loadType === 'bw'
        ? Math.max(0, ...ex.sets.map(s => parseInt(s.reps) || 0))
        : Math.max(0, ...ex.sets.map(s => parseFloat(s.weight) || 0));

      if (sessionBest <= 0) continue;

      const prev = runningMax[ex.id] ?? 0;
      if (sessionBest > prev) {
        runningMax[ex.id] = sessionBest;
        mostRecentPr = {
          name: ex.name,
          value: sessionBest,
          loadType: ex.loadType,
          date: sess.date,
          prev: prev > 0 ? prev : null
        };
      }
    }
  }

  return mostRecentPr;
}

function buildPrCard() {
  const pr = detectMostRecentPr();
  const prSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0;">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
    </svg>`;

  if (!pr) {
    return `
      <div class="home-momentum-card home-momentum-card--warm">
        <div class="home-momentum-tag">${prSvg} Personal best</div>
        <div class="home-momentum-name home-momentum-empty">Shows up after a few sessions</div>
      </div>
    `;
  }

  const valueLabel = pr.loadType === 'bw' ? `${pr.value} reps` : `${pr.value} lb`;
  const prevLabel = pr.prev ? (pr.loadType === 'bw' ? `${pr.prev} reps` : `${pr.prev} lb`) : null;
  const deltaLabel = prevLabel
    ? `<div class="home-momentum-delta">Up from ${prevLabel}</div>`
    : `<div class="home-momentum-delta">First time logged</div>`;

  return `
    <div class="home-momentum-card home-momentum-card--warm">
      <div class="home-momentum-tag">${prSvg} Personal best</div>
      <div class="home-momentum-name">${pr.name}</div>
      <div class="home-momentum-value">${valueLabel}</div>
      ${deltaLabel}
    </div>
  `;
}

// ─── Momentum — Coaching Card ─────────────────────────────────────────────────

function buildCoachingCard(activeProgram, suggestedDay) {
  let exerciseName = null;
  let suggestionMsg = null;

  if (activeProgram && suggestedDay) {
    for (const ex of suggestedDay.exercises) {
      const last = getLastPerformance(ex.id);
      const s = getSuggestion(ex, last);
      if (s) {
        if (!exerciseName || s.bump) {
          exerciseName = ex.name;
          suggestionMsg = s.msg;
          if (s.bump) break;
        }
      }
    }
  }

  const content = exerciseName
    ? `<div class="home-momentum-name">${exerciseName}</div>
       <div class="home-momentum-value">${suggestionMsg}</div>`
    : `<div class="home-momentum-name home-momentum-empty">Stick with current weights</div>`;

  return `
    <div class="home-momentum-card home-momentum-card--cool">
      <div class="home-momentum-tag home-momentum-tag--cool">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;flex-shrink:0;">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
        Next session
      </div>
      ${content}
    </div>
  `;
}

// ─── Yesterday Card ───────────────────────────────────────────────────────────

function buildYesterdayCard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().split('T')[0];

  const session = (state.history || []).find(s => s.date.startsWith(yesterdayIso));
  if (!session) return '';

  let volume = 0;
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (set.weight && set.reps) volume += parseFloat(set.weight) * parseInt(set.reps);
    }
  }
  const volumeLabel = volume > 0 ? ` · ${Math.round(volume).toLocaleString()} lb moved` : '';

  return `
    <div class="home-yesterday-card" onclick="window.homeOpenYesterday('${yesterdayIso}')">
      <div>
        <div class="home-yesterday-label">Yesterday</div>
        <div class="home-yesterday-summary">${session.dayTitle}${volumeLabel}</div>
      </div>
      <div class="home-yesterday-chevron">›</div>
    </div>
  `;
}

// ─── Stat Footer ─────────────────────────────────────────────────────────────

function buildStatFooter() {
  const total = (state.history || []).length;
  if (total === 0) return '';
  const label = total === 1 ? '1 session total' : `${total} sessions total`;
  return `<div class="home-stat-footer">${label}</div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcWeekStreak() {
  let checkStart = new Date();
  checkStart.setDate(checkStart.getDate() - checkStart.getDay());
  checkStart.setHours(0, 0, 0, 0);

  const MAX_STREAK_WEEKS = 260; // 5-year cap prevents infinite loop on corrupted dates
  let streak = 0;
  while (streak < MAX_STREAK_WEEKS) {
    const checkEnd = new Date(checkStart);
    checkEnd.setDate(checkStart.getDate() + 7);
    const hasSession = (state.history || []).some(s => {
      const d = new Date(s.date);
      return d >= checkStart && d < checkEnd;
    });
    if (!hasSession) break;
    streak++;
    checkStart.setDate(checkStart.getDate() - 7);
  }
  return streak;
}

function getDayType(session) {
  for (const prog of (state.programs || [])) {
    const day = prog.days?.find(d => d.id === session.dayId);
    if (day?.type) return day.type;
  }
  const title = (session.dayTitle || '').toLowerCase();
  if (title.includes('push') || (title.includes('upper') && title.includes('a'))) return 'push';
  if (title.includes('pull') || (title.includes('upper') && title.includes('b'))) return 'pull';
  if (title.includes('leg') || title.includes('lower')) return 'legs';
  return 'default';
}

// "Upper A - Push" → "Upper A"
function abbreviateTitle(title) {
  return (title || '').split(' - ')[0].trim();
}

function abbreviateDay(title) {
  if (!title) return '·';
  const base = title.split(' - ')[0].trim();
  return base.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
}

function getSuggestedDay(program) {
  const sessions = (state.history || []).filter(s => s.programId === program.id);
  if (sessions.length === 0) return program.days[0];
  const last = sessions.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  const lastIdx = program.days.findIndex(d => d.id === last.dayId);
  if (lastIdx === -1) return program.days[0];
  return program.days[(lastIdx + 1) % program.days.length];
}

// ─── Start Workout Sheet ──────────────────────────────────────────────────────

export function homeStartWorkout() {
  const profile = state.profile;
  if (!profile || profile.trainingMode !== 'structured') {
    window.startTrackAsYouGoWorkout();
    return;
  }
  const activeProgram = (state.programs || []).find(p => p.isActive);
  if (!activeProgram) {
    window.switchTab('myPlans');
    return;
  }
  showStartSheet(activeProgram);
}

function showStartSheet(program) {
  // calendarDayModal is a shared general-purpose bottom sheet used by both home and progress
  const modal = document.getElementById('calendarDayModal');
  const body = document.getElementById('calendarDayBody');
  const suggested = getSuggestedDay(program);

  let html = `
    <div class="cday-header">
      <div class="cday-title">Start Workout</div>
      <button class="cday-close" onclick="window.closeCalendarDay()">×</button>
    </div>
    <div class="start-sheet-label">Next Up</div>
    <div class="manual-day-card start-suggested-card" onclick="window.closeCalendarDay(); window.startSession('${suggested.id}')">
      <div class="start-suggested-inner">
        <div>
          <div class="manual-day-name">${suggested.name}</div>
          <div class="manual-day-meta">${suggested.exercises.length} exercises · ${suggested.exercises.reduce((s, e) => s + e.sets, 0)} sets</div>
        </div>
        <div class="start-suggested-arrow">→</div>
      </div>
    </div>
  `;

  const others = program.days.filter(d => d.id !== suggested.id);
  if (others.length > 0) {
    html += `<div class="start-sheet-label start-sheet-label--dim">Or choose a different day</div>`;
    others.forEach(d => {
      const totalSets = d.exercises.reduce((s, e) => s + e.sets, 0);
      html += `
        <div class="manual-day-card" onclick="window.closeCalendarDay(); window.startSession('${d.id}')">
          <div class="manual-day-name">${d.name}</div>
          <div class="manual-day-meta">${d.exercises.length} exercises · ${totalSets} sets</div>
        </div>
      `;
    });
  }

  body.innerHTML = html;
  modal.classList.add('active');
}

export function homeOpenYesterday(dateIso) {
  window.switchTab('progress');
  requestAnimationFrame(() => requestAnimationFrame(() => window.openCalendarDay(dateIso)));
}
