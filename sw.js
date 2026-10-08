// Offline support: cache the app so it opens without a connection. Bump VERSION when you publish changes.
const VERSION = 'primordium-v2';
const FILES = ['./','index.html','style.css','app.js','data.js','primordium-data.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
