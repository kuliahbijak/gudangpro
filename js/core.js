/* =====================================================================
   GudangPro OS — core.js
   Utilitas, API (fetch → GAS, dedupe, batch otomatis, SWR), Store
   (master + stok lokal, sinkron delta), Auth (Google + darurat), Router,
   komponen UI, pemindai, ekspor Excel/PDF, PWA, polling adaptif.
   ===================================================================== */
const APP_VER = '1.0.0';
const CFG = window.APP_CONFIG || {};
const GAS_URL = String(CFG.GAS_URL || '').trim();
const KONFIG_OK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(GAS_URL) || !!CFG.DEV;

/* ---------------- utilitas ---------------- */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const parseD = s => { if (!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/); return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null; };
const addDays = (s, n) => { const d = parseD(s) || new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round(((parseD(b) || new Date()) - (parseD(a) || new Date())) / 864e5);
const F = {
  num: (n, d) => (Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 2 : d }),
  rp: n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'),
  rpS: n => { n = Number(n) || 0; const a = Math.abs(n); return (n < 0 ? '-' : '') + 'Rp ' + (a >= 1e12 ? F.num(a / 1e12, 2) + ' T' : a >= 1e9 ? F.num(a / 1e9, 2) + ' M' : a >= 1e6 ? F.num(a / 1e6, 1) + ' jt' : a >= 1e3 ? F.num(a / 1e3, 0) + ' rb' : F.num(a, 0)); },
  tgl: s => { const d = parseD(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : (s || '-'); },
  tglP: s => { const d = parseD(s); return d ? d.getDate() + ' ' + BULAN_P[d.getMonth()] + ' ' + d.getFullYear() : (s || '-'); },
  jam: s => { const d = parseD(s); return d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''; },
  tglJam: s => s ? F.tgl(s) + (String(s).length > 10 ? ', ' + F.jam(s) : '') : '-',
  rel: s => { const d = parseD(s); if (!d) return '-'; const m = Math.round((Date.now() - d) / 6e4); if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; const h = Math.round(m / 60); if (h < 24) return h + ' jam lalu'; const dd = Math.round(h / 24); return dd < 8 ? dd + ' hari lalu' : F.tgl(s); },
  pct: (n, d) => (n == null || n === '' ? '—' : F.num(n, d == null ? 1 : d) + '%'),
  bln: k => { const p = String(k).split('-'); return BULAN[Number(p[1]) - 1] || k; }
};
const LS = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ROLE_LABEL = { STAF: 'Staf Gudang', KEPALA: 'Kepala Gudang', PURCHASING: 'Purchasing & Sales', OWNER: 'Owner', SUPERADMIN: 'Super Admin' };
/** Kelompok peran yang dipakai menu & halaman (harus ada sebelum berkas halaman dimuat). */
const R_OPS = ['STAF', 'KEPALA', 'SUPERADMIN'], R_APPR = ['KEPALA', 'OWNER', 'SUPERADMIN'], R_MAN = ['KEPALA', 'OWNER', 'SUPERADMIN'];
/** Jalankan saat browser senggang (fallback setTimeout). */
const idle = (fn, ms) => window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: ms || 1500 }) : setTimeout(fn, ms || 1500);
const can = (...roles) => !!(Store.me && roles.includes(Store.me.role));
const lihatHarga = () => can('KEPALA', 'OWNER', 'SUPERADMIN');
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

/* ---------------- pengukur performa (Perf.table() di console) ---------------- */
const Perf = { log: [], add(e) { this.log.push(e); if (this.log.length > 300) this.log.shift(); },
  table() { console.table(this.log.slice(-40)); }, summary() { const m = {}; this.log.forEach(x => { const a = m[x.aksi] = m[x.aksi] || { n: 0, total: 0, server: 0, cache: 0 }; a.n++; a.total += x.total; a.server += x.server || 0; if (x.cache) a.cache++; }); Object.keys(m).forEach(k => { m[k].rata = Math.round(m[k].total / m[k].n); m[k].server = Math.round(m[k].server / m[k].n); }); console.table(m); } };
window.Perf = Perf;

/* =====================================================================
   API — fetch ke GAS (POST text/plain → tanpa preflight CORS)
   ===================================================================== */
const READ_ACTIONS = /^(auth\.(me|config)|data\.sync|dash\.get|inbox\.get|trx\.(list|detail)|approval\.list|stok\.kartu|lap\.get|log\.list|opname\.(list|detail)|user\.list|rahasia\.status|sistem\.status|notif\.(config|queue)|wa\.(audience|blastList)|crm\.(list|stats|detail|export)|doc\.(templates|siapkan|list|pejabat)|ping)$/;
const API = {
  token: LS.get('gp_token', ''), inflight: {}, epoch: 0, online: true,
  async call(action, data, opts) {
    opts = opts || {};
    if (!KONFIG_OK) return { success: false, message: 'GAS_URL belum diisi di js/config.js.' };
    const baca = READ_ACTIONS.test(action);
    if (!baca) this.epoch++;
    const kunci = baca ? this.epoch + '|' + action + '|' + JSON.stringify(data || {}) : null;
    if (kunci && this.inflight[kunci]) return this.inflight[kunci];
    const p = this._run(action, data, opts, baca);
    if (kunci) { this.inflight[kunci] = p; p.finally(() => delete this.inflight[kunci]); }
    return p;
  },
  async _run(action, data, opts, baca) {
    const t0 = performance.now();
    const body = JSON.stringify({ action, token: this.token, data: data || {}, ua: Device.label });
    let res, coba = 0;
    while (true) {
      const ctrl = new AbortController(), batas = setTimeout(() => ctrl.abort(), opts.timeout || (/^(doc\.|migrasi|import|wa\.blast|notif\.process|sistem\.)/.test(action) ? 120000 : 35000));
      try {
        const r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctrl.signal, redirect: 'follow' });
        clearTimeout(batas);
        res = await r.json();
        this.setOnline(true);
        break;
      } catch (e) {
        clearTimeout(batas);
        this.setOnline(navigator.onLine !== false && e.name === 'AbortError');
        if (baca && coba < 2) { coba++; await sleep(800 * coba); continue; }
        return { success: false, message: e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Koneksi ke server gagal. Periksa internet Anda.', code: 'NET' };
      }
    }
    if (res.code === 'BUSY' && !opts._ulang) { await sleep(1500); return this._run(action, data, Object.assign({}, opts, { _ulang: true }), baca); }
    if (res.code === 'AUTH' && action !== 'auth.logout') Auth.expired();
    if (res.nq > 0) Drain.jadwalkan();
    Perf.add({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms, cache: !!res.cached, ok: res.success });
    return res;
  },
  /** Lempar Error bila gagal — dipakai dengan try/catch + toast. */
  async ok(action, data, opts) { const r = await this.call(action, data, opts); if (!r.success) { const e = new Error(r.message || 'Gagal.'); e.res = r; throw e; } return r; },
  /** Antrean baca: panggilan di tik yang sama digabung jadi 1 eksekusi 'batch'. */
  q(action, data) { return Batcher.add(action, data); },
  setOnline(v) { if (this.online === v) return; this.online = v; const el = $('#net-st'); if (el) { el.classList.toggle('off', !v); el.innerHTML = '<span class="live"></span>' + (v ? 'Database Google Sheets: Terhubung' : 'Offline — data terakhir ditampilkan'); } }
};
const Batcher = {
  q: null,
  add(action, data) { return new Promise(res => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data: data || {}, res }); }); },
  async flush() {
    const q = this.q; this.q = null;
    const grup = {}; q.forEach(x => { const k = x.action + '|' + JSON.stringify(x.data); (grup[k] = grup[k] || []).push(x); });
    const unik = Object.keys(grup).map(k => grup[k]);
    for (let i = 0; i < unik.length; i += 10) {
      const part = unik.slice(i, i + 10);
      if (part.length === 1) { const r = await API.call(part[0][0].action, part[0][0].data); part[0].forEach(x => x.res(r)); continue; }
      const r = await API.call('batch', { calls: part.map(g => ({ action: g[0].action, data: g[0].data })) });
      part.forEach((g, j) => { const hasil = r.success ? r.data.results[j] : r; g.forEach(x => x.res(hasil)); });
    }
  }
};
/** Stale-while-revalidate: tampilkan cache dulu, segarkan di belakang. */
const SWR = {
  mem: {}, PERSIST: /^(dash\.get|inbox\.get|approval\.list|opname\.list|trx\.list)/,
  key: (a, d) => a + '|' + JSON.stringify(d || {}),
  peek(a, d) { const k = this.key(a, d); return this.mem[k] || (this.PERSIST.test(a) ? LS.get('gp_swr_' + k, null) : null); },
  async get(action, data, opts) {
    opts = opts || {};
    const k = this.key(action, data), lama = this.peek(action, data);
    if (lama && opts.onData) opts.onData(lama.d, true);
    if (lama && !opts.paksa && Date.now() - lama.t < (opts.maxAge == null ? 20000 : opts.maxAge)) return lama.d;
    const r = await API.q(action, Object.assign({}, data || {}, opts.paksa ? { _fresh: true } : {}));
    if (!r.success) { if (!lama && opts.onError) opts.onError(r); return lama ? lama.d : null; }
    const baru = { t: Date.now(), d: r.data, h: JSON.stringify(r.data).length + ':' + (r.data && r.data.total) };
    this.mem[k] = baru;
    if (this.PERSIST.test(action)) LS.set('gp_swr_' + k, baru);
    if (opts.onData && (!lama || JSON.stringify(lama.d) !== JSON.stringify(r.data))) opts.onData(r.data, false);
    return r.data;
  },
  basi(prefix) { Object.keys(this.mem).forEach(k => { if (!prefix || k.indexOf(prefix) === 0) this.mem[k].t = 0; }); try { Object.keys(localStorage).forEach(k => { if (k.indexOf('gp_swr_' + (prefix || '')) === 0) { const v = LS.get(k); if (v) { v.t = 0; LS.set(k, v); } } }); } catch (e) { /* abaikan */ } }
};
/** Antrean notifikasi: respons dengan nq>0 → kirim segera lewat 'notif.drain'. */
const Drain = { t: null, n: 0, jadwalkan() { clearTimeout(this.t); this.t = setTimeout(() => this.jalan(), 400); },
  async jalan() { const r = await API.call('notif.drain', {}); if (r.success && r.data.left > 0 && this.n++ < 3) this.jadwalkan(); else this.n = 0; } };
const Device = { label: (/Mobi|Android/i.test(navigator.userAgent) ? 'HP ' : 'Desktop ') + ((navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d]+/) || [''])[0]) };

/* =====================================================================
   STORE — master + stok lokal (persist) dengan sinkron delta
   ===================================================================== */
const Store = {
  v: {}, me: null, set: {}, barang: [], kategori: [], satuan: [], lokasi: [], supplier: [], users: {}, stok: [], badge: {}, stokTs: 0, srvDelta: 0,
  idx: {}, _ls: [], _memo: {},
  on(fn) { this._ls.push(fn); }, emit(what) { this._memo = {}; this._ls.forEach(fn => { try { fn(what); } catch (e) { console.error(e); } }); },
  load() {
    const s = LS.get('gp_store_v1', null);
    if (s) Object.assign(this, { v: s.v || {}, me: s.me, set: s.set || {}, barang: s.barang || [], kategori: s.kategori || [], satuan: s.satuan || [], lokasi: s.lokasi || [], supplier: s.supplier || [], users: s.users || {}, stok: s.stok || [], stokTs: s.stokTs || 0, badge: s.badge || {} });
    this.reindex();
  },
  simpan: debounce(function () {
    const isi = { v: Store.v, me: Store.me, set: Store.set, barang: Store.barang, kategori: Store.kategori, satuan: Store.satuan, lokasi: Store.lokasi, supplier: Store.supplier, users: Store.users, stok: Store.stok, stokTs: Store.stokTs, badge: Store.badge };
    if (!LS.set('gp_store_v1', isi)) { isi.stok = []; isi.v = Object.assign({}, isi.v, { stok: '' }); LS.set('gp_store_v1', isi); }
  }, 500),
  bersih() { LS.del('gp_store_v1'); Object.assign(this, { v: {}, me: null, set: {}, barang: [], kategori: [], satuan: [], lokasi: [], supplier: [], users: {}, stok: [], stokTs: 0, badge: {} }); this.reindex(); },
  reindex() {
    const I = { sku: {}, bc: {}, kat: {}, sat: {}, lok: {}, lokKode: {}, sup: {}, stok: {}, stokSku: {} };
    this.barang.forEach(b => { I.sku[b.sku] = b; if (b.barcode) I.bc[String(b.barcode)] = b; });
    this.kategori.forEach(k => I.kat[k.id] = k); this.satuan.forEach(s => I.sat[s.id] = s);
    this.lokasi.forEach(l => { I.lok[l.id] = l; I.lokKode[String(l.kode).toUpperCase()] = l; }); this.supplier.forEach(s => I.sup[s.id] = s);
    this.stok.forEach(r => { I.stok[r.stok_id] = r; (I.stokSku[r.sku] = I.stokSku[r.sku] || []).push(r); });
    this.idx = I; this._memo = {};
  },
  apply(d) {
    let ubah = [];
    if (d.me) this.me = d.me;
    if (d.master) {
      const c = d.master.barang.cols;
      this.barang = d.master.barang.rows.map(r => { const o = {}; c.forEach((k, i) => o[k] = r[i]); return o; });
      this.kategori = d.master.kategori; this.satuan = d.master.satuan; this.lokasi = d.master.lokasi; this.supplier = d.master.supplier; ubah.push('master');
    }
    if (d.set) { this.set = d.set; ubah.push('set'); }
    if (d.users) { const u = {}; d.users.forEach(x => u[x[0]] = { nama: x[1], role: x[2], aktif: x[3] }); this.users = u; ubah.push('users'); }
    if (d.stok) {
      const c = d.stok.cols, map = r => { const o = {}; c.forEach((k, i) => o[k] = r[i]); return o; };
      if (d.stokDelta) { const by = {}; this.stok.forEach(r => by[r.stok_id] = r); d.stok.rows.forEach(r => { const o = map(r); by[o.stok_id] = o; }); this.stok = Object.values(by).filter(r => r.qty !== 0); }
      else this.stok = d.stok.rows.map(map).filter(r => r.qty !== 0);
      ubah.push('stok');
    }
    if (d.stokTs) this.stokTs = d.stokTs;
    if (d.badge) { this.badge = d.badge; ubah.push('badge'); }
    if (d.v) this.v = Object.assign({}, this.v, d.v);
    if (d.srv) this.srvDelta = d.srv - Date.now();
    this.reindex(); this.simpan();
    if (ubah.length) this.emit(ubah);
    return ubah;
  },
  async sync(paksa) {
    const have = paksa ? {} : Object.assign({}, this.v, { stokTs: this.stokTs });
    const r = await API.q('data.sync', { have, appUrl: location.origin + location.pathname });
    if (r.success) return this.apply(r.data);
    return [];
  },
  /* --- turunan --- */
  barangOf: sku => Store.idx.sku[sku], lok: id => Store.idx.lok[id] || { kode: id || '-' }, kat: id => (Store.idx.kat[id] || {}).nama || '-', sat: id => (Store.idx.sat[id] || {}).nama || '', sup: id => (Store.idx.sup[id] || {}).nama || '-',
  nama: email => email === 'darurat' ? 'Akses Darurat' : ((Store.users[email] || {}).nama || email || '-'),
  memo(k, fn) { if (!(k in this._memo)) this._memo[k] = fn(); return this._memo[k]; }
};

/* ---------------- logika stok (cermin server) ---------------- */
const Stok = {
  rows: sku => Store.idx.stokSku[sku] || [],
  lokAktif(id, karantina) { const l = Store.idx.lok[id]; return !!(l && (l.status === 'Aktif' || !l.status || (karantina && l.status === 'Karantina'))); },
  urut(sku, metode, termasukExp) {
    const h = today(), cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    return Stok.rows(sku).filter(r => r.qty > 0 && Stok.lokAktif(r.lokasi_id, termasukExp) && (termasukExp || !(r.tgl_expired && r.tgl_expired < h))).sort((a, b) => {
      if (termasukExp) { const ea = a.tgl_expired && a.tgl_expired < h ? 0 : 1, eb = b.tgl_expired && b.tgl_expired < h ? 0 : 1; if (ea !== eb) return ea - eb; }
      return metode === 'FEFO' ? cmp(a.tgl_expired || '9999', b.tgl_expired || '9999') || cmp(a.tgl_masuk || '9999', b.tgl_masuk || '9999') || cmp(a.stok_id, b.stok_id)
        : cmp(a.tgl_masuk || '9999', b.tgl_masuk || '9999') || cmp(a.tgl_expired || '9999', b.tgl_expired || '9999') || cmp(a.stok_id, b.stok_id);
    });
  },
  tersedia: (sku, exp) => Stok.urut(sku, 'FIFO', exp).reduce((t, r) => t + r.qty, 0),
  alokasi(sku, qty, exp) {
    const b = Store.barangOf(sku) || {}, out = []; let sisa = qty;
    for (const r of Stok.urut(sku, b.metode, exp)) { if (sisa <= 1e-9) break; const a = Math.min(r.qty, sisa); out.push({ r, qty: a }); sisa -= a; }
    return { baris: out, kurang: Math.max(0, sisa) };
  },
  /** Ringkasan per SKU (status Aman/Menipis/Kritis/Kedaluwarsa), di-memo per versi data. */
  ringkas() {
    return Store.memo('ringkas', () => {
      const h = today(), pct = Number(Store.set.MENIPIS_PERSEN || 50) / 100, h2 = addDays(h, Number(Store.set.EXPIRED_H2 || 30)), per = {};
      Store.barang.forEach(b => { if (b.status !== 'Nonaktif') per[b.sku] = { b, total: 0, exp: 0, nilai: 0, nearest: '', soon: 0, lok: {}, batch: 0 }; });
      Store.stok.forEach(s => { const p = per[s.sku]; if (!p || s.qty <= 0) return; p.total += s.qty; p.nilai += s.qty * (s.harga || 0); p.lok[s.lokasi_id] = (p.lok[s.lokasi_id] || 0) + s.qty; p.batch++;
        if (s.tgl_expired) { if (s.tgl_expired < h) p.exp += s.qty; else { if (!p.nearest || s.tgl_expired < p.nearest) p.nearest = s.tgl_expired; if (s.tgl_expired <= h2) p.soon += s.qty; } } });
      Object.values(per).forEach(p => { const pakai = p.total - p.exp, min = p.b.stok_minimum || 0; p.pakai = pakai;
        p.status = p.exp > 0 ? 'Kedaluwarsa' : (min > 0 && pakai < min) ? 'Kritis' : (min > 0 && pakai < min * (1 + pct)) ? 'Menipis' : 'Aman'; });
      return per;
    });
  },
  perLokasi() { return Store.memo('perlok', () => { const m = {}; Store.stok.forEach(s => { if (s.qty > 0) { const x = m[s.lokasi_id] = m[s.lokasi_id] || { qty: 0, sku: {}, rows: [] }; x.qty += s.qty; x.sku[s.sku] = 1; x.rows.push(s); } }); return m; }); },
  saranLokasi(sku) { const r = Stok.rows(sku).filter(x => x.qty > 0 && Stok.lokAktif(x.lokasi_id)); if (r.length) return r.sort((a, b) => b.qty - a.qty)[0].lokasi_id; const isi = Stok.perLokasi(); const kosong = Store.lokasi.find(l => l.status === 'Aktif' && !isi[l.id]); return kosong ? kosong.id : ''; }
};
const STATUS_STOK = { Aman: 'ok', Menipis: 'warn', Kritis: 'bad', Kedaluwarsa: 'bad' };

/* =====================================================================
   UI — toast, modal, drawer, menu, konfirmasi, tabel, kosong, skeleton
   ===================================================================== */
const UI = {
  toast(msg, tipe, opt) {
    opt = opt || {}; const wrap = $('#toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toasts', className: 'toasts' }));
    const el = document.createElement('div'); el.className = 'toast ' + (tipe || 'ok');
    el.innerHTML = icon(tipe === 'err' ? 'alert' : tipe === 'warn' ? 'warn' : tipe === 'info' ? 'info' : 'ok') + '<div class="grow">' + esc(msg) + '</div>' + (opt.aksi ? '<button>' + esc(opt.aksi.label) + '</button>' : '');
    if (opt.aksi) el.querySelector('button').onclick = () => { opt.aksi.fn(); el.remove(); };
    wrap.appendChild(el); setTimeout(() => el.remove(), opt.ms || (tipe === 'err' ? 6500 : 3800));
  },
  err(e) { UI.toast(e && e.message ? e.message : String(e), 'err'); },
  _stack: [],
  modal(o) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    const el = document.createElement('div'); el.className = (o.drawer ? 'drawer ' : 'modal ') + (o.size || ''); el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="mh">' + (o.head || '<div class="grow"><h3>' + esc(o.title || '') + '</h3>' + (o.desc ? '<div class="d">' + o.desc + '</div>' : '') + '</div>') + '<button class="x-btn" data-x aria-label="Tutup">' + icon('x') + '</button></div><div class="mb">' + (o.body || '') + '</div>' + (o.foot ? '<div class="mf">' + o.foot + '</div>' : '');
    document.body.append(scrim, el);
    const tutup = (v) => { if (el._ditutup) return; el._ditutup = true; scrim.remove(); el.remove(); UI._stack.pop(); if (o.onClose) o.onClose(v); };
    scrim.onclick = () => !o.kunci && tutup(); el.querySelector('[data-x]').onclick = () => tutup();
    UI._stack.push(tutup);
    const h = { el, tutup, body: el.querySelector('.mb'), foot: el.querySelector('.mf') };
    if (o.onOpen) o.onOpen(h);
    setTimeout(() => { const f = el.querySelector('[autofocus]'); if (f && !isMobile()) f.focus(); }, 60);
    return h;
  },
  drawer(o) { return UI.modal(Object.assign({}, o, { drawer: true })); },
  confirm(o) {
    if (typeof o === 'string') o = { msg: o };
    return new Promise(res => {
      UI.modal({ title: o.title || 'Konfirmasi', size: 'sm', body: '<div style="font-size:14px">' + o.msg + '</div>', onClose: v => res(!!v),
        foot: '<button class="btn" data-n>Batal</button><button class="btn ' + (o.danger ? 'danger' : 'pri') + '" data-y>' + esc(o.ok || 'Ya, lanjutkan') + '</button>',
        onOpen: h => { h.foot.querySelector('[data-n]').onclick = () => h.tutup(false); h.foot.querySelector('[data-y]').onclick = () => h.tutup(true); } });
    });
  },
  prompt(o) {
    return new Promise(res => {
      const inp = o.textarea ? '<textarea class="inp" id="pr-v" autofocus placeholder="' + esc(o.placeholder || '') + '">' + esc(o.value || '') + '</textarea>' : '<input class="inp" id="pr-v" autofocus type="' + (o.type || 'text') + '" placeholder="' + esc(o.placeholder || '') + '" value="' + esc(o.value || '') + '" ' + (o.attr || '') + '>';
      UI.modal({ title: o.title, size: 'sm', body: (o.msg ? '<div class="mb" style="padding:0 0 12px;font-size:13.5px">' + o.msg + '</div>' : '') + '<div class="fld">' + (o.label ? '<label>' + esc(o.label) + (o.required ? ' <span class="req">*</span>' : '') + '</label>' : '') + inp + '</div>', onClose: v => res(v === undefined ? null : v),
        foot: '<button class="btn" data-n>Batal</button><button class="btn ' + (o.danger ? 'danger' : 'pri') + '" data-y>' + esc(o.ok || 'Simpan') + '</button>',
        onOpen: h => { const go = () => { const v = h.el.querySelector('#pr-v').value.trim(); if (o.required && v.length < (o.min || 1)) { h.el.querySelector('#pr-v').classList.add('err'); return; } h.tutup(v); };
          h.foot.querySelector('[data-n]').onclick = () => h.tutup(null); h.foot.querySelector('[data-y]').onclick = go; if (!o.textarea) h.el.querySelector('#pr-v').onkeydown = e => { if (e.key === 'Enter') go(); }; } });
    });
  },
  menu(anchor, items) {
    UI.tutupMenu();
    const m = document.createElement('div'); m.className = 'menu'; m.id = 'menu-pop';
    m.innerHTML = items.map((it, i) => it.sep ? '<div class="sep"></div>' : it.h ? '<div class="h">' + esc(it.h) + '</div>' : (it.href ? '<a href="' + it.href + '" data-i="' + i + '">' : '<button data-i="' + i + '">') + (it.icon ? icon(it.icon) : '') + '<span>' + esc(it.label) + '</span>' + (it.href ? '</a>' : '</button>')).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), w = m.offsetWidth, hgt = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
    m.style.top = (r.bottom + hgt + 8 > innerHeight ? Math.max(8, r.top - hgt - 6) : r.bottom + 6) + 'px';
    m.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[b.dataset.i]; UI.tutupMenu(); if (it.fn) { e.preventDefault(); it.fn(); } };
    setTimeout(() => document.addEventListener('click', UI.tutupMenu, { once: true }), 0);
  },
  tutupMenu() { const m = $('#menu-pop'); if (m) m.remove(); },
  busy(btn, on) { if (!btn) return; btn.classList.toggle('loading', !!on); btn.disabled = !!on; },
  empty: (ic, t, d, aksi) => '<div class="empty"><div class="ib">' + icon(ic || 'box', 'lg') + '</div><div class="t">' + esc(t) + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + (aksi ? '<div class="mt">' + aksi + '</div>' : '') + '</div>',
  sk: (n, tinggi) => '<div class="card">' + '<div class="sk h"></div>' + Array.from({ length: n || 4 }, () => '<div class="sk t"></div>').join('') + (tinggi ? '<div class="sk b mt"></div>' : '') + '</div>',
  bdg(s, kelas) {
    const m = { Selesai: 'ok', Aman: 'ok', Aktif: 'ok', TERBIT: 'ok', SAH: 'ok', Disetujui: 'teal', Terkirim: 'ok', Cocok: 'ok', Disesuaikan: 'teal', Berjalan: 'teal', Y: 'ok',
      Menunggu: 'warn', MENUNGGU_TTD: 'warn', Menipis: 'warn', Terjadwal: 'navy', Draft: 'navy', DRAF: 'navy', Antri: 'navy', Karantina: 'warn', Selisih: 'warn', Belum: '',
      Kritis: 'bad', Kedaluwarsa: 'bad', Void: 'bad', Ditolak: 'bad', Batal: 'bad', Gagal: 'bad', DITARIK: 'bad', Nonaktif: '', N: '', Dilewati: '', Dihentikan: 'bad' };
    const label = { MENUNGGU_TTD: 'Menunggu TTD', DRAF: 'Draf', TERBIT: 'Terbit', DITARIK: 'Ditarik', Y: 'Aktif', N: 'Nonaktif' }[s] || s;
    return '<span class="bdg ' + (kelas || m[s] || '') + '">' + esc(label || '-') + '</span>';
  },
  pager(total, hal, per, act) {
    const n = Math.max(1, Math.ceil(total / per)); if (total <= per) return '<div class="pager">Menampilkan <b>' + F.num(total, 0) + '</b> data</div>';
    const a = Math.max(1, Math.min(hal - 2, n - 4)), btn = [];
    btn.push('<button data-act="' + act + '" data-p="' + (hal - 1) + '" ' + (hal <= 1 ? 'disabled' : '') + '>‹</button>');
    for (let i = a; i <= Math.min(n, a + 4); i++) btn.push('<button data-act="' + act + '" data-p="' + i + '" class="' + (i === hal ? 'on' : '') + '">' + i + '</button>');
    btn.push('<button data-act="' + act + '" data-p="' + (hal + 1) + '" ' + (hal >= n ? 'disabled' : '') + '>›</button>');
    return '<div class="pager">Menampilkan <b>' + F.num((hal - 1) * per + 1, 0) + '–' + F.num(Math.min(total, hal * per), 0) + '</b> dari <b>' + F.num(total, 0) + '</b><div class="pg">' + btn.join('') + '</div></div>';
  },
  /** Tabel + daftar kartu di HP. cols:[{k,label,n,w,r:(row)=>html}] */
  tabel(o) {
    if (!o.rows.length) return o.kosong || UI.empty('list', 'Belum ada data', o.kosongD || '');
    const th = o.cols.map(c => '<th class="' + (c.n ? 'n' : '') + '"' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.label) + '</th>').join('');
    const tr = o.rows.map((r, i) => '<tr class="' + (o.act ? 'clk ' : '') + (o.kelas ? o.kelas(r) : '') + '"' + (o.act ? ' data-act="' + o.act + '" data-id="' + esc(o.id ? o.id(r) : i) + '"' : '') + '>' + o.cols.map(c => '<td class="' + (c.n ? 'n' : '') + '">' + (c.r ? c.r(r) : esc(r[c.k])) + '</td>').join('') + '</tr>').join('');
    const ml = o.kartu ? '<div class="mlist">' + o.rows.map((r, i) => '<div class="mitem ' + (o.act ? 'clk' : '') + '"' + (o.act ? ' data-act="' + o.act + '" data-id="' + esc(o.id ? o.id(r) : i) + '"' : '') + '>' + o.kartu(r) + '</div>').join('') + '</div>' : '';
    return '<div class="tbl-wrap ' + (o.kartu ? 'mobile-cards' : '') + '"><table class="tbl"><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>' + ml + '</div>';
  },
  thumb: (url, ic) => '<div class="thumb">' + (url ? '<img loading="lazy" src="' + esc(url) + '" alt="" onerror="this.remove()">' : icon(ic || 'package')) + '</div>',
  avatar: nama => '<div class="avatar">' + esc(String(nama || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()) + '</div>'
};
/* aksi global lewat data-act (delegasi event) */
const ACT = {};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
  const fn = ACT[a.dataset.act]; if (fn) { e.preventDefault(); fn(a, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#menu-pop')) return UI.tutupMenu(); if (Cmdk.el) return Cmdk.tutup(); const t = UI._stack[UI._stack.length - 1]; if (t) t(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && Store.me) { e.preventDefault(); Cmdk.buka(); }
});

/* =====================================================================
   PUSTAKA EKSTERNAL (dimuat saat dibutuhkan, di-cache service worker)
   ===================================================================== */
const Lib = {
  url: {
    xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
    autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.9/dist/jspdf.plugin.autotable.min.js',
    scanner: 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
    barcode: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js',
    qr: 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js',
    gis: 'https://accounts.google.com/gsi/client'
  },
  _p: {},
  load(...names) { return Promise.all(names.map(n => this._p[n] || (this._p[n] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = this.url[n]; s.async = true; s.onload = res; s.onerror = () => { delete this._p[n]; rej(new Error('Gagal memuat pustaka ' + n + '. Periksa internet.')); }; document.head.appendChild(s); })))); }
};

/* ---------------- ekspor Excel / PDF (FR-33) ---------------- */
const Ekspor = {
  nilai(c, r) { const v = r[c.k]; return c.t === 'n' || c.t === 'rp' || c.t === 'p' ? (v === '' || v == null ? '' : Number(v)) : (v == null ? '' : String(v)); },
  async excel(judul, kolom, rows, meta) {
    await Lib.load('xlsx');
    const aoa = [[judul], [meta || ''], [], kolom.map(c => c.label)].concat(rows.map(r => kolom.map(c => Ekspor.nilai(c, r))));
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = kolom.map(c => ({ wch: Math.min(40, Math.max(10, c.label.length + 2, ...rows.slice(0, 200).map(r => String(r[c.k] == null ? '' : r[c.k]).length))) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, judul.replace(/[^\w\- ]+/g, '').trim() + ' ' + today() + '.xlsx');
  },
  async pdf(judul, kolom, rows, meta) {
    await Lib.load('jspdf'); await Lib.load('autotable');
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: kolom.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 37, 69); doc.rect(0, 0, w, 56, 'F'); doc.setTextColor(255); doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text(judul, 32, 26);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.text((Store.set.NAMA_PERUSAHAAN || 'GudangPro OS') + (meta ? ' · ' + meta : ''), 32, 42);
    const fmt = (c, v) => v === '' || v == null ? '' : c.t === 'rp' ? F.rp(v) : c.t === 'n' ? F.num(v) : c.t === 'p' ? F.pct(v) : c.t === 'd' ? F.tgl(v) : String(v);
    const opsi = { head: [kolom.map(c => c.label)], body: rows.map(r => kolom.map(c => fmt(c, r[c.k]))), startY: 70, styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [14, 154, 167] }, alternateRowStyles: { fillColor: [244, 246, 249] },
      columnStyles: Object.fromEntries(kolom.map((c, i) => [i, { halign: ['n', 'rp', 'p'].includes(c.t) ? 'right' : 'left' }])),
      didDrawPage: d => { doc.setFontSize(8); doc.setTextColor(120); doc.text('Dicetak ' + F.tglJam(today() + ' ' + new Date().toTimeString().slice(0, 8)) + ' · GudangPro OS · hal ' + doc.internal.getNumberOfPages(), 32, doc.internal.pageSize.getHeight() - 16); } };
    if (typeof doc.autoTable === 'function') doc.autoTable(opsi); else window.jspdf_autotable ? window.jspdf_autotable.autoTable(doc, opsi) : window.autoTable(doc, opsi);
    doc.save(judul.replace(/[^\w\- ]+/g, '').trim() + ' ' + today() + '.pdf');
  },
  csvTemplate(nama, header, contoh) {
    const csv = [header.join(','), ...(contoh || []).map(r => r.map(v => /[,"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
};

/* ---------------- gambar: kompres di browser sebelum diunggah ---------------- */
const Gambar = {
  baca: f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }),
  async kompres(file, maks, mutu) {
    if (!/^image\//.test(file.type)) return { base64: await Gambar.baca(file), mime: file.type, nama: file.name };
    const url = await Gambar.baca(file), img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, (maks || 1600) / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { base64: c.toDataURL('image/jpeg', mutu || 0.8), mime: 'image/jpeg', nama: file.name.replace(/\.\w+$/, '') + '.jpg' };
  },
  pilih(accept, capture) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || 'image/*'; if (capture) i.capture = 'environment'; i.onchange = () => res(i.files[0] || null); i.click(); }); }
};

/* =====================================================================
   PEMINDAI BARCODE/QR (FR-17, FR-18, FR-19)
   ===================================================================== */
const Scanner = {
  inst: null, torch: false, suara: LS.get('gp_beep', true),
  beep() { if (!this.suara) return; try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1180; g.gain.value = .08; o.connect(g); g.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, 120); } catch (e) { /* abaikan */ } if (navigator.vibrate) navigator.vibrate(60); },
  async mulai(elId, onKode) {
    await this.henti();
    await Lib.load('scanner');
    const F_ = window.Html5QrcodeSupportedFormats || {};
    const fmt = ['QR_CODE', 'EAN_13', 'EAN_8', 'CODE_128', 'CODE_39', 'UPC_A', 'UPC_E', 'ITF', 'DATA_MATRIX'].map(k => F_[k]).filter(x => x !== undefined);
    this.inst = new Html5Qrcode(elId, { formatsToSupport: fmt, verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
    let terakhir = '', waktu = 0;
    await this.inst.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w, h) => ({ width: Math.min(w * 0.82, 360), height: Math.min(h * 0.5, 220) }), aspectRatio: undefined },
      txt => { const now = Date.now(); if (txt === terakhir && now - waktu < 2500) return; terakhir = txt; waktu = now; this.beep(); onKode(String(txt).trim()); }, () => {});
  },
  async henti() { if (this.inst) { try { if (this.inst.isScanning) await this.inst.stop(); this.inst.clear(); } catch (e) { /* abaikan */ } this.inst = null; } this.torch = false; },
  async senter() { try { this.torch = !this.torch; await this.inst.applyVideoConstraints({ advanced: [{ torch: this.torch }] }); return true; } catch (e) { this.torch = false; UI.toast('Senter tidak didukung perangkat ini.', 'warn'); return false; } },
  /** Cari kode di data lokal → {jenis:'barang'|'lokasi'|'batch', data} */
  kenali(kode) {
    const k = String(kode || '').trim(), K = k.toUpperCase();
    const b = Store.idx.bc[k] || Store.idx.sku[K]; if (b) return { jenis: 'barang', data: b };
    const l = Store.idx.lokKode[K] || Store.idx.lokKode[K.replace(/^LOK-/, '')]; if (l) return { jenis: 'lokasi', data: l };
    const s = Store.stok.find(x => String(x.batch_no).toUpperCase() === K); if (s) return { jenis: 'batch', data: s, barang: Store.barangOf(s.sku) };
    return null;
  },
  /** Ambil satu kode lewat kamera (dipakai di form). mode: 'barang'|'lokasi'|'semua' */
  ambil(mode, judul) {
    return new Promise(res => {
      let selesai = false;
      const el = document.createElement('div'); el.className = 'scan-screen';
      el.innerHTML = '<div class="scan-top"><button class="icon-btn" data-x>' + icon('arrowl') + '</button><h2>' + esc(judul || 'Pindai ' + (mode === 'lokasi' ? 'Lokasi Rak/Bin' : 'Barcode Barang')) + '</h2><button class="icon-btn" data-t>' + icon('flash') + '</button></div>' +
        '<div class="scan-cam"><div id="qr-pick"></div><div class="scan-frame"><i></i><i></i><i></i><i></i><div class="laser"></div></div><div class="scan-hint"><span class="pill" data-m>' + icon('keyboard') + 'Input manual</span></div></div>';
      document.body.appendChild(el);
      const tutup = async v => { if (selesai) return; selesai = true; await Scanner.henti(); el.remove(); res(v || null); };
      el.querySelector('[data-x]').onclick = () => tutup(null);
      el.querySelector('[data-t]').onclick = () => Scanner.senter();
      el.querySelector('[data-m]').onclick = async () => { await Scanner.henti(); const v = await UI.prompt({ title: 'Input manual', label: mode === 'lokasi' ? 'Kode lokasi (mis. A-02-03)' : 'SKU / barcode', required: true, ok: 'Gunakan' }); tutup(v); };
      Scanner.mulai('qr-pick', kode => tutup(kode)).catch(e => { UI.toast('Kamera tidak dapat dibuka: ' + (e.message || e) + '. Gunakan input manual.', 'warn'); });
    });
  }
};

/* =====================================================================
   AUTH — Google Identity Services + akses darurat
   ===================================================================== */
const Auth = {
  async init() {
    API.token = LS.get('gp_token', '');
    if (!API.token) return false;
    Store.load();
    return !!Store.me;
  },
  simpan(token, me) { API.token = token; LS.set('gp_token', token); Store.me = me; Store.simpan(); },
  async keluar(semua) {
    if (semua && !(await UI.confirm({ title: 'Keluar dari semua perangkat?', msg: 'Semua sesi akun ini di HP & komputer lain akan diakhiri.', ok: 'Keluar semua', danger: true }))) return;
    API.call(semua ? 'auth.logoutSemua' : 'auth.logout', { token: API.token });
    await sleep(semua ? 600 : 150);
    Auth.bersihkan(); location.hash = ''; location.reload();
  },
  bersihkan() { LS.del('gp_token'); API.token = ''; Store.bersih(); try { Object.keys(localStorage).filter(k => k.indexOf('gp_swr_') === 0 || k.indexOf('gp_draft_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* abaikan */ } },
  expired() { if (Auth._exp) return; Auth._exp = true; Auth.bersihkan(); UI.toast('Sesi Anda berakhir. Silakan masuk kembali.', 'warn'); setTimeout(() => { location.hash = ''; location.reload(); }, 1200); },
  warm() { const k = 'gp_warm_pub', t = Number(sessionStorage.getItem(k) || 0); if (!KONFIG_OK || Date.now() - t < 240000) return; sessionStorage.setItem(k, Date.now()); fetch(GAS_URL + '?w=pub', { mode: 'no-cors' }).catch(() => {}); },
  async tampilLogin() {
    document.body.classList.remove('in-app');
    const darurat = location.hash.replace(/^#\/?/, '') === 'darurat';
    const root = $('#root');
    root.innerHTML = '<div class="login"><div class="art"><div class="row"><div class="logo">' + icon('warehouse', 'lg') + '</div><div><div style="font-weight:800;font-size:19px">GudangPro <span class="kbd" style="background:transparent;color:#8DF2FF;border-color:rgba(141,242,255,.4)">OS</span></div><div style="font-size:12px;color:#9FB3CC">WMS & Inventory Control</div></div></div>' +
      '<h1>Stok akurat, lokasi jelas, gudang terkendali.</h1><p>Catat barang masuk–keluar, FIFO/FEFO otomatis, opname dengan scan kamera HP, dan pantau semuanya dari satu dashboard.</p>' +
      '<div class="feat"><div>' + icon('scan') + 'Scan barcode dari HP</div><div>' + icon('hourglass') + 'FIFO / FEFO otomatis</div><div>' + icon('pin') + 'Lokasi blok-rak-bin</div><div>' + icon('approval') + 'Approval & audit trail</div></div></div>' +
      '<div class="form"><div class="box"><div class="logo only-m">' + icon('warehouse', 'lg') + '</div>' + (darurat ? Auth.formDarurat() : Auth.formGoogle()) + '<div class="tiny muted mt" style="text-align:center">GudangPro OS v' + APP_VER + ' · ' + esc(Device.label) + '</div></div></div></div>';
    Auth.warm();
    if (darurat) return Auth.ikatDarurat();
    if (!KONFIG_OK) return;
    const cfg = await API.call('auth.config', {});
    const kotak = $('#g-area');
    if (!cfg.success) { kotak.innerHTML = '<div class="note bad">' + icon('alert') + '<div>' + esc(cfg.message) + '</div></div>'; return; }
    if (cfg.data.perusahaan) $('#lg-perusahaan').textContent = cfg.data.perusahaan;
    if (!cfg.data.siap) { kotak.innerHTML = '<div class="note warn">' + icon('warn') + '<div>Backend belum disiapkan. Jalankan <b>setupAppEnvironment()</b> di editor Apps Script.</div></div>'; return; }
    if (!cfg.data.googleClientId) { kotak.innerHTML = '<div class="note warn">' + icon('key') + '<div>Login Google belum dikonfigurasi. Super Admin: masuk lewat halaman akses darurat (lihat panduan instalasi), lalu isi <b>Google Client ID</b> di Pengaturan → Keamanan.</div></div>'; return; }
    try {
      await Lib.load('gis');
      google.accounts.id.initialize({ client_id: cfg.data.googleClientId, callback: Auth.onGoogle, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup' });
      kotak.innerHTML = '<div id="g-btn"></div>';
      google.accounts.id.renderButton($('#g-btn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: Math.min(340, kotak.offsetWidth || 320) });
    } catch (e) { kotak.innerHTML = '<div class="note bad">' + icon('alert') + '<div>' + esc(e.message) + '</div></div>'; }
  },
  formGoogle() {
    return '<h2>Masuk ke GudangPro</h2><div class="muted" id="lg-perusahaan">Gunakan akun Google yang sudah didaftarkan Super Admin.</div>' +
      (KONFIG_OK ? '<div class="gbtn-wrap" id="g-area"><div class="sk" style="height:44px;width:280px;border-radius:22px"></div></div>' : '<div class="note bad mt">' + icon('alert') + '<div><b>Konfigurasi belum lengkap.</b> Isi URL Web App Apps Script (berakhiran <span class="mono">/exec</span>) di berkas <span class="mono">js/config.js</span>, lalu unggah ulang ke GitHub.</div></div>') +
      '<div id="lg-msg"></div><div class="note mt">' + icon('lock') + '<div class="small">Hak akses (Staf, Kepala Gudang, Purchasing, Owner, Super Admin) diperiksa di server untuk setiap aksi.</div></div>';
  },
  formDarurat() {
    return '<h2>Akses Darurat</h2><div class="muted small">Khusus Super Admin saat login Google belum dikonfigurasi atau bermasalah. Setiap percobaan dicatat di log.</div>' +
      '<form id="f-darurat" class="col mt"><div class="fld"><label>Nama pengguna</label><input class="inp" name="u" autocomplete="username" required></div><div class="fld"><label>Kata sandi</label><input class="inp" name="p" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn pri block lg" type="submit">' + icon('login') + 'Masuk</button><div id="lg-msg"></div><a href="#" class="small" style="text-align:center">Kembali ke login Google</a></form>';
  },
  ikatDarurat() {
    $('#f-darurat').onsubmit = async e => {
      e.preventDefault(); const f = e.target, btn = f.querySelector('button'); UI.busy(btn, true); $('#lg-msg').innerHTML = '';
      const r = await API.call('auth.darurat', { username: f.u.value.trim(), password: f.p.value });
      UI.busy(btn, false);
      if (!r.success) { $('#lg-msg').innerHTML = '<div class="note bad">' + icon('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
      f.p.value = ''; Auth.simpan(r.data.token, r.data.me); location.hash = '#/pengaturan/keamanan'; App.mulai();
    };
    $('#f-darurat a').onclick = e => { e.preventDefault(); location.hash = ''; Auth.tampilLogin(); };
  },
  async onGoogle(resp) {
    const msg = $('#lg-msg'); if (msg) msg.innerHTML = '<div class="note mt">' + icon('clock') + '<div>Memverifikasi akun…</div></div>';
    const r = await API.call('auth.google', { credential: resp.credential });
    if (!r.success) { if (msg) msg.innerHTML = '<div class="note bad mt">' + icon('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
    Auth.simpan(r.data.token, r.data.me); App.mulai();
  }
};

/* =====================================================================
   ROUTER (SPA hash) + registri halaman
   ===================================================================== */
const Pages = {};
function Page(id, def) { Pages[id] = def; }
const Router = {
  cur: null, params: {},
  parse() {
    const h = location.hash.replace(/^#\/?/, ''), [p, q] = h.split('?'), seg = p.split('/').filter(Boolean);
    const query = {}; new URLSearchParams(q || '').forEach((v, k) => query[k] = v);
    return { seg, query, raw: h };
  },
  go(h) { if (location.hash === h) Router.jalan(); else location.hash = h; },
  async jalan() {
    if (!Store.me) return;
    const { seg, query } = Router.parse();
    const id = seg[0] || 'dashboard', page = Pages[id];
    UI._stack.slice().reverse().forEach(t => t()); UI.tutupMenu(); Cmdk.tutup();
    $('.sidebar') && $('.sidebar').classList.remove('open');
    if (!page) return Router.go('#/dashboard');
    if (page.roles && !can(...page.roles)) { UI.toast('Menu ini tidak tersedia untuk peran ' + ROLE_LABEL[Store.me.role] + '.', 'warn'); return Router.go('#/dashboard'); }
    if (Router.cur && Router.cur.page.leave) try { Router.cur.page.leave(); } catch (e) { /* abaikan */ }
    Router.cur = { id, page, seg, query };
    App.aktifkanMenu(id);
    const el = $('#view'); el.innerHTML = ''; el.scrollTop = 0; window.scrollTo(0, 0);
    document.title = (page.title || 'GudangPro OS') + ' · GudangPro OS';
    const tt = $('#tb-title'); if (tt) tt.textContent = page.title || '';
    try { await page.render(el, seg.slice(1), query); } catch (e) { console.error(e); el.innerHTML = '<div class="card">' + UI.empty('alert', 'Halaman gagal dimuat', esc(e.message)) + '</div>'; }
  },
  /** render ulang halaman aktif bila data Store berubah (tanpa reload) */
  segarkan(what) { const c = Router.cur; if (c && c.page.onStore && $('#view')) try { c.page.onStore(what); } catch (e) { console.error(e); } }
};
window.addEventListener('hashchange', () => { if (Store.me) Router.jalan(); else if (location.hash.indexOf('darurat') >= 0 || location.hash === '') Auth.tampilLogin(); });

/* =====================================================================
   PALET PERINTAH (Ctrl/⌘ K) — cari SKU, nama, batch, lokasi, menu
   ===================================================================== */
const Cmdk = {
  el: null, i: 0, hasil: [],
  buka(awal) {
    if (this.el) return;
    const s = document.createElement('div'); s.className = 'scrim'; s.onclick = () => this.tutup();
    const el = document.createElement('div'); el.className = 'cmdk';
    el.innerHTML = '<div class="in">' + icon('search') + '<input id="ck-q" placeholder="Cari SKU, nama barang, nomor batch, kode bin (mis. A-02-03)…" autocomplete="off"><span class="kbd">Esc</span></div><div class="res" id="ck-r"></div>';
    document.body.append(s, el); this.el = el; this.scrim = s;
    const q = el.querySelector('#ck-q'); q.value = awal || ''; q.focus();
    q.oninput = () => this.cari(q.value); q.onkeydown = e => { if (e.key === 'ArrowDown') { this.i = Math.min(this.i + 1, this.hasil.length - 1); this.tandai(); e.preventDefault(); } else if (e.key === 'ArrowUp') { this.i = Math.max(this.i - 1, 0); this.tandai(); e.preventDefault(); } else if (e.key === 'Enter' && this.hasil[this.i]) this.pilih(this.i); };
    el.querySelector('#ck-r').onclick = e => { const it = e.target.closest('[data-i]'); if (it) this.pilih(+it.dataset.i); };
    this.cari(q.value);
  },
  tutup() { if (!this.el) return; this.el.remove(); this.scrim.remove(); this.el = null; },
  cari(q) {
    q = String(q || '').trim().toLowerCase(); const out = [];
    const menu = App.menuUntuk().filter(m => m.r);
    if (!q) menu.slice(0, 8).forEach(m => out.push({ g: 'Menu', ic: m.ic, t: m.l, d: 'Buka menu', go: '#/' + m.r }));
    else {
      Store.barang.filter(b => (b.sku + ' ' + b.nama_barang + ' ' + b.barcode).toLowerCase().includes(q)).slice(0, 8).forEach(b => { const r = Stok.ringkas()[b.sku]; out.push({ g: 'Barang', ic: 'package', t: b.nama_barang, d: b.sku + ' · stok ' + F.num(r ? r.total : 0) + ' ' + Store.sat(b.satuan_id), go: '#/stok?sku=' + encodeURIComponent(b.sku) }); });
      Store.lokasi.filter(l => String(l.kode).toLowerCase().includes(q)).slice(0, 5).forEach(l => out.push({ g: 'Lokasi', ic: 'pin', t: 'Bin ' + l.kode, d: (l.zona || '') + ' · ' + F.num((Stok.perLokasi()[l.id] || { qty: 0 }).qty) + ' unit', go: '#/stok?lok=' + encodeURIComponent(l.id) }));
      Store.stok.filter(s => String(s.batch_no).toLowerCase().includes(q)).slice(0, 5).forEach(s => out.push({ g: 'Batch', ic: 'layers', t: s.batch_no + ' · ' + ((Store.barangOf(s.sku) || {}).nama_barang || s.sku), d: Store.lok(s.lokasi_id).kode + ' · ' + F.num(s.qty) + (s.tgl_expired ? ' · exp ' + F.tgl(s.tgl_expired) : ''), go: '#/stok?sku=' + encodeURIComponent(s.sku) }));
      if (/^[a-z]{2,4}\/\d{4}/i.test(q)) out.push({ g: 'Dokumen', ic: 'file', t: 'Cari dokumen "' + q.toUpperCase() + '"', d: 'Daftar transaksi', go: '#/trx?q=' + encodeURIComponent(q) });
      menu.filter(m => m.l.toLowerCase().includes(q)).slice(0, 4).forEach(m => out.push({ g: 'Menu', ic: m.ic, t: m.l, d: 'Buka menu', go: '#/' + m.r }));
    }
    this.hasil = out; this.i = 0;
    let g = '';
    $('#ck-r').innerHTML = out.length ? out.map((x, i) => (x.g !== g ? '<div class="grp">' + (g = x.g) + '</div>' : '') + '<div class="it" data-i="' + i + '"><div class="thumb" style="width:34px;height:34px">' + icon(x.ic) + '</div><div class="grow"><div class="t ellipsis">' + esc(x.t) + '</div><div class="d ellipsis">' + esc(x.d) + '</div></div></div>').join('') : '<div class="empty">Tidak ditemukan.</div>';
    this.tandai();
  },
  tandai() { $$('#ck-r .it').forEach((e, i) => e.classList.toggle('on', i === this.i)); const on = $('#ck-r .it.on'); if (on) on.scrollIntoView({ block: 'nearest' }); },
  pilih(i) { const x = this.hasil[i]; this.tutup(); if (x) Router.go(x.go); }
};

/* =====================================================================
   PWA — service worker, tombol pasang, pembaruan versi
   ===================================================================== */
const PWA = {
  prompt: null,
  init() {
    if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
      navigator.serviceWorker && navigator.serviceWorker.register('./sw.js').then(reg => {
        reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Versi baru GudangPro tersedia.', 'info', { ms: 15000, aksi: { label: 'Muat ulang', fn: () => { w.postMessage('skipWaiting'); setTimeout(() => location.reload(), 300); } } }); }); });
      }).catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA.prompt = e; $$('.pwa-install').forEach(b => b.hidden = false); });
    window.addEventListener('appinstalled', () => { PWA.prompt = null; $$('.pwa-install').forEach(b => b.hidden = true); UI.toast('GudangPro terpasang di perangkat Anda.'); });
  },
  async pasang() {
    if (PWA.prompt) { PWA.prompt.prompt(); await PWA.prompt.userChoice; PWA.prompt = null; return; }
    UI.modal({ title: 'Pasang GudangPro di HP', size: 'sm', body: '<div class="col small"><div><b>Android (Chrome):</b> ketuk menu ⋮ → <b>Tambahkan ke layar utama / Instal aplikasi</b>.</div><div><b>iPhone (Safari):</b> ketuk tombol Bagikan ⬆ → <b>Tambah ke Layar Utama</b>.</div><div class="muted">Setelah terpasang, GudangPro terbuka layar penuh seperti aplikasi biasa dan memuat lebih cepat.</div></div>' });
  }
};

/* ---------------- aktivitas & polling adaptif ---------------- */
const Activity = { at: Date.now(), last: {},
  init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(ev => addEventListener(ev, () => this.at = Date.now(), { passive: true })); },
  idle() { return Date.now() - this.at > 120000; },
  due(k, aktif, diam) { if (document.visibilityState !== 'visible') return false; if (Date.now() - (this.last[k] || 0) < (this.idle() ? diam : aktif) - 500) return false; this.last[k] = Date.now(); return true; } };
