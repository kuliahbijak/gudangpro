/* GudangPro OS — Dashboard operasional & executive (PRD bagian 7.3) */
Page('dashboard', {
  title: 'Dashboard',
  periode() { const p = LS.get('gp_dash_periode', '7'); const s = today(); return { kode: p, dari: p === 'bulan' ? s.slice(0, 8) + '01' : addDays(s, -(Number(p) - 1)), sampai: s }; },
  render(el) {
    this.el = el;
    const me = Store.me, p = this.periode();
    el.innerHTML = '<div class="ph"><div><h1>Selamat datang kembali, ' + esc(String(me.nama).split(' ')[0]) + '! 👋</h1><div class="sub">Berikut rangkuman operasional gudang, mutasi FIFO/FEFO, dan pergerakan persediaan hari ini.</div></div>' +
      '<div class="acts"><button class="btn" data-act="dash.periode">' + icon('calendar') + '<span id="dash-per">' + F.tgl(p.dari).replace(/ \d{4}$/, '') + ' – ' + F.tgl(p.sampai) + '</span>' + icon('down', 'sm') + '</button>' +
      '<button class="btn" data-act="dash.segar" title="Segarkan">' + icon('refresh') + '<span class="only-d">Segarkan</span></button></div></div><div id="dash-body"></div>';
    this.gambar(SWR.peek('dash.get', { dari: p.dari, sampai: p.sampai }));
    SWR.get('dash.get', { dari: p.dari, sampai: p.sampai }, { maxAge: 30000, onData: d => this.gambar({ d, t: Date.now() }), onError: r => UI.toast(r.message, 'err') });
  },
  onStore() { const c = SWR.peek('dash.get', this.periode()); if (c) this.gambar(c); },
  gambar(cache) {
    const body = $('#dash-body'); if (!body) return;
    const d = cache && cache.d, lokal = Stok.ringkas(), skuL = Object.values(lokal);
    const komp = d ? d.komposisi : { Aman: 0, Menipis: 0, Kritis: 0, Kedaluwarsa: 0 };
    if (!d) skuL.forEach(p => komp[p.status]++);
    const k = d ? d.kpi : { sku: skuL.length, menipis: komp.Menipis + komp.Kritis, kritis: komp.Kritis, expSoon: skuL.filter(p => p.soon > 0).length, akurasi: null, target: Number(Store.set.TARGET_AKURASI || 98) };
    const harga = lihatHarga(), pur = can('PURCHASING'), staf = can('STAF');
    const tren = (a, b, label) => { if (b == null || !b) return '<span class="tr"><span class="trend flat">—</span>' + label + '</span>'; const p = (a - b) / Math.abs(b) * 100; return '<span class="tr"><span class="trend ' + (p > 0.05 ? 'up' : p < -0.05 ? 'dn' : 'flat') + '">' + icon(p >= 0 ? 'up' : 'dn', 'sm') + (p >= 0 ? '+' : '') + F.num(p, 1) + '%</span>' + label + '</span>'; };
    const kpi = [
      '<div class="card kpi"><div class="ib">' + icon('box', 'lg') + '</div><div class="grow"><div class="lbl">Total SKU Aktif</div><div class="val">' + F.num(k.sku, 0) + '<small>SKU</small></div>' + tren(k.sku, k.skuLalu, 'vs minggu lalu') + '</div></div>',
      harga ? '<div class="card kpi"><div class="ib navy">' + icon('briefcase', 'lg') + '</div><div class="grow"><div class="lbl">Nilai Persediaan Gudang</div><div class="val">' + (k.nilai == null ? '<span class="sk" style="display:inline-block;width:120px;height:26px"></span>' : F.rpS(k.nilai)) + '</div>' + tren(k.nilai, k.nilaiLalu, 'vs bulan lalu') + '</div></div>'
        : '<div class="card kpi"><div class="ib navy">' + icon('truck', 'lg') + '</div><div class="grow"><div class="lbl">Pergerakan Hari Ini</div><div class="val">' + F.num(d ? d.hariIni.trx_in + d.hariIni.trx_out : 0, 0) + '<small>dok</small></div><div class="tr"><span class="trend up">' + icon('in', 'sm') + F.num(d ? d.hariIni.qty_in : 0, 0) + '</span><span class="trend dn">' + icon('out', 'sm') + F.num(d ? d.hariIni.qty_out : 0, 0) + '</span> masuk / keluar</div></div></div>',
      '<div class="card kpi" style="cursor:pointer" data-act="go" data-h="#/stok?status=Kritis"><div class="ib coral">' + icon('warn', 'lg') + '</div><div class="grow"><div class="lbl">Stok Menipis &amp; Kritis</div><div class="val">' + F.num(k.menipis, 0) + '<small>SKU</small></div><div class="tr">' + (k.kritis ? '<span class="bdg bad nodot">' + k.kritis + ' restock segera</span>' : '<span class="bdg ok nodot">Aman</span>') + '<span>H-' + (Store.set.EXPIRED_H2 || 30) + ' exp: <b>' + F.num(k.expSoon, 0) + '</b></span></div></div></div>',
      '<div class="card kpi"><div class="ib ok">' + icon('target', 'lg') + '</div><div class="grow"><div class="lbl">Akurasi Stok Opname</div><div class="val">' + F.pct(k.akurasi) + '</div><div class="tr">Target minimal: ≥ ' + F.num(k.target, 1) + '%</div></div><div class="ring">' + Chart.ring(k.akurasi || 0, 50, k.akurasi != null && k.akurasi < k.target ? Chart.C.coral : Chart.C.teal) + '</div></div>'
    ].join('');
    if (!d) { body.innerHTML = '<div class="grid g4">' + kpi + '</div><div class="grid g-8-4 mt">' + UI.sk(6, true) + UI.sk(5, true) + '</div>'; return; }

    // pipeline
    const PIPE = [['Draft', 'DRAFT', 's1'], ['Menunggu', 'APPROVAL', 's2'], ['Disetujui', 'DISETUJUI', 's3'], ['Selesai', 'SELESAI', 's4'], ['Void', 'VOID/TOLAK', 's5']];
    const pp = {}; d.pipeline.forEach(x => pp[x.status] = x);
    const pipe = pur ? '' : '<div class="card"><div class="ch"><div><h3>Alur Dokumen Transaksi (Pipeline Status)</h3><div class="d">Pemantauan siklus dokumen masuk, keluar, mutasi, dan penyesuaian opname.</div></div><a class="lk" href="#/trx">Lihat Semua ' + icon('right', 'sm') + '</a></div>' +
      '<div class="pipe">' + PIPE.map(s => { const x = pp[s[0]] || { n: 0, nilai: 0 }; return '<div class="st ' + s[2] + '" data-act="go" data-h="#/trx?status=' + (s[0] === 'Void' ? 'Void/Ditolak' : s[0]) + '"><b>' + s[1] + '</b><span>' + x.n + ' Dok' + (harga ? ' (' + F.rpS(x.nilai).replace('Rp ', 'Rp') + ')' : '') + '</span></div>'; }).join('') + '</div>' +
      '<div class="pipe-cols">' + PIPE.map(s => { const x = pp[s[0]] || { docs: [], n: 0 }; const warna = { s1: 'var(--teal)', s2: '#2F6BD8', s3: 'var(--navy)', s4: 'var(--ok)', s5: 'var(--coral)' }[s[2]];
        return '<div>' + (x.docs.length ? x.docs.map(o => '<div class="doc-mini" data-act="go" data-h="#/trx/' + o.id + '"><div class="no"><i style="background:' + warna + '"></i>' + esc(o.no) + '</div><div class="m ellipsis">' + esc(o.mitra) + '</div>' + (harga ? '<div class="v" style="color:' + (s[2] === 's5' ? 'var(--coral)' : '') + '">' + F.rp(o.nilai) + '</div>' : '<div class="v">' + esc(o.tipe) + '</div>') + '</div>').join('') : '<div class="more-l">—</div>') + (x.n > 3 ? '<div class="more-l">+' + (x.n - 3) + ' lainnya</div>' : '') + '</div>'; }).join('') + '</div></div>';
    const bul = d.bulanan;
    const akurasi = '<div class="card"><div class="ch"><div><h3>Akurasi Stok &amp; Pergerakan</h3><div class="d">Target akurasi fisik vs buku: ' + F.num(k.target, 1) + '%</div></div><a class="lk" href="#/laporan/opname">Lihat Laporan</a></div>' +
      Chart.gauge({ value: k.akurasi, target: k.target, label: 'Akurasi Audit Siklus (90 hari)' }) +
      '<div class="grid g2 mt-s" style="gap:10px"><div class="mini-stat"><div class="l">Fisik Cocok</div><div class="v">' + F.num(k.cocok || 0, 0) + ' baris</div></div><div class="mini-stat bad"><div class="l">Selisih (Variance)</div><div class="v">' + F.num(k.selisih || 0, 0) + ' baris</div></div></div>' +
      '<div class="row between mt"><div class="small b">Volume Barang (' + F.bln(bul[0].bulan) + ' – ' + F.bln(bul[bul.length - 1].bulan) + ')</div><div class="legend"><span><i style="background:' + Chart.C.teal + '"></i>Masuk</span><span><i style="background:' + Chart.C.navy + '"></i>Keluar</span></div></div>' +
      Chart.bar({ labels: bul.map(b => F.bln(b.bulan)), series: [{ name: 'Masuk', color: Chart.C.teal, data: bul.map(b => b.masuk) }, { name: 'Keluar', color: Chart.C.navy, data: bul.map(b => b.keluar) }], h: 170, sorot: bul.length - 1 }) + '</div>';
    // komposisi
    const KW = { Aman: Chart.C.ok, Menipis: Chart.C.warn, Kritis: Chart.C.coral, Kedaluwarsa: '#B91C1C' };
    const tot = Object.values(komp).reduce((a, b) => a + b, 0) || 1;
    const donut = '<div class="card"><div class="ch"><h3>Komposisi Status Stok</h3><a class="lk" href="#/stok">Detail</a></div><div class="donut-wrap"><div>' + Chart.donut({ data: Object.keys(komp).map(s => ({ label: s, value: komp[s], color: KW[s] })), v: F.num(k.sku, 0), l: 'Total SKU' }) + '</div><div>' +
      Object.keys(komp).map(s => '<div class="leg-row" data-act="go" data-h="#/stok?status=' + s + '"><i style="background:' + KW[s] + '"></i><span>' + ({ Aman: 'Aman / Cukup', Menipis: 'Menipis', Kritis: 'Kritis (< Min)', Kedaluwarsa: 'Kedaluwarsa' })[s] + '</span><b class="num">' + F.num(komp[s], 0) + '</b><span class="p">(' + F.num(komp[s] / tot * 100, 1) + '%)</span></div>').join('') + '</div></div>' +
      '<div class="row between mt small" style="border-top:1px solid var(--line);padding-top:12px"><span>Tingkat stockout: <b>' + F.pct(komp.Kritis / tot * 100) + '</b></span><span class="bdg ' + (komp.Kedaluwarsa ? 'bad' : 'ok') + ' nodot">' + komp.Kedaluwarsa + ' SKU ada batch kedaluwarsa</span></div></div>';
    // kinerja staf
    const maxT = Math.max(1, ...d.staf.map(s => s.trx));
    const staf_ = '<div class="card"><div class="ch"><h3>Kinerja Staf Gudang</h3>' + (can(...R_MAN) ? '<a class="lk" href="#/laporan/kinerja">Papan Peringkat</a>' : '') + '</div>' +
      (d.staf.length ? d.staf.map(s => '<div class="lb">' + UI.avatar(s.nama).replace('avatar', 'avatar" style="width:34px;height:34px;font-size:12px') + '<div class="grow" style="min-width:0"><div class="n ellipsis">' + esc(s.nama) + '</div><div class="r ellipsis">' + esc(s.jabatan || s.role) + '</div></div><div class="bar-h"><i style="width:' + Math.round(s.trx / maxT * 100) + '%"></i></div><div class="v">' + s.trx + ' trx<small>' + (s.akurasi == null ? '—' : F.num(s.akurasi, 1) + '%') + '</small></div></div>').join('') : UI.empty('users', 'Belum ada transaksi', 'Pada periode ini.')) + '</div>';
    // pengingat
    const rem = '<div class="card"><div class="ch"><h3>Pengingat Operasional</h3><button class="lk" data-act="inbox">Lihat Semua</button></div>' +
      (d.pengingat.length ? d.pengingat.map(i => '<a class="rem ' + (i.level || 'info') + '" href="' + i.link + '"><div class="tm">' + (i.waktu && i.waktu.length > 10 ? F.jam(i.waktu) : F.tgl(i.waktu).split(' ').slice(0, 2).join(' ')) + '</div><div class="grow" style="min-width:0"><div class="t ellipsis">' + esc(i.judul) + '</div><div class="d ellipsis">' + esc(i.ket || '') + '</div></div><span class="btn sm ' + (i.level === 'danger' ? 'danger' : '') + '">' + esc(i.aksi) + '</span></a>').join('') : UI.empty('ok', 'Tidak ada pengingat', 'Semua operasional berjalan normal.')) +
      '<div class="row between small muted mt-s"><span>Notifikasi: ' + (Store.set.NOTIF_EMAIL_AKTIF === 'YA' ? 'Email aktif' : 'Email —') + '</span><span>WhatsApp: ' + (Store.set.NOTIF_WA_AKTIF === 'YA' ? '<b class="t-ok">Terhubung</b>' : '—') + '</span></div></div>';
    // linimasa
    const AW = { TRX_IN: ['in', Chart.C.teal], TRX_OUT: ['out', Chart.C.navy], APPROVAL_SETUJU: ['check', '#2F6BD8'], APPROVAL_TOLAK: ['x', Chart.C.coral], SELESAI_OPNAME: ['opname', Chart.C.ok], AJUKAN_OPNAME: ['warn', Chart.C.coral], VOID_TRX: ['no', Chart.C.coral], TRX_MUTASI: ['mutasi', '#2F6BD8'], PROSES_TRX: ['ok', Chart.C.ok], BUAT_OPNAME: ['calendar', Chart.C.teal] };
    const tl = '<div class="card"><div class="ch"><div><h3>Linimasa Aktivitas Gudang (Audit Trail)</h3><div class="d">Seluruh perubahan stok dan status terekam append-only.</div></div>' + (can(...R_MAN) ? '<a class="lk" href="#/log">Lihat Log Lengkap</a>' : '') + '</div>' +
      (d.aktivitas.length ? '<div class="tl">' + d.aktivitas.map(a => { const w = AW[a.aksi] || ['info', Chart.C.teal]; return '<div class="tl-i"><div class="c" style="background:' + w[1] + '">' + icon(w[0]) + '</div><div class="t">' + esc(a.label) + '</div><div class="d ellipsis">' + esc(a.ket || '') + '</div><div class="d ellipsis">' + esc(a.oleh) + '</div><div class="w">' + F.rel(a.waktu) + '</div></div>'; }).join('') + '</div>' : UI.empty('history', 'Belum ada aktivitas')) +
      '<div class="row between small muted mt" style="border-top:1px solid var(--line);padding-top:12px"><span class="row gap-s"><span class="live t-ok"></span>Google Sheets LockService: normal</span><span>Diperbarui ' + F.rel(ymd(new Date(cache.t || Date.now())) + ' ' + new Date(cache.t || Date.now()).toTimeString().slice(0, 8)) + '</span></div></div>';
    // prakiraan restock
    const rs = d.restock;
    const fc = '<div class="card"><div class="ch"><div><h3>Prakiraan Kebutuhan Restock' + (harga ? ' &amp; Valuasi' : '') + '</h3><div class="d">Moving average 90 hari · proyeksi 30 hari ke depan</div></div><a class="lk" href="#/laporan/restock">Detail</a></div>' +
      (harga ? '<div class="row between wrap"><div><div class="small muted">Estimasi restock (30 hari)</div><div style="font-size:24px;font-weight:800" class="num">' + F.rp(rs.estimasi) + '</div></div><div style="text-align:right"><div class="small muted">Nilai persediaan kini</div><div style="font-size:18px;font-weight:800;color:var(--teal-d)" class="num">' + F.rp(k.nilai) + '</div></div></div>' +
        (rs.tren.length > 1 ? Chart.area({ labels: rs.tren.map(t => F.tgl(t.tanggal).split(' ').slice(0, 2).join(' ')), data: rs.tren.map(t => t.nilai), fmt: F.rpS, sorotLabel: 'Puncak Valuasi' }) : Chart.area({ labels: rs.proyeksi.map(p => p.label), data: rs.proyeksi.map(p => p.nilai), fmt: F.rpS, sorot: 3, sorotLabel: 'Kebutuhan 4 Minggu' }))
        : '') +
      (rs.kandidat.length ? '<div class="col gap-s mt-s">' + rs.kandidat.slice(0, harga ? 3 : 6).map(c => '<div class="row small"><span class="tagk">' + esc(c.sku) + '</span><span class="grow ellipsis">' + esc(c.nama) + '</span><b class="num">' + F.num(c.butuh, 0) + '</b></div>').join('') + '</div>' : '<div class="small muted mt-s">Tidak ada SKU yang perlu di-restock dalam 30 hari.</div>') +
      '<div class="row between small mt" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted">Metode forecasting:</span><span class="bdg navy nodot">Moving Average 3-Bulan</span></div></div>';

    let html = '<div class="grid g4">' + kpi + '</div>';
    if (staf) html += '<div class="grid g4 mt only-m">' + ['in', 'out', 'scan', 'opname'].map(x => '<a class="card ps" href="#/' + (x === 'scan' ? 'scan' : x) + '" style="text-align:center">' + icon(x, 'lg') + '<div class="small b mt-s">' + { in: 'Barang Masuk', out: 'Barang Keluar', scan: 'Scan', opname: 'Opname' }[x] + '</div></a>').join('') + '</div>';
    html += pur ? '<div class="grid g2 mt">' + donut + fc + '</div><div class="grid g2 mt">' + rem + tl + '</div>'
      : '<div class="grid g-8-4 mt">' + pipe + akurasi + '</div><div class="grid g3 mt">' + donut + staf_ + rem + '</div><div class="grid g-7-5 mt">' + tl + fc + '</div>';
    body.innerHTML = html;
  }
});
ACT['go'] = el => Router.go(el.dataset.h);
ACT['dash.segar'] = async el => { UI.busy(el, true); const p = Pages.dashboard.periode(); await SWR.get('dash.get', { dari: p.dari, sampai: p.sampai }, { paksa: true, onData: d => Pages.dashboard.gambar({ d, t: Date.now() }) }); await Store.sync(); UI.busy(el, false); };
ACT['dash.periode'] = el => UI.menu(el, [{ h: 'Periode dashboard' }].concat([['7', '7 hari terakhir'], ['30', '30 hari terakhir'], ['bulan', 'Bulan ini'], ['90', '90 hari terakhir']].map(x => ({ icon: 'calendar', label: x[1], fn: () => { LS.set('gp_dash_periode', x[0]); Router.jalan(); } }))));
