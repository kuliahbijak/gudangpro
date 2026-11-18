/* GudangPro OS — Stok Opname cycle count (FR-20 s.d. FR-24) */
Page('opname', {
  title: 'Stok Opname', roles: ['STAF', 'KEPALA', 'OWNER', 'SUPERADMIN'],
  render(el, seg, q) {
    if (seg[0]) return OpSesi.render(el, seg[0]);
    this.el = el; this.tab = this.tab || 'aktif';
    el.innerHTML = '<div class="ph"><div><h1>Stok Opname</h1><div class="sub">Cycle count per area dengan scan kamera HP — transaksi lain tetap berjalan. Snapshot stok disimpan saat sesi dibuka.</div></div><div class="acts">' + (can(...R_OPS) ? '<button class="btn pri" data-act="op.baru">' + icon('plus') + 'Buat Sesi Opname</button>' : '') + '</div></div>' +
      '<div class="tabs" id="op-tabs">' + [['aktif', 'Berjalan & Terjadwal'], ['menunggu', 'Menunggu Review'], ['selesai', 'Selesai'], ['batal', 'Dibatalkan']].map(t => '<button data-t="' + t[0] + '" class="' + (this.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div id="op-isi">' + UI.sk(4) + '</div>';
    $('#op-tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; this.tab = b.dataset.t; $$('#op-tabs button').forEach(x => x.classList.toggle('on', x === b)); this.isi(this.data); };
    SWR.get('opname.list', {}, { maxAge: 10000, onData: d => { this.data = d; this.isi(d); } });
    if (q.baru && can(...R_OPS)) setTimeout(() => OpSesi.buat(), 80);
    if (q.sku) UI.toast('Pilih sesi berjalan yang mencakup lokasi barang ini, atau buat sesi baru.', 'info');
  },
  isi(d) {
    const box = $('#op-isi'); if (!box || !d) return;
    const f = { aktif: o => o.status === 'Berjalan' || o.status === 'Terjadwal', menunggu: o => o.status === 'Menunggu', selesai: o => o.status === 'Selesai', batal: o => o.status === 'Batal' }[this.tab];
    const rows = d.filter(f), harga = lihatHarga();
    box.innerHTML = rows.length ? '<div class="grid g3">' + rows.map(o => '<div class="card" style="cursor:pointer" data-act="go" data-h="#/opname/' + o.id + '"><div class="row between"><span class="tagk">' + esc(o.no) + '</span>' + UI.bdg(o.status) + '</div><div class="bb mt-s" style="font-size:16px">' + esc(o.area) + '</div><div class="small muted">' + esc(o.tipe === 'Penuh' ? 'Opname penuh' : 'Cycle count') + ' · ' + o.lokasi + ' bin · ' + (o.status === 'Terjadwal' ? 'dijadwalkan ' : '') + F.tglP(o.jadwal || o.tanggal) + '</div>' +
      '<div class="row mt small"><span>' + icon('user', 'sm') + ' ' + esc(Store.nama(o.pic)) + '</span><span class="ml-auto">' + F.num(o.total, 0) + ' baris</span></div>' +
      (o.status !== 'Terjadwal' ? '<div class="row mt-s small"><span class="bdg ' + (o.selisih ? 'warn' : 'ok') + ' nodot">' + o.selisih + ' selisih</span>' + (harga && o.nilai ? '<span class="num ' + (o.nilai < 0 ? 't-bad' : 't-ok') + '">' + F.rp(o.nilai) + '</span>' : '') + (o.ba ? '<a class="ml-auto" href="' + esc(o.ba) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + icon('file', 'sm') + ' BA PDF</a>' : '') + '</div>' : '') + '</div>').join('') + '</div>'
      : UI.empty('opname', 'Tidak ada sesi', this.tab === 'aktif' ? 'Buat sesi cycle count untuk satu zona/rak — tidak perlu menutup gudang.' : '', this.tab === 'aktif' && can(...R_OPS) ? '<button class="btn pri" data-act="op.baru">' + icon('plus') + 'Buat Sesi Opname</button>' : '');
  }
});
ACT['op.baru'] = () => OpSesi.buat();

const OpSesi = {
  buat() {
    const zona = [...new Set(Store.lokasi.map(l => l.zona).filter(Boolean))].sort(), blok = [...new Set(Store.lokasi.map(l => l.blok))].sort();
    const pic = Object.keys(Store.users).filter(e => Store.users[e].aktif === 'Y' && ['STAF', 'KEPALA'].includes(Store.users[e].role));
    UI.modal({ title: 'Buat Sesi Stok Opname', desc: 'Pilih cakupan area. Snapshot qty sistem diambil saat sesi dimulai.', size: 'lg',
      body: '<div class="form-g"><div class="fld full"><label>Tipe</label><div class="seg" id="ob-tipe"><button type="button" class="on" data-v="Cycle">' + icon('refresh', 'sm') + 'Cycle count (per area)</button><button type="button" data-v="Penuh">' + icon('warehouse', 'sm') + 'Opname penuh</button></div></div>' +
        '<div class="fld" id="ob-mode-f"><label>Cakupan</label><select class="inp" id="ob-mode"><option value="zona">Per zona</option><option value="rak">Per blok & rak</option><option value="bin">Pilih bin tertentu</option></select></div>' +
        '<div class="fld" id="ob-zona-f"><label>Zona</label><select class="inp" id="ob-zona">' + zona.map(z => '<option>' + esc(z) + '</option>').join('') + '</select></div>' +
        '<div class="fld hidden" id="ob-rak-f"><label>Blok · Rak</label><div class="row gap-s"><select class="inp" id="ob-blok">' + blok.map(b => '<option>' + esc(b) + '</option>').join('') + '</select><select class="inp" id="ob-rak"><option value="">Semua rak</option></select></div></div>' +
        '<div class="fld full hidden" id="ob-bin-f"><label>Bin</label><div class="chips" style="max-height:180px;overflow:auto" id="ob-bins">' + Store.lokasi.filter(l => l.status !== 'Nonaktif').map(l => '<button type="button" class="chip" data-id="' + l.id + '">' + esc(l.kode) + '</button>').join('') + '</div></div>' +
        '<div class="fld"><label>Jadwal</label><input class="inp" type="date" id="ob-jadwal" min="' + today() + '" value="' + today() + '"></div>' +
        '<div class="fld"><label>Penanggung jawab (PIC)</label><select class="inp" id="ob-pic"><option value="' + esc(Store.me.email) + '">' + esc(Store.me.nama) + ' (saya)</option>' + pic.filter(e => e !== Store.me.email).map(e => '<option value="' + esc(e) + '">' + esc(Store.users[e].nama) + '</option>').join('') + '</select></div>' +
        '<div class="fld full"><label>Catatan</label><input class="inp" id="ob-cat" placeholder="opsional"></div><label class="chk full"><input type="checkbox" id="ob-mulai" checked> Mulai sekarang (ambil snapshot stok)</label><div class="small muted full" id="ob-info"></div></div>',
      foot: '<button class="btn" data-x2>Batal</button><button class="btn pri" id="ob-ok">' + icon('check') + 'Buat Sesi</button>',
      onOpen: h => {
        const E = id => h.el.querySelector(id); let tipe = 'Cycle';
        const rakOpt = () => { const b = E('#ob-blok').value; E('#ob-rak').innerHTML = '<option value="">Semua rak</option>' + [...new Set(Store.lokasi.filter(l => l.blok === b).map(l => l.rak))].sort().map(r => '<option>' + esc(r) + '</option>').join(''); };
        const ids = () => { if (tipe === 'Penuh') return Store.lokasi.filter(l => l.status !== 'Nonaktif').map(l => l.id); const m = E('#ob-mode').value; if (m === 'zona') return Store.lokasi.filter(l => l.zona === E('#ob-zona').value && l.status !== 'Nonaktif').map(l => l.id); if (m === 'rak') return Store.lokasi.filter(l => l.blok === E('#ob-blok').value && (!E('#ob-rak').value || l.rak === E('#ob-rak').value) && l.status !== 'Nonaktif').map(l => l.id); return $$('#ob-bins .chip.on', h.el).map(c => c.dataset.id); };
        const label = () => { if (tipe === 'Penuh') return 'Seluruh gudang'; const m = E('#ob-mode').value; return m === 'zona' ? E('#ob-zona').value : m === 'rak' ? 'Blok ' + E('#ob-blok').value + (E('#ob-rak').value ? ' Rak ' + E('#ob-rak').value : '') : ids().length + ' bin terpilih'; };
        const info = () => { const s = ids(), per = Stok.perLokasi(); E('#ob-info').innerHTML = icon('info', 'sm') + ' ' + s.length + ' bin · ±' + s.reduce((t, id) => t + (per[id] ? per[id].rows.length : 0), 0) + ' baris stok akan di-snapshot.'; };
        const mode = () => { const m = E('#ob-mode').value; ['zona', 'rak', 'bin'].forEach(x => E('#ob-' + x + '-f').classList.toggle('hidden', tipe === 'Penuh' || x !== m)); E('#ob-mode-f').classList.toggle('hidden', tipe === 'Penuh'); info(); };
        E('#ob-tipe').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; tipe = b.dataset.v; $$('#ob-tipe button', h.el).forEach(x => x.classList.toggle('on', x === b)); mode(); };
        E('#ob-mode').onchange = mode; E('#ob-zona').onchange = info; E('#ob-blok').onchange = () => { rakOpt(); info(); }; E('#ob-rak').onchange = info;
        E('#ob-bins').onclick = e => { const c = e.target.closest('.chip'); if (c) { c.classList.toggle('on'); info(); } };
        E('#ob-jadwal').onchange = () => { E('#ob-mulai').checked = E('#ob-jadwal').value <= today(); };
        h.el.querySelector('[data-x2]').onclick = () => h.tutup();
        rakOpt(); mode();
        E('#ob-ok').onclick = async () => {
          const s = ids(); if (!s.length) return UI.toast('Pilih minimal satu bin.', 'warn');
          const btn = E('#ob-ok'); UI.busy(btn, true);
          const r = await API.call('opname.buat', { tipe, area: label(), lokasi_ids: s, jadwal: E('#ob-jadwal').value, pic: E('#ob-pic').value, catatan: E('#ob-cat').value, mulai: E('#ob-mulai').checked });
          UI.busy(btn, false);
          if (!r.success) return UI.toast(r.message, 'err');
          h.tutup(); UI.toast(r.message); SWR.basi('opname'); App.kartuOpname(); Router.go('#/opname/' + r.data.opname_id);
        };
      } });
  },
  async render(el, id) {
    this.el = el; this.id = id; this.pending = LS.get('gp_op_' + id, {});
    el.innerHTML = '<div class="crumb"><a href="#/opname">Stok Opname</a>' + icon('right') + 'Sesi</div>' + UI.sk(6, true);
    const r = await API.q('opname.detail', { opname_id: id, _fresh: true });
    if (!el.isConnected) return;
    if (!r.success) { el.innerHTML = '<div class="card">' + UI.empty('alert', 'Sesi tidak dapat dibuka', esc(r.message)) + '</div>'; return; }
    this.d = r.data; this.buta = LS.get('gp_op_buta', false);
    const lok = [...new Set(this.d.detail.map(x => x.lokasi_id))];
    this.lok = this.lok && lok.includes(this.lok) ? this.lok : (lok.find(l => this.d.detail.some(x => x.lokasi_id === l && x.qty_fisik === '' && this.pending[x.od_id] === undefined)) || lok[0]);
    this.gambar();
  },
  nilaiFisik(x) { return this.pending[x.od_id] !== undefined ? this.pending[x.od_id].q : x.qty_fisik; },
  gambar() {
    const { opname: o, detail, ambang } = this.d, el = this.el, harga = lihatHarga();
    const hitung = detail.filter(x => this.nilaiFisik(x) !== '' && this.nilaiFisik(x) !== undefined).length, pend = Object.keys(this.pending).length;
    const selisih = detail.filter(x => { const f = this.nilaiFisik(x); return f !== '' && Number(f) !== (x.qty_hitung === '' ? x.qty_kini : x.qty_hitung); }).length;
    const berjalan = o.status === 'Berjalan' && can(...R_OPS);
    const lokasi = [...new Set(detail.map(x => x.lokasi_id).concat(o.lokasi_ids))];
    let html = '<div class="crumb"><a href="#/opname">Stok Opname</a>' + icon('right') + esc(o.no) + '</div><div class="ph"><div><h1>' + esc(o.area) + '</h1><div class="sub row wrap gap-s">' + UI.bdg(o.status) + '<span class="tagk">' + esc(o.no) + '</span><span>' + esc(o.tipe === 'Penuh' ? 'Opname penuh' : 'Cycle count') + ' · PIC ' + esc(Store.nama(o.pic)) + ' · ' + F.tglP(o.tanggal) + '</span></div></div><div class="acts">' +
      (o.status === 'Terjadwal' && can(...R_OPS) ? '<button class="btn pri" data-act="os.mulai">' + icon('play') + 'Mulai Sekarang</button>' : '') +
      (berjalan ? '<button class="btn pri" data-act="os.ajukan">' + icon('send') + (can(...R_APPR) ? 'Selesai & Sesuaikan Stok' : 'Selesai & Ajukan') + '</button>' : '') +
      (o.status === 'Selesai' && can('STAF', 'KEPALA', 'OWNER', 'SUPERADMIN') ? (o.ba ? '<a class="btn pri" href="' + esc(o.ba) + '" target="_blank" rel="noopener">' + icon('file') + 'Berita Acara PDF</a>' : '<button class="btn pri" data-act="os.ba">' + icon('file') + 'Buat Berita Acara PDF</button>') : '') +
      (o.status === 'Menunggu' && can(...R_APPR) ? '<a class="btn pri" href="#/approval">' + icon('approval') + 'Review di Approval</a>' : '') +
      (['Terjadwal', 'Berjalan', 'Menunggu'].includes(o.status) && can('KEPALA', 'SUPERADMIN') ? '<button class="btn" data-act="os.batal">' + icon('x') + 'Batalkan</button>' : '') + '</div></div>' +
      '<div class="grid g4"><div class="card ps"><div class="small muted">Progres hitung</div><div class="bb" style="font-size:22px">' + hitung + ' / ' + detail.length + '</div><div class="progress mt-s"><i style="width:' + (detail.length ? hitung / detail.length * 100 : 0) + '%"></i></div></div><div class="card ps"><div class="small muted">Baris selisih</div><div class="bb ' + (selisih ? 't-warn' : 't-ok') + '" style="font-size:22px">' + selisih + '</div></div><div class="card ps"><div class="small muted">' + (harga ? 'Nilai selisih' : 'Bin') + '</div><div class="bb" style="font-size:22px">' + (harga ? F.rpS(o.nilai) : lokasi.length) + '</div></div><div class="card ps"><div class="small muted">Belum tersimpan</div><div class="bb ' + (pend ? 't-warn' : '') + '" style="font-size:22px">' + pend + '</div>' + (pend ? '<button class="btn sm pri mt-s" data-act="os.simpan">' + icon('synced', 'sm') + 'Simpan sekarang</button>' : '') + '</div></div>';
    if (o.status === 'Terjadwal') { el.innerHTML = html + '<div class="card mt">' + UI.empty('calendar', 'Sesi belum dimulai', 'Klik "Mulai Sekarang" saat tim siap menghitung — sistem menyimpan snapshot qty saat itu.') + '</div>'; return; }
    if (berjalan) {
      const baris = detail.filter(x => x.lokasi_id === this.lok);
      html += '<div class="card mt"><div class="ch"><div><h3>' + icon('pin', 'sm') + ' Hitung per lokasi</h3><div class="d">Scan label bin, lalu hitung barang di dalamnya.' + (o.tipe ? '' : '') + '</div></div><div class="ml-auto row"><label class="chk small"><input type="checkbox" id="os-buta" ' + (this.buta ? 'checked' : '') + '> Hitung buta</label><button class="btn sm" data-act="os.scanLok">' + icon('scan') + 'Scan bin</button></div></div>' +
        '<div class="chips mb" style="max-height:120px;overflow:auto">' + lokasi.map(l => { const r = detail.filter(x => x.lokasi_id === l), s = r.filter(x => this.nilaiFisik(x) !== '').length; return '<button class="chip ' + (l === this.lok ? 'on' : '') + '" data-act="os.lok" data-id="' + l + '">' + esc(Store.lok(l).kode) + ' <span class="c">' + s + '/' + r.length + '</span></button>'; }).join('') + '</div>' +
        '<div class="row between mb"><div class="b">Bin ' + esc(Store.lok(this.lok).kode) + ' <span class="muted small">' + esc(Store.lok(this.lok).zona || '') + '</span></div><button class="btn sm soft" data-act="os.temuan">' + icon('pkgplus') + 'Barang ditemukan (tidak tercatat)</button></div>' +
        (baris.length ? baris.map(x => this.barisHitung(x, ambang)).join('') : UI.empty('box', 'Bin kosong menurut sistem', 'Bila ada barang di bin ini, tambahkan lewat "Barang ditemukan".')) + '</div>';
    }
    if (!berjalan) {
      const tampil = detail.filter(x => x.qty_fisik !== '').sort((a, b) => Math.abs(b.nilai) - Math.abs(a.nilai) || Math.abs(b.selisih) - Math.abs(a.selisih));
      html += '<div class="card p0 mt"><div class="ch" style="padding:16px 18px 0"><h3>Hasil hitung (' + tampil.length + ' baris)</h3></div>' + UI.tabel({ rows: tampil, kelas: x => x.selisih ? 'warnrow' : '',
        cols: [{ label: 'Lokasi', r: x => '<span class="tagk">' + esc(Store.lok(x.lokasi_id).kode) + '</span>' }, { label: 'Barang', r: x => '<div class="b">' + esc((Store.barangOf(x.sku) || {}).nama_barang || x.sku) + '</div><div class="sub mono">' + esc(x.sku + ' · ' + x.batch) + '</div>' },
          { label: 'Sistem', n: 1, r: x => F.num(x.qty_hitung === '' ? x.qty_sistem : x.qty_hitung) }, { label: 'Fisik', n: 1, r: x => '<b>' + F.num(x.qty_fisik) + '</b>' }, { label: 'Selisih', n: 1, r: x => '<b class="' + (x.selisih < 0 ? 't-bad' : x.selisih > 0 ? 't-ok' : '') + '">' + (x.selisih > 0 ? '+' : '') + F.num(x.selisih) + '</b>' }]
          .concat(harga ? [{ label: 'Nilai', n: 1, r: x => F.rp(x.nilai) }] : []).concat([{ label: 'Alasan', r: x => '<span class="small">' + esc(String(x.alasan || '').replace(/\s*\|\s*exp:.*/, '')) + '</span>' }, { label: 'Status', r: x => UI.bdg(x.status) }, { label: 'Petugas', r: x => '<span class="small">' + esc(Store.nama(x.oleh)) + '</span>' }]),
        kartu: x => '<div class="grow"><div class="row between"><span class="tagk">' + esc(Store.lok(x.lokasi_id).kode) + '</span>' + UI.bdg(x.status) + '</div><div class="b mt-s">' + esc((Store.barangOf(x.sku) || {}).nama_barang || x.sku) + '</div><div class="small">Sistem ' + F.num(x.qty_hitung === '' ? x.qty_sistem : x.qty_hitung) + ' · Fisik <b>' + F.num(x.qty_fisik) + '</b> · Selisih <b class="' + (x.selisih ? 't-bad' : '') + '">' + F.num(x.selisih) + '</b></div></div>' }) + '</div>';
    }
    el.innerHTML = html;
    const b = $('#os-buta'); if (b) b.onchange = () => { this.buta = b.checked; LS.set('gp_op_buta', this.buta); this.gambar(); };
    $$('[data-od]', el).forEach(inp => inp.oninput = debounce(() => this.ubah(inp.dataset.od, inp.dataset.f, inp.value), 300));
  },
  barisHitung(x, ambang) {
    const b = Store.barangOf(x.sku) || {}, f = this.nilaiFisik(x), sis = x.qty_hitung === '' ? x.qty_kini : x.qty_hitung;
    const p = this.pending[x.od_id] || {}, sel = f === '' || f === undefined ? null : Number(f) - sis;
    const nilai = sel == null ? 0 : sel * (b.harga_beli || 0), perluAlasan = sel != null && Math.abs(nilai) > ambang;
    const alasan = p.a !== undefined ? p.a : x.alasan;
    return '<div class="item-card" style="' + (sel ? 'border-color:var(--warn)' : sel === 0 ? 'border-color:var(--ok)' : '') + '"><div class="top">' + UI.thumb(b.foto_url) + '<div class="grow" style="min-width:0"><div class="row gap-s"><span class="tagk">' + esc(x.sku) + '</span><span class="mono small">' + esc(x.batch) + '</span>' + (x.exp ? '<span class="small muted">exp ' + F.tgl(x.exp) + '</span>' : '') + (p.q !== undefined ? '<span class="bdg warn nodot ml-auto">belum disimpan</span>' : x.status !== 'Belum' ? '<span class="ml-auto">' + UI.bdg(x.status) + '</span>' : '') + '</div><div class="b ellipsis" style="margin-top:3px">' + esc(b.nama_barang || x.sku) + '</div>' +
      (this.buta ? '' : '<div class="small muted">Sistem saat dibuka: <b>' + F.num(x.qty_sistem) + '</b>' + (x.qty_kini !== x.qty_sistem ? ' · kini <b>' + F.num(x.qty_kini) + '</b> (ada transaksi berjalan)' : '') + '</div>') + '</div></div>' +
      '<div class="form-g mt-s"><div class="fld"><label>Qty fisik (' + esc(Store.sat(b.satuan_id)) + ')</label><div class="qty-in"><button type="button" data-act="os.q" data-id="' + x.od_id + '" data-d="-1">−</button><input type="number" inputmode="decimal" step="any" data-od="' + x.od_id + '" data-f="q" value="' + esc(f === undefined ? '' : f) + '" placeholder="hitung…"><button type="button" data-act="os.q" data-id="' + x.od_id + '" data-d="1">+</button></div>' + (this.buta ? '' : '<button type="button" class="btn sm ghost mt-s" data-act="os.sama" data-id="' + x.od_id + '">' + icon('check', 'sm') + 'Sama dengan sistem</button>') + '</div>' +
      '<div class="fld"><label>Alasan selisih' + (perluAlasan ? ' <span class="req">*</span>' : '') + '</label><input class="inp ' + (perluAlasan && !alasan ? 'err' : '') + '" data-od="' + x.od_id + '" data-f="a" value="' + esc(String(alasan || '').replace(/\s*\|\s*exp:.*/, '')) + '" placeholder="' + (sel ? 'mis. rusak, salah taruh' : 'isi bila ada selisih') + '">' + (sel != null && !this.buta ? '<div class="hint">Selisih <b class="' + (sel < 0 ? 't-bad' : sel > 0 ? 't-ok' : '') + '">' + (sel > 0 ? '+' : '') + F.num(sel) + '</b>' + (lihatHarga() ? ' · ' + F.rp(nilai) : '') + '</div>' : '') + '</div></div></div>';
  },
  ubah(od, f, v) {
    const p = this.pending[od] = this.pending[od] || {};
    if (f === 'q') p.q = v === '' ? '' : Number(v); else p.a = v;
    if (p.q === undefined) { const x = this.d.detail.find(z => z.od_id === od); p.q = x ? x.qty_fisik : ''; }
    LS.set('gp_op_' + this.id, this.pending);
    if (Object.keys(this.pending).length >= 15) this.simpan();
    else { const k = $('[data-od="' + od + '"][data-f="q"]'); const kartu = k && k.closest('.item-card'); const x = this.d.detail.find(z => z.od_id === od); if (kartu && x && f === 'q') { const tmp = document.createElement('div'); tmp.innerHTML = this.barisHitung(x, this.d.ambang); const pos = k.selectionStart; kartu.replaceWith(tmp.firstChild); $$('[data-od="' + od + '"]').forEach(inp => inp.oninput = debounce(() => this.ubah(inp.dataset.od, inp.dataset.f, inp.value), 300)); const n = $('[data-od="' + od + '"][data-f="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* number */ } } } }
  },
  async simpan(diam) {
    const ids = Object.keys(this.pending); if (!ids.length) return true;
    const lines = ids.filter(id => !id.startsWith('baru_')).map(id => ({ od_id: id, qty_fisik: this.pending[id].q, alasan: this.pending[id].a }))
      .concat(ids.filter(id => id.startsWith('baru_')).map(id => Object.assign({}, this.pending[id].baru, { qty_fisik: this.pending[id].q, alasan: this.pending[id].a })));
    const r = await API.call('opname.hitung', { opname_id: this.id, lines });
    if (!r.success) { if (!diam) UI.toast(r.message + ' — hitungan tetap tersimpan di perangkat.', 'err'); return false; }
    this.pending = {}; LS.del('gp_op_' + this.id);
    if (!diam) UI.toast(r.message);
    await this.render(this.el, this.id);
    return true;
  }
};
ACT['os.lok'] = async el => { const s = OpSesi; if (Object.keys(s.pending).length) await s.simpan(true); s.lok = el.dataset.id; s.gambar(); };
ACT['os.scanLok'] = async () => { const k = await Scanner.ambil('lokasi', 'Pindai label bin'); if (!k) return; const x = Scanner.kenali(k); if (!x || x.jenis !== 'lokasi') return UI.toast('Kode bin "' + k + '" tidak dikenali.', 'warn'); if (!OpSesi.d.opname.lokasi_ids.includes(x.data.id)) return UI.toast('Bin ' + x.data.kode + ' di luar area sesi ini.', 'warn'); ACT['os.lok']({ dataset: { id: x.data.id } }); };
ACT['os.q'] = el => { const x = OpSesi.d.detail.find(z => z.od_id === el.dataset.id); const cur = OpSesi.nilaiFisik(x); const v = Math.max(0, (cur === '' || cur === undefined ? 0 : Number(cur)) + Number(el.dataset.d)); OpSesi.ubah(el.dataset.id, 'q', String(v)); };
ACT['os.sama'] = el => { const x = OpSesi.d.detail.find(z => z.od_id === el.dataset.id); OpSesi.ubah(el.dataset.id, 'q', String(x.qty_hitung === '' ? x.qty_kini : x.qty_hitung)); OpSesi.gambar(); };
ACT['os.simpan'] = async el => { UI.busy(el, true); await OpSesi.simpan(); UI.busy(el, false); };
ACT['os.mulai'] = async el => { UI.busy(el, true); const r = await API.call('opname.mulai', { opname_id: OpSesi.id }); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('opname'); OpSesi.render(OpSesi.el, OpSesi.id); };
ACT['os.temuan'] = async () => {
  const k = await Scanner.ambil('barang', 'Pindai barang yang ditemukan'); if (!k) return;
  const x = Scanner.kenali(k); if (!x || x.jenis === 'lokasi') return UI.toast('Barang "' + k + '" tidak ada di master. Daftarkan dulu di Master Data.', 'warn');
  const b = x.barang || x.data;
  UI.modal({ title: 'Barang ditemukan di ' + Store.lok(OpSesi.lok).kode, size: 'sm', body: '<div class="b">' + esc(b.nama_barang) + '</div><div class="small muted mb">' + esc(b.sku) + '</div><div class="form-g"><div class="fld"><label>Batch</label><input class="inp" id="tm-b" value="' + esc(x.jenis === 'batch' ? x.data.batch_no : '') + '" style="text-transform:uppercase"></div><div class="fld"><label>Kedaluwarsa</label><input class="inp" type="date" id="tm-e"></div><div class="fld"><label>Qty fisik</label><input class="inp" type="number" id="tm-q" value="1"></div><div class="fld"><label>Keterangan</label><input class="inp" id="tm-a" value="Barang ditemukan, tidak tercatat"></div></div>',
    foot: '<button class="btn pri" id="tm-ok">Tambahkan</button>', onOpen: h => { h.el.querySelector('#tm-ok').onclick = () => { const id = 'baru_' + uid(); OpSesi.pending[id] = { q: Number(h.el.querySelector('#tm-q').value), a: h.el.querySelector('#tm-a').value, baru: { sku: b.sku, lokasi_id: OpSesi.lok, batch_no: h.el.querySelector('#tm-b').value, tgl_expired: h.el.querySelector('#tm-e').value } }; LS.set('gp_op_' + OpSesi.id, OpSesi.pending); h.tutup(); OpSesi.simpan(); }; } });
};
ACT['os.ajukan'] = async el => {
  const s = OpSesi; UI.busy(el, true);
  if (!(await s.simpan(true)) && Object.keys(s.pending).length) { UI.busy(el, false); return UI.toast('Hitungan belum tersimpan. Periksa koneksi.', 'err'); }
  let r = await API.call('opname.ajukan', { opname_id: s.id });
  if (!r.success && r.code === 'BELUM') { UI.busy(el, false); if (!(await UI.confirm({ title: 'Ada baris belum dihitung', msg: esc(r.message) + '<br><br>Lewati baris yang belum dihitung? (tidak akan disesuaikan)', ok: 'Lewati & ajukan' }))) return; UI.busy(el, true); r = await API.call('opname.ajukan', { opname_id: s.id, lewatiBelum: true }); }
  UI.busy(el, false);
  if (!r.success) return UI.toast(r.message, 'err');
  UI.toast(r.message); SWR.basi('opname'); App.setelahTulis('opname'); App.kartuOpname();
  await s.render(s.el, s.id);
  if (r.data.status === 'Selesai') ACT['os.ba']($('[data-act="os.ba"]') || document.createElement('button'), true);
};
ACT['os.batal'] = async el => { const a = await UI.prompt({ title: 'Batalkan sesi opname', label: 'Alasan', required: true, ok: 'Batalkan', danger: true }); if (!a) return; const r = await API.call('opname.batal', { opname_id: OpSesi.id, alasan: a }); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('opname'); OpSesi.render(OpSesi.el, OpSesi.id); };
ACT['os.ba'] = async (el, otomatis) => {
  UI.busy(el, true); UI.toast('Menyusun Berita Acara PDF dari template…', 'info', { ms: 6000 });
  const r = await API.call('doc.ba', { opname_id: OpSesi.id });
  UI.busy(el, false);
  if (!r.success) return UI.toast((otomatis ? 'Berita acara belum dibuat: ' : '') + r.message, otomatis ? 'warn' : 'err');
  UI.toast(r.message, 'ok', r.data && r.data.berkas && r.data.berkas.pdf ? { aksi: { label: 'Buka PDF', fn: () => window.open(r.data.berkas.pdf.url, '_blank') } } : null);
  OpSesi.render(OpSesi.el, OpSesi.id);
};
