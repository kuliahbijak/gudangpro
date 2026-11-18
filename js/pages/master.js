/* GudangPro OS — Master Data: barang (SKU), kategori, satuan, lokasi blok-rak-bin, supplier (FR-04 s.d. FR-07) */
const MASTER_TAB = [['barang', 'Barang (SKU)', 'package'], ['kategori', 'Kategori', 'tag'], ['satuan', 'Satuan', 'scale'], ['lokasi', 'Lokasi Bin', 'pin'], ['supplier', 'Supplier', 'truck']];
Page('master', {
  title: 'Master Data', roles: ['KEPALA', 'SUPERADMIN', 'PURCHASING', 'OWNER'],
  render(el, seg, q) {
    this.el = el; this.tab = seg[0] || 'barang'; this.q = Object.assign({ hal: 1 }, q);
    if (this.tab === 'lokasi' && can('PURCHASING')) this.tab = 'barang';
    this.gambar();
    if (q.baru && this.ubah()) setTimeout(() => Master.form(this.tab, null, q), 60);
    if (q.sku && this.tab === 'barang') setTimeout(() => Master.form('barang', Store.barangOf(q.sku)), 60);
  },
  ubah: () => can('KEPALA', 'SUPERADMIN'),
  onStore() { this.isi(); },
  gambar() {
    const el = this.el, t = this.tab;
    el.innerHTML = '<div class="ph"><div><h1>Master Data</h1><div class="sub">' + (this.ubah() ? 'Kelola SKU, kategori, satuan, lokasi blok-rak-bin, dan supplier. Data dinonaktifkan, bukan dihapus.' : 'Tampilan baca-saja untuk peran Anda.') + '</div></div><div class="acts">' + (this.ubah() ? '<a class="btn" href="#/import">' + icon('upload') + 'Impor Excel/CSV</a>' + (t === 'barang' || t === 'lokasi' ? '<button class="btn" data-act="ms.label">' + icon('printer') + 'Cetak Label</button>' : '') + (t === 'lokasi' ? '<button class="btn" data-act="ms.gen">' + icon('grid') + 'Generator Lokasi</button>' : '') + '<button class="btn pri" data-act="ms.baru">' + icon('plus') + 'Tambah ' + esc(MASTER_TAB.find(x => x[0] === t)[1].replace(/ \(.*\)/, '')) + '</button>' : '') + '</div></div>' +
      '<div class="tabs">' + MASTER_TAB.filter(x => !(x[0] === 'lokasi' && can('PURCHASING'))).map(x => '<button class="' + (x[0] === t ? 'on' : '') + '" data-act="go" data-h="#/master/' + x[0] + '">' + icon(x[2], 'sm') + x[1] + '</button>').join('') + '</div>' +
      '<div class="card p0"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="inp-ic grow" style="max-width:380px">' + icon('search') + '<input class="inp" id="ms-q" placeholder="Cari…" value="' + esc(this.q.q || '') + '"></div>' +
      (t === 'barang' ? '<select class="inp sm" style="width:auto" id="ms-kat"><option value="">Semua kategori</option>' + Store.kategori.map(k => '<option value="' + k.id + '" ' + (this.q.kat === k.id ? 'selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select>' : '') +
      (t === 'lokasi' ? '<select class="inp sm" style="width:auto" id="ms-zona"><option value="">Semua zona</option>' + [...new Set(Store.lokasi.map(l => l.zona).filter(Boolean))].map(z => '<option ' + (this.q.zona === z ? 'selected' : '') + '>' + esc(z) + '</option>').join('') + '</select>' : '') +
      (['barang', 'lokasi', 'supplier'].includes(t) ? '<select class="inp sm" style="width:auto" id="ms-st"><option value="">Semua status</option><option ' + (this.q.status === 'Aktif' ? 'selected' : '') + '>Aktif</option>' + (t === 'lokasi' ? '<option ' + (this.q.status === 'Karantina' ? 'selected' : '') + '>Karantina</option>' : '') + '<option ' + (this.q.status === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select>' : '') + '</div><div id="ms-isi"></div></div>';
    const qi = $('#ms-q'); qi.oninput = debounce(() => { this.q.q = qi.value; this.q.hal = 1; this.isi(); }, 200);
    ['kat', 'zona', 'st'].forEach(k => { const s = $('#ms-' + k); if (s) s.onchange = () => { this.q[k === 'st' ? 'status' : k] = s.value; this.q.hal = 1; this.isi(); }; });
    this.isi();
  },
  isi() {
    const box = $('#ms-isi'); if (!box) return;
    const t = this.tab, q = String(this.q.q || '').toLowerCase(), ub = this.ubah(), harga = lihatHarga(), per = 30, hal = this.q.hal || 1;
    let rows = [], cols = [], kartu, id;
    if (t === 'barang') {
      rows = Store.barang.filter(b => (!q || (b.sku + ' ' + b.nama_barang + ' ' + b.barcode).toLowerCase().includes(q)) && (!this.q.kat || b.kategori_id === this.q.kat) && (!this.q.status || b.status === this.q.status));
      id = b => b.sku;
      cols = [{ label: 'SKU', r: b => '<div class="row">' + UI.thumb(b.foto_url) + '<div><div class="b mono t-teal" style="font-size:12px">' + esc(b.sku) + '</div><div class="sub mono">' + esc(b.barcode || '-') + '</div></div></div>' }, { label: 'Nama Barang', r: b => '<div class="b">' + esc(b.nama_barang) + '</div><div class="sub">' + esc(Store.kat(b.kategori_id)) + ' · ' + esc(Store.sat(b.satuan_id)) + '</div>' },
        { label: 'Metode', r: b => '<span class="bdg teal nodot">' + esc(b.metode) + '</span>' }, { label: 'Min / Maks', n: 1, r: b => F.num(b.stok_minimum) + ' / ' + F.num(b.stok_maksimum) }]
        .concat(harga ? [{ label: 'Harga Beli', n: 1, r: b => F.rp(b.harga_beli) }] : []).concat([{ label: 'Harga Jual', n: 1, r: b => F.rp(b.harga_jual) }, { label: 'Stok', n: 1, r: b => F.num((Stok.ringkas()[b.sku] || {}).total || 0) }, { label: 'Status', r: b => UI.bdg(b.status) }]);
      kartu = b => UI.thumb(b.foto_url) + '<div class="grow"><div class="row between"><span class="tagk">' + esc(b.sku) + '</span>' + UI.bdg(b.status) + '</div><div class="b mt-s">' + esc(b.nama_barang) + '</div><div class="small muted">' + esc(Store.kat(b.kategori_id)) + ' · ' + esc(b.metode) + ' · min ' + F.num(b.stok_minimum) + '</div></div>';
    } else if (t === 'kategori' || t === 'satuan') {
      rows = (t === 'kategori' ? Store.kategori : Store.satuan).filter(k => !q || k.nama.toLowerCase().includes(q)); id = k => k.id;
      const hit = {}; Store.barang.forEach(b => { const k = t === 'kategori' ? b.kategori_id : b.satuan_id; hit[k] = (hit[k] || 0) + 1; });
      cols = [{ label: 'Nama', r: k => '<b>' + esc(k.nama) + '</b>' }, { label: 'Kode', r: k => '<span class="mono small muted">' + esc(k.id) + '</span>' }, { label: t === 'kategori' ? 'Keterangan' : 'Konversi dasar', r: k => esc(t === 'kategori' ? k.ket || '' : k.konversi) }, { label: 'Dipakai', n: 1, r: k => F.num(hit[k.id] || 0, 0) + ' SKU' }];
    } else if (t === 'lokasi') {
      rows = Store.lokasi.filter(l => (!q || (l.kode + ' ' + l.zona).toLowerCase().includes(q)) && (!this.q.zona || l.zona === this.q.zona) && (!this.q.status || l.status === this.q.status)).sort((a, b) => a.kode.localeCompare(b.kode)); id = l => l.id;
      const isi = Stok.perLokasi();
      cols = [{ label: 'Kode', r: l => '<span class="tagk">' + esc(l.kode) + '</span>' }, { label: 'Blok · Rak · Bin', r: l => esc(l.blok + ' · ' + l.rak + ' · ' + l.bin) }, { label: 'Zona', r: l => esc(l.zona || '-') }, { label: 'Kapasitas', n: 1, r: l => l.kapasitas ? F.num(l.kapasitas, 0) : '—' },
        { label: 'Terisi', n: 1, r: l => { const x = isi[l.id]; return x ? F.num(x.qty, 0) + (l.kapasitas ? ' <span class="sub">(' + F.num(x.qty / l.kapasitas * 100, 0) + '%)</span>' : '') : '<span class="muted">kosong</span>'; } }, { label: 'Status', r: l => UI.bdg(l.status) }];
      kartu = l => '<div class="grow"><div class="row between"><span class="tagk">' + esc(l.kode) + '</span>' + UI.bdg(l.status) + '</div><div class="small muted mt-s">' + esc(l.zona || '') + ' · ' + F.num((isi[l.id] || { qty: 0 }).qty, 0) + (l.kapasitas ? ' / ' + F.num(l.kapasitas, 0) : '') + '</div></div>';
    } else {
      rows = Store.supplier.filter(s => (!q || (s.nama + ' ' + s.kontak + ' ' + s.no_wa + ' ' + s.email).toLowerCase().includes(q)) && (!this.q.status || s.status === this.q.status)); id = s => s.id;
      cols = [{ label: 'Nama Supplier', r: s => '<b>' + esc(s.nama) + '</b><div class="sub">' + esc(s.alamat || '') + '</div>' }, { label: 'Kontak', r: s => esc(s.kontak || '-') }, { label: 'WhatsApp', r: s => s.no_wa ? '<span class="mono">' + esc(s.no_wa) + '</span> <span class="wa-badge ' + (s.status_wa === 'Terdaftar' ? 'ya' : s.status_wa ? 'tidak' : 'belum') + '">' + (s.status_wa === 'Terdaftar' ? '✓ WA' : s.status_wa ? '✕' : '?') + '</span>' : '-' }, { label: 'Email', r: s => esc(s.email || '-') }, { label: 'Status', r: s => UI.bdg(s.status) }];
      kartu = s => '<div class="grow"><div class="row between"><b>' + esc(s.nama) + '</b>' + UI.bdg(s.status) + '</div><div class="small muted">' + esc([s.kontak, s.no_wa, s.email].filter(Boolean).join(' · ')) + '</div></div>';
    }
    box.innerHTML = UI.tabel({ rows: rows.slice((hal - 1) * per, hal * per), cols, kartu, act: ub ? 'ms.edit' : (t === 'barang' ? 'stok.sku' : null), id, kosong: UI.empty('database', 'Belum ada data', ub ? 'Klik Tambah atau impor dari Excel.' : '') }) + (rows.length ? UI.pager(rows.length, hal, per, 'ms.hal') : '');
  }
});
ACT['ms.hal'] = el => { Pages.master.q.hal = +el.dataset.p; Pages.master.isi(); };
ACT['ms.baru'] = () => Master.form(Pages.master.tab, null, {});
ACT['ms.edit'] = el => { const t = Pages.master.tab, id = el.dataset.id; const x = t === 'barang' ? Store.barangOf(id) : (Store[t] || []).find(o => o.id === id); Master.form(t, x); };

const Master = {
  form(t, x, q) {
    q = q || {}; const baru = !x, ub = Pages.master.ubah();
    let body = '';
    const opt = (arr, v, f) => arr.map(o => '<option value="' + esc(o.id) + '" ' + (o.id === v ? 'selected' : '') + '>' + esc(f ? f(o) : o.nama) + '</option>').join('');
    if (t === 'barang') {
      x = x || { sku: '', nama_barang: '', kategori_id: (Store.kategori[0] || {}).id, satuan_id: (Store.satuan[0] || {}).id, barcode: q.barcode || '', harga_beli: 0, harga_jual: 0, stok_minimum: 0, stok_maksimum: 0, metode: 'FIFO', pakai_batch: 'N', pakai_expired: 'N', status: 'Aktif', keterangan: '', foto_url: '' };
      body = '<div class="row mb">' + UI.thumb(x.foto_url).replace('class="thumb"', 'class="thumb" id="mf-foto" style="width:72px;height:72px"') + '<div><button type="button" class="btn sm" data-act="mf.foto" ' + (baru ? 'disabled title="Simpan SKU dulu"' : '') + '>' + icon('camera') + 'Foto barang</button><div class="hint mt-s">' + (baru ? 'Foto bisa ditambahkan setelah SKU disimpan.' : 'Dikompres otomatis sebelum diunggah.') + '</div></div></div>' +
        '<div class="form-g"><div class="fld"><label>SKU <span class="req">*</span></label><input class="inp" name="sku" value="' + esc(x.sku) + '" ' + (baru ? '' : 'readonly') + ' placeholder="mis. SKU-MIE-0101" style="text-transform:uppercase"></div><div class="fld"><label>Barcode</label><div class="row gap-s"><input class="inp" name="barcode" value="' + esc(x.barcode) + '" placeholder="EAN-13 / kode"><button type="button" class="btn" data-act="mf.scanbc" title="Scan">' + icon('scan') + '</button><button type="button" class="btn" data-act="mf.genbc" title="Buat barcode internal">' + icon('sparkles') + '</button></div></div>' +
        '<div class="fld full"><label>Nama barang <span class="req">*</span></label><input class="inp" name="nama_barang" value="' + esc(x.nama_barang) + '"></div>' +
        '<div class="fld"><label>Kategori</label><select class="inp" name="kategori_id">' + opt(Store.kategori, x.kategori_id) + '</select></div><div class="fld"><label>Satuan</label><select class="inp" name="satuan_id">' + opt(Store.satuan, x.satuan_id) + '</select></div>' +
        (lihatHarga() ? '<div class="fld"><label>Harga beli (HPP)</label><input class="inp" type="number" name="harga_beli" value="' + esc(x.harga_beli) + '"></div>' : '') + '<div class="fld"><label>Harga jual</label><input class="inp" type="number" name="harga_jual" value="' + esc(x.harga_jual) + '"></div>' +
        '<div class="fld"><label>Stok minimum</label><input class="inp" type="number" name="stok_minimum" value="' + esc(x.stok_minimum) + '"><div class="hint">Di bawah ini → alert & status Kritis</div></div><div class="fld"><label>Stok maksimum</label><input class="inp" type="number" name="stok_maksimum" value="' + esc(x.stok_maksimum) + '"></div>' +
        '<div class="fld"><label>Metode pengambilan</label><select class="inp" name="metode"><option value="FIFO" ' + (x.metode === 'FIFO' ? 'selected' : '') + '>FIFO — masuk pertama keluar pertama</option><option value="FEFO" ' + (x.metode === 'FEFO' ? 'selected' : '') + '>FEFO — kedaluwarsa terdekat keluar pertama</option></select></div>' +
        '<div class="fld"><label>Status</label><select class="inp" name="status"><option ' + (x.status === 'Aktif' ? 'selected' : '') + '>Aktif</option><option ' + (x.status === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select></div>' +
        '<label class="chk"><input type="checkbox" name="pakai_batch" ' + (x.pakai_batch === 'Y' ? 'checked' : '') + '> Nomor batch wajib diisi</label><label class="chk"><input type="checkbox" name="pakai_expired" ' + (x.pakai_expired === 'Y' ? 'checked' : '') + '> Tanggal kedaluwarsa wajib (otomatis untuk FEFO)</label>' +
        '<div class="fld full"><label>Keterangan</label><input class="inp" name="keterangan" value="' + esc(x.keterangan) + '"></div></div>';
    } else if (t === 'kategori') { x = x || { nama: '', ket: '' }; body = '<div class="form-g"><div class="fld full"><label>Nama kategori <span class="req">*</span></label><input class="inp" name="nama_kategori" value="' + esc(x.nama) + '" autofocus></div><div class="fld full"><label>Keterangan</label><input class="inp" name="keterangan" value="' + esc(x.ket || '') + '"></div></div>'; }
    else if (t === 'satuan') { x = x || { nama: '', konversi: 1 }; body = '<div class="form-g"><div class="fld"><label>Nama satuan <span class="req">*</span></label><input class="inp" name="nama_satuan" value="' + esc(x.nama) + '" autofocus placeholder="mis. dus"></div><div class="fld"><label>Konversi ke satuan dasar</label><input class="inp" type="number" name="konversi_dasar" value="' + esc(x.konversi) + '"></div></div>'; }
    else if (t === 'lokasi') {
      x = x || { blok: '', rak: '', bin: '', zona: '', kapasitas: 0, status: 'Aktif' };
      body = '<div class="form-g g3"><div class="fld"><label>Blok <span class="req">*</span></label><input class="inp" name="blok" value="' + esc(x.blok) + '" ' + (baru ? 'autofocus' : 'readonly') + ' placeholder="A"></div><div class="fld"><label>Rak <span class="req">*</span></label><input class="inp" name="rak" value="' + esc(x.rak) + '" ' + (baru ? '' : 'readonly') + ' placeholder="02"></div><div class="fld"><label>Bin <span class="req">*</span></label><input class="inp" name="bin" value="' + esc(x.bin) + '" ' + (baru ? '' : 'readonly') + ' placeholder="03"></div></div>' +
        '<div class="form-g mt"><div class="fld"><label>Zona</label><input class="inp" name="zona" value="' + esc(x.zona) + '" list="dl-zona" placeholder="mis. Zona A - Kering"></div><div class="fld"><label>Kapasitas (unit)</label><input class="inp" type="number" name="kapasitas" value="' + esc(x.kapasitas) + '"></div><div class="fld full"><label>Status</label><select class="inp" name="status">' + ['Aktif', 'Karantina', 'Nonaktif'].map(s => '<option ' + (x.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select><div class="hint">Karantina: barang tetap tercatat tetapi tidak disarankan untuk outbound (FIFO/FEFO).</div></div></div>' +
        '<datalist id="dl-zona">' + [...new Set(Store.lokasi.map(l => l.zona).filter(Boolean))].map(z => '<option value="' + esc(z) + '">').join('') + '</datalist>';
    } else { x = x || { nama: '', kontak: '', no_wa: '', email: '', alamat: '', status: 'Aktif' }; body = '<div class="form-g"><div class="fld full"><label>Nama supplier <span class="req">*</span></label><input class="inp" name="nama" value="' + esc(x.nama) + '" autofocus></div><div class="fld"><label>Kontak (PIC)</label><input class="inp" name="kontak" value="' + esc(x.kontak) + '"></div><div class="fld"><label>WhatsApp</label><input class="inp" name="no_wa" inputmode="tel" value="' + esc(x.no_wa) + '" placeholder="0812…"></div><div class="fld"><label>Email</label><input class="inp" type="email" name="email" value="' + esc(x.email) + '"></div><div class="fld"><label>Status</label><select class="inp" name="status"><option ' + (x.status === 'Aktif' ? 'selected' : '') + '>Aktif</option><option ' + (x.status === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select></div><div class="fld full"><label>Alamat</label><textarea class="inp" name="alamat">' + esc(x.alamat) + '</textarea></div></div>'; }
    const judul = MASTER_TAB.find(m => m[0] === t)[1].replace(/ \(.*\)/, '');
    UI.modal({ title: (baru ? 'Tambah ' : 'Ubah ') + judul, size: t === 'barang' ? 'lg' : '', body: '<form id="mf">' + body + '</form>',
      foot: (!baru && t === 'barang' ? '<a class="btn ghost" href="#/stok?sku=' + encodeURIComponent(x.sku) + '">' + icon('boxes') + 'Lihat stok</a>' : '') + '<button class="btn" data-x3>Batal</button>' + (ub ? '<button class="btn pri" id="mf-ok">' + icon('check') + 'Simpan</button>' : ''),
      onOpen: h => {
        const f = h.el.querySelector('#mf'); h.el.querySelector('[data-x3]').onclick = () => h.tutup();
        if (!ub) f.querySelectorAll('input,select,textarea').forEach(i => i.disabled = true);
        Master._h = h; Master._x = x;
        const metode = f.querySelector('[name=metode]'); if (metode) metode.onchange = () => { if (metode.value === 'FEFO') f.querySelector('[name=pakai_expired]').checked = true; };
        const ok = h.el.querySelector('#mf-ok'); if (!ok) return;
        ok.onclick = async () => {
          const d = {}; new FormData(f).forEach((v, k) => d[k] = v); f.querySelectorAll('input[type=checkbox]').forEach(c => d[c.name] = c.checked ? 'Y' : 'N');
          if (!baru) { const key = { barang: 'sku', kategori: 'kategori_id', satuan: 'satuan_id', lokasi: 'lokasi_id', supplier: 'supplier_id' }[t]; d[key] = t === 'barang' ? x.sku : x.id; if (t === 'lokasi') d.kode_lokasi = x.kode; if (t === 'barang') d.foto_url = x.foto_url; if (t === 'barang' && !lihatHarga()) d.harga_beli = x.harga_beli; }
          UI.busy(ok, true);
          const r = await API.call('master.simpan', { entitas: t, data: d, baru });
          UI.busy(ok, false);
          if (!r.success) return UI.toast(r.message, 'err');
          UI.toast(r.message); h.tutup(); await App.setelahTulis(''); Pages.master.isi && Pages.master.isi();
        };
      } });
  }
};
ACT['mf.genbc'] = () => { const f = $('#mf'); const s = '200' + String(Date.now()).slice(-9); let t = 0; for (let i = 0; i < 12; i++) t += Number(s[i]) * (i % 2 ? 3 : 1); f.barcode.value = s + ((10 - t % 10) % 10); };
ACT['mf.scanbc'] = async () => { const k = await Scanner.ambil('barang', 'Pindai barcode kemasan'); if (k) $('#mf').barcode.value = k; };
ACT['mf.foto'] = async el => {
  const f = await Gambar.pilih('image/*'); if (!f) return; const x = Master._x;
  UI.busy(el, true); const g = await Gambar.kompres(f, 900, .8);
  const r = await API.call('master.foto', Object.assign({ sku: x.sku }, g)); UI.busy(el, false);
  if (!r.success) return UI.toast(r.message, 'err');
  x.foto_url = r.data.foto_url; const t = $('#mf-foto'); if (t) t.innerHTML = '<img src="' + esc(g.base64) + '">'; UI.toast('Foto tersimpan.'); App.setelahTulis('');
};
ACT['ms.gen'] = () => UI.modal({ title: 'Generator Lokasi Blok-Rak-Bin', desc: 'Buat banyak bin sekaligus (mis. Blok A rak 01–04 bin 01–05 = 20 bin).', body: '<div class="form-g g3"><div class="fld"><label>Blok</label><input class="inp" id="g-blok" value="A"></div><div class="fld"><label>Rak dari</label><input class="inp" type="number" id="g-r1" value="1"></div><div class="fld"><label>Rak sampai</label><input class="inp" type="number" id="g-r2" value="4"></div><div class="fld"><label>Zona</label><input class="inp" id="g-zona" placeholder="Zona A - Kering"></div><div class="fld"><label>Bin dari</label><input class="inp" type="number" id="g-b1" value="1"></div><div class="fld"><label>Bin sampai</label><input class="inp" type="number" id="g-b2" value="5"></div><div class="fld"><label>Kapasitas / bin</label><input class="inp" type="number" id="g-kap" value="100"></div></div><div class="small muted mt" id="g-info"></div>',
  foot: '<button class="btn pri" id="g-ok">' + icon('grid') + 'Buat Lokasi</button>', onOpen: h => {
    const v = id => h.el.querySelector(id).value, info = () => { const n = Math.max(0, v('#g-r2') - v('#g-r1') + 1) * Math.max(0, v('#g-b2') - v('#g-b1') + 1); h.el.querySelector('#g-info').textContent = n + ' bin akan dibuat (kode ' + String(v('#g-blok')).toUpperCase() + '-' + pad(v('#g-r1')) + '-' + pad(v('#g-b1')) + ' s.d. ' + String(v('#g-blok')).toUpperCase() + '-' + pad(v('#g-r2')) + '-' + pad(v('#g-b2')) + '). Kode yang sudah ada dilewati.'; };
    h.el.querySelectorAll('input').forEach(i => i.oninput = info); info();
    h.el.querySelector('#g-ok').onclick = async () => {
      const rows = []; for (let r = +v('#g-r1'); r <= +v('#g-r2'); r++) for (let b = +v('#g-b1'); b <= +v('#g-b2'); b++) rows.push({ blok: v('#g-blok'), rak: pad(r), bin: pad(b), zona: v('#g-zona'), kapasitas: v('#g-kap') });
      if (!rows.length || rows.length > 500) return UI.toast('Jumlah bin harus 1–500.', 'warn');
      const btn = h.el.querySelector('#g-ok'); UI.busy(btn, true);
      const r = await API.call('import.data', { jenis: 'lokasi', rows }); UI.busy(btn, false);
      if (!r.success) return UI.toast(r.message, 'err');
      UI.toast(r.data.ditambah + ' lokasi dibuat' + (r.data.dilewati ? ', ' + r.data.dilewati + ' sudah ada' : '') + '.'); h.tutup(); App.setelahTulis('');
    };
  } });
ACT['ms.label'] = () => {
  const t = Pages.master.tab;
  if (t === 'lokasi') { const l = Store.lokasi.filter(x => !Pages.master.q.zona || x.zona === Pages.master.q.zona); return Label.cetak(l.map(x => ({ kode: x.kode, judul: 'BIN ' + x.kode, sub: x.zona || '' })), 'qr'); }
  const q = String(Pages.master.q.q || '').toLowerCase(), b = Store.barang.filter(x => x.status === 'Aktif' && (!q || (x.sku + ' ' + x.nama_barang).toLowerCase().includes(q))).slice(0, 120);
  Label.cetak(b.map(x => ({ kode: x.barcode || x.sku, judul: x.nama_barang, sub: x.sku })), 'barcode');
};
