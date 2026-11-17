const CACHE_NAME = 'lift-tracker-v35';
// Background photos live in their own cache, kept across app updates, filled as they are viewed
const BG_CACHE = 'plate-log-backgrounds-v1';

const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/session.js',
  './js/overload.js',
  './js/progress.js',
  './js/calendar.js',
  './js/historyEdit.js',
  './js/data.js',
  './js/charts.js',
  './js/utils.js',
  './js/program.js',
  './js/welcome.js',
  './js/exerciseLibrary.js',
  './js/programTemplates.js',
  './js/onboarding.js',
  './js/home.js',
  './js/stats.js',
  './js/myplans.js',
  './js/settings.js',
  './js/programActions.js',
  './js/restTimer.js',
  './js/sessionBanner.js',
  './js/exerciseSelector.js',
  './js/programBuilder.js',
  './js/healthkit.js',
  './js/media.js',
  './js/profilePhoto.js',
  './js/backgrounds.js',
  './js/backgroundPicker.js',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== BG_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  if (event.request.url.includes('/img/backgrounds/')) {
    event.respondWith(
      caches.open(BG_CACHE).then(cache =>
        cache.match(event.request).then(cached => cached || fetch(event.request).then(res => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        }))
      )
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
