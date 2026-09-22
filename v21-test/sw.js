'use strict';
const CACHE='meal-note-shell-v21-1';
const FILES=['./index.html','./planner.js','./nutrition.js','./capture.js','./daily.css','./app.js','./storage.js','./upgrade.js','./upgrade.css','./meals.js','./experience.js','./experience.css','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('meal-note-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL('./',self.location.href);
  if(['localhost','127.0.0.1'].includes(url.hostname))return;
  if(event.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  // Cache public application assets only. Never cache family records or future APIs.
  const match=FILES.find(file=>new URL(file,base).pathname===url.pathname);
  if(event.request.mode==='navigate')event.respondWith(caches.match(new URL('./index.html',base).href).then(cached=>cached||fetch(event.request)));
  else if(match)event.respondWith(caches.match(new URL(match,base).href).then(cached=>cached||fetch(event.request)));
});

