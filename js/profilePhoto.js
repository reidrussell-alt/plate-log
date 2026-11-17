// Profile photo: the options sheet (take / choose / remove), a simple crop step
// (drag and zoom inside a circle), and saving a 400×400 JPEG via media.js.
import { showToast, showConfirm, escapeHtml } from './utils.js';
import { getCachedAvatarUrl, isAvatarLoaded, loadAvatar, saveAvatar, removeAvatar } from './media.js';
import { state } from './data.js';

// Profile chip: the user's name and a small round photo in the top right of
// Home, My Plans, Progress and Profile (design-reference pattern 5). Tapping it
// opens the Profile tab. Shows the name's initial until a photo is set.
function _chipPhotoInner() {
  const url = getCachedAvatarUrl();
  if (url) return `<img src="${url}" alt="">`;
  const name = (state.profile?.name || '').trim();
  return name && name !== '—' ? escapeHtml(name[0].toUpperCase()) : '';
}

export function buildProfileChip() {
  const raw = (state.profile?.name || '').trim();
  const name = raw && raw !== '—' ? raw : '';
  // The photo is read from the device the first time; fill the chips once it arrives
  if (!isAvatarLoaded()) {
    loadAvatar().then(url => {
      if (!url) return;
      document.querySelectorAll('.me-chip-photo').forEach(el => { el.innerHTML = _chipPhotoInner(); });
    });
  }
  return `
    <button type="button" class="me-chip" onclick="window.switchTab('profile')" aria-label="Open your profile">
      ${name ? `<span class="me-chip-name">${escapeHtml(name)}</span>` : ''}
      <span class="me-chip-photo" aria-hidden="true">${_chipPhotoInner()}</span>
    </button>
  `;
}

const OUTPUT_SIZE = 400;   // pixels, square
const CROP_SIZE = 280;     // on-screen crop circle, CSS pixels

let _crop = null;  // { img, url, scale, minScale, x, y } while the crop step is open

export function showProfilePhotoOptions() {
  closeProfilePhotoOptions();
  const hasPhoto = !!getCachedAvatarUrl();
  const backdrop = document.createElement('div');
  backdrop.id = 'photoOptionsBackdrop';
  backdrop.className = 'ex-options-backdrop';
  backdrop.onclick = (e) => { if (e.target === backdrop) closeProfilePhotoOptions(); };
  backdrop.innerHTML = `
    <div class="ex-options-sheet" role="dialog" aria-label="Profile photo">
      <div class="ex-options-name">Profile photo</div>
      <button class="ex-options-btn ex-options-btn--replace" onclick="pickProfilePhoto('camera')">Take photo</button>
      <button class="ex-options-btn ex-options-btn--replace" onclick="pickProfilePhoto('library')">Choose from library</button>
      ${hasPhoto ? `<button class="ex-options-btn ex-options-btn--remove" onclick="removeProfilePhoto()">Remove photo</button>` : ''}
      <button class="ex-options-btn ex-options-btn--cancel" onclick="closeProfilePhotoOptions()">Cancel</button>
    </div>
  `;
  document.body.appendChild(backdrop);
}

export function closeProfilePhotoOptions() {
  document.getElementById('photoOptionsBackdrop')?.remove();
}

// mode: 'camera' opens the front camera; 'library' opens the photo picker.
// The input is created inside the tap so iOS treats it as the user's action.
export function pickProfilePhoto(mode) {
  closeProfilePhotoOptions();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (mode === 'camera') input.setAttribute('capture', 'user');
  input.className = 'file-input-hidden';
  input.onchange = () => {
    const file = input.files?.[0];
    input.remove();
    if (file) _openCrop(file);
  };
  document.body.appendChild(input);
  input.click();
}

export function removeProfilePhoto() {
  closeProfilePhotoOptions();
  showConfirm('Remove your profile photo?', async () => {
    await removeAvatar();
    window.renderSettings();
  }, 'Remove');
}

// ─── Crop step ────────────────────────────────────────────────────────────────

function _openCrop(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const minScale = CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
    _crop = { img, url, minScale, scale: minScale, x: 0, y: 0 };
    _renderCrop();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Could not open that photo');
  };
  img.src = url;
}

function _renderCrop() {
  document.getElementById('photoCrop')?.remove();
  const el = document.createElement('div');
  el.id = 'photoCrop';
  el.className = 'photo-crop';
  el.innerHTML = `
    <div class="photo-crop-title">Move and zoom</div>
    <div class="photo-crop-frame" id="photoCropFrame" style="width:${CROP_SIZE}px;height:${CROP_SIZE}px">
      <img id="photoCropImg" src="${_crop.url}" alt="" draggable="false">
    </div>
    <input type="range" class="photo-crop-zoom" min="1" max="4" step="0.01" value="1"
           aria-label="Zoom" oninput="zoomPhotoCrop(this.value)">
    <div class="photo-crop-actions">
      <button class="photo-crop-btn" onclick="cancelPhotoCrop()">Cancel</button>
      <button class="photo-crop-btn photo-crop-btn--primary" onclick="confirmPhotoCrop()">Use photo</button>
    </div>
  `;
  document.body.appendChild(el);
  _applyCrop();
  _bindDrag(document.getElementById('photoCropFrame'));
}

// Keeps the photo covering the whole circle.
function _clamp() {
  const w = _crop.img.naturalWidth * _crop.scale;
  const h = _crop.img.naturalHeight * _crop.scale;
  const maxX = (w - CROP_SIZE) / 2;
  const maxY = (h - CROP_SIZE) / 2;
  _crop.x = Math.max(-maxX, Math.min(maxX, _crop.x));
  _crop.y = Math.max(-maxY, Math.min(maxY, _crop.y));
}

function _applyCrop() {
  _clamp();
  const imgEl = document.getElementById('photoCropImg');
  if (!imgEl) return;
  const w = _crop.img.naturalWidth * _crop.scale;
  const h = _crop.img.naturalHeight * _crop.scale;
  imgEl.style.width = `${w}px`;
  imgEl.style.height = `${h}px`;
  imgEl.style.transform = `translate(${(CROP_SIZE - w) / 2 + _crop.x}px, ${(CROP_SIZE - h) / 2 + _crop.y}px)`;
}

function _bindDrag(frame) {
  let start = null;
  frame.addEventListener('pointerdown', (e) => {
    start = { px: e.clientX, py: e.clientY, x: _crop.x, y: _crop.y };
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener('pointermove', (e) => {
    if (!start) return;
    _crop.x = start.x + (e.clientX - start.px);
    _crop.y = start.y + (e.clientY - start.py);
    _applyCrop();
  });
  const end = () => { start = null; };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
}

export function zoomPhotoCrop(value) {
  if (!_crop) return;
  const prev = _crop.scale;
  _crop.scale = _crop.minScale * parseFloat(value);
  // Zoom around the centre of the circle
  _crop.x *= _crop.scale / prev;
  _crop.y *= _crop.scale / prev;
  _applyCrop();
}

export function cancelPhotoCrop() {
  if (_crop) URL.revokeObjectURL(_crop.url);
  _crop = null;
  document.getElementById('photoCrop')?.remove();
}

export function confirmPhotoCrop() {
  if (!_crop) return;
  const { img, scale, x, y } = _crop;
  // The part of the original photo inside the circle, in the photo's own pixels
  const side = CROP_SIZE / scale;
  const sx = img.naturalWidth / 2 - x / scale - side / 2;
  const sy = img.naturalHeight / 2 - y / scale - side / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  canvas.toBlob(async (blob) => {
    cancelPhotoCrop();
    if (!blob) { showToast('Could not save that photo'); return; }
    try {
      await saveAvatar(blob);
      showToast('Profile photo updated', 'success');
    } catch (e) {
      console.warn('Profile photo save failed', e);
      showToast('Could not save that photo');
    }
    window.renderSettings();
  }, 'image/jpeg', 0.85);
}
