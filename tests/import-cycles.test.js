// Static check: no import cycles between js/ modules. REFACTOR_PLAN 5.7 removed
// the last one (calendar.js ↔ progress.js); cross-module calls that would close a
// loop go through `window` instead (CLAUDE.md "Critical architecture pattern").
// This reads the source text; it does not run the app.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, posix } from 'node:path';

const ROOT = resolve(__dirname, '..');
const jsFiles = readdirSync(resolve(ROOT, 'js')).filter(f => f.endsWith('.js')).sort();

// Relative specifiers from static `import … from`, `export … from`, bare
// `import '…'` and dynamic `import('…')`. Statements may span lines.
const IMPORT_RE = /^\s*(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm;

function importsOf(file) {
  const src = readFileSync(resolve(ROOT, 'js', file), 'utf8');
  const deps = new Set();
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec.startsWith('.')) continue; // CDN or bare specifiers: not our modules
    deps.add(posix.normalize(posix.join(posix.dirname(file), spec)));
  }
  return [...deps];
}

// Every cycle found by depth-first search, each as a path that starts and ends
// at the same module (e.g. ['a.js', 'b.js', 'a.js']).
function findCycles(graph) {
  const cycles = [];
  const state = {}; // undefined = unvisited, 1 = on the stack, 2 = done
  const stack = [];
  const visit = node => {
    state[node] = 1;
    stack.push(node);
    for (const dep of graph[node] || []) {
      if (state[dep] === 1) cycles.push([...stack.slice(stack.indexOf(dep)), dep]);
      else if (state[dep] === undefined) visit(dep);
    }
    stack.pop();
    state[node] = 2;
  };
  for (const node of Object.keys(graph)) if (state[node] === undefined) visit(node);
  return cycles;
}

const graph = Object.fromEntries(jsFiles.map(f => [f, importsOf(f)]));

describe('import graph of js/', () => {
  it('reads the imports (sanity: the parser finds known edges)', () => {
    expect(graph['app.js']).toEqual(expect.arrayContaining(['home.js', 'data.js', 'calendar.js', 'progress.js']));
    expect(graph['progress.js']).toContain('calendar.js');
    expect(graph['data.js']).toEqual(expect.arrayContaining(['utils.js', 'program.js', 'media.js']));
  });

  it('every relative import points at a file in js/', () => {
    const missing = Object.entries(graph).flatMap(([f, deps]) =>
      deps.filter(d => !jsFiles.includes(d)).map(d => `${f} → ${d}`));
    expect(missing).toEqual([]);
  });

  it('has no import cycles', () => {
    expect(findCycles(graph).map(c => c.join(' → '))).toEqual([]);
  });

  it('the cycle check itself detects cycles (self-test)', () => {
    expect(findCycles({ 'a.js': ['b.js'], 'b.js': ['a.js'] })).toEqual([['a.js', 'b.js', 'a.js']]);
    expect(findCycles({ 'a.js': ['b.js'], 'b.js': ['c.js'], 'c.js': ['a.js'] }).length).toBe(1);
    expect(findCycles({ 'a.js': ['a.js'] })).toEqual([['a.js', 'a.js']]);
    expect(findCycles({ 'a.js': ['b.js', 'c.js'], 'b.js': ['c.js'], 'c.js': [] })).toEqual([]);
  });
});
