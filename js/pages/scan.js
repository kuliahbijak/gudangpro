/* GudangPro OS — Scanner barcode/QR kamera HP (FR-17, FR-18, FR-19) */
Page('scan', {
  title: 'Scanner',
  render(el, seg, q) {
    this.mode = q.mode === 'lokasi' ? 'lokasi' : 'barang'; this.hasil = null; this.aksi = LS.get('gp_scan_aksi', 'out');
    el.innerHTML = '';
    const s = document.createElement('div'); s.className = 'scan-screen'; s.id = 'scan-scr';
    s.innerHTML = '<div class="scan-top"><button class="icon-btn" data-act="sc.kembali" aria-label="Kembali">' + icon('arrowl') + '</button><h2>Scanner</h2>' +
      '<button class="icon-btn" data-act="sc.senter" aria-label="Senter">' + icon('flash') + '</button><button class="icon-btn" data-act="sc.suara" aria-label="Suara" id="sc-suara" style="opacity:' + (Scanner.suara ? 1 : .45) + '">' + icon('sound') + '</button>' +
      '<a class="icon-btn" href="#/profil" aria-label="Profil" style="background:var(--teal-d);border-color:var(--teal-d)">' + icon('user') + '</a></div>' +
      '<div class="scan-cam"><div id="qr-reader"></div><div class="scan-mode"><button data-act="sc.mode" data-m="barang" class="' + (this.mode === 'barang' ? 'on' : '') + '">' + icon('qr', 'sm') + 'Pindai SKU Produk</button><button data-act="sc.mode" data-m="lokasi" class="' + (this.mode === 'lokasi' ? 'on' : '') + '">' + icon('pin', 'sm') + 'Lokasi Rak/Bin</button></div>' +
      '<div class="scan-frame"><i></i><i></i><i></i><i></i><div class="laser"></div></div>' +
      '<div class="scan-hint"><span class="pill" data-act="sc.manual">' + icon('keyboard') + 'Barcode buram? Input manual</span></div>' +
      '<div id="sc-cam-msg" style="position:absolute;inset:0;display:grid;place-items:center;z-index:1;color:#9FB3CC;font-size:13px;text-align:center;padding:30px">Menyalakan kamera…</div></div>' +
      '<div class="scan-sheet" id="sc-sheet"><div class="grab"></div>' + this.sheetKosong() + '</div>';
    document.body.appendChild(s);
    this.nyalakan();
  },
  leave() { Scanner.henti(); const s = $('#scan-scr'); if (s) s.remove(); },
  async nyalakan() {
    const msg = $('#sc-cam-msg');
    try {
      await Scanner.mulai('qr-reader', kode => this.dapat(kode));
      if (msg) msg.remove();
    } catch (e) {
      if (msg) msg.innerHTML = '<div>' + icon('camera', 'xl') + '<div class="mt-s">Kamera tidak dapat dibuka.</div><div class="tiny mt-s">' + esc(e && e.message ? e.message : String(e)) + '</div><div class="tiny mt-s">Pastikan izin kamera diberikan dan aplikasi dibuka lewat HTTPS (bukan di dalam iframe). Gunakan input manual sebagai cadangan.</div></div>';
    }
  },
  sheetKosong() {
    return '<div class="row between"><div class="small b">Arahkan kamera ke barcode ' + (this.mode === 'lokasi' ? 'label bin (mis. A-02-03)' : 'produk / QR batch') + '</div><span class="bdg ' + (API.online ? 'ok' : 'warn') + ' nodot">' + icon(API.online ? 'synced' : 'offline', 'sm') + (API.online ? 'GSheets Online' : 'Offline') + ' · Data lokal siap</span></div>' +
      '<div class="small muted mt-s">' + F.num(Store.barang.length, 0) + ' SKU dan ' + F.num(Store.lokasi.length, 0) + ' lokasi tersimpan di perangkat — hasil pindai muncul seketika tanpa menunggu server.</div>' +
      '<div class="qa">' + this.tombolAksi() + '</div>';
  },
  tombolAksi() {
    const a = [['in', 'Inbound', 'in', ''], ['out', 'Picking', 'out', 'o'], ['mutasi', 'Mutasi', 'mutasi', 'm'], ['opname', 'Opname', 'opname', 'p']].filter(x => x[0] === 'opname' ? can('STAF', 'KEPALA', 'OWNER', 'SUPERADMIN') : can(...R_OPS));
    return a.map(x => '<button class="' + x[3] + '" data-act="sc.aksi" data-a="' + x[0] + '" style="' + (this.aksi === x[0] && this.hasil ? 'outline:2px solid var(--teal)' : '') + '">' + icon(x[2]) + x[1] + '</button>').join('');
  },
  dapat(kode) {
    const x = Scanner.kenali(kode), sheet = $('#sc-sheet'); if (!sheet) return;
    this.hasil = x ? Object.assign({ kode }, x) : { kode, jenis: 'tidak' };
    if (!x) {
      sheet.innerHTML = '<div class="grab"></div><div class="scan-res">' + UI.thumb('', 'alert') + '<div class="grow"><div class="b">Kode tidak dikenal</div><div class="mono small">' + esc(kode) + '</div></div></div>' +
        '<div class="small muted mt-s">Kode ini belum terdaftar sebagai barcode SKU, kode lokasi, atau nomor batch.</div><div class="col mt">' + (can('KEPALA', 'SUPERADMIN') ? '<a class="btn pri block lg" href="#/master/barang?baru=1&barcode=' + encodeURIComponent(kode) + '">' + icon('pkgplus') + 'Daftarkan sebagai SKU baru</a>' : '') + '<button class="btn block" data-act="sc.lagi">' + icon('refresh') + 'Pindai lagi</button></div>';
      return;
    }
    if (x.jenis === 'lokasi') {
      const l = x.data, isi = Stok.perLokasi()[l.id] || { qty: 0, sku: {}, rows: [] };
      sheet.innerHTML = '<div class="grab"></div><div class="scan-res"><div class="thumb" style="background:var(--teal-d);color:#fff">' + icon('pin', 'lg') + '</div><div class="grow"><div class="row between"><span class="tagk">BIN ' + esc(l.kode) + '</span><span class="t-ok small b">' + icon('verified', 'sm') + ' Valid</span></div><div class="bb" style="font-size:18px">' + esc(l.zona || 'Lokasi') + '</div><div class="small muted">Blok ' + esc(l.blok) + ' · Rak ' + esc(l.rak) + ' · Bin ' + esc(l.bin) + ' · ' + UI.bdg(l.status) + '</div></div></div>' +
        '<div class="scan-grid"><div><div class="small muted">' + icon('package', 'sm') + ' Isi bin</div><div style="font-size:28px;font-weight:800" class="num">' + F.num(isi.qty, 0) + '</div><div class="small t-teal">' + Object.keys(isi.sku).length + ' SKU · ' + isi.rows.length + ' batch</div></div><div class="fefo"><div class="small muted">' + icon('gauge', 'sm') + ' Kapasitas</div><div style="font-size:28px;font-weight:800" class="num">' + (l.kapasitas ? F.num(isi.qty / l.kapasitas * 100, 0) + '%' : '—') + '</div><div class="small">' + (l.kapasitas ? F.num(l.kapasitas, 0) + ' maks' : 'tidak dibatasi') + '</div></div></div>' +
        (isi.rows.length ? '<div class="col gap-s">' + isi.rows.slice(0, 4).map(r => '<div class="row small"><span class="tagk">' + esc(r.sku) + '</span><span class="grow ellipsis">' + esc((Store.barangOf(r.sku) || {}).nama_barang || '') + '</span><b class="num">' + F.num(r.qty) + '</b></div>').join('') + '</div>' : '') +
        '<div class="col mt"><a class="btn pri block lg" href="#/stok?lok=' + l.id + '">' + icon('boxes') + 'Lihat Isi Bin</a><div class="row">' + (can(...R_OPS) ? '<a class="btn grow" style="justify-content:center" href="#/in?lok=' + l.id + '">' + icon('in') + 'Putaway</a><a class="btn grow" style="justify-content:center" href="#/mutasi?asal=' + l.id + '">' + icon('mutasi') + 'Mutasi</a>' : '') + '<button class="btn grow" style="justify-content:center" data-act="sc.lagi">' + icon('refresh') + 'Lagi</button></div></div>';
      return;
    }
    const b = x.barang || x.data, r = Stok.ringkas()[b.sku] || { total: 0, lok: {} }, fefo = Stok.urut(b.sku, b.metode, false)[0];
    sheet.innerHTML = '<div class="grab"></div><div class="scan-res">' + UI.thumb(b.foto_url).replace('class="thumb"', 'class="thumb" style="width:64px;height:64px"') + '<div class="grow" style="min-width:0"><div class="row between"><span class="tagk" style="background:var(--teal-d);color:#fff">' + esc(b.sku) + '</span><span class="t-ok small b">' + icon('verified', 'sm') + ' Valid</span></div><div class="bb ellipsis" style="font-size:17px;margin-top:4px">' + esc(b.nama_barang) + '</div><div class="small muted">Barcode: <span class="mono">' + esc(b.barcode || '-') + '</span> · ' + esc(Store.kat(b.kategori_id)) + '</div></div></div>' +
      (x.jenis === 'batch' ? '<div class="note mt-s" style="padding:8px 12px">' + icon('layers') + '<div class="small">Batch <b class="mono">' + esc(x.data.batch_no) + '</b> di ' + esc(Store.lok(x.data.lokasi_id).kode) + ' · ' + F.num(x.data.qty) + ' unit</div></div>' : '') +
      '<div class="scan-grid"><div><div class="small muted">' + icon('archive', 'sm') + ' Total Stok Fisik</div><div style="font-size:30px;font-weight:800" class="num">' + F.num(r.total) + ' <span style="font-size:15px;font-weight:600" class="muted">' + esc(Store.sat(b.satuan_id)) + '</span></div><div class="small t-teal">Tersebar di ' + Object.keys(r.lok).length + ' bin</div></div>' +
      '<div class="fefo"><div class="small muted">' + icon('hourglass', 'sm') + ' Bin Ambil (' + esc(b.metode) + ')</div>' + (fefo ? '<div style="font-size:24px;font-weight:800" class="mono">' + esc(Store.lok(fefo.lokasi_id).kode) + '</div><div class="small t-teal">' + F.num(fefo.qty) + ' · ' + esc(fefo.batch_no) + '</div><div class="small">' + (fefo.tgl_expired ? 'Exp: ' + F.tgl(fefo.tgl_expired) : 'Masuk: ' + F.tgl(fefo.tgl_masuk)) + '</div>' : '<div class="b t-bad mt-s">Stok kosong</div>') + '</div></div>' +
      '<div class="row between small"><b>Pilih Aksi Cepat Operasional:</b><span class="t-teal">' + esc(ROLE_LABEL[Store.me.role]) + '</span></div><div class="qa">' + this.tombolAksi() + '</div>' +
      '<div class="col">' + (can(...R_OPS) ? '<button class="btn pri block lg" data-act="sc.lanjut">Lanjutkan Transaksi ' + icon('arrowr') + '</button>' : '<a class="btn pri block lg" href="#/stok?sku=' + encodeURIComponent(b.sku) + '">Lihat Detail Stok ' + icon('arrowr') + '</a>') + '<button class="btn soft block" data-act="sc.lagi">' + icon('refresh') + 'Pindai Barang Lainnya</button></div>';
  }
});
ACT['sc.kembali'] = () => history.length > 1 ? history.back() : Router.go('#/dashboard');
ACT['sc.senter'] = () => Scanner.senter();
ACT['sc.suara'] = () => { Scanner.suara = !Scanner.suara; LS.set('gp_beep', Scanner.suara); $('#sc-suara').style.opacity = Scanner.suara ? 1 : .45; };
ACT['sc.mode'] = el => { const p = Pages.scan; p.mode = el.dataset.m; $$('.scan-mode button').forEach(b => b.classList.toggle('on', b.dataset.m === p.mode)); if (!p.hasil) $('#sc-sheet').innerHTML = '<div class="grab"></div>' + p.sheetKosong(); };
ACT['sc.manual'] = async () => { const v = await UI.prompt({ title: 'Input manual', label: Pages.scan.mode === 'lokasi' ? 'Kode lokasi (mis. A-02-03)' : 'SKU / barcode / nomor batch', required: true, ok: 'Cari' }); if (v) Pages.scan.dapat(v); };
ACT['sc.lagi'] = () => { const p = Pages.scan; p.hasil = null; $('#sc-sheet').innerHTML = '<div class="grab"></div>' + p.sheetKosong(); };
ACT['sc.aksi'] = el => { const p = Pages.scan; p.aksi = el.dataset.a; LS.set('gp_scan_aksi', p.aksi); if (p.hasil && p.hasil.jenis !== 'tidak' && p.hasil.jenis !== 'lokasi') ACT['sc.lanjut'](); else if (!p.hasil) Router.go('#/' + p.aksi); };
ACT['sc.lanjut'] = () => {
  const p = Pages.scan, h = p.hasil; if (!h) return;
  const sku = (h.barang || h.data).sku, a = p.aksi || 'out';
  if (a === 'opname') return Router.go('#/opname?sku=' + encodeURIComponent(sku));
  Router.go('#/' + a + '?sku=' + encodeURIComponent(sku) + (h.jenis === 'batch' && a !== 'in' ? '&stok=' + h.data.stok_id : ''));
};
