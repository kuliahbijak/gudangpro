/* GudangPro OS — Service Worker
   - Aset aplikasi: cache-first (buka instan, tetap jalan saat sinyal lemah)
   - Pustaka CDN & font: stale-while-revalidate
   - Permintaan ke Google Apps Script TIDAK PERNAH di-cache (data selalu dari server) */
const VERSI = 'gudangpro-v1.0.0';
const ASET = ['./', './index.html', './verifikasi.html', './manifest.webmanifest', './css/app.css?v=1.0.0',
  './js/config.js?v=1.0.0', './js/icons.js?v=1.0.0', './js/core.js?v=1.0.0', './js/charts.js?v=1.0.0', './js/app.js?v=1.0.0',
  './js/pages/dashboard.js?v=1.0.0', './js/pages/stok.js?v=1.0.0', './js/pages/trx.js?v=1.0.0', './js/pages/scan.js?v=1.0.0', './js/pages/opname.js?v=1.0.0',
  './js/pages/approval.js?v=1.0.0', './js/pages/master.js?v=1.0.0', './js/pages/laporan.js?v=1.0.0', './js/pages/dokumen.js?v=1.0.0', './js/pages/notif.js?v=1.0.0',
  './js/pages/sistem.js?v=1.0.0', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(ASET)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSI).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/script\.google(usercontent)?\.com$/.test(url.hostname) || url.hostname === 'accounts.google.com' || url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) return;
  const cdn = /(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (cdn) {
    e.respondWith(caches.open(VERSI + '-cdn').then(async c => { const hit = await c.match(req); const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; }));
    return;
  }
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') { e.respondWith(fetch(req).then(r => { caches.open(VERSI).then(c => c.put('./index.html', r.clone())); return r; }).catch(() => caches.match('./index.html'))); return; }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSI).then(c => c.put(req, cp)); } return r; })));
  }
});
