import { state, saveData, openResetModal } from './data.js';
import { showToast, showConfirm, showPrompt, escapeHtml, dayTitleBase } from './utils.js';
import { getCachedAvatarUrl, isAvatarLoaded, loadAvatar } from './media.js';
import { getBackgroundById, backgroundFullUrl } from './backgrounds.js';
import { backgroundCreditHtml } from './backgroundPicker.js';
import { buildProfileChip } from './profilePhoto.js';
import { getTimerSettings, setTimerEnabled, setTimerDuration, setTimerAlertEnabled, formatRestDuration } from './restTimer.js';
import { isHealthKitAvailable, getHealthSettings, setHealthEnabled, setReadSteps, setReadWeight, requestHealthPermissions } from './healthkit.js';

// Cover (orange fade for now) with the profile photo centred half over it, then name and a line of facts.
function buildProfileHeader(profile) {
  const name = profile.name && profile.name !== '—' ? profile.name : '';
  const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
  const facts = [];
  if (createdAt) facts.push(`Member since ${createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
  facts.push(profile.trainingMode === 'trackAsYouGo' ? 'Track as you go' : 'Structured plan');

  const photoUrl = getCachedAvatarUrl();
  const initial = name ? escapeHtml(name.trim()[0].toUpperCase()) : '';
  const avatarInner = photoUrl
    ? `<img src="${photoUrl}" alt="">`
    : (initial || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`);

  const bg = getBackgroundById(profile.background);
  return `
    <div class="pf-cover${bg ? ' pf-cover--photo' : ''}"${bg ? ` style="background-image:url('${backgroundFullUrl(bg)}')"` : ''}>
      <button type="button" class="pf-cover-btn" onclick="showBackgroundPicker()" aria-label="Change background">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <div class="me-chip-on-cover">${buildProfileChip()}</div>
    </div>
    <button type="button" class="pf-avatar-wrap" onclick="showProfilePhotoOptions()" aria-label="${photoUrl ? 'Change profile photo' : 'Add a profile photo'}">
      <span class="pf-avatar" id="pfAvatar">${avatarInner}</span>
      <span class="pf-avatar-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </span>
    </button>
    ${name ? `<div class="pf-name">${escapeHtml(name)}</div>` : ''}
    <div class="pf-meta">${facts.join(' · ')}</div>
  `;
}

function buildProfileStatsCard(profile) {
  const history = state.history || [];
  const totalSessions = history.length;

  const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
  const weeksActive = createdAt
    ? Math.max(1, Math.ceil((new Date() - createdAt) / (7 * 24 * 60 * 60 * 1000)))
    : '—';

  // Most frequently logged workout day title
  const titleCounts = {};
  for (const s of history) {
    const key = s.dayTitle || 'Workout';
    titleCounts[key] = (titleCounts[key] || 0) + 1;
  }
  const favDay = Object.keys(titleCounts).sort((a, b) => titleCounts[b] - titleCounts[a])[0];
  const favLabel = favDay ? dayTitleBase(favDay) : '—';

  return `
    <div class="profile-stats-card">
      <div class="profile-stats-grid">
        <div class="profile-stat">
          <div class="profile-stat-value">${totalSessions}</div>
          <div class="profile-stat-label">Sessions</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${weeksActive}</div>
          <div class="profile-stat-label">Weeks Active</div>
        </div>
        <div class="profile-stat profile-stat--wide">
          <div class="profile-stat-value profile-stat-value--sm">${escapeHtml(favLabel)}</div>
          <div class="profile-stat-label">Fav. Workout</div>
        </div>
      </div>
    </div>
  `;
}

// Profile section: name and training mode, each with its button.
function buildProfileSection(profile) {
  const isStructured = profile.trainingMode === 'structured';

  return `
    <div class="settings-section">
      <div class="settings-section-title">Profile</div>
      <div class="settings-row">
        <span class="settings-row-label">Name</span>
        <div class="settings-row-right">
          <span class="settings-row-value" id="profileNameDisplay">${profile.name}</span>
          <button class="settings-edit-btn" onclick="editProfileName()">Edit</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">Mode</span>
        <div class="settings-row-right">
          <span class="settings-row-value">${isStructured ? 'Structured Plan' : 'Track As You Go'}</span>
          <button class="settings-edit-btn" onclick="switchTrainingMode()">Switch</button>
        </div>
      </div>
    </div>
  `;
}

// Workout settings: rest timer on/off, duration and vibrate.
function buildWorkoutSection() {
  const timer = getTimerSettings();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Workout Settings</div>
      <div class="settings-row">
        <span class="settings-row-label">Rest Timer</span>
        <label class="settings-toggle">
          <input type="checkbox" ${timer.enabled ? 'checked' : ''}
                 onchange="window.toggleRestTimer(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div id="restTimerOptions" style="display:${timer.enabled ? '' : 'none'}">
        <div class="settings-row">
          <span class="settings-row-label">Rest Duration</span>
          <div class="timer-duration-wrap">
            <input type="range" class="timer-duration-slider"
                   min="30" max="600" step="15" value="${timer.duration}"
                   oninput="window.onRestDurationChange(this.value)">
            <span class="timer-duration-display" id="restDurationDisplay">${formatRestDuration(timer.duration)}</span>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Vibrate when ready</span>
          <label class="settings-toggle">
            <input type="checkbox" ${timer.alertEnabled ? 'checked' : ''}
                   onchange="window.toggleRestAlert(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;
}

// Apple Health: toggles and connection status ("iOS only" on the web).
function buildHealthSection() {
  const health = getHealthSettings();
  const healthAvailable = isHealthKitAvailable();
  const healthStatusLabel = !healthAvailable
    ? 'iOS only'
    : health.permissionsGranted ? 'Connected' : 'Not connected';
  const healthStatusColor = health.permissionsGranted ? 'var(--success)' : 'var(--text-dim)';

  return `
    <div class="settings-section">
      <div class="settings-section-title">Apple Health</div>
      <div class="settings-row">
        <span class="settings-row-label">Health Integration</span>
        <label class="settings-toggle">
          <input type="checkbox" ${health.enabled ? 'checked' : ''} ${!healthAvailable ? 'disabled' : ''}
                 onchange="window.toggleHealthEnabled(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">Status</span>
        <div class="settings-row-right">
          <span class="settings-row-value" style="color:${healthStatusColor};">${healthStatusLabel}</span>
          ${healthAvailable && !health.permissionsGranted ? `
            <button class="settings-edit-btn" onclick="window.connectHealth()">Connect</button>
          ` : ''}
        </div>
      </div>
      ${health.enabled && healthAvailable ? `
        <div class="settings-row">
          <span class="settings-row-label">Read Steps</span>
          <label class="settings-toggle">
            <input type="checkbox" ${health.readSteps ? 'checked' : ''}
                   onchange="window.toggleHealthSteps(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Read Bodyweight</span>
          <label class="settings-toggle">
            <input type="checkbox" ${health.readWeight ? 'checked' : ''}
                   onchange="window.toggleHealthWeight(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      ` : ''}
      ${!healthAvailable ? `
        <div class="data-helper">Apple Health is only available in the Capacitor iOS app — not the web version.</div>
      ` : ''}
    </div>
  `;
}

// Data: export, import, reset, and the cover photo credit when a photo is set.
function buildDataSection(profile) {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Data</div>
      <div class="data-buttons">
        <button class="data-btn" onclick="exportData()">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button class="data-btn" onclick="document.getElementById('importInput').click()">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </button>
      </div>
      <input type="file" id="importInput" class="file-input-hidden" accept=".json,application/json" onchange="importData(event)">
      <div class="data-helper">Export saves your full history as a backup file. Import restores from a backup.</div>
    </div>
    <div class="reset-section">
      <button class="reset-link" onclick="openResetModal()">↻ Reset All Data</button>
    </div>
    ${getBackgroundById(profile.background) ? `<div class="pf-cover-credit">Cover ${backgroundCreditHtml(getBackgroundById(profile.background)).replace(/^Photo/, 'photo')}</div>` : ''}
  `;
}

export function renderSettings() {
  const el = document.getElementById('settingsPage');
  if (!el) return;

  const profile = state.profile || { name: '—', trainingMode: 'structured' };

  const html = buildProfileHeader(profile) + buildProfileStatsCard(profile)
    + buildProfileSection(profile)
    + buildWorkoutSection()
    + buildHealthSection()
    + buildDataSection(profile);

  el.innerHTML = html;

  // The photo is read from the device the first time; show it once it arrives
  if (!isAvatarLoaded()) loadAvatar().then(url => { if (url) renderSettings(); });
}

export function editProfileName() {
  showPrompt('Enter your name:', state.profile?.name || '', (name) => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Name cannot be empty'); return; }
    if (!state.profile) state.profile = { trainingMode: 'structured', createdAt: new Date().toISOString() };
    state.profile.name = trimmed;
    saveData();
    renderSettings();
    showToast('Name updated', 'success');
  });
}

export function switchTrainingMode() {
  const current = state.profile?.trainingMode || 'structured';
  const next = current === 'structured' ? 'trackAsYouGo' : 'structured';
  const label = next === 'structured' ? 'Structured Plan' : 'Track As You Go';
  showConfirm(`Switch to "${label}" mode?`, () => {
    state.profile.trainingMode = next;
    saveData();
    renderSettings();
    window.renderMyPlans();
    showToast(`Switched to ${label}`, 'success');
  }, 'Switch');
}

export function toggleRestTimer(enabled) {
  setTimerEnabled(enabled);
  const opts = document.getElementById('restTimerOptions');
  if (opts) opts.style.display = enabled ? '' : 'none';
}

export function onRestDurationChange(val) {
  const seconds = parseInt(val, 10);
  setTimerDuration(seconds);
  const display = document.getElementById('restDurationDisplay');
  if (display) display.textContent = formatRestDuration(seconds);
}

export function toggleRestAlert(enabled) {
  setTimerAlertEnabled(enabled);
}

// ── Apple Health handlers ──────────────────────────────────────────────────

export async function connectHealth() {
  const granted = await requestHealthPermissions();
  if (granted) {
    showToast('Apple Health connected', 'success');
  } else {
    showToast('Health permission denied or unavailable');
  }
  renderSettings();
}

export function toggleHealthEnabled(enabled) {
  setHealthEnabled(enabled);
  renderSettings(); // re-render to show/hide sub-options
}

export function toggleHealthSteps(enabled) {
  setReadSteps(enabled);
}

export function toggleHealthWeight(enabled) {
  setReadWeight(enabled);
}
