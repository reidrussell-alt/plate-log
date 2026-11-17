// Progressive overload logic: last performance, next-session suggestion, last note.
// Pure reads of state.history (no DOM). Used by the workout screen and Home.
import { state } from './data.js';
import { formatDate } from './utils.js';

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

  let topRep = exercise.repRangeMax || 10;
  if (exercise.repRange) {
    const m = exercise.repRange.match(/(\d+)-(\d+)/);
    if (m) topRep = parseInt(m[2]);
  }

  const sortedByWeight = [...validSets].sort((a, b) => parseFloat(b.weight || 0) - parseFloat(a.weight || 0));
  const topSet = sortedByWeight[0];

  if (exercise.loadType === 'bw') {
    const bestReps = Math.max(...validSets.map(s => parseInt(s.reps) || 0));
    if (bestReps >= topRep) return { msg: `Try for ${topRep + 1}+ reps`, bump: true, value: `${topRep + 1}+ reps`, why: `You hit ${bestReps} last time` };
    return { msg: `Beat ${bestReps} reps`, value: `${bestReps + 1} reps`, why: `Best last time was ${bestReps}` };
  }

  const lastWeight = parseFloat(topSet.weight);
  const lastTopReps = parseInt(topSet.reps);
  const allHitTop = validSets.every(s => parseInt(s.reps) >= topRep);
  const targetSets = exercise.targetSets || 3;

  if (allHitTop && validSets.length >= targetSets - 1) {
    return { msg: `Go up to ${lastWeight + 5} lb`, bump: true, value: `${lastWeight + 5} lb`, why: `Every set hit ${topRep} last time` };
  }
  return { msg: `Repeat ${lastWeight} lb, beat ${lastTopReps} reps`, value: `${lastWeight} lb`, why: `Beat ${lastTopReps} reps this time` };
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
