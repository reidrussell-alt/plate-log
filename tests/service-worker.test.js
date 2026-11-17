// Guards the precache list. If a refactor adds, renames or removes a file,
// service-worker.js must change too, or the installed PWA breaks offline
// (cache.addAll fails the whole install when one path 404s).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const sw = readFileSync(resolve(ROOT, 'service-worker.js'), 'utf8');
const assets = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

describe('service worker', () => {
  it('has a versioned cache name and a separate background cache', () => {
    expect(sw).toMatch(/const CACHE_NAME = 'lift-tracker-v\d+';/);
    expect(sw).toMatch(/const BG_CACHE = 'plate-log-backgrounds-v1';/);
  });

  it('every precached path exists', () => {
    const missing = assets.filter(a => a !== './' && !existsSync(resolve(ROOT, a)));
    expect(missing).toEqual([]);
  });

  it('every js/ module is precached', () => {
    const js = readdirSync(resolve(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `./js/${f}`);
    expect(js.filter(f => !assets.includes(f))).toEqual([]);
  });

  it('precaches the shell, stylesheet, manifest and icons', () => {
    for (const a of ['./', './index.html', './css/main.css', './manifest.json', './icons/apple-touch-icon.png']) {
      expect(assets).toContain(a);
    }
  });
});
