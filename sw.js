// Nilomi v4 — Service Worker with auto-update
// Strategy: network-first for HTML, cache-first for assets
// On every open, checks for a new SW and forces reload if found

const CACHE = 'nilomi-v4';
const ASSETS = ['/manifest.json', '/icon-192.svg', '/icon-512.svg'];
// NOTE: index.html is intentionally NOT pre-cached
// It is always fetched fresh from network, falling back to cache only if offline

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Take over immediately without waiting for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Delete all old caches
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // For index.html (and root /): always try network first, cache as fallback
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          // Cache the fresh copy
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For everything else: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Notification scheduling ──
let scheduledAlarms = [];

function timeToNextMs(hh, mm) {
  const now = new Date();
  const fire = new Date();
  fire.setHours(hh, mm, 0, 0);
  if (fire <= now) fire.setDate(fire.getDate() + 1);
  return fire - now;
}

function parseTime(str) {
  const [hh, mm] = str.split(':').map(Number);
  return { hh, mm };
}

function buildAlarms(times) {
  const t = times || { morning: '08:30', afternoon: '13:00', night: '22:00' };
  return [
    { key: 'morning',   ...parseTime(t.morning),   title: 'Morning routine ☀️', body: 'Time for meds after breakfast + Glutone, Flawlizo, Sunscreen, Glibest' },
    { key: 'afternoon', ...parseTime(t.afternoon), title: 'Afternoon med 🌤',    body: 'T Faze — 1 tab after lunch' },
    { key: 'night',     ...parseTime(t.night),     title: 'Bedtime routine 🌙',  body: 'Lactofy, Clingen, Glibest, Theara hair serum + tonight\'s serum' },
    { key: 'midnight',  hh: 23, mm: 55,            title: 'Day summary 🌿',      body: 'Tap to see what you missed today', isSummary: true },
  ];
}

function fireAlarm(alarm) {
  self.registration.showNotification(alarm.title, {
    body: alarm.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'nilomi-' + alarm.key,
    renotify: true,
    requireInteraction: false,
    actions: alarm.isSummary
      ? [{ action: 'open', title: 'View summary' }]
      : [{ action: 'open', title: 'Mark done' }, { action: 'snooze', title: 'Snooze 15m' }]
  });
}

function scheduleAll(times) {
  scheduledAlarms.forEach(t => clearTimeout(t));
  scheduledAlarms = [];
  buildAlarms(times).forEach(alarm => {
    const delay = timeToNextMs(alarm.hh, alarm.mm);
    const t = setTimeout(() => {
      fireAlarm(alarm);
      setInterval(() => fireAlarm(alarm), 24 * 60 * 60 * 1000);
    }, delay);
    scheduledAlarms.push(t);
  });
}

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE' || e.data.type === 'HEARTBEAT') {
    scheduleAll(e.data.times);
  }
  if (e.data.type === 'SEND_SUMMARY') {
    const missed = e.data.missed || [];
    const body = missed.length === 0
      ? 'You completed everything today! Great job 🌿'
      : `Missed today: ${missed.slice(0, 4).join(', ')}${missed.length > 4 ? ` + ${missed.length - 4} more` : ''}`;
    self.registration.showNotification('Daily summary 🌿', {
      body, icon: '/icon-192.svg', badge: '/icon-192.svg',
      tag: 'nilomi-midnight', renotify: true,
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'snooze') {
    setTimeout(() => {
      self.registration.showNotification(e.notification.title, {
        body: e.notification.body, icon: '/icon-192.svg',
        tag: e.notification.tag + '-snooze',
      });
    }, 15 * 60 * 1000);
    return;
  }
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const focused = cs.find(c => c.focused);
      if (focused) return focused.focus();
      if (cs.length) return cs[0].focus();
      return clients.openWindow('/');
    })
  );
});
