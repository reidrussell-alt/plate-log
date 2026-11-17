// Runs before every test file.
import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  // The app logs expected failures (no IndexedDB in jsdom, corrupt data) with console.warn
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
