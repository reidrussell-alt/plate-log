// Small settings stores: liftTimerSettings, liftHealthSettings, liftTrackerChartRanges.
import { describe, it, expect, vi } from 'vitest';

// Fresh module state per call. Paths must stay literal so Vite can resolve them.
async function fresh(load) {
  vi.resetModules();
  return load();
}

describe('rest timer settings (liftTimerSettings)', () => {
  it('defaults: off, 120 s, vibrate on', async () => {
    const t = await fresh(() => import('../js/restTimer.js'));
    expect(t.getTimerSettings()).toEqual({ enabled: false, duration: 120, alertEnabled: true });
  });

  it('snaps duration to 15 s and clamps to 30–600', async () => {
    const t = await fresh(() => import('../js/restTimer.js'));
    const cases = [[97, 90], [98, 105], [10, 30], [1000, 600], [600, 600], [37, 30]];
    for (const [input, expected] of cases) {
      t.setTimerDuration(input);
      expect(t.getTimerSettings().duration).toBe(expected);
    }
  });

  it('round-trips through localStorage', async () => {
    const t = await fresh(() => import('../js/restTimer.js'));
    t.setTimerEnabled(true);
    t.setTimerDuration(150);
    t.setTimerAlertEnabled(false);
    expect(JSON.parse(localStorage.getItem('liftTimerSettings'))).toEqual({ enabled: true, duration: 150, alertEnabled: false });

    const reloaded = await fresh(() => import('../js/restTimer.js'));
    reloaded.initRestTimer();
    expect(reloaded.getTimerSettings()).toEqual({ enabled: true, duration: 150, alertEnabled: false });
  });

  it('PINNED: unknown keys in storage are merged into settings', async () => {
    localStorage.setItem('liftTimerSettings', JSON.stringify({ duration: 45, extra: 'x' }));
    const t = await fresh(() => import('../js/restTimer.js'));
    t.initRestTimer();
    expect(t.getTimerSettings()).toEqual({ enabled: false, duration: 45, alertEnabled: true, extra: 'x' });
  });

  it('formatRestDuration shows m:ss', async () => {
    const t = await fresh(() => import('../js/restTimer.js'));
    expect(t.formatRestDuration(0)).toBe('0:00');
    expect(t.formatRestDuration(65)).toBe('1:05');
    expect(t.formatRestDuration(600)).toBe('10:00');
  });
});

describe('HealthKit settings (liftHealthSettings)', () => {
  it('defaults to all on; HealthKit unavailable on the web', async () => {
    const h = await fresh(() => import('../js/healthkit.js'));
    expect(h.getHealthSettings()).toEqual({ enabled: true, readSteps: true, readWeight: true, permissionsGranted: false });
    expect(h.isHealthKitAvailable()).toBe(false);
    expect(h.getCachedWeight()).toBeNull();
  });

  it('round-trips through localStorage (loaded by initHealthKit)', async () => {
    const h = await fresh(() => import('../js/healthkit.js'));
    h.setHealthEnabled(false);
    h.setReadSteps(false);
    expect(JSON.parse(localStorage.getItem('liftHealthSettings'))).toEqual({ enabled: false, readSteps: false, readWeight: true });

    const reloaded = await fresh(() => import('../js/healthkit.js'));
    expect(await reloaded.initHealthKit()).toEqual({ steps: null, weight: null });
    expect(reloaded.getHealthSettings()).toMatchObject({ enabled: false, readSteps: false, readWeight: true });
  });

  it('is available only inside the native iOS shell', async () => {
    const h = await fresh(() => import('../js/healthkit.js'));
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
    expect(h.isHealthKitAvailable()).toBe(true);
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    expect(h.isHealthKitAvailable()).toBe(false);
    delete window.Capacitor;
  });
});

describe('chart ranges (liftTrackerChartRanges)', () => {
  it('setChartRange saves the range per exercise even before Progress has rendered', async () => {
    const p = await fresh(() => import('../js/progress.js'));
    p.setChartRange('chest', 'db_press', 20);
    p.setChartRange('legs', 'squat', 'all');
    expect(JSON.parse(localStorage.getItem('liftTrackerChartRanges'))).toEqual({ db_press: 20, squat: 'all' });
  });
});
