// Stores the profile photo on the device (IndexedDB), apart from the workout data in
// localStorage, so photos can never fill up the space the workout history needs.
// No DOM here. Callers read the photo with getCachedAvatarUrl() after loadAvatar().

const DB_NAME = 'plateLogMedia';
const STORE = 'images';
const AVATAR_KEY = 'avatar';

let _dbPromise = null;
let _avatarUrl = null;      // object URL or data URL ready for an <img>, or null
let _avatarLoaded = false;

function _openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  _dbPromise.catch(() => { _dbPromise = null; });
  return _dbPromise;
}

async function _tx(mode, fn) {
  const db = await _openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function _setUrl(url) {
  if (_avatarUrl && _avatarUrl.startsWith('blob:')) URL.revokeObjectURL(_avatarUrl);
  _avatarUrl = url;
  _avatarLoaded = true;
}

export function getCachedAvatarUrl() { return _avatarUrl; }
export function isAvatarLoaded() { return _avatarLoaded; }

export async function loadAvatar() {
  if (_avatarLoaded) return _avatarUrl;
  try {
    const blob = await _tx('readonly', s => s.get(AVATAR_KEY));
    _setUrl(blob ? URL.createObjectURL(blob) : null);
  } catch (e) {
    console.warn('Could not load profile photo', e);
    _setUrl(null);
  }
  return _avatarUrl;
}

export async function saveAvatar(blob) {
  await _tx('readwrite', s => s.put(blob, AVATAR_KEY));
  _setUrl(URL.createObjectURL(blob));
}

export async function removeAvatar() {
  try {
    await _tx('readwrite', s => s.delete(AVATAR_KEY));
  } catch (e) {
    console.warn('Could not remove profile photo', e);
  }
  _setUrl(null);
}

// For backups: the photo as a data URL (about 40 KB), or null.
export async function getAvatarDataUrl() {
  try {
    const blob = await _tx('readonly', s => s.get(AVATAR_KEY));
    if (!blob) return null;
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not read profile photo for backup', e);
    return null;
  }
}

// From a backup. Shows straight away (data URLs work in <img>), then saves in the background.
export function restoreAvatarFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return;
  _setUrl(dataUrl);
  fetch(dataUrl)
    .then(r => r.blob())
    .then(blob => _tx('readwrite', s => s.put(blob, AVATAR_KEY)))
    .catch(e => console.warn('Could not save restored profile photo', e));
}
