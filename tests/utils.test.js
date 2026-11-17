import { describe, it, expect, vi } from 'vitest';
import { todayDateString, isoDateOnly, formatDate, formatDateShort, escapeHtml, readJSON, writeJSON } from '../js/utils.js';
import { setNow } from './helpers.js';

describe('todayDateString', () => {
  it('returns the local date as YYYY-MM-DD', () => {
    setNow('2026-03-05T10:00:00Z');
    expect(todayDateString()).toBe('2026-03-05');
  });
});

describe('isoDateOnly', () => {
  it('cuts the time off an ISO string', () => {
    expect(isoDateOnly('2026-04-15T12:00:00.000Z')).toBe('2026-04-15');
  });
  it('falls back to today for an empty value', () => {
    setNow('2026-11-16T09:00:00Z');
    expect(isoDateOnly('')).toBe('2026-11-16');
    expect(isoDateOnly(undefined)).toBe('2026-11-16');
  });
});

describe('formatDate', () => {
  it('says Today, Yesterday, "Nd ago" for under a week, then a short date', () => {
    setNow('2026-11-16T15:00:00Z');
    expect(formatDate('2026-11-16T12:00:00Z')).toBe('Today');
    expect(formatDate('2026-11-15T12:00:00Z')).toBe('Yesterday');
    expect(formatDate('2026-11-13T12:00:00Z')).toBe('3d ago');
    expect(formatDate('2026-11-10T12:00:00Z')).toBe('6d ago');
    expect(formatDate('2026-11-09T12:00:00Z')).toBe('Nov 9');
  });

  it('PINNED BUG: a future date shows as a negative "d ago"', () => {
    setNow('2026-11-16T15:00:00Z');
    expect(formatDate('2026-11-19T12:00:00Z')).toBe('-3d ago');
  });
});

describe('formatDateShort', () => {
  it('uses en-US month and day', () => {
    expect(formatDateShort('2026-04-15T12:00:00Z')).toBe('Apr 15');
  });
});

// Shared by settings, welcome, profilePhoto, programBuilder and backgroundPicker
// (REFACTOR_PLAN.md 2.1).
describe('escapeHtml', () => {
  it('escapes & < > " and the apostrophe', () => {
    expect(escapeHtml(`Tom & "Jerry" <b>it's</b>`)).toBe('Tom &amp; &quot;Jerry&quot; &lt;b&gt;it&#39;s&lt;/b&gt;');
  });

  it('null and undefined become an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('other values are turned into text; plain text is unchanged', () => {
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml('Upper A')).toBe('Upper A');
  });
});

describe('readJSON / writeJSON (REFACTOR_PLAN 4.1)', () => {
  it('round-trips a value under the given key', () => {
    writeJSON('k', { a: 1 });
    expect(localStorage.getItem('k')).toBe('{"a":1}');
    expect(readJSON('k', 'fb')).toEqual({ a: 1 });
  });

  it('missing or empty key gives the fallback', () => {
    expect(readJSON('missing', 'fb')).toBe('fb');
    localStorage.setItem('empty', '');
    expect(readJSON('empty', 'fb')).toBe('fb');
  });

  it('stored JSON null comes back as null, not the fallback', () => {
    localStorage.setItem('n', 'null');
    expect(readJSON('n', 'fb')).toBeNull();
  });

  it('invalid JSON gives the fallback and warns', () => {
    localStorage.setItem('bad', '{oops');
    console.warn.mockClear();
    expect(readJSON('bad', 'fb')).toBe('fb');
    expect(console.warn).toHaveBeenCalled();
  });

  it('a failed write warns instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    console.warn.mockClear();
    try {
      expect(() => writeJSON('k', 1)).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
