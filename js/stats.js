// Pure stats and rotation logic used by Home (and My Plans for the next day).
// Reads state; no DOM.
import { state } from './data.js';
import { dayTitleBase } from './utils.js';

// Sunday 00:00 local time of the week containing `date` (a new Date; `date` is
// not changed). Date keys elsewhere still come from toISOString() (BUGS.md M1).
export function _weekStart(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function detectMostRecentPr() {
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

export function calcWeekStreak() {
  let checkStart = _weekStart(new Date());

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

export function getDayType(session) {
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
export function abbreviateTitle(title) {
  return dayTitleBase(title || '').trim();
}

export function abbreviateDay(title) {
  if (!title) return '·';
  const base = dayTitleBase(title).trim();
  return base.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
}

export function getSuggestedDay(program) {
  const sessions = (state.history || []).filter(s => s.programId === program.id);
  if (sessions.length === 0) return program.days[0];
  const last = sessions.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  const lastIdx = program.days.findIndex(d => d.id === last.dayId);
  if (lastIdx === -1) return program.days[0];
  return program.days[(lastIdx + 1) % program.days.length];
}
