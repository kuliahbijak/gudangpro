/* GudangPro OS — Stok & Lokasi Bin (FR-15, FR-16): denah rak, tabel stok per SKU, rincian batch FIFO/FEFO */
Page('stok', {
  title: 'Stok & Lokasi Bin',
  render(el, seg, q) {
    this.el = el; this.q = Object.assign({ hal: 1 }, q);
    if (q.lok && Store.idx.lok[q.lok]) { const l = Store.lok(q.lok); this.q.blok = l.blok; this.q.rak = l.rak; }
    if (!this.q.blok) this.q.blok = (Store.lokasi[0] || {}).blok || '';
    this.gambar();
    if (q.sku) setTimeout(() => StokUI.drawer(q.sku), 50);
  },
  onStore() { this.gambar(true); },
  dataTabel() {
    const q = this.q, rk = Stok.ringkas(), lokSet = this.lokasiScope(), kata = String(q.q || '').toLowerCase();
    let rows = Object.values(rk).map(p => {
      let qty = p.total, batch = p.batch, exp = p.nearest;
      if (lokSet) { const rr = Stok.rows(p.b.sku).filter(r => r.qty > 0 && lokSet[r.lokasi_id]); qty = rr.reduce((t, r) => t + r.qty, 0); batch = rr.length; exp = rr.map(r => r.tgl_expired).filter(Boolean).sort()[0] || ''; }
      return { p, b: p.b, qty, batch, exp };
    });
    if (lokSet) rows = rows.filter(r => r.qty > 0);
    if (q.status) rows = rows.filter(r => r.p.status === q.status);
    if (q.kat) rows = rows.filter(r => r.b.kategori_id === q.kat);
    if (kata) rows = rows.filter(r => (r.b.sku + ' ' + r.b.nama_barang + ' ' + r.b.barcode + ' ' + Stok.rows(r.b.sku).map(x => x.batch_no).join(' ')).toLowerCase().includes(kata));
    const urut = { Kedaluwarsa: 0, Kritis: 1, Menipis: 2, Aman: 3 };
    rows.sort((a, b) => q.status || kata ? a.b.sku.localeCompare(b.b.sku) : (urut[a.p.status] - urut[b.p.status]) || b.qty - a.qty);
    return rows;
  },
  lokasiScope() { const q = this.q; if (q.lok) return { [q.lok]: 1 }; if (q.zona) { const s = {}; Store.lokasi.filter(l => l.zona === q.zona).forEach(l => s[l.id] = 1); return s; } return null; },
  gambar(soft) {
    const el = this.el, q = this.q; if (!el || !el.isConnected) return;
    const lok = q.lok ? Store.lok(q.lok) : null, rows = this.dataTabel(), harga = lihatHarga();
    const scopeRows = rows; const nilai = scopeRows.reduce((t, r) => t + (r.qty * (r.p.total ? r.p.nilai / r.p.total : 0)), 0);
    const fefo = scopeRows.filter(r => r.b.metode === 'FEFO').length;
    const expRows = scopeRows.filter(r => r.p.exp > 0).length, soon = scopeRows.filter(r => r.p.soon > 0).length;
    const isi = lok ? (Stok.perLokasi()[lok.id] || { qty: 0 }).qty : 0;
    const head = '<div class="crumb"><a href="#/dashboard">Beranda</a>' + icon('right') + '<a href="#/stok">Stok &amp; Lokasi</a>' + (lok ? icon('right') + 'Blok ' + esc(lok.blok) + icon('right') + 'Rak ' + esc(lok.blok + '-' + lok.rak) + icon('right') + '<b>Bin ' + esc(lok.kode) + '</b>' : '') + '</div>' +
      '<div class="ph"><div><h1>Stok &amp; Lokasi Bin' + (lok ? ': ' + esc(lok.kode) : '') + '</h1><div class="sub row wrap gap-s">' + (lok ? UI.bdg(lok.status === 'Aktif' ? 'Aktif' : lok.status) + '<span class="bdg navy nodot">' + icon('pin', 'sm') + esc(lok.zona || '-') + '</span>' + (lok.kapasitas ? '<span class="bdg teal nodot">Kapasitas terisi: ' + F.num(isi / lok.kapasitas * 100, 0) + '% (' + F.num(isi, 0) + ' / ' + F.num(lok.kapasitas, 0) + ')</span>' : '') : 'Cari barang berdasarkan nama, SKU, scan barcode, atau klik bin pada denah rak.') + '</div></div>' +
      '<div class="acts">' + (lok ? '<button class="btn" data-act="stok.labelLok" data-id="' + lok.id + '">' + icon('qr') + 'Cetak Label QR Bin</button>' : '') +
      (can(...R_OPS) ? '<a class="btn" href="#/mutasi' + (lok ? '?asal=' + lok.id : '') + '">' + icon('mutasi') + 'Mutasi Bin</a>' : '') +
      '<button class="btn" data-act="stok.ekspor">' + icon('download') + 'Ekspor</button>' +
      (can(...R_OPS) ? '<a class="btn pri" href="#/in' + (lok ? '?lok=' + lok.id : '') + '">' + icon('plus') + 'Tambah Putaway SKU</a>' : '') + '</div></div>';
    const kpi = '<div class="grid g4">' +
      '<div class="card kpi"><div class="ib">' + icon('package', 'lg') + '</div><div class="grow"><div class="lbl">Total SKU' + (lok ? ' di Bin' : q.zona ? ' di Zona' : ' Aktif') + '</div><div class="val">' + F.num(scopeRows.length, 0) + '<small>SKU</small></div>' + (lok && lok.kapasitas ? '<div class="bar-h mt-s ' + (isi / lok.kapasitas > .9 ? 'coral' : '') + '"><i style="width:' + Math.min(100, isi / lok.kapasitas * 100) + '%"></i></div>' : '<div class="tr">' + F.num(scopeRows.reduce((t, r) => t + r.qty, 0), 0) + ' unit tersimpan</div>') + '</div></div>' +
      (harga ? '<div class="card kpi"><div class="ib navy">' + icon('wallet', 'lg') + '</div><div class="grow"><div class="lbl">Total Nilai Stok</div><div class="val">' + F.rpS(nilai) + '</div><div class="tr">' + F.num(scopeRows.reduce((t, r) => t + r.batch, 0), 0) + ' batch berbeda</div></div></div>'
        : '<div class="card kpi"><div class="ib navy">' + icon('layers', 'lg') + '</div><div class="grow"><div class="lbl">Batch Tersimpan</div><div class="val">' + F.num(scopeRows.reduce((t, r) => t + r.batch, 0), 0) + '</div><div class="tr">di ' + F.num(lok ? 1 : Object.keys(Stok.perLokasi()).length, 0) + ' bin terisi</div></div></div>') +
      '<div class="card kpi"><div class="ib ok">' + icon('hourglass', 'lg') + '</div><div class="grow"><div class="lbl">Metode Alur Stok</div><div class="val" style="font-size:22px">' + (fefo >= scopeRows.length / 2 ? 'FEFO' : 'FIFO') + ' Primer</div><div class="tr">' + (fefo >= scopeRows.length / 2 ? 'Kedaluwarsa terdekat keluar lebih dulu' : 'Masuk lebih dulu keluar lebih dulu') + '</div></div></div>' +
      '<div class="card kpi"><div class="ib ' + (expRows ? 'coral' : 'ok') + '">' + icon(expRows ? 'warn' : 'verified', 'lg') + '</div><div class="grow"><div class="lbl">Status Keamanan Expired</div><div class="val" style="font-size:22px">' + (expRows ? '<span class="t-bad">' + expRows + ' SKU</span>' : 'Aman') + '</div><div class="tr">' + (soon ? icon('warn', 'sm') + soon + ' SKU mendekati H-' + (Store.set.EXPIRED_H2 || 30) : 'Tidak ada batch mendekati kedaluwarsa') + '</div></div></div></div>';
    // denah rak
    const bloks = [...new Set(Store.lokasi.map(l => l.blok))].sort();
    const lb = Store.lokasi.filter(l => l.blok === q.blok), raks = [...new Set(lb.map(l => l.rak))].sort(), bins = [...new Set(lb.map(l => l.bin))].sort();
    const per = Stok.perLokasi();
    const denah = '<div class="card mt"><div class="ch"><div><h3>' + icon('grid', 'sm') + ' Visualisasi Denah Blok ' + esc(q.blok || '-') + '</h3><div class="d">' + raks.length + ' rak × ' + bins.length + ' bin. Klik bin untuk melihat isinya.</div></div>' +
      '<div class="ml-auto chips">' + bloks.map(b => '<button class="chip ' + (b === q.blok ? 'on' : '') + '" data-act="stok.blok" data-b="' + esc(b) + '">Blok ' + esc(b) + '</button>').join('') + '</div></div>' +
      '<div class="legend mb"><span><i style="background:var(--teal-d)"></i>Bin terpilih</span><span><i style="background:rgba(14,154,167,.25)"></i>Terisi sebagian</span><span><i style="background:rgba(255,107,74,.45)"></i>Penuh (&gt;90%)</span><span><i style="background:var(--line-2);border:1px solid var(--line)"></i>Kosong</span><span><i style="background:var(--warn-50);border:1px solid var(--warn)"></i>Karantina</span></div>' +
      (lb.length ? '<div class="tbl-wrap"><div class="rack" style="grid-template-columns:70px repeat(' + bins.length + ', minmax(84px,1fr));min-width:' + (70 + bins.length * 92) + 'px">' + raks.slice().reverse().map(rk => '<div class="lvl">Rak ' + esc(rk) + '</div>' + bins.map(bn => {
        const l = lb.find(x => x.rak === rk && x.bin === bn); if (!l) return '<div></div>';
        const x = per[l.id], qty = x ? x.qty : 0, p = l.kapasitas ? qty / l.kapasitas * 100 : (qty ? 50 : 0);
        const kls = l.status === 'Nonaktif' ? 'nonaktif' : l.id === q.lok ? 'on' : l.status === 'Karantina' ? 'karantina' : !qty ? 'kosong' : p > 90 ? 'penuh' : 'isi';
        return '<div class="bin ' + kls + '" data-act="stok.bin" data-id="' + l.id + '" title="' + esc(l.kode + ' · ' + F.num(qty, 0) + ' unit · ' + (x ? Object.keys(x.sku).length : 0) + ' SKU') + '"><div class="k">' + esc(l.kode) + '</div><div class="p">' + (qty ? (l.kapasitas ? F.num(p, 0) + '%' : F.num(qty, 0)) : 'Kosong') + (l.id === q.lok && qty ? ' Terisi' : '') + '</div>' + (qty && l.kapasitas ? '<div class="bar"><i style="width:' + Math.min(100, p) + '%"></i></div>' : '') + '</div>';
      }).join('')).join('') + '</div></div>' : UI.empty('pin', 'Belum ada master lokasi', 'Tambahkan blok-rak-bin di Master Data.', can('KEPALA', 'SUPERADMIN') ? '<a class="btn pri" href="#/master/lokasi">Kelola Lokasi</a>' : '')) + '</div>';
    // filter + tabel
    const katTop = Store.kategori.filter(k => Object.values(Stok.ringkas()).some(p => p.b.kategori_id === k.id)).slice(0, 5);
    const per_ = 25, hal = Number(q.hal) || 1, tampil = rows.slice((hal - 1) * per_, hal * per_);
    const filter = '<div class="card p0 mt"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="inp-ic grow" style="min-width:220px;max-width:380px">' + icon('search') + '<input class="inp" id="stk-q" placeholder="Cari SKU, nama produk, batch…" value="' + esc(q.q || '') + '"><button class="btn sm ghost btn-in" data-act="stok.scan" title="Scan">' + icon('scan') + '</button></div>' +
      '<div class="chips"><button class="chip ' + (!q.kat ? 'on' : '') + '" data-act="stok.kat" data-k="">Semua Kategori</button>' + katTop.map(k => '<button class="chip ' + (q.kat === k.id ? 'on' : '') + '" data-act="stok.kat" data-k="' + k.id + '">' + esc(k.nama) + '</button>').join('') + '</div>' +
      '<select class="inp sm ml-auto" style="width:auto" id="stk-st"><option value="">Semua status</option>' + ['Aman', 'Menipis', 'Kritis', 'Kedaluwarsa'].map(s => '<option ' + (q.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
      (q.lok || q.status || q.kat || q.q ? '<button class="btn sm ghost" data-act="stok.reset">' + icon('x', 'sm') + 'Reset</button>' : '') + '</div>' +
      UI.tabel({ rows: tampil, act: 'stok.sku', id: r => r.b.sku, kelas: r => r.p.status === 'Kedaluwarsa' || r.p.status === 'Kritis' ? 'warnrow' : '',
        cols: [
          { label: 'SKU & Foto Barang', r: r => '<div class="row">' + UI.thumb(r.b.foto_url) + '<div><div class="b t-teal mono" style="font-size:12px">' + esc(r.b.sku) + '</div><div class="sub">Barcode: <span class="mono">' + esc(r.b.barcode || '-') + '</span></div></div></div>' },
          { label: 'Nama Produk', r: r => '<div class="b" style="max-width:260px">' + esc(r.b.nama_barang) + '</div><div class="sub">Min ' + F.num(r.b.stok_minimum, 0) + ' · ' + esc(r.b.metode) + '</div>' },
          { label: 'Kategori', r: r => '<span class="bdg navy nodot">' + esc(Store.kat(r.b.kategori_id)) + '</span>' },
          { label: lok ? 'Qty di Bin' : 'Total Qty', n: 1, r: r => '<div class="bb" style="font-size:16px">' + F.num(r.qty) + '</div><div class="sub">' + esc(Store.sat(r.b.satuan_id)) + (lok && lok.kapasitas ? ' (' + F.num(r.qty / lok.kapasitas * 100, 0) + '% bin)' : '') + '</div>' },
          { label: 'Batch Aktif', n: 1, r: r => '<span class="bdg navy nodot">' + r.batch + '</span>' },
          { label: 'Expired Terdekat', r: r => r.p.exp ? '<span class="t-bad b">Ada yang lewat</span><div class="sub">' + F.num(r.p.exp) + ' unit kedaluwarsa</div>' : r.exp ? '<div class="b ' + (daysBetween(today(), r.exp) <= Number(Store.set.EXPIRED_H2 || 30) ? 't-warn' : '') + '">' + F.tgl(r.exp) + '</div><div class="sub">Sisa ' + daysBetween(today(), r.exp) + ' hari</div>' : '<span class="muted">—</span>' },
          { label: 'Status Stok', r: r => UI.bdg(r.p.status) },
          { label: 'Aksi', r: r => '<span class="btn sm ' + (r === tampil[0] ? 'navy' : 'ghost') + '">Lihat Batch ' + icon('right', 'sm') + '</span>' }
        ],
        kartu: r => UI.thumb(r.b.foto_url) + '<div class="grow" style="min-width:0"><div class="row between"><span class="tagk">' + esc(r.b.sku) + '</span>' + UI.bdg(r.p.status) + '</div><div class="b mt-s">' + esc(r.b.nama_barang) + '</div><div class="row between small mt-s"><span class="muted">' + r.batch + ' batch · ' + (r.exp ? 'exp ' + F.tgl(r.exp) : 'tanpa exp') + '</span><b class="num" style="font-size:15px">' + F.num(r.qty) + ' <span class="muted small">' + esc(Store.sat(r.b.satuan_id)) + '</span></b></div></div>',
        kosong: UI.empty('search', Store.barang.length ? 'Tidak ada barang yang cocok' : 'Belum ada data barang', Store.barang.length ? 'Ubah kata kunci atau filter.' : 'Tambahkan SKU di Master Data atau impor dari Excel.')
      }) + (rows.length ? UI.pager(rows.length, hal, per_, 'stok.hal') : '') + '</div>';
    if (soft && $('#stk-q') && document.activeElement === $('#stk-q')) { const tb = $('#stk-tbl'); if (tb) tb.innerHTML = filter; return; }
    el.innerHTML = head + kpi + denah + '<div id="stk-tbl">' + filter + '</div>';
    this.ikat();
  },
  ikat() {
    const qi = $('#stk-q'), st = $('#stk-st');
    if (qi) qi.oninput = debounce(() => { this.q.q = qi.value; this.q.hal = 1; const pos = qi.selectionStart; this.gambar(); const n = $('#stk-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 220);
    if (st) st.onchange = () => { this.q.status = st.value; this.q.hal = 1; this.gambar(); };
  }
});
ACT['stok.blok'] = el => { const p = Pages.stok; p.q.blok = el.dataset.b; p.gambar(); };
ACT['stok.bin'] = el => { const p = Pages.stok; p.q.lok = p.q.lok === el.dataset.id ? '' : el.dataset.id; p.q.hal = 1; history.replaceState(null, '', '#/stok' + (p.q.lok ? '?lok=' + p.q.lok : '')); p.gambar(); };
ACT['stok.kat'] = el => { const p = Pages.stok; p.q.kat = el.dataset.k; p.q.hal = 1; p.gambar(); };
ACT['stok.hal'] = el => { const p = Pages.stok; p.q.hal = +el.dataset.p; p.gambar(); $('#stk-tbl').scrollIntoView({ behavior: 'smooth' }); };
ACT['stok.reset'] = () => { const p = Pages.stok; p.q = { hal: 1, blok: p.q.blok }; history.replaceState(null, '', '#/stok'); p.gambar(); };
ACT['stok.sku'] = el => StokUI.drawer(el.dataset.id);
ACT['stok.scan'] = async () => { const k = await Scanner.ambil('semua', 'Cari barang / bin'); if (!k) return; const x = Scanner.kenali(k); if (!x) return UI.toast('Kode "' + k + '" tidak dikenali.', 'warn'); if (x.jenis === 'lokasi') ACT['stok.bin']({ dataset: { id: x.data.id } }); else StokUI.drawer((x.barang || x.data).sku); };
ACT['stok.ekspor'] = el => { const rows = Pages.stok.dataTabel(); const kol = [{ k: 'sku', label: 'SKU' }, { k: 'nama', label: 'Nama Barang' }, { k: 'kategori', label: 'Kategori' }, { k: 'qty', label: 'Qty', t: 'n' }, { k: 'satuan', label: 'Satuan' }, { k: 'batch', label: 'Batch', t: 'n' }, { k: 'exp', label: 'Exp Terdekat', t: 'd' }, { k: 'status', label: 'Status' }];
  if (lihatHarga()) kol.push({ k: 'nilai', label: 'Nilai', t: 'rp' });
  const data = rows.map(r => ({ sku: r.b.sku, nama: r.b.nama_barang, kategori: Store.kat(r.b.kategori_id), qty: r.qty, satuan: Store.sat(r.b.satuan_id), batch: r.batch, exp: r.exp, status: r.p.status, nilai: r.p.total ? Math.round(r.qty * r.p.nilai / r.p.total) : 0 }));
  UI.menu(el, [{ icon: 'download', label: 'Unduh Excel', fn: () => Ekspor.excel('Posisi Stok', kol, data, 'Per ' + F.tglP(today())).catch(UI.err) }, { icon: 'printer', label: 'Unduh PDF', fn: () => Ekspor.pdf('Posisi Stok', kol, data, 'Per ' + F.tglP(today())).catch(UI.err) }]); };
ACT['stok.labelLok'] = el => Label.cetak([{ kode: Store.lok(el.dataset.id).kode, judul: 'BIN ' + Store.lok(el.dataset.id).kode, sub: Store.lok(el.dataset.id).zona || '' }], 'qr');

/* ---------------- drawer rincian SKU ---------------- */
const StokUI = {
  drawer(sku) {
    const b = Store.barangOf(sku); if (!b) return UI.toast('SKU tidak ditemukan.', 'warn');
    const p = Stok.ringkas()[sku] || { total: 0, nilai: 0, lok: {}, exp: 0, status: 'Aman' };
    const urutan = Stok.urut(sku, b.metode, false).map(r => r.stok_id);
    const semua = Stok.rows(sku).filter(r => r.qty > 0).sort((a, c) => { const ia = urutan.indexOf(a.stok_id), ic = urutan.indexOf(c.stok_id); return (ia < 0 ? 999 : ia) - (ic < 0 ? 999 : ic); });
    const harga = lihatHarga(), nLok = Object.keys(p.lok).length;
    const h = UI.drawer({ size: 'lg',
      head: '<div class="row grow" style="min-width:0">' + UI.thumb(b.foto_url) + '<div style="min-width:0"><div class="row gap-s"><span class="tagk">' + esc(b.sku) + '</span><span class="bdg teal nodot">' + esc(b.metode) + ' Aktif</span>' + UI.bdg(p.status) + '</div><div class="bb ellipsis" style="font-size:17px;margin-top:4px">' + esc(b.nama_barang) + '</div><div class="small muted">Barcode: <span class="mono">' + esc(b.barcode || '-') + '</span> · ' + esc(Store.kat(b.kategori_id)) + '</div></div></div>',
      body: '<div class="grid g3" style="gap:10px"><div class="stat-pill"><span class="l">Total Qty</span><span class="v">' + F.num(p.total) + ' ' + esc(Store.sat(b.satuan_id)) + '</span></div>' + (harga ? '<div class="stat-pill"><span class="l">Nilai Stok</span><span class="v">' + F.rpS(p.nilai) + '</span></div>' : '<div class="stat-pill"><span class="l">Minimum</span><span class="v">' + F.num(b.stok_minimum) + '</span></div>') + '<div class="stat-pill"><span class="l">Lokasi Bin</span><span class="v">' + (nLok === 1 ? esc(Store.lok(Object.keys(p.lok)[0]).kode) : nLok + ' bin') + '</span></div></div>' +
        '<div class="tabs mt"><button class="on" data-t="batch">Rincian Batch <span class="c" style="background:var(--teal)">' + semua.length + '</span></button><button data-t="kartu">Riwayat Pergerakan</button><button data-t="info">Info SKU &amp; Lokasi</button></div><div id="sd-isi"></div>',
      foot: (can(...R_OPS) && p.total ? '<a class="btn navy block lg" href="#/out?sku=' + encodeURIComponent(sku) + '">' + icon('truck') + 'Buat Transaksi Outbound (Picking)</a><a class="btn block" href="#/mutasi?sku=' + encodeURIComponent(sku) + '">' + icon('mutasi') + 'Pindahkan Batch ke Bin Lain</a>' : '') + (can(...R_OPS) ? '<a class="btn soft block" href="#/in?sku=' + encodeURIComponent(sku) + '">' + icon('in') + 'Terima Barang Masuk</a>' : ''),
      onOpen: hh => {
        const isi = hh.el.querySelector('#sd-isi');
        const tab = t => { hh.el.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === t)); StokUI['tab_' + t](isi, b, semua, urutan, p); };
        hh.el.querySelector('.tabs').onclick = e => { const t = e.target.closest('[data-t]'); if (t) tab(t.dataset.t); };
        hh.el.querySelectorAll('.mf a').forEach(a => a.addEventListener('click', () => hh.tutup()));
        tab('batch');
      }
    });
    return h;
  },
  tab_batch(isi, b, semua, urutan, p) {
    const h0 = today(), harga = lihatHarga(); let k = 0;
    isi.innerHTML = semua.length ? semua.map(r => {
      const i = urutan.indexOf(r.stok_id), exp = r.tgl_expired && r.tgl_expired < h0, l = Store.lok(r.lokasi_id), sisa = r.tgl_expired ? daysBetween(h0, r.tgl_expired) : null;
      const label = exp ? '<span class="bdg bad">Kedaluwarsa — dikecualikan dari outbound</span>' : l.status === 'Karantina' ? '<span class="bdg warn">Lokasi karantina</span>' : i === 0 ? '<span class="bdg dark nodot">' + icon('alert', 'sm') + ' Prioritas ' + esc(b.metode) + ' #1 (Next Outbound)</span>' : '<span class="bdg navy nodot">Batch #' + (++k + 1) + ' (Antrean Cadangan)</span>';
      return '<div class="batch-card ' + (i === 0 ? 'prio' : '') + '"><div class="row between">' + label + '<button class="btn sm ghost" data-act="stok.labelBatch" data-id="' + r.stok_id + '" title="Label QR batch">' + icon('qr') + '</button></div>' +
        '<div class="row between mt-s"><div class="bb" style="font-size:17px">' + esc(r.batch_no || '-') + '</div><div class="bb t-teal" style="font-size:17px">' + F.num(r.qty) + ' ' + esc(Store.sat(b.satuan_id)) + '</div></div>' +
        '<div class="kv"><div><div class="l">Tgl Masuk (Inbound)</div><div class="b">' + F.tgl(r.tgl_masuk) + '</div></div><div><div class="l">Tanggal Kedaluwarsa</div><div class="b ' + (exp ? 't-bad' : sisa != null && sisa <= Number(Store.set.EXPIRED_H2 || 30) ? 't-warn' : '') + '">' + (r.tgl_expired ? F.tgl(r.tgl_expired) : '—') + '</div>' + (sisa != null ? '<div class="tiny ' + (exp ? 't-bad' : 't-ok') + '">' + (exp ? 'Lewat ' + (-sisa) + ' hari' : 'Sisa ' + sisa + ' hari') + '</div>' : '') + '</div>' +
        '<div><div class="l">Lokasi Bin</div><div class="b">' + esc(l.kode) + ' <span class="muted tiny">' + esc(l.zona || '') + '</span></div></div><div><div class="l">Supplier</div><div class="b ellipsis">' + esc(Store.sup(r.supplier_id)) + '</div>' + (harga ? '<div class="tiny muted">HPP: ' + F.rp(r.harga) + ' / ' + esc(Store.sat(b.satuan_id)) + '</div>' : '') + '</div></div>' +
        (can(...R_OPS) ? '<div class="row"><a class="btn sm grow" style="justify-content:center" href="#/mutasi?stok=' + r.stok_id + '">' + icon('mutasi') + 'Ajukan Mutasi</a>' + (can('KEPALA', 'OWNER', 'SUPERADMIN') ? '<a class="btn sm grow" style="justify-content:center" href="#/adj?stok=' + r.stok_id + '">' + icon('scale') + 'Koreksi Stok</a>' : '') + (exp ? '<a class="btn sm danger grow" style="justify-content:center" href="#/retur?keluar=1&stok=' + r.stok_id + '">' + icon('retur') + 'Retur ke Supplier</a>' : '') + '</div>' : '') + '</div>';
    }).join('') : UI.empty('box', 'Tidak ada stok', 'SKU ini belum memiliki stok di gudang.');
    isi.querySelectorAll('a').forEach(a => a.addEventListener('click', () => UI._stack.length && UI._stack[UI._stack.length - 1]()));
  },
  async tab_kartu(isi, b) {
    if (can('PURCHASING')) { isi.innerHTML = UI.empty('lock', 'Riwayat pergerakan', 'Tersedia untuk Staf, Kepala Gudang, dan Owner.'); return; }
    isi.innerHTML = UI.sk(5);
    const r = await API.q('stok.kartu', { sku: b.sku });
    if (!isi.isConnected) return;
    if (!r.success) { isi.innerHTML = UI.empty('alert', 'Gagal memuat', esc(r.message)); return; }
    const d = r.data;
    isi.innerHTML = '<div class="row wrap small mb"><span class="bdg navy nodot">' + F.tgl(d.dari) + ' – ' + F.tgl(d.sampai) + '</span><span>Saldo awal <b>' + F.num(d.awal) + '</b></span><span>Saldo akhir <b>' + F.num(d.akhir) + '</b></span><a class="ml-auto" href="#/laporan/masukkeluar">Laporan lengkap</a></div>' +
      (d.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Dokumen</th><th>Batch / Lokasi</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Saldo</th></tr></thead><tbody>' + d.rows.slice().reverse().map(x => '<tr class="clk" data-act="go" data-h="#/trx/' + x.trx_id + '"><td>' + F.tgl(x.tanggal) + '</td><td><div class="b">' + esc(x.no) + '</div><div class="sub">' + esc(x.jenis) + (x.ket ? ' · ' + esc(x.ket) : '') + '</div></td><td><div class="mono small">' + esc(x.batch) + '</div><div class="sub">' + esc(x.mutasi ? Store.lok(x.asal).kode + ' → ' + Store.lok(x.tujuan).kode : Store.lok(x.tujuan || x.asal).kode) + '</div></td><td class="n t-ok b">' + (x.masuk ? '+' + F.num(x.masuk) : '') + '</td><td class="n t-bad b">' + (x.keluar ? '−' + F.num(x.keluar) : '') + '</td><td class="n bb">' + F.num(x.saldo) + '</td></tr>').join('') + '</tbody></table></div>' : UI.empty('history', 'Tidak ada pergerakan', 'Dalam 90 hari terakhir.'));
  },
  tab_info(isi, b, semua, urutan, p) {
    isi.innerHTML = '<div class="kv-list"><span class="k">Kategori</span><span>' + esc(Store.kat(b.kategori_id)) + '</span><span class="k">Satuan</span><span>' + esc(Store.sat(b.satuan_id)) + '</span><span class="k">Metode</span><span>' + esc(b.metode) + ' · batch ' + (b.pakai_batch === 'Y' ? 'wajib' : 'otomatis') + ' · exp ' + (b.pakai_expired === 'Y' ? 'wajib' : 'opsional') + '</span>' +
      '<span class="k">Stok min / maks</span><span>' + F.num(b.stok_minimum) + ' / ' + F.num(b.stok_maksimum) + '</span>' + (lihatHarga() ? '<span class="k">Harga beli</span><span>' + F.rp(b.harga_beli) + '</span>' : '') + '<span class="k">Harga jual</span><span>' + F.rp(b.harga_jual) + '</span>' + (b.keterangan ? '<span class="k">Keterangan</span><span>' + esc(b.keterangan) + '</span>' : '') + '</div>' +
      '<h4 class="mt">Sebaran per lokasi</h4>' + (Object.keys(p.lok).length ? Object.keys(p.lok).sort((a, c) => p.lok[c] - p.lok[a]).map(id => '<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line-2)"><span class="tagk">' + esc(Store.lok(id).kode) + '</span><span class="grow small muted">' + esc(Store.lok(id).zona || '') + '</span><div class="bar-h" style="width:120px"><i style="width:' + Math.round(p.lok[id] / p.total * 100) + '%"></i></div><b class="num" style="min-width:60px;text-align:right">' + F.num(p.lok[id]) + '</b></div>').join('') : '<div class="muted small">Belum tersimpan di lokasi mana pun.</div>') +
      '<div class="row mt"><button class="btn sm" data-act="stok.labelSku" data-id="' + esc(b.sku) + '">' + icon('printer') + 'Cetak label barcode</button>' + (can('KEPALA', 'SUPERADMIN') ? '<a class="btn sm" href="#/master/barang?sku=' + encodeURIComponent(b.sku) + '">' + icon('edit') + 'Ubah master</a>' : '') + '</div>';
    isi.querySelectorAll('a').forEach(a => a.addEventListener('click', () => UI._stack.length && UI._stack[UI._stack.length - 1]()));
  }
};
ACT['stok.labelBatch'] = el => { const r = Store.idx.stok[el.dataset.id], b = Store.barangOf(r.sku); Label.cetak([{ kode: r.batch_no, judul: b.nama_barang, sub: r.sku + ' · ' + r.batch_no + (r.tgl_expired ? ' · EXP ' + F.tgl(r.tgl_expired) : '') }], 'qr'); };
ACT['stok.labelSku'] = el => { const b = Store.barangOf(el.dataset.id); Label.cetak([{ kode: b.barcode || b.sku, judul: b.nama_barang, sub: b.sku }], 'barcode'); };

/* ---------------- cetak label barcode / QR (FR-05) ---------------- */
const Label = {
  async cetak(items, jenis) {
    try { await Lib.load(jenis === 'qr' ? 'qr' : 'barcode'); if (jenis !== 'qr') await Lib.load('qr'); } catch (e) { return UI.err(e); }
    const html = items.map(it => {
      let g = '';
      if (jenis === 'qr' || !/^[\x20-\x7e]+$/.test(it.kode)) { const q = qrcode(0, 'M'); q.addData(String(it.kode)); q.make(); g = q.createSvgTag({ cellSize: 4, margin: 2 }); }
      else { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); try { JsBarcode(s, String(it.kode), { format: /^\d{13}$/.test(it.kode) ? 'EAN13' : 'CODE128', height: 46, fontSize: 12, margin: 4, width: 1.6 }); } catch (e) { JsBarcode(s, String(it.kode), { format: 'CODE128', height: 46, fontSize: 12, margin: 4 }); } g = s.outerHTML; }
      return '<div class="label"><div class="t">' + esc(it.judul) + '</div>' + g + '<div class="d">' + esc(it.sub || it.kode) + '</div></div>';
    }).join('');
    const w = window.open('', '_blank');
    if (!w) return UI.toast('Izinkan pop-up untuk mencetak label.', 'warn');
    w.document.write('<!DOCTYPE html><html><head><title>Label GudangPro</title><style>body{font-family:Inter,Arial,sans-serif;margin:12px}.print-sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.label{border:1px dashed #9aa7b4;border-radius:8px;padding:8px;text-align:center;page-break-inside:avoid}.label .t{font-weight:700;font-size:12px;margin-bottom:4px}.label .d{font-size:10px;color:#333;margin-top:2px}.label svg{max-width:100%;height:auto}@media print{button{display:none}}</style></head><body><button onclick="print()" style="margin-bottom:10px;padding:8px 14px">Cetak</button><div class="print-sheet">' + html + '</div><script>setTimeout(function(){print()},400)<\/script></body></html>');
    w.document.close();
  }
};
