import { state } from './data.js';

// Welcome screen shown on every app open: the plate logo on its own, then a
// slowly turning disc of dots shaped like a weight plate, "Welcome in, {name}"
// and one button that goes to Home. Design notes: design-reference/patterns.md.

const LOGO_MS = 1200;        // how long the logo shows on its own
const LIGHT = Math.PI * 1.05; // dots are lit from the left

// Dot layout: concentric rings like a plate, a gap for the rim groove, an empty hub.
const DOTS = [];
[0.32, 0.42, 0.52, 0.62, 0.72, /* groove */ 0.88, 0.98].forEach((r, i) => {
  const n = Math.round((2 * Math.PI * r) / 0.105);
  for (let k = 0; k < n; k++) DOTS.push({ r, a: (k / n) * Math.PI * 2 + (i % 2) * (Math.PI / n) });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const PLATE_SVG = `
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Weight plate mark, matches the home-screen icon -->
    <circle cx="30" cy="30" r="27" fill="var(--plate)"/>
    <circle cx="30" cy="30" r="20.5" fill="none" stroke="var(--plate-ink)" stroke-opacity=".45" stroke-width="1.2"/>
    <circle cx="30" cy="30" r="8" fill="var(--plate-ink)"/>
    <circle cx="30" cy="30" r="3.4" fill="var(--plate)"/>
    <rect x="25.5" y="6.5" width="9" height="4.2" rx="2.1" fill="var(--plate-ink)"/>
    <rect x="25.5" y="49.3" width="9" height="4.2" rx="2.1" fill="var(--plate-ink)"/>
  </svg>`;

export function showWelcomeScreen() {
  const el = document.getElementById('welcomeScreen');
  if (!el) return;

  const name = (state.profile?.name || '').trim();
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.innerHTML = `
    <div class="welcome-splash">${PLATE_SVG}</div>
    <div class="welcome-main">
      <div class="welcome-dots"><canvas aria-hidden="true"></canvas></div>
      <h1 class="welcome-title welcome-rise">Welcome in${name ? `,<br>${escapeHtml(name)}` : ''}</h1>
      <button type="button" class="welcome-start welcome-rise">Let's get moving</button>
    </div>
  `;
  el.classList.toggle('still', still);
  el.classList.add('visible');
  el.setAttribute('aria-hidden', 'false');

  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let size = 0, t0 = 0, frame = 0, dismissed = false;

  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now) => {
    if (!size) return;
    const t = (now - t0) / 1000;
    const spin = still ? 0 : t * 0.12;
    const reveal = still ? 1 : Math.min(1, t / 1.1); // dots grow out from the hub
    const c = size / 2, R = size * 0.47, unit = size / 300;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = getComputedStyle(el).getPropertyValue('--plate').trim();
    for (const d of DOTS) {
      const a = d.a + spin * (d.r > 0.8 ? 1 : -0.6); // rim and inner rings turn opposite ways
      const lit = 0.5 + 0.5 * Math.cos(a - LIGHT);
      const appear = Math.max(0, Math.min(1, (reveal - (d.r - 0.3) * 0.9) * 4));
      if (appear <= 0) continue;
      ctx.globalAlpha = (0.08 + 0.92 * lit) * appear;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * d.r * R, c + Math.sin(a) * d.r * R, (0.7 + 3.6 * lit * lit) * unit * appear, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now) => {
    draw(now);
    if (!still && !dismissed) frame = requestAnimationFrame(loop);
  };

  const onResize = () => { fit(); draw(performance.now()); };

  const reveal = setTimeout(() => {
    el.classList.add('phase-main');
    fit();
    t0 = performance.now();
    frame = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
  }, still ? 300 : LOGO_MS);

  el.querySelector('.welcome-start').addEventListener('click', () => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(reveal);
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
    window.switchTab('home');
    el.classList.add('fading');
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      el.classList.remove('visible', 'fading', 'phase-main', 'still');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '';
    };
    el.addEventListener('transitionend', e => { if (e.target === el) cleanup(); });
    setTimeout(cleanup, 600); // in case the fade's transitionend never fires
  });
}
