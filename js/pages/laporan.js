/* GudangPro OS — Laporan & Valuasi (FR-32, FR-33, FR-34): tabel + filter + unduh Excel/PDF */
const LAP_INFO = {
  posisi: ['Posisi stok per lokasi bin', 'pin', ['kategori', 'zona']],
  kedaluwarsa: ['Batch kedaluwarsa & mendekati (H-90/H-30/H-7)', 'hourglass', ['kategori', 'zona', 'hari']],
  masukkeluar: ['Detail barang masuk, keluar, retur, mutasi', 'mutasi', ['periode', 'tipe', 'kategori']],
  mutasi: ['Saldo awal, masuk, keluar, saldo akhir per SKU', 'layers', ['periode', 'kategori']],
  valuasi: ['Nilai persediaan per SKU & kategori (HPP)', 'wallet', ['kategori']],
  abc: ['Kelas A/B/C berdasar nilai keluar 90 hari', 'chart', ['kategori']],
  deadstock: ['Barang tidak bergerak > N hari', 'archive', ['kategori', 'hari']],
  opname: ['Rekap sesi opname & akurasi', 'opname', ['periode']],
  kinerja: ['Transaksi & akurasi hitung per staf', 'users', ['periode']],
  restock: ['Saran order berdasar moving average', 'truck', ['kategori']]
};
Page('laporan', {
  title: 'Laporan & Valuasi',
  render(el, seg, q) {
    if (seg[0]) return Lap.buka(el, seg[0], q);
    el.innerHTML = '<div class="ph"><div><h1>Laporan &amp; Valuasi</h1><div class="sub">Setiap laporan berbentuk tabel dengan filter, plus tombol Unduh Excel dan Unduh PDF.</div></div></div><div id="lp-daftar">' + UI.sk(3) + '</div>';
    SWR.get('lap.get', {}, { maxAge: 3600000, onData: d => {
      const box = $('#lp-daftar'); if (!box || !d) return;
      box.innerHTML = '<div class="grid g3">' + d.daftar.map(x => { const i = LAP_INFO[x.kode] || ['', 'file']; return '<a class="card" href="#/laporan/' + x.kode + '" style="color:inherit"><div class="kpi"><div class="ib">' + icon(i[1], 'lg') + '</div><div><div class="bb" style="font-size:15px">' + esc(x.label) + '</div><div class="small muted mt-s">' + esc(i[0]) + '</div></div></div></a>'; }).join('') + '</div>';
    } });
  }
});
const Lap = {
  buka(el, jenis, q) {
    const info = LAP_INFO[jenis]; if (!info) return Router.go('#/laporan');
    this.el = el; this.jenis = jenis; this.f = Object.assign({ dari: addDays(today(), -30), sampai: today() }, q); this.cari = ''; this.urut = null; this.hal = 1;
    const fl = info[2], zona = [...new Set(Store.lokasi.map(l => l.zona).filter(Boolean))];
    el.innerHTML = '<div class="crumb"><a href="#/laporan">Laporan</a>' + icon('right') + '<span id="lp-jdl">…</span></div><div class="ph"><div><h1 id="lp-h1">Laporan</h1><div class="sub">' + esc(info[0]) + '</div></div><div class="acts"><button class="btn" data-act="lp.xls">' + icon('download') + 'Unduh Excel</button><button class="btn" data-act="lp.pdf">' + icon('printer') + 'Unduh PDF</button></div></div>' +
      '<div class="card ps"><div class="row wrap">' +
      (fl.includes('periode') ? '<div class="fld"><label class="tiny">Dari</label><input class="inp sm" type="date" data-f="dari" value="' + this.f.dari + '"></div><div class="fld"><label class="tiny">Sampai</label><input class="inp sm" type="date" data-f="sampai" value="' + this.f.sampai + '"></div><div class="fld"><label class="tiny">&nbsp;</label><div class="chips">' + [[7, '7H'], [30, '30H'], [90, '90H']].map(x => '<button class="chip" data-act="lp.cepat" data-n="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>' : '') +
      (fl.includes('tipe') ? '<div class="fld"><label class="tiny">Jenis</label><select class="inp sm" data-f="tipe"><option value="">Semua</option>' + ['IN', 'OUT', 'RETUR', 'MUTASI', 'ADJ'].map(t => '<option ' + (this.f.tipe === t ? 'selected' : '') + '>' + t + '</option>').join('') + '</select></div>' : '') +
      (fl.includes('kategori') ? '<div class="fld"><label class="tiny">Kategori</label><select class="inp sm" data-f="kategori"><option value="">Semua</option>' + Store.kategori.map(k => '<option value="' + k.id + '" ' + (this.f.kategori === k.id ? 'selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select></div>' : '') +
      (fl.includes('zona') ? '<div class="fld"><label class="tiny">Zona</label><select class="inp sm" data-f="zona"><option value="">Semua</option>' + zona.map(z => '<option ' + (this.f.zona === z ? 'selected' : '') + '>' + esc(z) + '</option>').join('') + '</select></div>' : '') +
      (fl.includes('hari') ? '<div class="fld"><label class="tiny">' + (jenis === 'deadstock' ? 'Tidak bergerak (hari)' : 'Dalam (hari)') + '</label><input class="inp sm" type="number" data-f="hari" style="width:110px" value="' + esc(this.f.hari || (jenis === 'deadstock' ? Store.set.DEAD_STOCK_HARI || 90 : Store.set.EXPIRED_H1 || 90)) + '"></div>' : '') +
      '<div class="fld grow" style="min-width:200px"><label class="tiny">Cari di tabel</label><input class="inp sm" id="lp-cari" placeholder="ketik untuk menyaring…"></div></div></div><div id="lp-isi" class="mt">' + UI.sk(6, true) + '</div>';
    el.querySelectorAll('[data-f]').forEach(i => i.onchange = () => { this.f[i.dataset.f] = i.value; this.muat(); });
    $('#lp-cari').oninput = debounce(e => { this.cari = e.target.value.toLowerCase(); this.hal = 1; this.tabel(); }, 200);
    this.muat();
  },
  param() { const p = { jenis: this.jenis }; ['dari', 'sampai', 'tipe', 'kategori', 'zona', 'hari'].forEach(k => { if (this.f[k]) p[k] = this.f[k]; }); if (!LAP_INFO[this.jenis][2].includes('periode')) { delete p.dari; delete p.sampai; } return p; },
  async muat() {
    const box = $('#lp-isi'); if (box && this.d) box.style.opacity = .5;
    await SWR.get('lap.get', this.param(), { maxAge: 60000, onData: d => { this.d = d; this.hal = 1; this.gambar(); }, onError: r => { const b = $('#lp-isi'); if (b) b.innerHTML = '<div class="card">' + UI.empty('alert', 'Laporan tidak tersedia', esc(r.message)) + '</div>'; } });
  },
  rowsTersaring() {
    let r = this.d.rows; const q = this.cari;
    if (q) r = r.filter(x => this.d.kolom.some(c => String(x[c.k] == null ? '' : x[c.k]).toLowerCase().includes(q)));
    if (this.urut) { const { k, dir, t } = this.urut; r = r.slice().sort((a, b) => { const va = a[k], vb = b[k]; return (['n', 'rp', 'p'].includes(t) ? (Number(va) || 0) - (Number(vb) || 0) : String(va).localeCompare(String(vb))) * dir; }); }
    return r;
  },
  gambar() {
    const d = this.d, box = $('#lp-isi'); if (!box) return; box.style.opacity = 1;
    $('#lp-jdl').textContent = d.judul; $('#lp-h1').textContent = d.judul; document.title = d.judul + ' · GudangPro OS';
    const R = d.ringkasan || {}, label = { baris: 'Baris', qty: 'Total qty', nilai: 'Nilai', batch: 'Batch', kedaluwarsa: 'Sudah lewat', masuk: 'Total masuk', keluar: 'Total keluar', sku: 'SKU', A: 'Kelas A', B: 'Kelas B', C: 'Kelas C', hari: 'Ambang hari', sesi: 'Sesi', akurasi: 'Akurasi', staf: 'Staf', trx: 'Transaksi' };
    const pill = Object.keys(R).filter(k => k !== 'grafik').map(k => '<span class="stat-pill"><span class="l">' + (label[k] || k) + '</span><span class="v">' + (k === 'nilai' ? F.rpS(R[k]) : k === 'akurasi' ? F.pct(R[k]) : F.num(R[k])) + '</span></span>').join('');
    let grafik = '';
    if (R.grafik && R.grafik.length) grafik = '<div class="card mt"><div class="ch"><h3>Valuasi per kategori</h3></div>' + R.grafik.map(g => '<div class="row" style="padding:6px 0"><span style="width:160px" class="ellipsis small b">' + esc(g.label) + '</span><div class="bar-h grow"><i style="width:' + (g.nilai / R.grafik[0].nilai * 100) + '%"></i></div><span class="num small b" style="width:120px;text-align:right">' + F.rp(g.nilai) + '</span></div>').join('') + '</div>';
    if (this.jenis === 'abc' && d.rows.length) grafik = '<div class="card mt"><div class="ch"><h3>Sebaran kelas ABC</h3></div>' + Chart.bar({ labels: ['A (fast)', 'B (medium)', 'C (slow)'], series: [{ name: 'SKU', color: Chart.C.teal, data: [R.A || 0, R.B || 0, R.C || 0] }], h: 160 }) + '</div>';
    if (this.jenis === 'kedaluwarsa' && d.rows.length) { const g = {}; d.rows.forEach(r => g[r.status] = (g[r.status] || 0) + 1); grafik = '<div class="card mt"><div class="ch"><h3>Batch per tingkat peringatan</h3></div><div class="row wrap">' + ['Kedaluwarsa', 'H-7', 'H-30', 'H-90'].map(s => '<span class="stat-pill"><span class="l">' + s + '</span><span class="v ' + (s === 'Kedaluwarsa' ? 't-bad' : s === 'H-7' ? 't-warn' : '') + '">' + (g[s] || 0) + '</span></span>').join('') + '</div></div>'; }
    box.innerHTML = '<div class="row wrap">' + pill + '<span class="small muted ml-auto">' + (d.dari && LAP_INFO[this.jenis][2].includes('periode') ? F.tgl(d.dari) + ' – ' + F.tgl(d.sampai) + ' · ' : '') + 'dibuat ' + F.tglJam(d.dibuat) + '</span></div>' + grafik + '<div class="card p0 mt" id="lp-tbl"></div>';
    this.tabel();
  },
  tabel() {
    const d = this.d, box = $('#lp-tbl'); if (!box) return;
    const rows = this.rowsTersaring(), per = 50, hal = this.hal, tampil = rows.slice((hal - 1) * per, hal * per);
    const fmt = (c, v) => v === '' || v == null ? '<span class="muted">—</span>' : c.t === 'rp' ? F.rp(v) : c.t === 'n' ? F.num(v) : c.t === 'p' ? F.pct(v) : c.t === 'd' ? (/^\d{4}-/.test(v) ? F.tgl(v) : esc(v)) : c.k === 'status' || c.k === 'kelas' ? (c.k === 'kelas' ? '<span class="bdg ' + ({ A: 'ok', B: 'warn', C: 'bad' })[v] + ' nodot">' + esc(v) + '</span>' : UI.bdg(v, v === 'H-7' ? 'warn' : v === 'H-30' ? 'warn' : v === 'H-90' ? 'navy' : '')) : esc(v);
    box.innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + d.kolom.map(c => '<th class="sortable ' + (['n', 'rp', 'p'].includes(c.t) ? 'n' : '') + '" data-act="lp.urut" data-k="' + c.k + '" data-t="' + c.t + '">' + esc(c.label) + (this.urut && this.urut.k === c.k ? (this.urut.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>' +
      tampil.map(r => '<tr' + (r.trx_id ? ' class="clk" data-act="go" data-h="#/trx/' + r.trx_id + '"' : r.id && this.jenis === 'opname' ? ' class="clk" data-act="go" data-h="#/opname/' + r.id + '"' : r.sku && ['posisi', 'kedaluwarsa', 'valuasi', 'abc', 'deadstock', 'restock', 'mutasi'].includes(this.jenis) ? ' class="clk" data-act="stok.sku" data-id="' + esc(r.sku) + '"' : '') + '>' + d.kolom.map(c => '<td class="' + (['n', 'rp', 'p'].includes(c.t) ? 'n' : '') + '">' + fmt(c, r[c.k]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + UI.pager(rows.length, hal, per, 'lp.hal')
      : UI.empty('chart', 'Tidak ada data', 'Coba ubah filter atau periode.');
  },
  meta() { const d = this.d; return (LAP_INFO[this.jenis][2].includes('periode') ? 'Periode ' + F.tgl(d.dari) + ' – ' + F.tgl(d.sampai) : 'Per ' + F.tglP(today())) + (this.f.kategori ? ' · ' + Store.kat(this.f.kategori) : '') + (this.f.zona ? ' · ' + this.f.zona : ''); }
};
ACT['lp.hal'] = el => { Lap.hal = +el.dataset.p; Lap.tabel(); };
ACT['lp.urut'] = el => { const k = el.dataset.k; Lap.urut = Lap.urut && Lap.urut.k === k ? { k, t: el.dataset.t, dir: -Lap.urut.dir } : { k, t: el.dataset.t, dir: ['n', 'rp', 'p'].includes(el.dataset.t) ? -1 : 1 }; Lap.tabel(); };
ACT['lp.cepat'] = el => { Lap.f.dari = addDays(today(), -(Number(el.dataset.n) - 1)); Lap.f.sampai = today(); Lap.el.querySelector('[data-f=dari]').value = Lap.f.dari; Lap.el.querySelector('[data-f=sampai]').value = Lap.f.sampai; Lap.muat(); };
ACT['lp.xls'] = async el => { if (!Lap.d) return; UI.busy(el, true); try { await Ekspor.excel(Lap.d.judul, Lap.d.kolom, Lap.rowsTersaring(), Lap.meta()); } catch (e) { UI.err(e); } UI.busy(el, false); };
ACT['lp.pdf'] = async el => { if (!Lap.d) return; UI.busy(el, true); try { await Ekspor.pdf(Lap.d.judul, Lap.d.kolom, Lap.rowsTersaring().slice(0, 3000), Lap.meta()); } catch (e) { UI.err(e); } UI.busy(el, false); };
