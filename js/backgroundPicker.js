// Background picker for the Profile cover: a sheet with Cities / Nature / None tabs and a
// grid of curated photos. Tapping one previews it on the cover; "Use this background" saves
// it to state.profile.background (an id from backgrounds.js, or null for the orange fade).
import { state, saveData } from './data.js';
import { BACKGROUNDS, getBackgroundById, backgroundFullUrl, backgroundThumbUrl } from './backgrounds.js';
import { showToast } from './utils.js';

let _tab = 'cities';
let _picked = null;   // id being previewed, or null for none

function _escape(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Credit line for a photo (the licences ask for one wherever the photo is shown).
export function backgroundCreditHtml(bg) {
  if (!bg) return '';
  return `Photo: <a href="${_escape(bg.page)}" target="_blank" rel="noopener">${_escape(bg.artist || 'Unknown')}</a>,
    <a href="${_escape(bg.licenceUrl || bg.page)}" target="_blank" rel="noopener">${_escape(bg.licence)}</a>, via Wikimedia Commons`;
}

// Puts a background (or the default fade) on the cover that is on screen.
function _applyToCover(id) {
  const cover = document.querySelector('#settingsPage .pf-cover');
  if (!cover) return;
  const bg = getBackgroundById(id);
  cover.classList.toggle('pf-cover--photo', !!bg);
  cover.style.backgroundImage = bg ? `url("${backgroundFullUrl(bg)}")` : '';
}

function _renderSheet() {
  const sheet = document.getElementById('bgPickerSheet');
  if (!sheet) return;
  const tabs = [['cities', 'Cities'], ['nature', 'Nature'], ['none', 'None']];
  const picked = getBackgroundById(_picked);

  let body;
  if (_tab === 'none') {
    body = `<div class="bg-none-note">No photo: the cover shows the soft orange fade.</div>`;
  } else {
    body = `<div class="bg-grid">${BACKGROUNDS.filter(b => b.category === _tab).map(b => `
      <button type="button" class="bg-tile${b.id === _picked ? ' on' : ''}" onclick="selectBackground('${b.id}')" aria-pressed="${b.id === _picked}">
        <span class="bg-tile-img"><img src="${backgroundThumbUrl(b)}" alt="" loading="lazy"></span>
        <span class="bg-tile-name">${_escape(b.label)}</span>
        <span class="bg-tile-sub">${_escape(b.sub)}</span>
      </button>`).join('')}</div>`;
  }

  sheet.innerHTML = `
    <div class="ex-options-name">Background</div>
    <div class="range-selector bg-tabs">
      ${tabs.map(([k, l]) => `<button class="range-btn${_tab === k ? ' active' : ''}" onclick="setBackgroundTab('${k}')">${l}</button>`).join('')}
    </div>
    ${body}
    <div class="bg-credit">${picked ? backgroundCreditHtml(picked) : ''}</div>
    <div class="bg-actions">
      <button class="photo-crop-btn" onclick="closeBackgroundPicker()">Cancel</button>
      <button class="photo-crop-btn photo-crop-btn--primary" onclick="saveBackground()">Use background</button>
    </div>
  `;
}

export function showBackgroundPicker() {
  closeBackgroundPicker(true);
  _picked = state.profile?.background || null;
  const current = getBackgroundById(_picked);
  _tab = current ? current.category : 'cities';

  const backdrop = document.createElement('div');
  backdrop.id = 'bgPickerBackdrop';
  backdrop.className = 'ex-options-backdrop bg-picker-backdrop';
  backdrop.onclick = (e) => { if (e.target === backdrop) closeBackgroundPicker(); };
  backdrop.innerHTML = `<div class="ex-options-sheet bg-sheet" id="bgPickerSheet" role="dialog" aria-label="Background"></div>`;
  document.body.appendChild(backdrop);
  _renderSheet();
}

export function setBackgroundTab(tab) {
  _tab = tab;
  if (tab === 'none') { _picked = null; _applyToCover(null); }
  _renderSheet();
}

export function selectBackground(id) {
  _picked = id;
  _applyToCover(id);
  _renderSheet();
}

// keepCover: true when reopening, so the cover isn't reset in between.
export function closeBackgroundPicker(keepCover = false) {
  const open = document.getElementById('bgPickerBackdrop');
  if (!open) return;
  open.remove();
  if (!keepCover) _applyToCover(state.profile?.background || null);  // undo the preview
}

export function saveBackground() {
  if (!state.profile) return;
  state.profile.background = _picked || null;
  saveData();
  document.getElementById('bgPickerBackdrop')?.remove();
  showToast(_picked ? 'Background updated' : 'Background removed', 'success');
  window.renderSettings();
}
