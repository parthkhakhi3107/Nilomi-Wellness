/* Nilomi service worker — offline cache + push + scheduled reminders
 * Push requires iOS 16.4+ with the app installed to Home Screen.
 */
const CACHE='nilomi-v4-3';
const ASSETS=[
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e=>{
  // Resilient install: cache whatever we can, don't fail the whole worker if one asset 404s.
  e.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(ASSETS.map(async a=>{
      try{ await cache.add(a); }catch(err){ /* ignore individual miss */ }
    }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  // Network-first for Google API calls so Drive sync isn't cached
  if(/googleapis\.com|accounts\.google\.com/.test(req.url))return;
  // Navigation fallback: if offline and page fails, serve index.html
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(resp=>{
    if(resp&&resp.status===200&&resp.type==='basic'){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone));}
    return resp;
  }).catch(()=>caches.match('./index.html'))));
});

/* ---------- Scheduled reminders (local, app-open-only) ---------- */
let scheduled=[];
function clearAll(){scheduled.forEach(id=>clearTimeout(id));scheduled=[];}

function parseTime(t){const [h,m]=(t||'0:0').split(':').map(Number);return {h:h||0,m:m||0};}
function nextOccurrence(h,m){
  const now=new Date();const target=new Date();target.setHours(h,m,0,0);
  if(target<=now)target.setDate(target.getDate()+1);
  return target.getTime()-now.getTime();
}

function scheduleSession(label, time, bodyMap){
  const {h,m}=parseTime(time);
  const delay=nextOccurrence(h,m);
  const id=setTimeout(()=>{
    self.registration.showNotification('Nilomi', {
      body: bodyMap[label]||`Time for ${label} routine`,
      icon:'./icon-192.png', badge:'./icon-192.png', tag:'nilomi-'+label,
      vibrate:[140,60,140], requireInteraction:false,
      data:{session:label, url:'./'}
    });
    // Re-schedule for tomorrow
    scheduleSession(label,time,bodyMap);
  }, delay);
  scheduled.push(id);
}

self.addEventListener('message', e=>{
  const d=e.data||{};
  if(d.type==='SCHEDULE'||d.type==='HEARTBEAT'){
    clearAll();
    const bodyMap={morning:'☀ Good morning — time for your morning routine',afternoon:'🌤 Afternoon check-in — time for your midday dose',night:'🌙 Bedtime — meds, serums, skincare'};
    if(d.times){
      if(d.times.morning)scheduleSession('morning', d.times.morning, bodyMap);
      if(d.times.afternoon)scheduleSession('afternoon', d.times.afternoon, bodyMap);
      if(d.times.night)scheduleSession('night', d.times.night, bodyMap);
    }
  } else if(d.type==='CANCEL_ALL'){
    clearAll();
  } else if(d.type==='SEND_SUMMARY'){
    const missed=d.missed||[];
    if(missed.length){
      self.registration.showNotification('Nilomi — missed today', {
        body: missed.length>4?`${missed.length} items missed including ${missed.slice(0,2).join(', ')}`:`Missed: ${missed.join(', ')}`,
        icon:'./icon-192.png', badge:'./icon-192.png', tag:'nilomi-summary',
        data:{url:'./'}
      });
    }
  }
});

/* ---------- Real Web Push (iOS 16.4+ with VAPID) ---------- */
self.addEventListener('push', e=>{
  let payload={title:'Nilomi', body:'Routine reminder', url:'./'};
  try{if(e.data){const j=e.data.json();payload={...payload,...j};}}catch(err){try{payload.body=e.data.text();}catch(_){}}
  e.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon||'./icon-192.png',
    badge: payload.badge||'./icon-192.png',
    tag: payload.tag||'nilomi-push',
    vibrate:[160,80,160],
    data:{url: payload.url||'./'}
  }));
});

self.addEventListener('notificationclick', e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c){c.navigate(url).catch(()=>{});return c.focus();}}
    if(clients.openWindow)return clients.openWindow(url);
  }));
});

/* iOS resubscribe when subscription expires */
self.addEventListener('pushsubscriptionchange', e=>{
  // Best-effort: notify the open page so it can re-subscribe with the VAPID key
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    list.forEach(c=>c.postMessage({type:'RESUBSCRIBE_NEEDED'}));
  }));
});
