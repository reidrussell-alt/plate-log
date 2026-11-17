import { readJSON, writeJSON } from './utils.js';

const TIMER_SETTINGS_KEY = 'liftTimerSettings';

const settings = {
  enabled: false,
  duration: 120,
  alertEnabled: true
};

const timerState = {
  isActive: false,
  remainingTime: 0,
  duration: 120,
  status: 'RED',
  isPaused: false,
  isExpanded: false,
  startedAt: null,      // Date.now() when timer started or last resumed
  pausedRemaining: null // remaining seconds frozen at the moment of pause
};

let _interval = null;
const CIRC = 2 * Math.PI * 28; // r=28 → ~175.93

function loadTimerSettings() {
  Object.assign(settings, readJSON(TIMER_SETTINGS_KEY, null));
}

function _saveTimerSettings() {
  writeJSON(TIMER_SETTINGS_KEY, settings);
}

export function getTimerSettings() {
  return { ...settings };
}

export function setTimerEnabled(val) {
  settings.enabled = !!val;
  _saveTimerSettings();
  if (!val) stopRestTimer();
  else updatePillVisibility();
}

export function setTimerDuration(seconds) {
  const snapped = Math.round(seconds / 15) * 15;
  settings.duration = Math.max(30, Math.min(600, snapped));
  _saveTimerSettings();
}

export function setTimerAlertEnabled(val) {
  settings.alertEnabled = !!val;
  _saveTimerSettings();
}

function _getStatus(remaining, total) {
  if (remaining > total * 0.34) return 'RED';
  if (remaining > total * 0.10) return 'YELLOW';
  return 'GREEN';
}

export function startRestTimer(exIdx, setIdx) {
  if (!settings.enabled) return;
  clearInterval(_interval);
  _interval = null;
  timerState.isActive = true;
  timerState.duration = settings.duration;
  timerState.remainingTime = settings.duration;
  timerState.status = 'RED';
  timerState.isPaused = false;
  timerState.isExpanded = false;
  timerState.startedAt = Date.now();
  timerState.pausedRemaining = null;

  const pill = document.getElementById('restTimerPill');
  if (pill) pill.classList.remove('expanded');
  const controls = document.getElementById('timerControlsRow');
  if (controls) controls.classList.remove('visible');

  _updateDisplay();
  updatePillVisibility();
  _interval = setInterval(_tick, 1000);
}

export function stopRestTimer() {
  clearInterval(_interval);
  _interval = null;
  timerState.isActive = false;
  timerState.isExpanded = false;
  updatePillVisibility();
}

export function pauseTimer() {
  if (!timerState.isActive) return;
  timerState.isPaused = !timerState.isPaused;
  if (timerState.isPaused) {
    clearInterval(_interval);
    _interval = null;
    // Freeze remaining at the wall-clock computed value
    const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
    timerState.pausedRemaining = Math.max(0, timerState.duration - elapsed);
    timerState.remainingTime = timerState.pausedRemaining;
  } else if (timerState.pausedRemaining > 0) {
    // Shift startedAt forward so elapsed still equals duration - pausedRemaining
    timerState.startedAt = Date.now() - (timerState.duration - timerState.pausedRemaining) * 1000;
    timerState.pausedRemaining = null;
    clearInterval(_interval);
    _interval = setInterval(_tick, 1000);
  }
  _updateDisplay();
}

export function skipTimer() {
  if (!timerState.isActive) return;
  clearInterval(_interval);
  _interval = null;
  timerState.remainingTime = 0;
  timerState.status = 'GREEN';
  timerState.isPaused = false;
  _updateDisplay();
}

export function resetTimer() {
  if (!timerState.isActive) return;
  clearInterval(_interval);
  _interval = null;
  timerState.remainingTime = timerState.duration;
  timerState.startedAt = Date.now();
  timerState.pausedRemaining = null;
  timerState.status = _getStatus(timerState.remainingTime, timerState.duration);
  timerState.isPaused = false;
  _updateDisplay();
  _interval = setInterval(_tick, 1000);
}

export function toggleTimerExpanded() {
  if (!timerState.isActive) return;
  timerState.isExpanded = !timerState.isExpanded;
  const pill = document.getElementById('restTimerPill');
  if (pill) pill.classList.toggle('expanded', timerState.isExpanded);
  const controls = document.getElementById('timerControlsRow');
  if (controls) controls.classList.toggle('visible', timerState.isExpanded);
}

function _tick() {
  if (timerState.isPaused) return;
  const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
  timerState.remainingTime = Math.max(0, timerState.duration - elapsed);
  timerState.status = _getStatus(timerState.remainingTime, timerState.duration);
  if (timerState.remainingTime === 0) {
    clearInterval(_interval);
    _interval = null;
    if (settings.alertEnabled && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  }
  _updateDisplay();
}

export function reconcileTimer() {
  if (!timerState.isActive || timerState.isPaused) return;
  const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
  timerState.remainingTime = Math.max(0, timerState.duration - elapsed);
  timerState.status = _getStatus(timerState.remainingTime, timerState.duration);
  if (timerState.remainingTime === 0) {
    clearInterval(_interval);
    _interval = null;
    if (settings.alertEnabled && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } else if (!_interval) {
    _interval = setInterval(_tick, 1000);
  }
  _updateDisplay();
}


function _updateDisplay() {
  const display = document.getElementById('timerDisplay');
  const progressCircle = document.getElementById('timerProgressCircle');
  const pauseBtn = document.getElementById('timerPauseBtn');
  const pill = document.getElementById('restTimerPill');

  if (!pill || !display) return;

  const { remainingTime, duration, status, isPaused } = timerState;

  display.textContent = isPaused ? '⏸' : (remainingTime === 0 ? 'READY' : formatRestDuration(remainingTime));

  if (progressCircle) {
    const pct = duration > 0 ? remainingTime / duration : 0;
    progressCircle.setAttribute('stroke-dasharray', `${pct * CIRC} ${CIRC}`);
  }

  pill.dataset.status = status;

  if (pauseBtn) {
    if (status === 'GREEN') {
      pauseBtn.style.display = 'none';
    } else {
      pauseBtn.style.display = '';
      pauseBtn.textContent = isPaused ? '▶' : '⏸';
      pauseBtn.title = isPaused ? 'Resume' : 'Pause';
    }
  }
}

export function updatePillVisibility() {
  const pill = document.getElementById('restTimerPill');
  if (!pill) return;
  const sessionActive = document.getElementById('sessionPage')?.classList.contains('active');
  const shouldShow = timerState.isActive && settings.enabled && sessionActive;
  pill.classList.toggle('visible', shouldShow);
  if (!shouldShow) {
    pill.classList.remove('expanded');
    timerState.isExpanded = false;
    const controls = document.getElementById('timerControlsRow');
    if (controls) controls.classList.remove('visible');
  }
}

export function initRestTimer() {
  loadTimerSettings();
  updatePillVisibility();
}

export function formatRestDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
