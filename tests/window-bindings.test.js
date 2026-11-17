// Static check of the window-binding pattern (CLAUDE.md "Critical architecture
// pattern"). Inline onclick/oninput/onchange strings in js/*.js and index.html
// reach functions only by name through `window`, so a rename or move that misses
// a binding in app.js fails silently until the button is tapped. This reads the
// source text; it does not run the app.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = rel => readFileSync(resolve(ROOT, rel), 'utf8');
const jsFiles = readdirSync(resolve(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const sources = Object.fromEntries([...jsFiles, 'index.html'].map(f => [f, read(f)]));

// Every function called from an inline handler: `name(` or `window.name(`, but not
// methods such as `event.stopPropagation(` or `document.getElementById(`.
// `${...}` template expressions are blanked first so their contents aren't counted.
function inlineCallers() {
  const callers = new Map(); // name → Set of files
  for (const [file, src] of Object.entries(sources)) {
    for (const [, code] of src.matchAll(/\bon[a-z]+="([^"]*)"/g)) {
      const plain = code.replace(/\$\{[^}]*\}/g, '0');
      for (const [, name] of plain.matchAll(/(?<![\w$.])(?:window\.)?([A-Za-z_$][\w$]*)\s*\(/g)) {
        if (name === 'if') continue;
        if (!callers.has(name)) callers.set(name, new Set());
        callers.get(name).add(file);
      }
    }
  }
  return callers;
}

const BINDING = /^window\.([\w$]+)\s*=/gm;
const bindings = new Set([...sources['js/app.js'].matchAll(BINDING)].map(m => m[1]));

// Names reached in JS code as `window.name` (cross-module calls such as
// window.switchTab), ignoring the binding lines themselves.
function windowReferences() {
  const refs = new Set();
  for (const file of jsFiles) {
    const src = sources[file].replace(/^window\.[\w$]+\s*=.*$/gm, '');
    for (const [, name] of src.matchAll(/window\.([\w$]+)/g)) refs.add(name);
  }
  return refs;
}

describe('window bindings', () => {
  const callers = inlineCallers();

  it('finds the inline handlers (sanity check on the parser)', () => {
    expect(callers.size).toBeGreaterThan(100);
    expect(bindings.size).toBeGreaterThan(100);
    expect(callers.get('switchTab')).toContain('index.html');
    expect(callers.get('setChartRange')).toContain('js/progress.js');
    expect(callers.has('stopPropagation')).toBe(false);
    expect(callers.has('getElementById')).toBe(false);
  });

  it('every function called from an inline handler has a window binding in app.js', () => {
    const missing = [...callers.entries()]
      .filter(([name]) => !bindings.has(name))
      .map(([name, files]) => `${name} (called in ${[...files].join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('window bindings are only made in app.js', () => {
    const elsewhere = jsFiles
      .filter(f => f !== 'js/app.js')
      .flatMap(f => [...sources[f].matchAll(BINDING)].map(m => `${f}: window.${m[1]}`));
    expect(elsewhere).toEqual([]);
  });

  // The reverse direction. A binding is "used" if an inline handler calls it or JS
  // code reaches it as window.name. PINNED: this is today's list of bindings with
  // neither. Some are dead code (REFACTOR_PLAN.md 1.2–1.4 remove renderPlan,
  // updateBw, editProgram, showCreateProgram); the rest are bound but only called
  // directly by import. Update this list when a batch removes or starts using one.
  it('PINNED: bindings that nothing reaches through window', () => {
    const refs = windowReferences();
    const unused = [...bindings].filter(n => !callers.has(n) && !refs.has(n)).sort();
    expect(unused).toEqual([
      'editProgram',
      'hideOnboarding',
      'openExerciseSelector',
      'renderHome',
      'renderPlan',
      'renderProgress',
      'showCreateProgram',
      'showOnboarding',
      'showWelcomeScreen',
      'updateBw',
    ]);
  });
});
