/* =====================================================================
   GudangPro OS — app.js : kerangka aplikasi (sidebar, topbar, bottom nav),
   menu per peran (RBAC tampilan; server tetap memeriksa), inbox, polling.
   ===================================================================== */
/* R_OPS, R_APPR, R_MAN didefinisikan di core.js (dimuat paling awal, dipakai halaman). */
const MENU = [
  { g: 'Utama' },
  { r: 'dashboard', l: 'Dashboard', ic: 'dashboard' },
  { r: 'stok', l: 'Stok & Lokasi Bin', ic: 'boxes' },
  { g: 'Operasional' },
  { r: 'in', l: 'Barang Masuk (IN)', ic: 'in', roles: R_OPS },
  { r: 'out', l: 'Barang Keluar (OUT)', ic: 'out', roles: R_OPS },
  { r: 'retur', l: 'Retur Barang', ic: 'retur', roles: R_OPS },
  { r: 'mutasi', l: 'Mutasi Antar Rak', ic: 'mutasi', roles: R_OPS },
  { r: 'trx', l: 'Daftar Transaksi', ic: 'list', roles: ['STAF', 'KEPALA', 'OWNER', 'SUPERADMIN'] },
  { r: 'opname', l: 'Stok Opname', ic: 'opname', roles: ['STAF', 'KEPALA', 'OWNER', 'SUPERADMIN'], badge: 'opname' },
  { g: 'Kontrol' },
  { r: 'approval', l: 'Approval', ic: 'approval', roles: R_APPR, badge: 'approval' },
  { r: 'dokumen', l: 'Dokumen & Surat', ic: 'file', badge: 'ttd' },
  { r: 'master', l: 'Master Data SKU', ic: 'database', roles: ['KEPALA', 'SUPERADMIN', 'PURCHASING', 'OWNER'] },
  { g: 'Analitik' },
  { r: 'laporan', l: 'Laporan & Valuasi', ic: 'chart' },
  { r: 'log', l: 'Audit Log Aktivitas', ic: 'history', roles: R_MAN },
  { g: 'Sistem' },
  { r: 'notif', l: 'WhatsApp & Notifikasi', ic: 'wa', roles: R_MAN },
  { r: 'crm', l: 'CRM Kontak', ic: 'users', roles: R_MAN },
  { r: 'import', l: 'Import & Migrasi', ic: 'upload', roles: ['KEPALA', 'SUPERADMIN'] },
  { r: 'pengaturan', l: 'Pengaturan WMS', ic: 'settings', roles: ['SUPERADMIN', 'OWNER'] }
];
const AKSI_CEPAT = [
  { l: 'Tambah Inbound', h: '#/in', ic: 'in', roles: R_OPS },
  { l: 'Tambah Outbound', h: '#/out', ic: 'out', roles: R_OPS },
  { l: 'Scan Kamera Barcode', h: '#/scan', ic: 'scan', roles: ['STAF', 'KEPALA', 'PURCHASING', 'SUPERADMIN', 'OWNER'] },
  { l: 'Buat Sesi Opname', h: '#/opname?baru=1', ic: 'opname', roles: R_OPS },
  { l: 'Tambah SKU', h: '#/master/barang?baru=1', ic: 'pkgplus', roles: ['KEPALA', 'SUPERADMIN'] }
];

const App = {
  menuUntuk() { return MENU.filter(m => !m.r || !m.roles || can(...m.roles)).filter((m, i, a) => !m.g || (a[i + 1] && !a[i + 1].g)); },
  renderShell() {
    document.body.classList.add('in-app');
    const me = Store.me;
    const nav = App.menuUntuk().map(m => m.g ? '<div class="sb-group">' + esc(m.g) + '</div>' :
      '<a class="nav-a" href="#/' + m.r + '" data-r="' + m.r + '">' + icon(m.ic) + '<span>' + esc(m.l) + '</span>' + (m.badge ? '<i class="cnt" data-badge="' + m.badge + '" hidden></i>' : '') + '</a>').join('');
    const aksi = AKSI_CEPAT.filter(a => can(...a.roles));
    $('#root').innerHTML =
      '<div class="app"><aside class="sidebar" id="sb"><div class="sb-brand"><div class="logo">' + icon('warehouse', 'lg') + '</div><div><div class="t1">GudangPro <span class="os">OS</span></div><div class="t2">WMS &amp; Inventory Control</div></div></div>' +
      '<div class="sb-scroll"><nav>' + nav + '</nav>' +
      (aksi.length ? '<div class="sb-quick"><div class="h">AKSI CEPAT <span>+</span></div>' + aksi.map(a => '<a href="' + a.h + '">' + icon('plus') + esc(a.l) + '</a>').join('') + '</div>' : '') + '</div>' +
      '<div class="sb-card" id="sb-card"><div class="ib">' + icon('calendar') + '</div><div class="ttl">Cycle Count Terdekat</div><div class="d" id="sb-card-d">Belum ada jadwal opname.</div><a class="btn sm" id="sb-card-b" href="#/opname">Mulai Opname ' + icon('right') + '</a></div></aside>' +
      '<div class="main"><header class="topbar"><button class="icon-btn hamb" data-act="sb.buka" aria-label="Menu">' + icon('menu') + '</button><div class="tb-title only-m" id="tb-title"></div>' +
      '<div class="tb-search" data-act="cmdk">' + icon('search') + '<span>Cari SKU, nama barang, nomor batch, kode bin (mis. A-02-03)…</span><span class="kbd">' + (/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</span></div>' +
      '<div class="tb-right"><button class="icon-btn only-m" data-act="cmdk" aria-label="Cari">' + icon('search') + '</button>' +
      (aksi.length ? '<button class="fab-plus" data-act="tb.plus" aria-label="Buat baru">' + icon('plus') + '</button>' : '') +
      '<a class="btn tb-scan" href="#/scan">' + icon('scan') + 'Scan SKU</a>' +
      '<button class="icon-btn" data-act="inbox" aria-label="Notifikasi">' + icon('bell') + '<span class="dot" id="bell-dot" hidden></span></button>' +
      '<div class="who" data-act="tb.profil">' + UI.avatar(me.nama) + '<div><div class="n">' + esc(me.nama) + '</div><div class="r">' + esc(ROLE_LABEL[me.role] || me.role) + '</div></div>' + icon('down', 'sm') + '</div></div></header>' +
      '<main class="content" id="view"></main>' +
      '<footer class="footer"><b>GudangPro OS v' + APP_VER + '</b><span>•</span><span>Web App Google Apps Script + Google Sheets</span><span>•</span><span>' + esc(Store.set.NAMA_PERUSAHAAN || '') + '</span><span class="st" id="net-st"><span class="live"></span>Database Google Sheets: Terhubung</span></footer></div></div>' +
      '<nav class="bnav"><a href="#/dashboard" data-r="dashboard">' + icon('home') + 'Beranda</a><a href="#/stok" data-r="stok">' + icon('boxes') + 'Stok</a><a href="#/scan" class="scanbtn" data-r="scan"><span class="c">' + icon('scan') + '</span></a>' +
      (can('STAF', 'KEPALA', 'OWNER', 'SUPERADMIN') ? '<a href="#/opname" data-r="opname">' + icon('opname') + 'Opname<i class="dot" data-badge="opname" hidden></i></a>' : '<a href="#/laporan" data-r="laporan">' + icon('chart') + 'Laporan</a>') +
      '<a href="#" data-act="sb.buka">' + icon('menu') + 'Menu<i class="dot" data-badge="approval" hidden></i></a></nav><div class="toasts" id="toasts"></div>';
    App.badge();
    App.kartuOpname();
  },
  aktifkanMenu(id) {
    const alias = { sku: 'stok' }, r = alias[id] || id;
    $$('.nav-a, .bnav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  },
  badge() {
    const b = Store.badge || {};
    $$('[data-badge]').forEach(el => { const n = b[el.dataset.badge] || 0; el.hidden = !n; el.textContent = n > 99 ? '99+' : n; });
    const tot = (b.approval || 0) + (b.ttd || 0);
    const d = $('#bell-dot'); if (d) { d.hidden = !tot; d.textContent = tot; }
  },
  async kartuOpname() {
    if (!can('STAF', 'KEPALA', 'OWNER', 'SUPERADMIN')) { const c = $('#sb-card'); if (c) c.hidden = true; return; }
    const tampil = d => {
      const o = (d || []).filter(x => x.status === 'Berjalan' || x.status === 'Terjadwal').sort((a, b) => (a.status === 'Berjalan' ? -1 : 1) || (a.jadwal < b.jadwal ? -1 : 1))[0];
      const el = $('#sb-card-d'), b = $('#sb-card-b'); if (!el) return;
      if (!o) { el.textContent = 'Belum ada jadwal opname. Buat sesi cycle count per area.'; b.href = '#/opname?baru=1'; b.innerHTML = 'Buat Sesi ' + icon('right'); return; }
      el.textContent = o.area + (o.status === 'Berjalan' ? ' sedang dihitung (' + F.num(o.total, 0) + ' baris).' : ' dijadwalkan ' + F.tglP(o.jadwal) + '.');
      b.href = '#/opname/' + o.id; b.innerHTML = (o.status === 'Berjalan' ? 'Lanjutkan Opname ' : 'Mulai Opname ') + icon('right');
    };
    SWR.get('opname.list', {}, { onData: tampil, maxAge: 60000 });
  },
  async inbox() {
    const h = UI.drawer({ title: 'Pengingat & Notifikasi', desc: 'Hal yang perlu ditindaklanjuti', body: UI.sk(4) });
    const d = await SWR.get('inbox.get', {}, { maxAge: 5000, onData: x => isi(x) });
    function isi(x) {
      if (!x || !h.body.isConnected) return;
      Store.badge = x.badge || Store.badge; App.badge();
      h.body.innerHTML = x.items.length ? x.items.map(i => '<a class="rem ' + (i.level || 'info') + '" href="' + i.link + '"><div class="tm">' + (i.waktu && i.waktu.length > 10 ? F.jam(i.waktu) : F.tgl(i.waktu).split(' ').slice(0, 2).join(' ')) + '</div><div class="grow"><div class="t">' + esc(i.judul) + '</div><div class="d ellipsis">' + esc(i.ket || '') + '</div></div><span class="btn sm">' + esc(i.aksi || 'Buka') + '</span></a>').join('') : UI.empty('ok', 'Semua beres', 'Tidak ada pengingat saat ini.');
      h.body.querySelectorAll('a').forEach(a => a.addEventListener('click', () => h.tutup()));
    }
    if (d) isi(d);
  },
  async mulai() {
    App.renderShell();
    Router.jalan();
    const ubah = await Store.sync(!Store.v.master);
    if (ubah.length) { App.badge(); Router.segarkan(ubah); }
    if (!App._poll) {
      Activity.init();
      App._poll = setInterval(async () => {
        if (!Store.me || !API.token) return;
        if (Activity.due('sync', 30000, 120000)) { const u = await Store.sync(); if (u.length) { App.badge(); Router.segarkan(u); } }
      }, 5000);
      document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && Store.me && Date.now() - (Activity.last.sync || 0) > 15000) { Activity.last.sync = Date.now(); const u = await Store.sync(); if (u.length) { App.badge(); Router.segarkan(u); } } });
      Store.on(what => { if (what.includes('badge')) App.badge(); });
      // prefetch saat senggang: data menu yang sering dibuka jatuh di 1 batch
      idle(() => { SWR.get('inbox.get', {}, { maxAge: 30000, onData: x => { if (x && x.badge) { Store.badge = x.badge; App.badge(); } } }); if (can(...R_APPR)) SWR.get('approval.list', {}, { maxAge: 30000 }); }, 1500);
    }
  },
  /** Setelah aksi tulis berhasil: segarkan data stok/badge di belakang layar. */
  async setelahTulis(prefix) {
    SWR.basi(prefix || ''); SWR.basi('dash.get'); SWR.basi('inbox.get');
    const u = await Store.sync(); if (u.length) { App.badge(); Router.segarkan(u); }
  }
};

/* ---------------- aksi shell ---------------- */
ACT['sb.buka'] = () => { const sb = $('#sb'); sb.classList.add('open'); const s = document.createElement('div'); s.className = 'scrim'; s.style.zIndex = 84; s.onclick = () => { sb.classList.remove('open'); s.remove(); }; document.body.appendChild(s); sb.addEventListener('click', e => { if (e.target.closest('a')) { sb.classList.remove('open'); s.remove(); } }, { once: true }); };
ACT['cmdk'] = () => Cmdk.buka();
ACT['inbox'] = () => App.inbox();
ACT['tb.plus'] = el => UI.menu(el, [{ h: 'Buat baru' }].concat(AKSI_CEPAT.filter(a => can(...a.roles)).map(a => ({ icon: a.ic, label: a.l, fn: () => Router.go(a.h) }))).concat(can('KEPALA', 'OWNER', 'SUPERADMIN') ? [{ icon: 'scale', label: 'Penyesuaian Stok (ADJ)', fn: () => Router.go('#/adj') }] : []));
ACT['tb.profil'] = el => UI.menu(el, [
  { h: Store.me.email },
  { icon: 'userc', label: 'Profil & PIN saya', fn: () => Router.go('#/profil') },
  { icon: document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', label: document.documentElement.dataset.theme === 'dark' ? 'Mode terang' : 'Mode gelap', fn: Tema.ganti },
  { icon: 'phone', label: 'Pasang aplikasi di HP', fn: PWA.pasang },
  { icon: 'refresh', label: 'Muat ulang data', fn: async () => { UI.toast('Memuat ulang data…', 'info'); SWR.basi(); await Store.sync(true); Router.jalan(); } },
  { sep: true },
  { icon: 'logout', label: 'Keluar', fn: () => Auth.keluar(false) },
  { icon: 'shieldx', label: 'Keluar dari semua perangkat', fn: () => Auth.keluar(true) }
]);
const Tema = {
  init() { const t = LS.get('gp_theme', window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = t; },
  ganti() { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; LS.set('gp_theme', t); const m = $('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0B1622' : '#0B2545'; }
};

/* ---------------- start ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  Tema.init(); PWA.init();
  if (await Auth.init()) App.mulai(); else Auth.tampilLogin();
});
