import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Dates in the app depend on the local time zone. Pin it so tests give the same
// result on any machine. Several date bugs only show up east of UTC (see the
// "time zone" tests), which run under their own TZ where needed.
process.env.TZ = 'UTC';

// Run from tests/ (cd tests && npm test). Tests import the app from ../js/.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['**/*.test.js'],
    setupFiles: ['./setup.js'],
    env: { TZ: 'UTC' },
  },
});
