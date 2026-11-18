/* GudangPro OS — Transaksi: form IN/OUT/RETUR/MUTASI/ADJ (FR-08 s.d. FR-14), daftar & detail dokumen */
const TIPE_INFO = {
  IN: { judul: 'Barang Masuk (Inbound)', ic: 'in', sub: 'Terima barang dari supplier, catat batch & kedaluwarsa, lalu simpan ke lokasi bin (putaway).' },
  OUT: { judul: 'Barang Keluar (Outbound)', ic: 'out', sub: 'Sistem menyarankan batch & lokasi sesuai FIFO/FEFO. Stok tidak bisa minus.' },
  RETUR: { judul: 'Retur Barang', ic: 'retur', sub: 'Retur masuk dari pelanggan atau retur keluar ke supplier — alasan wajib diisi.' },
  MUTASI: { judul: 'Mutasi Antar Rak', ic: 'mutasi', sub: 'Pindahkan batch antar lokasi bin. Mutasi dari Staf menunggu persetujuan Kepala Gudang.' },
  ADJ: { judul: 'Penyesuaian Stok (ADJ)', ic: 'scale', sub: 'Koreksi stok manual dengan alasan — tercatat sebagai transaksi penyesuaian di audit log.' }
};
const TrxForm = {
  s: null,
  buka(el, tipe, q) {
    const kunci = 'gp_draft_' + tipe, draf = LS.get(kunci, null);
    this.s = draf && draf.items && draf.items.length && !q.sku && !q.stok && !q.asal ? draf : { tipe, sub: tipe === 'RETUR' ? (q.keluar ? 'KELUAR' : 'MASUK') : tipe === 'ADJ' ? 'MANUAL' : '', h: { tanggal: today(), supplier_id: '', tujuan: '', catatan: '' }, items: [], cid: uid() };
    this.s.lampiran = []; this.el = el; this.kunci = kunci; this.dipulihkan = !!(draf && draf.items && draf.items.length && this.s === draf);
    if (q.sku && !q.stok) this.tambah(q.sku, { lokasi_id: q.lok });
    if (q.stok && Store.idx.stok[q.stok]) { const r = Store.idx.stok[q.stok]; this.tambah(r.sku, { stok_id: r.stok_id, qty: tipe === 'RETUR' ? r.qty : 1 }); if (tipe === 'RETUR') this.s.h.supplier_id = r.supplier_id || ''; }
    if (q.asal && tipe === 'MUTASI') Stok.perLokasi()[q.asal] && Stok.perLokasi()[q.asal].rows.forEach(r => this.tambah(r.sku, { stok_id: r.stok_id, qty: r.qty }));
    this.gambar();
  },
  simpanDraf: debounce(function () { const s = TrxForm.s; if (!s) return; if (s.items.length) LS.set(TrxForm.kunci, Object.assign({}, s, { lampiran: [] })); else LS.del(TrxForm.kunci); }, 400),
  info() { const s = this.s; return { masuk: s.tipe === 'IN' || (s.tipe === 'RETUR' && s.sub === 'MASUK'), keluar: s.tipe === 'OUT' || (s.tipe === 'RETUR' && s.sub === 'KELUAR') }; },
  tambah(sku, pre) {
    const b = Store.barangOf(sku); if (!b) return UI.toast('SKU ' + sku + ' tidak ada di master.', 'warn');
    if (b.status === 'Nonaktif') return UI.toast(b.sku + ' berstatus nonaktif.', 'warn');
    const s = this.s, i = this.info(); pre = pre || {};
    const ada = pre.inc && s.items.find(x => x.sku === b.sku && !x.stok_id && (i.keluar || i.masuk));
    if (ada) { ada.qty = (Number(ada.qty) || 0) + 1; UI.toast(b.nama_barang + ': qty +1 (' + ada.qty + ')', 'info', { ms: 1500 }); this.gambar(); return; }
    const it = { k: uid(), sku: b.sku, qty: pre.qty || 1 };
    if (i.masuk) Object.assign(it, { batch_no: pre.batch_no || '', tgl_expired: '', lokasi_id: pre.lokasi_id || (s.sub === 'MASUK' && s.tipe === 'RETUR' ? (Store.lokasi.find(l => l.status === 'Karantina') || {}).id : '') || Stok.saranLokasi(b.sku), harga: lihatHarga() ? b.harga_beli : '' });
    if (i.keluar) Object.assign(it, { stok_id: pre.stok_id || '', alasan: '' });
    if (s.tipe === 'MUTASI') { const r = pre.stok_id ? Store.idx.stok[pre.stok_id] : Stok.urut(b.sku, b.metode, true)[0]; Object.assign(it, { stok_id: r ? r.stok_id : '', lokasi_tujuan: '' }); }
    if (s.tipe === 'ADJ') { const r = pre.stok_id ? Store.idx.stok[pre.stok_id] : null; Object.assign(it, { stok_id: r ? r.stok_id : '', qty: pre.qty || 0, alasan: '', lokasi_id: '', batch_no: '', tgl_expired: '' }); if (!r) it.mode = Stok.rows(b.sku).length ? 'ada' : 'baru'; if (!r && it.mode === 'ada') it.stok_id = Stok.rows(b.sku)[0].stok_id; }
    s.items.push(it);
    if (this.el && this.el.isConnected) this.gambar();
  },
  /** Validasi + pratinjau alokasi untuk satu item. */
  cek(it) {
    const s = this.s, i = this.info(), b = Store.barangOf(it.sku) || {}, qty = Number(it.qty);
    const e = [];
    if (s.tipe !== 'ADJ' && !(qty > 0)) e.push('Jumlah harus lebih dari 0.');
    if (i.masuk) {
      if (!it.lokasi_id) e.push('Pilih lokasi putaway.');
      if (b.pakai_batch === 'Y' && !String(it.batch_no || '').trim()) e.push('Nomor batch wajib.');
      if (b.pakai_expired === 'Y' && !it.tgl_expired) e.push('Tanggal kedaluwarsa wajib.');
      if (it.tgl_expired && it.tgl_expired < today()) e.push('Perhatian: tanggal kedaluwarsa sudah lewat.');
    }
    let alok = null;
    if (i.keluar && qty > 0) {
      const exp = s.tipe === 'RETUR';
      if (it.stok_id) {
        const r = Store.idx.stok[it.stok_id], saran = Stok.urut(it.sku, b.metode, exp)[0];
        if (!r) e.push('Batch pilihan tidak ditemukan.');
        else { if (r.qty < qty) e.push('Stok batch ' + r.batch_no + ' hanya ' + F.num(r.qty) + '.'); if (!exp && r.tgl_expired && r.tgl_expired < today()) e.push('Batch sudah kedaluwarsa.'); if (!exp && saran && saran.stok_id !== r.stok_id && !String(it.alasan || '').trim()) e.push('Isi alasan memilih batch di luar saran ' + b.metode + '.'); alok = { baris: r ? [{ r, qty }] : [], kurang: 0 }; }
      } else { alok = Stok.alokasi(it.sku, qty, exp); if (alok.kurang > 0) e.push('Stok tidak cukup. Tersedia ' + F.num(Stok.tersedia(it.sku, exp)) + ' ' + Store.sat(b.satuan_id) + '.'); }
    }
    if (s.tipe === 'MUTASI') { const r = Store.idx.stok[it.stok_id]; if (!r) e.push('Pilih batch/lokasi asal.'); else if (r.qty < qty) e.push('Stok di ' + Store.lok(r.lokasi_id).kode + ' hanya ' + F.num(r.qty) + '.'); if (!it.lokasi_tujuan) e.push('Pilih lokasi tujuan.'); else if (r && r.lokasi_id === it.lokasi_tujuan) e.push('Lokasi tujuan sama dengan asal.'); }
    if (s.tipe === 'ADJ') { if (!qty) e.push('Isi selisih (+ tambah / − kurangi).'); if (!String(it.alasan || '').trim()) e.push('Alasan wajib.'); if (it.mode !== 'baru') { const r = Store.idx.stok[it.stok_id]; if (!r) e.push('Pilih baris stok.'); else if (r.qty + qty < 0) e.push('Stok akan minus (stok ' + F.num(r.qty) + ').'); } else { if (qty < 0) e.push('Batch baru hanya untuk penambahan.'); if (!it.lokasi_id) e.push('Pilih lokasi.'); } }
    return { e, alok, b };
  },
  nilai(it, c) { const b = c.b; if (c.alok) return c.alok.baris.reduce((t, x) => t + x.qty * (x.r.harga || b.harga_beli || 0), 0); if (this.info().masuk) return Number(it.qty) * (Number(it.harga) || b.harga_beli || 0); const r = Store.idx.stok[it.stok_id]; return Math.abs(Number(it.qty)) * ((r && r.harga) || b.harga_beli || 0); },
  opsiLokasi(pilih, filter) {
    const z = {}; Store.lokasi.filter(l => l.status !== 'Nonaktif' && (!filter || filter(l))).forEach(l => (z[l.zona || 'Tanpa zona'] = z[l.zona || 'Tanpa zona'] || []).push(l));
    const isi = Stok.perLokasi();
    return '<option value="">— pilih lokasi —</option>' + Object.keys(z).sort().map(k => '<optgroup label="' + esc(k) + '">' + z[k].sort((a, b) => a.kode.localeCompare(b.kode)).map(l => '<option value="' + l.id + '" ' + (l.id === pilih ? 'selected' : '') + '>' + esc(l.kode) + (l.status === 'Karantina' ? ' (karantina)' : '') + (isi[l.id] ? ' · ' + F.num(isi[l.id].qty, 0) + ' unit' : ' · kosong') + '</option>').join('') + '</optgroup>').join('');
  },
  kartuItem(it, idx) {
    const s = this.s, i = this.info(), c = this.cek(it), b = c.b, sat = Store.sat(b.satuan_id), h = lihatHarga();
    let f = '';
    const qtyIn = (lbl) => '<div class="fld"><label>' + lbl + ' <span class="req">*</span></label><div class="qty-in"><button type="button" data-act="tf.qty" data-k="' + it.k + '" data-d="-1">−</button><input type="number" inputmode="decimal" step="any" data-f="qty" data-k="' + it.k + '" value="' + esc(it.qty) + '"><button type="button" data-act="tf.qty" data-k="' + it.k + '" data-d="1">+</button></div><div class="hint">' + esc(sat) + '</div></div>';
    if (i.masuk) {
      f = '<div class="form-g g3 mt-s">' + qtyIn('Jumlah diterima') +
        '<div class="fld"><label>No. batch' + (b.pakai_batch === 'Y' ? ' <span class="req">*</span>' : '') + '</label><input class="inp" data-f="batch_no" data-k="' + it.k + '" value="' + esc(it.batch_no) + '" placeholder="' + (b.pakai_batch === 'Y' ? 'mis. B2611-01' : 'otomatis bila kosong') + '" style="text-transform:uppercase"></div>' +
        '<div class="fld"><label>Kedaluwarsa' + (b.pakai_expired === 'Y' ? ' <span class="req">*</span>' : '') + '</label><input class="inp" type="date" data-f="tgl_expired" data-k="' + it.k + '" value="' + esc(it.tgl_expired) + '"></div>' +
        '<div class="fld" style="grid-column:span 2"><label>Lokasi putaway <span class="req">*</span></label><div class="row gap-s"><select class="inp" data-f="lokasi_id" data-k="' + it.k + '">' + this.opsiLokasi(it.lokasi_id) + '</select><button type="button" class="btn" data-act="tf.scanLok" data-k="' + it.k + '" data-f="lokasi_id" title="Scan label bin">' + icon('scan') + '</button></div></div>' +
        (h ? '<div class="fld"><label>Harga beli / ' + esc(sat) + '</label><input class="inp" type="number" inputmode="decimal" data-f="harga" data-k="' + it.k + '" value="' + esc(it.harga) + '"></div>' : '') + '</div>';
    } else if (i.keluar) {
      const exp = s.tipe === 'RETUR', urut = Stok.urut(it.sku, b.metode, exp), saranId = urut[0] && urut[0].stok_id;
      const sel = '<select class="inp" data-f="stok_id" data-k="' + it.k + '"><option value="">✓ Otomatis sesuai ' + esc(b.metode) + ' (disarankan)</option>' + urut.map((r, j) => '<option value="' + r.stok_id + '" ' + (r.stok_id === it.stok_id ? 'selected' : '') + '>' + (j === 0 ? '★ ' : '') + esc(Store.lok(r.lokasi_id).kode + ' · ' + r.batch_no + ' · ' + F.num(r.qty) + (r.tgl_expired ? ' · exp ' + F.tgl(r.tgl_expired) : '') + (r.tgl_expired && r.tgl_expired < today() ? ' (KEDALUWARSA)' : '')) + '</option>').join('') + '</select>';
      f = '<div class="form-g mt-s">' + qtyIn('Jumlah keluar') + '<div class="fld"><label>Batch & lokasi ambil</label>' + sel + '<div class="hint">Tersedia ' + F.num(Stok.tersedia(it.sku, exp)) + ' ' + esc(sat) + (exp ? ' (termasuk kedaluwarsa/karantina)' : '') + '</div></div>' +
        (it.stok_id && it.stok_id !== saranId && !exp ? '<div class="fld full"><label>Alasan menyimpang dari saran ' + esc(b.metode) + ' <span class="req">*</span></label><input class="inp" data-f="alasan" data-k="' + it.k + '" value="' + esc(it.alasan) + '" placeholder="mis. permintaan pelanggan batch tertentu"></div>' : '') + '</div>' +
        (c.alok && c.alok.baris.length ? '<div class="note mt-s" style="padding:9px 12px">' + icon('hourglass') + '<div class="small grow"><b>Rencana pengambilan (' + esc(it.stok_id ? 'manual' : b.metode) + '):</b>' + c.alok.baris.map((x, j) => '<div class="row" style="margin-top:4px"><span class="tagk">' + esc(Store.lok(x.r.lokasi_id).kode) + '</span><span class="mono">' + esc(x.r.batch_no) + '</span><span class="muted">' + (x.r.tgl_expired ? 'exp ' + F.tgl(x.r.tgl_expired) : 'masuk ' + F.tgl(x.r.tgl_masuk)) + '</span><b class="ml-auto num">ambil ' + F.num(x.qty) + '</b></div>').join('') + '</div></div>' : '');
    } else if (s.tipe === 'MUTASI') {
      const rows = Stok.rows(it.sku).filter(r => r.qty > 0);
      f = '<div class="form-g g3 mt-s"><div class="fld"><label>Dari (batch & lokasi) <span class="req">*</span></label><select class="inp" data-f="stok_id" data-k="' + it.k + '">' + rows.map(r => '<option value="' + r.stok_id + '" ' + (r.stok_id === it.stok_id ? 'selected' : '') + '>' + esc(Store.lok(r.lokasi_id).kode + ' · ' + r.batch_no + ' · ' + F.num(r.qty)) + '</option>').join('') + '</select></div>' + qtyIn('Jumlah dipindah') +
        '<div class="fld"><label>Ke lokasi <span class="req">*</span></label><div class="row gap-s"><select class="inp" data-f="lokasi_tujuan" data-k="' + it.k + '">' + this.opsiLokasi(it.lokasi_tujuan, l => !Store.idx.stok[it.stok_id] || l.id !== Store.idx.stok[it.stok_id].lokasi_id) + '</select><button type="button" class="btn" data-act="tf.scanLok" data-k="' + it.k + '" data-f="lokasi_tujuan">' + icon('scan') + '</button></div></div></div>';
    } else if (s.tipe === 'ADJ') {
      const rows = Stok.rows(it.sku);
      f = '<div class="form-g mt-s"><div class="fld"><label>Baris stok</label><select class="inp" data-f="mode" data-k="' + it.k + '"><option value="ada" ' + (it.mode !== 'baru' ? 'selected' : '') + ' ' + (rows.length ? '' : 'disabled') + '>Batch yang sudah ada</option><option value="baru" ' + (it.mode === 'baru' ? 'selected' : '') + '>Batch baru (barang ditemukan)</option></select></div>' +
        (it.mode !== 'baru' ? '<div class="fld"><label>Batch & lokasi</label><select class="inp" data-f="stok_id" data-k="' + it.k + '">' + rows.map(r => '<option value="' + r.stok_id + '" ' + (r.stok_id === it.stok_id ? 'selected' : '') + '>' + esc(Store.lok(r.lokasi_id).kode + ' · ' + r.batch_no + ' · stok ' + F.num(r.qty)) + '</option>').join('') + '</select></div>'
          : '<div class="fld"><label>Lokasi</label><select class="inp" data-f="lokasi_id" data-k="' + it.k + '">' + this.opsiLokasi(it.lokasi_id) + '</select></div><div class="fld"><label>Batch</label><input class="inp" data-f="batch_no" data-k="' + it.k + '" value="' + esc(it.batch_no) + '"></div><div class="fld"><label>Kedaluwarsa</label><input class="inp" type="date" data-f="tgl_expired" data-k="' + it.k + '" value="' + esc(it.tgl_expired) + '"></div>') +
        qtyIn('Selisih (+/−)') + '<div class="fld"><label>Alasan <span class="req">*</span></label><input class="inp" data-f="alasan" data-k="' + it.k + '" value="' + esc(it.alasan) + '" placeholder="mis. barang rusak / hilang"></div></div>';
    }
    return '<div class="item-card ' + (c.e.length && this.coba ? 'err' : '') + '" id="it-' + it.k + '"><div class="top">' + UI.thumb(b.foto_url) + '<div class="grow" style="min-width:0"><div class="row gap-s"><span class="tagk">' + esc(b.sku) + '</span><span class="bdg teal nodot">' + esc(b.metode) + '</span>' + (h && c.b.sku ? '<span class="small muted ml-auto num">' + F.rp(this.nilai(it, c)) + '</span>' : '') + '</div><div class="b ellipsis" style="margin-top:3px">' + (idx + 1) + '. ' + esc(b.nama_barang) + '</div></div><button type="button" class="x-btn" data-act="tf.hapus" data-k="' + it.k + '" title="Hapus baris">' + icon('x') + '</button></div>' + f +
      (c.e.length ? '<div class="small t-bad mt-s">' + c.e.map(x => '• ' + esc(x)).join('<br>') + '</div>' : '') + '</div>';
  },
  gambar() {
    const s = this.s, el = this.el, inf = TIPE_INFO[s.tipe], i = this.info(), h = lihatHarga();
    const sup = Store.supplier.filter(x => x.status !== 'Nonaktif');
    const cek = s.items.map(it => this.cek(it)), salah = cek.filter(c => c.e.filter(x => !/^Perhatian/.test(x)).length).length;
    const totQty = s.items.reduce((t, x) => t + Math.abs(Number(x.qty) || 0), 0), totNilai = s.items.reduce((t, x, j) => t + this.nilai(x, cek[j]), 0);
    const butuhAppr = (s.tipe === 'MUTASI' && can('STAF') && Store.set.APPROVAL_MUTASI_STAF !== 'TIDAK') || (s.tipe === 'OUT' && can('STAF') && totNilai > Number(Store.set.APPROVAL_OUT_NILAI || 25000000));
    el.innerHTML = '<div class="crumb"><a href="#/dashboard">Beranda</a>' + icon('right') + '<a href="#/trx">Transaksi</a>' + icon('right') + esc(inf.judul) + '</div>' +
      '<div class="ph"><div><h1>' + esc(inf.judul) + '</h1><div class="sub">' + esc(inf.sub) + '</div></div><div class="acts">' + (s.items.length ? '<button class="btn ghost" data-act="tf.buang">' + icon('trash') + 'Kosongkan</button>' : '') + '<a class="btn" href="#/trx?tipe=' + s.tipe + '">' + icon('list') + 'Riwayat ' + s.tipe + '</a></div></div>' +
      (this.dipulihkan ? '<div class="note mb">' + icon('info') + '<div class="grow">Draf terakhir dipulihkan dari perangkat ini.</div><button class="btn sm" data-act="tf.buang">Buang draf</button></div>' : '') +
      '<div class="steps"><div class="s ' + (s.items.length ? 'done' : 'on') + '"><i>1</i>Header dokumen</div><span class="sep"></span><div class="s ' + (s.items.length ? (salah ? 'on' : 'done') : '') + '"><i>2</i>Tambah item (scan/cari)</div><span class="sep"></span><div class="s ' + (s.items.length && !salah ? 'on' : '') + '"><i>3</i>Ringkasan &amp; simpan</div></div>' +
      '<div class="grid g-8-4 has-sticky"><div class="col" style="gap:16px">' +
      '<div class="card"><div class="ch"><h3>' + icon('file', 'sm') + ' Header Dokumen</h3><span class="ml-auto small muted">No. dokumen otomatis: ' + esc((Store.set['PREFIX_' + (s.tipe === 'RETUR' ? 'RETUR' : s.tipe)] || s.tipe) + '/' + today().slice(0, 4) + '/' + today().slice(5, 7) + '/####') + '</span></div><div class="form-g">' +
      (s.tipe === 'RETUR' ? '<div class="fld full"><label>Jenis retur</label><div class="seg" id="tf-sub"><button type="button" class="' + (s.sub === 'MASUK' ? 'on' : '') + '" data-v="MASUK">' + icon('in', 'sm') + 'Retur masuk (dari pelanggan)</button><button type="button" class="' + (s.sub === 'KELUAR' ? 'on' : '') + '" data-v="KELUAR">' + icon('out', 'sm') + 'Retur keluar (ke supplier)</button></div></div>' : '') +
      '<div class="fld"><label>Tanggal</label><input class="inp" type="date" data-h="tanggal" max="' + today() + '" value="' + esc(s.h.tanggal) + '"></div>' +
      (s.tipe === 'IN' || (s.tipe === 'RETUR' && s.sub === 'KELUAR') ? '<div class="fld"><label>Supplier' + (s.tipe === 'IN' ? ' <span class="req">*</span>' : '') + '</label><select class="inp" data-h="supplier_id"><option value="">— pilih supplier —</option>' + sup.map(x => '<option value="' + x.id + '" ' + (x.id === s.h.supplier_id ? 'selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '</select></div>' : '') +
      (s.tipe === 'OUT' || (s.tipe === 'RETUR' && s.sub === 'MASUK') ? '<div class="fld"><label>' + (s.tipe === 'OUT' ? 'Tujuan / penerima <span class="req">*</span>' : 'Dari pelanggan') + '</label><input class="inp" data-h="tujuan" value="' + esc(s.h.tujuan) + '" placeholder="' + (s.tipe === 'OUT' ? 'mis. Toko Barokah Jaya' : 'nama pelanggan') + '" list="dl-tujuan"></div>' : '') +
      '<div class="fld full"><label>' + (s.tipe === 'RETUR' ? 'Alasan retur <span class="req">*</span>' : s.tipe === 'ADJ' ? 'Catatan penyesuaian' : 'Catatan') + '</label><input class="inp" data-h="catatan" value="' + esc(s.h.catatan) + '" placeholder="' + (s.tipe === 'RETUR' ? 'mis. kemasan rusak, salah kirim, kedaluwarsa' : 'opsional') + '"></div>' +
      (s.tipe !== 'ADJ' ? '<div class="fld full"><label>' + (s.tipe === 'IN' ? 'Foto surat jalan / bukti terima' : 'Lampiran (foto/PDF)') + '</label><div class="row wrap" id="tf-lamp">' + s.lampiran.map((f, j) => '<div class="thumb" style="width:64px;height:64px;position:relative">' + (/^image/.test(f.mime) ? '<img src="' + f.base64 + '">' : icon('file')) + '<button type="button" class="x-btn" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;background:var(--card);box-shadow:var(--sh-1)" data-act="tf.lampHapus" data-i="' + j + '">' + icon('x', 'sm') + '</button></div>').join('') + '<button type="button" class="btn" data-act="tf.lamp">' + icon('camera') + 'Ambil / pilih berkas</button><span class="hint">Maks ' + (Store.set.MAKS_LAMPIRAN_MB || 5) + ' MB; foto dikompres otomatis.</span></div></div>' : '') +
      '</div></div>' +
      '<div class="card"><div class="ch"><h3>' + icon('package', 'sm') + ' Item Barang <span class="bdg navy nodot">' + s.items.length + '</span></h3></div>' +
      '<div class="row gap-s mb"><div class="rel grow"><div class="inp-ic">' + icon('search') + '<input class="inp" id="tf-cari" placeholder="Cari SKU / nama / barcode lalu Enter…" autocomplete="off"></div><div id="tf-sug"></div></div><button type="button" class="btn pri" data-act="tf.scan">' + icon('scan') + '<span class="only-d">Scan</span></button></div>' +
      (s.items.length ? s.items.map((it, j) => this.kartuItem(it, j)).join('') : UI.empty('scan', 'Belum ada item', 'Scan barcode dengan kamera HP atau cari barang di atas. Scan berulang menambah jumlah.')) + '</div></div>' +
      '<div><div class="card" style="position:sticky;top:90px"><div class="ch"><h3>Ringkasan</h3></div><div class="kv-list"><span class="k">Jenis</span><span class="b">' + esc(s.tipe + (s.sub && s.tipe !== 'ADJ' ? ' ' + s.sub : '')) + '</span><span class="k">Jumlah baris</span><span class="b">' + s.items.length + '</span><span class="k">Total qty</span><span class="b num">' + F.num(totQty) + '</span>' + (h ? '<span class="k">Nilai (HPP)</span><span class="b num">' + F.rp(totNilai) + '</span>' : '') + '</div>' +
      (butuhAppr ? '<div class="note warn mt">' + icon('approval') + '<div class="small">Dokumen ini akan <b>menunggu persetujuan Kepala Gudang</b> sebelum stok berubah.</div></div>' : '') +
      (salah && this.coba ? '<div class="note bad mt">' + icon('alert') + '<div class="small">' + salah + ' baris perlu diperbaiki.</div></div>' : '') +
      '<div class="sticky-act" style="position:static;margin:16px 0 0;padding:0;border:0;box-shadow:none;flex-direction:column"><button class="btn pri lg block" data-act="tf.simpan" ' + (s.items.length ? '' : 'disabled') + '>' + icon('check') + (butuhAppr ? 'Ajukan ke Kepala Gudang' : s.tipe === 'ADJ' ? 'Simpan Penyesuaian' : 'Simpan &amp; Perbarui Stok') + '</button>' + (s.tipe !== 'ADJ' ? '<button class="btn block" data-act="tf.simpan" data-draft="1" ' + (s.items.length ? '' : 'disabled') + '>' + icon('file') + 'Simpan sebagai Draf</button>' : '') + '</div></div></div></div>' +
      '<datalist id="dl-tujuan">' + [...new Set((LS.get('gp_tujuan', [])))].slice(0, 30).map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>';
    this.ikat();
  },
  ikat() {
    const s = this.s, el = this.el;
    el.querySelectorAll('[data-h]').forEach(x => x.onchange = x.oninput = () => { s.h[x.dataset.h] = x.value; this.simpanDraf(); });
    el.querySelectorAll('[data-f]').forEach(x => x.onchange = () => {
      const it = s.items.find(i => i.k === x.dataset.k); if (!it) return;
      it[x.dataset.f] = x.dataset.f === 'batch_no' ? x.value.toUpperCase() : x.value;
      if (x.dataset.f === 'mode') { it.stok_id = it.mode === 'baru' ? '' : (Stok.rows(it.sku)[0] || {}).stok_id || ''; }
      this.simpanDraf(); this.perbaruiItem(it);
    });
    el.querySelectorAll('input[data-f="qty"]').forEach(x => x.oninput = debounce(() => { const it = s.items.find(i => i.k === x.dataset.k); if (it) { it.qty = x.value; this.simpanDraf(); this.perbaruiItem(it, true); } }, 350));
    const sub = $('#tf-sub'); if (sub) sub.onclick = e => { const b = e.target.closest('[data-v]'); if (!b || b.dataset.v === s.sub) return; s.sub = b.dataset.v; s.items = []; this.gambar(); };
    const cari = $('#tf-cari'), sug = $('#tf-sug');
    const tampil = () => {
      const q = cari.value.trim().toLowerCase(); if (!q) { sug.innerHTML = ''; return; }
      const hasil = Store.barang.filter(b => b.status !== 'Nonaktif' && (b.sku + ' ' + b.nama_barang + ' ' + b.barcode).toLowerCase().includes(q)).slice(0, 8);
      sug.innerHTML = hasil.length ? '<div class="sug">' + hasil.map((b, i) => '<div class="o ' + (i ? '' : 'on') + '" data-sku="' + esc(b.sku) + '">' + UI.thumb(b.foto_url) + '<div class="grow"><div class="t">' + esc(b.nama_barang) + '</div><div class="d">' + esc(b.sku) + ' · stok ' + F.num((Stok.ringkas()[b.sku] || {}).total || 0) + ' ' + esc(Store.sat(b.satuan_id)) + '</div></div></div>').join('') + '</div>' : '<div class="sug"><div class="o muted">Tidak ditemukan.</div></div>';
    };
    cari.oninput = tampil;
    cari.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const k = cari.value.trim(); const x = Scanner.kenali(k); const o = sug.querySelector('.o[data-sku]'); if (x && x.jenis === 'barang') this.tambah(x.data.sku, { inc: true }); else if (o) this.tambah(o.dataset.sku); else return; this.simpanDraf(); setTimeout(() => $('#tf-cari') && $('#tf-cari').focus(), 30); } };
    sug.onclick = e => { const o = e.target.closest('[data-sku]'); if (o) { this.tambah(o.dataset.sku); this.simpanDraf(); } };
    cari.onblur = () => setTimeout(() => { if (sug) sug.innerHTML = ''; }, 200);
  },
  perbaruiItem(it, jagaFokus) {
    const kartu = $('#it-' + it.k); if (!kartu) return this.gambar();
    if (jagaFokus) { // perbarui pesan & rencana tanpa merusak fokus input qty
      const baru = document.createElement('div'); baru.innerHTML = this.kartuItem(it, this.s.items.indexOf(it));
      const inp = kartu.querySelector('input[data-f="qty"]'), pos = inp && inp.selectionStart;
      kartu.replaceWith(baru.firstChild); this.ikat();
      const n = $('#it-' + it.k + ' input[data-f="qty"]'); if (n && document.activeElement !== n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* number */ } }
      this.ringkasan(); return;
    }
    this.gambar();
  },
  ringkasan() { /* ringkasan diperbarui saat simpan/gambar penuh — cukup untuk mencegah lag ketik */ },
  async simpan(btn, draft) {
    const s = this.s; this.coba = true;
    const cek = s.items.map(it => this.cek(it)), salah = cek.findIndex(c => c.e.some(x => !/^Perhatian/.test(x)));
    const info = this.info();
    if (s.tipe === 'IN' && !s.h.supplier_id) { this.gambar(); return UI.toast('Pilih supplier terlebih dahulu.', 'warn'); }
    if (s.tipe === 'OUT' && !String(s.h.tujuan).trim()) { this.gambar(); return UI.toast('Isi tujuan / penerima barang.', 'warn'); }
    if (s.tipe === 'RETUR' && !String(s.h.catatan).trim()) { this.gambar(); return UI.toast('Alasan retur wajib diisi.', 'warn'); }
    if (salah >= 0 && !draft) { this.gambar(); const k = $('#it-' + s.items[salah].k); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'center' }); return UI.toast('Periksa baris ' + (salah + 1) + ': ' + cek[salah].e[0], 'warn'); }
    const items = s.items.map(it => {
      const o = { sku: it.sku, qty: Number(it.qty) };
      if (info.masuk) Object.assign(o, { batch_no: String(it.batch_no || '').trim().toUpperCase(), tgl_expired: it.tgl_expired, lokasi_id: it.lokasi_id, harga: it.harga });
      if (info.keluar) Object.assign(o, { stok_id: it.stok_id, alasan: it.alasan });
      if (s.tipe === 'MUTASI') Object.assign(o, { stok_id: it.stok_id, lokasi_tujuan: it.lokasi_tujuan });
      if (s.tipe === 'ADJ') Object.assign(o, it.mode === 'baru' ? { lokasi_id: it.lokasi_id, batch_no: it.batch_no, tgl_expired: it.tgl_expired, alasan: it.alasan } : { stok_id: it.stok_id, alasan: it.alasan });
      return o;
    });
    UI.busy(btn, true);
    const r = await API.call('trx.simpan', { tipe: s.tipe, sub_tipe: s.sub, tanggal: s.h.tanggal, supplier_id: s.h.supplier_id, tujuan: s.h.tujuan, catatan: s.h.catatan, items, draft: !!draft, client_id: s.cid });
    UI.busy(btn, false);
    if (!r.success) return UI.toast(r.message, 'err');
    if (s.h.tujuan) { const t = LS.get('gp_tujuan', []); LS.set('gp_tujuan', [s.h.tujuan].concat(t.filter(x => x !== s.h.tujuan)).slice(0, 30)); }
    const lamp = s.lampiran.slice(), id = r.data.trx_id;
    LS.del(this.kunci); this.s = null; this.coba = false;
    UI.toast(r.message, r.data.status === 'Menunggu' ? 'warn' : 'ok', { aksi: { label: 'Lihat', fn: () => Router.go('#/trx/' + id) } });
    App.setelahTulis('trx');
    Router.go('#/trx/' + id);
    for (let j = 0; j < lamp.length; j++) {
      UI.toast('Mengunggah lampiran ' + (j + 1) + '/' + lamp.length + '…', 'info', { ms: 2000 });
      const u = await API.call('trx.lampiran', Object.assign({ trx_id: id }, lamp[j]));
      if (!u.success) UI.toast('Lampiran gagal: ' + u.message, 'err'); else if (j === lamp.length - 1) { UI.toast('Lampiran tersimpan.'); SWR.basi('trx.detail'); if (Router.cur && Router.cur.id === 'trx') Router.jalan(); }
    }
  }
};
ACT['tf.qty'] = el => { const it = TrxForm.s.items.find(i => i.k === el.dataset.k); if (!it) return; const d = Number(el.dataset.d); it.qty = Math.round(((Number(it.qty) || 0) + d) * 1000) / 1000; if (TrxForm.s.tipe !== 'ADJ' && it.qty < 0) it.qty = 0; TrxForm.simpanDraf(); TrxForm.perbaruiItem(it); };
ACT['tf.hapus'] = el => { const s = TrxForm.s; s.items = s.items.filter(i => i.k !== el.dataset.k); TrxForm.simpanDraf(); TrxForm.gambar(); };
ACT['tf.buang'] = async () => { if (!(await UI.confirm({ msg: 'Kosongkan semua item di form ini?', ok: 'Kosongkan', danger: true }))) return; LS.del(TrxForm.kunci); const t = TrxForm.s.tipe; TrxForm.s = null; TrxForm.buka(TrxForm.el, t, {}); };
ACT['tf.scan'] = async () => { const k = await Scanner.ambil('barang'); if (!k) return; const x = Scanner.kenali(k); if (!x || x.jenis === 'lokasi') return UI.toast('Barang dengan kode "' + k + '" tidak ditemukan.', 'warn'); TrxForm.tambah((x.barang || x.data).sku, x.jenis === 'batch' && !TrxForm.info().masuk ? { stok_id: x.data.stok_id } : { inc: true }); TrxForm.simpanDraf(); };
ACT['tf.scanLok'] = async el => { const k = await Scanner.ambil('lokasi'); if (!k) return; const x = Scanner.kenali(k); if (!x || x.jenis !== 'lokasi') return UI.toast('Kode lokasi "' + k + '" tidak dikenali.', 'warn'); const it = TrxForm.s.items.find(i => i.k === el.dataset.k); it[el.dataset.f] = x.data.id; TrxForm.simpanDraf(); TrxForm.gambar(); };
ACT['tf.lamp'] = async () => { const f = await Gambar.pilih('image/*,application/pdf', false); if (!f) return; if (f.size > (Number(Store.set.MAKS_LAMPIRAN_MB || 5)) * 1048576 * (/^image/.test(f.type) ? 4 : 1)) return UI.toast('Berkas terlalu besar.', 'warn'); TrxForm.s.lampiran.push(await Gambar.kompres(f, 1600, .78)); TrxForm.gambar(); };
ACT['tf.lampHapus'] = el => { TrxForm.s.lampiran.splice(+el.dataset.i, 1); TrxForm.gambar(); };
ACT['tf.simpan'] = el => TrxForm.simpan(el, !!el.dataset.draft);

['in', 'out', 'retur', 'mutasi', 'adj'].forEach(id => Page(id, {
  title: TIPE_INFO[id.toUpperCase()].judul, roles: id === 'adj' ? ['KEPALA', 'OWNER', 'SUPERADMIN'] : R_OPS,
  render(el, seg, q) { TrxForm.buka(el, id.toUpperCase(), q); },
  onStore() { if (TrxForm.s && TrxForm.el && TrxForm.el.isConnected && document.activeElement && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) TrxForm.gambar(); }
}));

/* =====================================================================
   DAFTAR & DETAIL TRANSAKSI
   ===================================================================== */
const LABEL_TIPE = t => ({ IN: 'Barang Masuk', OUT: 'Barang Keluar', MUTASI: 'Mutasi', ADJ: 'Penyesuaian' })[t.tipe] || (t.tipe === 'RETUR' ? 'Retur ' + (t.sub === 'MASUK' ? 'Masuk' : 'Keluar') : t.tipe);
Page('trx', {
  title: 'Transaksi', roles: ['STAF', 'KEPALA', 'OWNER', 'SUPERADMIN'],
  render(el, seg, q) { if (seg[0]) return TrxDetail.render(el, seg[0]); this.el = el; this.f = Object.assign({ halaman: 1 }, q); this.gambar(); },
  async gambar() {
    const el = this.el, f = this.f, harga = lihatHarga();
    el.innerHTML = '<div class="ph"><div><h1>Daftar Transaksi</h1><div class="sub">Dokumen barang masuk, keluar, retur, mutasi, dan penyesuaian. Dokumen final tidak dapat dihapus — koreksi lewat void.</div></div><div class="acts">' + (can(...R_OPS) ? '<a class="btn" href="#/out">' + icon('out') + 'Barang Keluar</a><a class="btn pri" href="#/in">' + icon('in') + 'Barang Masuk</a>' : '') + '</div></div>' +
      '<div class="card p0"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="chips">' + [['', 'Semua'], ['IN', 'Masuk'], ['OUT', 'Keluar'], ['RETUR', 'Retur'], ['MUTASI', 'Mutasi'], ['ADJ', 'Penyesuaian']].map(x => '<button class="chip ' + ((f.tipe || '') === x[0] ? 'on' : '') + '" data-act="tl.f" data-k="tipe" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<select class="inp sm" style="width:auto" id="tl-st"><option value="">Semua status</option>' + ['Draft', 'Menunggu', 'Disetujui', 'Selesai', 'Void/Ditolak'].map(s => '<option ' + (f.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
      '<input class="inp sm" type="date" id="tl-dari" style="width:auto" value="' + esc(f.dari || '') + '" title="Dari"><input class="inp sm" type="date" id="tl-sampai" style="width:auto" value="' + esc(f.sampai || '') + '" title="Sampai">' +
      '<div class="inp-ic grow" style="min-width:200px"><input class="inp sm" id="tl-q" placeholder="Cari no. dokumen, supplier, tujuan…" value="' + esc(f.q || '') + '" style="padding-left:12px"></div></div><div id="tl-isi">' + UI.sk(6).replace('class="card"', 'style="padding:16px"') + '</div></div>';
    const muat = () => SWR.get('trx.list', this.param(), { maxAge: 15000, onData: d => this.isi(d) });
    $('#tl-st').onchange = e => { f.status = e.target.value; f.halaman = 1; muat(); };
    $('#tl-dari').onchange = e => { f.dari = e.target.value; f.halaman = 1; muat(); };
    $('#tl-sampai').onchange = e => { f.sampai = e.target.value; f.halaman = 1; muat(); };
    $('#tl-q').oninput = debounce(e => { f.q = e.target.value; f.halaman = 1; muat(); }, 350);
    muat();
  },
  param() { const f = this.f, p = { halaman: f.halaman, per: 50 }; ['tipe', 'status', 'dari', 'sampai', 'q'].forEach(k => { if (f[k]) p[k] = f[k]; }); return p; },
  isi(d) {
    const box = $('#tl-isi'); if (!box || !d) return; const harga = lihatHarga();
    box.innerHTML = UI.tabel({ rows: d.rows, act: 'go', id: r => '#/trx/' + r.trx_id,
      cols: [{ label: 'No. Dokumen', r: r => '<div class="b">' + esc(r.no) + '</div><div class="sub">' + esc(LABEL_TIPE(r)) + '</div>' }, { label: 'Tanggal', r: r => F.tgl(r.tanggal) + '<div class="sub">' + F.jam(r.dibuat) + '</div>' },
        { label: 'Supplier / Tujuan', r: r => '<div class="ellipsis" style="max-width:240px">' + esc(r.tipe === 'IN' || r.sub === 'KELUAR' ? Store.sup(r.supplier_id) : r.tujuan || '-') + '</div>' }, { label: 'Qty', n: 1, r: r => F.num(r.qty) }].concat(harga ? [{ label: 'Nilai', n: 1, r: r => F.rp(Math.abs(r.nilai)) }] : [])
        .concat([{ label: 'Status', r: r => UI.bdg(r.status) + (r.void && r.status === 'Selesai' ? ' <span class="bdg warn nodot">void diajukan</span>' : '') }, { label: 'Petugas', r: r => '<span class="small">' + esc(Store.nama(r.oleh)) + '</span>' }]),
      kartu: r => '<div class="grow" style="min-width:0"><div class="row between"><b>' + esc(r.no) + '</b>' + UI.bdg(r.status) + '</div><div class="small muted mt-s">' + esc(LABEL_TIPE(r)) + ' · ' + F.tgl(r.tanggal) + ' · ' + esc(r.tipe === 'IN' ? Store.sup(r.supplier_id) : r.tujuan || '') + '</div><div class="row between small mt-s"><span>' + esc(Store.nama(r.oleh)) + '</span><b class="num">' + F.num(r.qty) + ' unit' + (harga ? ' · ' + F.rpS(Math.abs(r.nilai)) : '') + '</b></div></div>',
      kosong: UI.empty('list', 'Tidak ada transaksi', 'Ubah filter atau buat transaksi baru.') }).replace(/data-act="go" data-id="/g, 'data-act="go" data-h="') + UI.pager(d.total, d.halaman, d.per, 'tl.hal');
  }
});
ACT['tl.f'] = el => { const p = Pages.trx; p.f[el.dataset.k] = el.dataset.v; p.f.halaman = 1; p.gambar(); };
ACT['tl.hal'] = el => { const p = Pages.trx; p.f.halaman = +el.dataset.p; SWR.get('trx.list', p.param(), { onData: d => p.isi(d) }); };

const TrxDetail = {
  async render(el, id) {
    this.el = el; this.id = id;
    el.innerHTML = '<div class="crumb"><a href="#/trx">Transaksi</a>' + icon('right') + 'Detail</div>' + UI.sk(5, true);
    const r = await API.q('trx.detail', { trx_id: id });
    if (!el.isConnected) return;
    if (!r.success) { el.innerHTML = '<div class="card">' + UI.empty('alert', 'Transaksi tidak dapat dibuka', esc(r.message)) + '</div>'; return; }
    this.d = r.data; this.gambar();
  },
  gambar() {
    const { trx: t, items, approval, dokumen } = this.d, el = this.el, harga = lihatHarga(), me = Store.me;
    const STEP = ['Draft', 'Menunggu', 'Disetujui', 'Selesai'], idx = STEP.indexOf(t.status);
    const pemilik = t.oleh === me.email || can('KEPALA', 'SUPERADMIN');
    const aksi = [];
    if (t.status === 'Draft' && pemilik && can(...R_OPS)) aksi.push('<button class="btn pri" data-act="td.ajukan">' + icon('send') + 'Ajukan / Proses</button>');
    if (t.status === 'Disetujui' && can(...R_OPS)) aksi.push('<button class="btn pri" data-act="td.proses">' + icon('check') + 'Proses Sekarang (stok diperbarui)</button>');
    if (t.status === 'Menunggu' && can(...R_APPR)) aksi.push('<a class="btn pri" href="#/approval">' + icon('approval') + 'Buka Approval</a>');
    if (['Draft', 'Menunggu', 'Disetujui'].includes(t.status) && pemilik) aksi.push('<button class="btn" data-act="td.batal">' + icon('x') + 'Batalkan</button>');
    if (t.status === 'Selesai' && t.sub !== 'OPNAME' && !t.void && (can('KEPALA', 'OWNER', 'SUPERADMIN') || t.oleh === me.email)) aksi.push('<button class="btn danger" data-act="td.void">' + icon('no') + (can('KEPALA', 'OWNER', 'SUPERADMIN') ? 'Void' : 'Ajukan Void') + '</button>');
    aksi.push('<button class="btn" data-act="td.dok">' + icon('printer') + 'Cetak Dokumen</button>');
    const mitra = t.tipe === 'IN' || t.sub === 'KELUAR' ? Store.sup(t.supplier_id) : t.tujuan || '-';
    el.innerHTML = '<div class="crumb"><a href="#/trx">Transaksi</a>' + icon('right') + esc(t.no) + '</div>' +
      '<div class="ph"><div><h1>' + esc(t.no) + '</h1><div class="sub row wrap gap-s">' + UI.bdg(t.status) + '<span class="bdg navy nodot">' + esc(LABEL_TIPE(t)) + '</span>' + (t.void && t.status === 'Selesai' ? '<span class="bdg warn">Void diajukan</span>' : '') + '<span>' + F.tglP(t.tanggal) + ' · dibuat ' + F.tglJam(t.dibuat) + '</span></div></div><div class="acts">' + aksi.join('') + '</div></div>' +
      (['Void', 'Ditolak', 'Batal'].includes(t.status) ? '<div class="note bad mb">' + icon('alert') + '<div><b>Dokumen ' + esc(t.status) + '.</b> ' + esc(t.alasan_void || t.catatan || '') + '</div></div>' : '<div class="pipe mb" style="grid-template-columns:repeat(4,1fr)">' + STEP.map((s, i) => '<div class="st" style="background:' + (i < idx ? 'var(--navy)' : i === idx ? 'var(--teal)' : 'var(--line)') + ';color:' + (i <= idx ? '#fff' : 'var(--muted)') + ';cursor:default"><b>' + s.toUpperCase() + '</b></div>').join('') + '</div>') +
      '<div class="grid g-8-4"><div class="col" style="gap:16px"><div class="card p0"><div class="ch" style="padding:16px 18px 0"><h3>Item (' + items.filter(i => i.qty !== 0).length + ' baris)</h3></div>' +
      UI.tabel({ rows: items.filter(i => i.qty !== 0), cols: [
        { label: 'Barang', r: i => { const b = Store.barangOf(i.sku) || {}; return '<div class="row">' + UI.thumb(b.foto_url) + '<div><div class="b">' + esc(b.nama_barang || i.sku) + '</div><div class="sub mono">' + esc(i.sku) + '</div></div></div>'; } },
        { label: 'Batch', r: i => '<span class="mono small">' + esc(i.batch) + '</span>' + (i.exp ? '<div class="sub">exp ' + F.tgl(i.exp) + '</div>' : '') },
        { label: 'Lokasi', r: i => t.tipe === 'MUTASI' ? '<span class="tagk">' + esc(Store.lok(i.asal).kode) + '</span> → <span class="tagk">' + esc(Store.lok(i.tujuan).kode) + '</span>' : '<span class="tagk">' + esc(Store.lok(i.tujuan || i.asal).kode) + '</span>' },
        { label: 'Qty', n: 1, r: i => '<b>' + (t.tipe === 'ADJ' && i.qty > 0 ? '+' : '') + F.num(i.qty) + '</b> <span class="sub">' + esc(Store.sat((Store.barangOf(i.sku) || {}).satuan_id)) + '</span>' }]
        .concat(harga ? [{ label: 'Nilai', n: 1, r: i => F.rp(Math.abs(i.qty) * i.harga) }] : []).concat([{ label: 'Keterangan', r: i => '<span class="small">' + esc(i.alasan || '') + '</span>' }]),
        kartu: i => { const b = Store.barangOf(i.sku) || {}; return UI.thumb(b.foto_url) + '<div class="grow"><div class="b">' + esc(b.nama_barang || i.sku) + '</div><div class="small muted">' + esc(i.batch) + ' · ' + esc(t.tipe === 'MUTASI' ? Store.lok(i.asal).kode + ' → ' + Store.lok(i.tujuan).kode : Store.lok(i.tujuan || i.asal).kode) + (i.alasan ? ' · ' + esc(i.alasan) : '') + '</div></div><b class="num">' + F.num(i.qty) + '</b>'; } }) + '</div>' +
      (approval.length ? '<div class="card"><div class="ch"><h3>Riwayat Approval</h3></div><div class="vtl">' + approval.map(a => '<div class="it ' + (a.status === 'Ditolak' ? 'bad' : '') + '"><div class="row"><b>' + esc(a.jenis) + '</b>' + UI.bdg(a.status) + '<span class="small muted ml-auto">' + F.tglJam(a.waktu) + '</span></div><div class="small muted">Diajukan ' + esc(Store.nama(a.oleh)) + (a.penyetuju ? ' · diproses ' + esc(Store.nama(a.penyetuju)) + ' ' + F.tglJam(a.proses) : '') + '</div>' + (a.alasan ? '<div class="small">“' + esc(a.alasan) + '”</div>' : '') + '</div>').join('') + '</div></div>' : '') + '</div>' +
      '<div class="col" style="gap:16px"><div class="card"><div class="ch"><h3>Informasi Dokumen</h3></div><div class="kv-list"><span class="k">' + (t.tipe === 'IN' || t.sub === 'KELUAR' ? 'Supplier' : 'Tujuan') + '</span><span class="b">' + esc(mitra) + '</span><span class="k">Total qty</span><span class="b num">' + F.num(t.qty) + '</span>' + (harga ? '<span class="k">Nilai</span><span class="b num">' + F.rp(Math.abs(t.nilai)) + '</span>' : '') + '<span class="k">Petugas</span><span>' + esc(Store.nama(t.oleh)) + '</span>' + (t.setuju ? '<span class="k">Disetujui</span><span>' + esc(Store.nama(t.setuju)) + '<div class="tiny muted">' + F.tglJam(t.waktu_setuju) + '</div></span>' : '') + '<span class="k">Catatan</span><span>' + esc(t.catatan || '-') + '</span>' + (t.alasan_void ? '<span class="k">Void</span><span class="t-bad">' + esc(t.alasan_void) + '</span>' : '') + '</div></div>' +
      '<div class="card"><div class="ch"><h3>Lampiran</h3>' + (can(...R_OPS) ? '<button class="lk" data-act="td.lamp">' + icon('plus', 'sm') + 'Tambah</button>' : '') + '</div>' + (t.lampiran.length ? '<div class="row wrap">' + t.lampiran.map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" class="thumb" style="width:80px;height:80px" title="' + esc(l.nama) + '">' + (l.thumb ? '<img src="' + esc(l.thumb) + '">' : icon('file', 'lg')) + '</a>').join('') + '</div>' : '<div class="small muted">Belum ada lampiran.</div>') + '</div>' +
      '<div class="card"><div class="ch"><h3>Dokumen Tercetak</h3><button class="lk" data-act="td.dok">' + icon('plus', 'sm') + 'Buat</button></div>' + (dokumen.length ? dokumen.map(o => '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line-2)">' + icon('file') + '<div class="grow" style="min-width:0"><div class="b small ellipsis">' + esc(o.judul) + '</div><div class="tiny muted">' + esc(o.nomor || '-') + '</div></div>' + UI.bdg(o.status) + (o.berkas && o.berkas.pdf ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(o.berkas.pdf.url) + '">PDF</a>' : '') + '</div>').join('') : '<div class="small muted">Surat jalan / bukti terima dari template dokumen.</div>') + '</div></div></div>';
  },
  async aksi(btn, action, data, konfirmasi) {
    if (konfirmasi && !(await UI.confirm(konfirmasi))) return;
    UI.busy(btn, true);
    const r = await API.call(action, Object.assign({ trx_id: this.d.trx.trx_id }, data || {}));
    UI.busy(btn, false);
    if (!r.success) return UI.toast(r.message, 'err');
    UI.toast(r.message, r.data && r.data.menunggu ? 'warn' : 'ok');
    App.setelahTulis('trx'); this.render(this.el, this.id);
  }
};
ACT['td.ajukan'] = el => TrxDetail.aksi(el, 'trx.ajukan', {}, { msg: 'Ajukan / proses draf ini? Bila tidak memerlukan approval, stok langsung diperbarui.' });
ACT['td.proses'] = el => TrxDetail.aksi(el, 'trx.proses', {}, { msg: 'Pastikan barang sudah dipindah/diambil secara fisik. Proses sekarang dan perbarui stok?', ok: 'Proses' });
ACT['td.batal'] = async el => { const a = await UI.prompt({ title: 'Batalkan dokumen', label: 'Alasan pembatalan', required: true, ok: 'Batalkan', danger: true }); if (a) TrxDetail.aksi(el, 'trx.batal', { alasan: a }); };
ACT['td.void'] = async el => { const a = await UI.prompt({ title: 'Void transaksi', msg: 'Void membalik efek stok dokumen ini. Dokumen tetap tersimpan dengan status Void (tidak dihapus).' + (can('KEPALA', 'OWNER', 'SUPERADMIN') ? '' : ' Permintaan akan dikirim ke Kepala Gudang.'), label: 'Alasan void (wajib)', required: true, min: 5, textarea: true, ok: 'Void', danger: true }); if (a) TrxDetail.aksi(el, 'trx.void', { alasan: a }); };
ACT['td.lamp'] = async el => { const f = await Gambar.pilih('image/*,application/pdf'); if (!f) return; UI.busy(el, true); const r = await API.call('trx.lampiran', Object.assign({ trx_id: TrxDetail.d.trx.trx_id }, await Gambar.kompres(f, 1600, .78))); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast('Lampiran diunggah.'); TrxDetail.render(TrxDetail.el, TrxDetail.id); };
ACT['td.dok'] = () => { const t = TrxDetail.d.trx; DokUI.buat({ modul: t.tipe, refTipe: 'TRX', refId: t.trx_id, judul: LABEL_TIPE(t) + ' ' + t.no, selesai: () => TrxDetail.render(TrxDetail.el, TrxDetail.id) }); };
