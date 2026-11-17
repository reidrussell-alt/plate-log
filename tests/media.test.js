// Profile photo storage: IndexedDB database "plateLogMedia", store "images", key "avatar".
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// media.js keeps module-level state (open DB, cached URL), so each test loads it fresh.
async function freshMedia({ withIdb }) {
  vi.resetModules();
  if (withIdb) window.indexedDB = new IDBFactory();
  else delete window.indexedDB;
  globalThis.indexedDB = window.indexedDB;
  return import('../js/media.js');
}

beforeEach(() => {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:test/${++n}`);
  URL.revokeObjectURL = vi.fn();
});

describe('with IndexedDB', () => {
  it('save → load round-trip returns an object URL for the stored photo', async () => {
    const media = await freshMedia({ withIdb: true });
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await media.saveAvatar(blob);
    expect(media.getCachedAvatarUrl()).toBe('blob:test/1');

    // A new page load: fresh module, same database
    const idb = window.indexedDB;
    vi.resetModules();
    const reloaded = await import('../js/media.js');
    expect(reloaded.isAvatarLoaded()).toBe(false);
    window.indexedDB = idb;
    const url = await reloaded.loadAvatar();
    expect(url).toMatch(/^blob:test\//);
    expect(reloaded.isAvatarLoaded()).toBe(true);
  });

  it('getAvatarDataUrl returns null when there is no photo', async () => {
    const media = await freshMedia({ withIdb: true });
    expect(await media.getAvatarDataUrl()).toBeNull();
  });

  it('remove clears the stored photo', async () => {
    const media = await freshMedia({ withIdb: true });
    await media.saveAvatar(new Blob(['x'], { type: 'image/jpeg' }));
    await media.removeAvatar();
    expect(media.getCachedAvatarUrl()).toBeNull();
    expect(await media.getAvatarDataUrl()).toBeNull();
  });

  it('loadAvatar with nothing stored gives null and marks loaded', async () => {
    const media = await freshMedia({ withIdb: true });
    expect(await media.loadAvatar()).toBeNull();
    expect(media.isAvatarLoaded()).toBe(true);
  });
});

describe('without IndexedDB (jsdom default)', () => {
  it('loadAvatar resolves to null and warns, never throws', async () => {
    const media = await freshMedia({ withIdb: false });
    expect(await media.loadAvatar()).toBeNull();
    expect(media.isAvatarLoaded()).toBe(true);
    expect(console.warn).toHaveBeenCalled();
  });

  it('getAvatarDataUrl resolves to null', async () => {
    const media = await freshMedia({ withIdb: false });
    expect(await media.getAvatarDataUrl()).toBeNull();
  });
});

describe('restoreAvatarFromDataUrl', () => {
  it('ignores anything that is not a data:image URL', async () => {
    const media = await freshMedia({ withIdb: false });
    media.restoreAvatarFromDataUrl('https://example.com/a.jpg');
    media.restoreAvatarFromDataUrl(42);
    expect(media.getCachedAvatarUrl()).toBeNull();
    expect(media.isAvatarLoaded()).toBe(false);
  });

  it('shows a data:image URL straight away', async () => {
    const media = await freshMedia({ withIdb: false });
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    media.restoreAvatarFromDataUrl('data:image/jpeg;base64,AAAA');
    expect(media.getCachedAvatarUrl()).toBe('data:image/jpeg;base64,AAAA');
    expect(media.isAvatarLoaded()).toBe(true);
  });
});
