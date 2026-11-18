/* GudangPro OS — Dokumen & Surat (skill gas-doc-engine): template Docs/Sheets/Slides → form → TTD + QR → PDF */
const MODUL_DOK = { IN: 'Barang Masuk', OUT: 'Barang Keluar', RETUR: 'Retur', MUTASI: 'Mutasi', ADJ: 'Penyesuaian', OPNAME: 'Stok Opname', UMUM: 'Umum (kustom)' };
const AUTO_KEYS = {
  TRX: 'NO_DOKUMEN, TGL_TRANSAKSI, JENIS_TRANSAKSI, SUPPLIER, SUPPLIER_ALAMAT, SUPPLIER_KONTAK, TUJUAN, CATATAN, PETUGAS, DISETUJUI_OLEH, TOTAL_QTY, TOTAL_NILAI, JUMLAH_ITEM · baris berulang {{#ITEM}} dengan ITEM.NO, ITEM.SKU, ITEM.NAMA, ITEM.QTY, ITEM.SATUAN, ITEM.BATCH, ITEM.EXP, ITEM.LOKASI, ITEM.LOKASI_ASAL, ITEM.LOKASI_TUJUAN, ITEM.HARGA, ITEM.SUBTOTAL, ITEM.KETERANGAN',
  OPNAME: 'NO_OPNAME, TGL_OPNAME, AREA, TIPE_OPNAME, PIC, TOTAL_ITEM, ITEM_SELISIH, NILAI_SELISIH, AKURASI, NO_ADJ · baris {{#ITEM}}: ITEM.SKU, ITEM.NAMA, ITEM.LOKASI, ITEM.BATCH, ITEM.QTY_SISTEM, ITEM.QTY_FISIK, ITEM.SELISIH, ITEM.NILAI, ITEM.ALASAN',
  UMUM: 'Semua penanda selain sistem/pejabat menjadi kolom isian otomatis (mis. {{PERIHAL}}, {{ISI}}, {{TGL_ACARA}}, {{JUMLAH_DANA|rupiah}})'
};
Page('dokumen', {
  title: 'Dokumen & Surat',
  render(el, seg) {
    this.el = el; this.tab = seg[0] || this.tab || 'dokumen';
    const tabs = [['dokumen', 'Dokumen', 'file'], ['ttd', 'Perlu TTD Saya', 'sign'], ['template', 'Template', 'layers'], ['pejabat', 'Pejabat Penanda Tangan', 'stamp'], ['pin', 'PIN Saya', 'key']];
    el.innerHTML = '<div class="ph"><div><h1>Dokumen &amp; Surat</h1><div class="sub">Surat jalan, bukti penerimaan, berita acara opname, dan surat kustom dari template Google Docs/Sheets/Slides Anda — lengkap dengan QR verifikasi.</div></div><div class="acts"><button class="btn pri" data-act="dk.umum">' + icon('plus') + 'Buat Dokumen Umum</button></div></div>' +
      '<div class="tabs">' + tabs.map(t => '<button class="' + (t[0] === this.tab ? 'on' : '') + '" data-act="go" data-h="#/dokumen/' + t[0] + '">' + icon(t[2], 'sm') + t[1] + (t[0] === 'ttd' && Store.badge.ttd ? '<span class="c">' + Store.badge.ttd + '</span>' : '') + '</button>').join('') + '</div><div id="dk-isi">' + UI.sk(4) + '</div>';
    this['t_' + this.tab]($('#dk-isi'));
  },
  t_dokumen(box, saya) {
    SWR.get('doc.list', saya ? { saya: true } : {}, { maxAge: 10000, onData: d => {
      if (!box.isConnected || !d) return;
      box.innerHTML = '<div class="card p0">' + UI.tabel({ rows: d, cols: [
        { label: 'Dokumen', r: x => '<div class="b">' + esc(x.judul) + '</div><div class="sub">' + esc(x.nomor || 'belum bernomor') + ' · ' + esc(x.template) + '</div>' },
        { label: 'Status', r: x => UI.bdg(x.status) },
        { label: 'Penanda tangan', r: x => x.ttd.filter(s => s.nama).map(s => '<div class="small">' + (s.status === 'SETUJU' ? '<span class="t-ok">✓</span> ' : s.wajib ? '<span class="t-warn">○</span> ' : '· ') + esc(s.nama) + (s.metode ? ' <span class="tiny muted">(' + esc(s.metode) + ')</span>' : '') + '</div>').join('') || '<span class="muted small">—</span>' },
        { label: 'Dibuat', r: x => '<span class="small">' + F.tglJam(x.dibuat) + '<br>' + esc(x.oleh) + '</span>' },
        { label: 'Aksi', r: x => '<div class="row gap-s wrap">' + (x.berkas && x.berkas.pdf ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(x.berkas.pdf.url) + '">' + icon('file', 'sm') + 'PDF</a>' : '') + ['docx', 'xlsx', 'png'].filter(f => x.berkas && x.berkas[f]).map(f => '<a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(x.berkas[f].url) + '">' + f.toUpperCase() + '</a>').join('') +
          x.ttd.filter(s => s.saya && s.wajib && s.status !== 'SETUJU' && x.status === 'MENUNGGU_TTD').map(s => '<button class="btn sm pri" data-act="dk.ttd" data-id="' + x.id + '" data-s="' + s.slot + '">' + icon('sign', 'sm') + 'TTD</button>').join('') +
          (x.status === 'MENUNGGU_TTD' && can('SUPERADMIN') ? '<button class="btn sm" data-act="dk.bypass" data-id="' + x.id + '" data-s="' + (x.ttd.find(s => s.wajib && s.status !== 'SETUJU') || {}).slot + '">Bypass</button>' : '') +
          (x.kode ? '<button class="btn sm ghost" data-act="dk.link" data-k="' + esc(x.kode) + '" title="Salin tautan verifikasi">' + icon('qr', 'sm') + '</button>' : '') +
          ((x.status === 'TERBIT' || x.status === 'MENUNGGU_TTD') && can(...R_APPR) ? '<button class="btn sm ghost" data-act="dk.tarik" data-id="' + x.id + '" title="Tarik dokumen">' + icon('no', 'sm') + '</button>' : '') + '</div>' }],
        kartu: x => '<div class="grow"><div class="row between"><b class="ellipsis">' + esc(x.judul) + '</b>' + UI.bdg(x.status) + '</div><div class="small muted">' + esc(x.nomor || '-') + ' · ' + F.tgl(x.dibuat) + '</div><div class="row gap-s mt-s">' + (x.berkas && x.berkas.pdf ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(x.berkas.pdf.url) + '">PDF</a>' : '') + x.ttd.filter(s => s.saya && s.wajib && s.status !== 'SETUJU' && x.status === 'MENUNGGU_TTD').map(s => '<button class="btn sm pri" data-act="dk.ttd" data-id="' + x.id + '" data-s="' + s.slot + '">TTD</button>').join('') + '</div></div>',
        kosong: UI.empty('file', saya ? 'Tidak ada dokumen yang menunggu tanda tangan Anda' : 'Belum ada dokumen', saya ? '' : 'Buat dari halaman detail transaksi (Cetak Dokumen) atau tombol "Buat Dokumen Umum".') }) + '</div>';
    } });
  },
  t_ttd(box) { this.t_dokumen(box, true); },
  t_template(box) {
    const kelola = can('KEPALA', 'SUPERADMIN');
    SWR.get('doc.templates', { semua: true }, { maxAge: 10000, onData: d => {
      if (!box.isConnected || !d) return;
      box.innerHTML = '<div class="row wrap mb">' + (kelola ? '<button class="btn pri" data-act="dk.tpl">' + icon('plus') + 'Tambah Template</button>' : '') + (can('SUPERADMIN') ? '<button class="btn" data-act="dk.bawaan">' + icon('sparkles') + 'Buat Template Bawaan</button>' : '') + '<button class="btn ghost" data-act="dk.bantuan">' + icon('info') + 'Cara membuat template</button></div>' +
        (d.length ? '<div class="grid g3">' + d.map(t => '<div class="card"><div class="row between"><span class="tagk">' + esc(t.kode) + '</span>' + UI.bdg(t.aktif ? 'Aktif' : 'Nonaktif') + '</div><div class="bb mt-s">' + esc(t.nama) + '</div><div class="small muted">' + esc(MODUL_DOK[t.modul] || t.modul) + ' · ' + esc(t.engine.toUpperCase()) + ' · v' + t.versi + ' · keluaran ' + esc(t.keluaran.toUpperCase()) + '</div>' +
          '<div class="small mt-s">' + t.bidang.length + ' kolom isian · ' + t.slot.length + ' slot TTD' + (t.qrPerTtd ? ' · QR per penanda tangan' : '') + '</div><div class="row gap-s mt wrap"><a class="btn sm" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + icon('ext', 'sm') + 'Buka template</a>' + (kelola ? '<button class="btn sm" data-act="dk.tpl" data-id="' + t.id + '">' + icon('edit', 'sm') + 'Atur</button><button class="btn sm ghost" data-act="dk.tplStatus" data-id="' + t.id + '" data-a="' + (t.aktif ? '' : '1') + '">' + (t.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>' : '') + '</div></div>').join('') + '</div>'
          : UI.empty('layers', 'Belum ada template', can('SUPERADMIN') ? 'Klik "Buat Template Bawaan" untuk membuat Surat Jalan, Bukti Penerimaan, Berita Acara Opname, dan Surat Umum.' : 'Minta Super Admin membuat template.'));
      DokUI._tpl = d;
    } });
  },
  t_pejabat(box) {
    const kelola = can('KEPALA', 'SUPERADMIN');
    SWR.get('doc.pejabat', {}, { maxAge: 10000, onData: d => {
      if (!box.isConnected || !d) return;
      DokUI._pj = d;
      box.innerHTML = (kelola ? '<div class="row mb"><button class="btn pri" data-act="dk.pj">' + icon('useradd') + 'Tambah Pejabat</button><span class="small muted">Pejabat menandatangani dengan login Google (email harus sama) + PIN 6 digit.</span></div>' : '') +
        '<div class="card p0">' + UI.tabel({ rows: d, act: kelola ? 'dk.pj' : null, id: p => p.id, cols: [{ label: 'Nama', r: p => '<b>' + esc([p.nama, p.gelar].filter(Boolean).join(', ')) + '</b><div class="sub">' + esc(p.nip ? 'NIP/NIK ' + p.nip : '') + '</div>' }, { label: 'Jabatan', r: p => esc(p.jabatan) }, { label: 'Email Google', r: p => esc(p.email || '—') },
          { label: 'Spesimen', r: p => p.adaSpesimen ? '<span class="bdg ok nodot">ada</span>' : '<span class="bdg nodot">—</span>' }, { label: 'PIN', r: p => p.adaPin ? '<span class="bdg ok nodot">sudah</span>' : '<span class="bdg warn nodot">belum</span>' }, { label: 'Status', r: p => UI.bdg(p.aktif ? 'Aktif' : 'Nonaktif') }],
          kosong: UI.empty('stamp', 'Belum ada pejabat', 'Tambahkan Kepala Gudang / Owner sebagai penanda tangan dokumen.') }) + '</div>';
    } });
  },
  t_pin(box) {
    SWR.get('doc.pejabat', {}, { maxAge: 10000, onData: d => {
      if (!box.isConnected || !d) return;
      const saya = d.find(p => p.saya);
      box.innerHTML = '<div class="card" style="max-width:520px">' + (saya ? '<div class="ch"><h3>' + icon('key', 'sm') + ' PIN Tanda Tangan</h3></div><div class="small muted mb">Anda terdaftar sebagai <b>' + esc(saya.jabatan) + '</b>. PIN 6 angka dipakai setiap menandatangani dokumen. 5× salah = terkunci 15 menit.</div><form id="pin-f" class="col">' + (saya.adaPin ? '<div class="fld"><label>PIN lama</label><input class="inp" type="password" inputmode="numeric" maxlength="6" name="lama" autocomplete="off"></div>' : '') + '<div class="fld"><label>PIN baru (6 angka)</label><input class="inp" type="password" inputmode="numeric" maxlength="6" name="pin" autocomplete="off"></div><div class="fld"><label>Ulangi PIN baru</label><input class="inp" type="password" inputmode="numeric" maxlength="6" name="ulang" autocomplete="off"></div><button class="btn pri" type="submit">' + icon('check') + 'Simpan PIN</button></form>'
        : UI.empty('key', 'Anda bukan pejabat penanda tangan', 'Akun ' + esc(Store.me.email) + ' belum terdaftar di daftar pejabat.')) + '</div>';
      const f = $('#pin-f'); if (f) f.onsubmit = async e => { e.preventDefault(); if (!/^\d{6}$/.test(f.pin.value)) return UI.toast('PIN harus 6 angka.', 'warn'); if (f.pin.value !== f.ulang.value) return UI.toast('PIN tidak sama.', 'warn'); const b = f.querySelector('button'); UI.busy(b, true); const r = await API.call('doc.pin', { pin: f.pin.value, pinLama: f.lama ? f.lama.value : '' }); UI.busy(b, false); f.reset(); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('doc.pejabat'); };
    } });
  }
});

const DokUI = {
  /** Dialog buat dokumen dari transaksi / opname / umum. */
  async buat(o) {
    const h = UI.modal({ title: 'Buat Dokumen', desc: o.judul ? esc(o.judul) : 'Pilih template', size: 'lg', body: UI.sk(3) });
    const r = await API.q('doc.templates', { modul: o.modul });
    if (!h.el.isConnected) return;
    const tpl = (r.success ? r.data : []).filter(t => o.modul === 'UMUM' ? t.modul === 'UMUM' : true);
    if (!tpl.length) { h.body.innerHTML = UI.empty('layers', 'Belum ada template untuk ' + (MODUL_DOK[o.modul] || o.modul), can('SUPERADMIN') ? 'Buka Dokumen → Template → "Buat Template Bawaan".' : 'Minta Super Admin / Kepala Gudang menambahkan template.', can('KEPALA', 'SUPERADMIN') ? '<a class="btn pri" href="#/dokumen/template">Kelola Template</a>' : ''); h.body.querySelectorAll('a').forEach(a => a.onclick = () => h.tutup()); return; }
    h.body.innerHTML = '<div class="grid g2">' + tpl.map(t => '<button class="card" style="text-align:left;cursor:pointer" data-t="' + t.id + '"><div class="row between"><span class="tagk">' + esc(t.kode) + '</span><span class="bdg navy nodot">' + esc(MODUL_DOK[t.modul] || t.modul) + '</span></div><div class="bb mt-s">' + esc(t.nama) + '</div><div class="small muted">' + t.bidang.length + ' kolom isian · ' + t.slot.length + ' slot TTD · ' + esc(t.keluaran.toUpperCase()) + '</div></button>').join('') + '</div>';
    h.body.onclick = e => { const b = e.target.closest('[data-t]'); if (b) DokUI.form(h, b.dataset.t, o); };
    if (tpl.length === 1) DokUI.form(h, tpl[0].id, o);
  },
  async form(h, tid, o) {
    h.body.innerHTML = UI.sk(5);
    const r = await API.q('doc.siapkan', { templateId: tid, refTipe: o.refTipe || '', refId: o.refId || '' });
    if (!h.el.isConnected) return;
    if (!r.success) { h.body.innerHTML = UI.empty('alert', 'Gagal', esc(r.message)); return; }
    const { template: t, otomatis, judul, pejabat } = r.data;
    const draf = LS.get('gp_dokdraf_' + t.id + '_' + (o.refId || ''), {});
    const fld = b => {
      const v = draf[b.kunci] != null ? draf[b.kunci] : '', id = 'dkf_' + b.kunci, req = b.wajib ? ' <span class="req">*</span>' : '';
      let inp;
      if (b.tipe === 'area') inp = '<textarea class="inp" id="' + id + '">' + esc(v) + '</textarea>';
      else if (b.tipe === 'naskah') inp = '<div class="ed-bar"><button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><button type="button" data-cmd="underline"><u>U</u></button><button type="button" data-cmd="insertUnorderedList">•</button><button type="button" data-cmd="insertOrderedList">1.</button></div><div class="editor-isi" contenteditable="true" id="' + id + '">' + (v || '') + '</div>';
      else if (b.tipe === 'pilihan') inp = '<select class="inp" id="' + id + '">' + (b.opsi || []).map(x => '<option ' + (x === v ? 'selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
      else if (b.tipe === 'daftar') inp = '<div class="small muted">Tabel isian: ' + (b.kolom || []).map(k => esc(k.label)).join(', ') + '</div><textarea class="inp" id="' + id + '" placeholder="Satu baris per item; pisahkan kolom dengan | (garis tegak)">' + esc(Array.isArray(v) ? v.map(x => (b.kolom || []).map(k => x[k.kunci] || '').join(' | ')).join('\n') : v) + '</textarea>';
      else if (b.tipe === 'gambar') inp = '<div class="note warn small">' + icon('info') + '<div>Kolom gambar belum didukung dari form — penanda akan dikosongkan.</div></div>';
      else inp = '<input class="inp" id="' + id + '" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '" value="' + esc(v) + '">';
      return '<div class="fld ' + (b.tipe === 'naskah' || b.tipe === 'area' || b.tipe === 'daftar' ? 'full' : '') + '"><label for="' + id + '">' + esc(b.label) + req + '</label>' + inp + (b.bantu ? '<div class="hint">' + esc(b.bantu) + '</div>' : '') + '</div>';
    };
    const slot = s => '<div class="fld"><label>' + esc(s.label) + ' (slot ' + s.slot + ')' + (s.wajibSetuju ? ' <span class="bdg warn nodot">perlu persetujuan</span>' : '') + '</label>' + (s.cara === 'tetap' ? '<div class="small">' + esc((pejabat.find(p => p.id === s.pejabatId) || {}).nama || '— belum diatur —') + ' (tetap)</div>' : s.cara === 'jabatan' ? '<div class="small">Otomatis: pejabat aktif "' + esc(s.jabatan) + '"</div>' : '<select class="inp" data-slot="' + s.slot + '"><option value="">— kosongkan —</option>' + pejabat.map(p => '<option value="' + p.id + '" ' + (p.id === s.pejabatId ? 'selected' : '') + '>' + esc(p.nama + ' · ' + p.jabatan) + '</option>').join('') + '</select>') + '</div>';
    const auto = Object.keys(otomatis).filter(k => k !== 'ITEM' && otomatis[k] !== '' && !/^INSTITUSI_EMAIL$/.test(k));
    h.el.querySelector('.mh h3').textContent = t.nama;
    h.body.innerHTML = '<div class="fld mb"><label>Judul dokumen</label><input class="inp" id="dk-judul" value="' + esc(judul || t.nama) + '"></div>' +
      (t.bidang.length ? '<h4 style="margin:6px 0 10px">Isian</h4><div class="form-g">' + t.bidang.map(fld).join('') + '</div>' : '<div class="note small">' + icon('info') + '<div>Template ini tidak memiliki kolom isian manual — semua data diisi otomatis.</div></div>') +
      (t.slot.length ? '<h4 style="margin:18px 0 10px">Penanda tangan</h4><div class="form-g">' + t.slot.map(slot).join('') + '</div>' + (pejabat.length ? '' : '<div class="note warn small mt-s">' + icon('warn') + '<div>Belum ada pejabat terdaftar — nama penanda tangan akan kosong. Tambahkan di tab Pejabat.</div></div>') : '') +
      '<details class="mt"><summary class="small b" style="cursor:pointer">Data otomatis (' + auto.length + ' penanda' + (otomatis.ITEM ? ' + ' + otomatis.ITEM.length + ' baris item' : '') + ')</summary><div class="kv-list small mt-s">' + auto.slice(0, 40).map(k => '<span class="k mono">' + esc(k) + '</span><span>' + esc(otomatis[k]) + '</span>').join('') + '</div></details>';
    if (!h.foot) { const f = document.createElement('div'); f.className = 'mf'; h.el.appendChild(f); h.foot = f; }
    h.foot.innerHTML = '<span class="small muted grow">Nomor, tanggal terbit & kode QR diisi server saat terbit.</span><button class="btn pri" id="dk-ok">' + icon('filecheck') + 'Terbitkan Dokumen</button>';
    h.body.querySelectorAll('.ed-bar button').forEach(b => b.onmousedown = e => { e.preventDefault(); document.execCommand(b.dataset.cmd); });
    h.body.querySelectorAll('.editor-isi').forEach(ed => ed.onpaste = e => { e.preventDefault(); const html = (e.clipboardData.getData('text/html') || '').replace(/<(\/?)(span|font|meta|style)[^>]*>/gi, '').replace(/\s(style|class|id)="[^"]*"/gi, ''); document.execCommand(html ? 'insertHTML' : 'insertText', false, html || e.clipboardData.getData('text/plain')); });
    const kumpul = () => { const o2 = {}; t.bidang.forEach(b => { const el = h.body.querySelector('#dkf_' + b.kunci); if (!el) return; if (b.tipe === 'naskah') o2[b.kunci] = el.innerHTML; else if (b.tipe === 'daftar') o2[b.kunci] = el.value.split('\n').filter(x => x.trim()).map(l => { const p = l.split('|'), x = {}; (b.kolom || []).forEach((k, i) => x[k.kunci] = (p[i] || '').trim()); return x; }); else o2[b.kunci] = el.value; }); return o2; };
    h.body.oninput = debounce(() => LS.set('gp_dokdraf_' + t.id + '_' + (o.refId || ''), kumpul()), 500);
    h.foot.querySelector('#dk-ok').onclick = async e => {
      const isian = kumpul(), kurang = t.bidang.find(b => b.wajib && (b.tipe === 'daftar' ? !isian[b.kunci].length : !String(isian[b.kunci] || '').replace(/<[^>]+>/g, '').trim()));
      if (kurang) return UI.toast('Kolom "' + kurang.label + '" wajib diisi.', 'warn');
      const btn = e.currentTarget; UI.busy(btn, true); UI.toast('Menyusun dokumen dari template… (5–20 detik)', 'info', { ms: 8000 });
      const res = await API.call('doc.buat', { templateId: t.id, refTipe: o.refTipe || '', refId: o.refId || '', judul: h.body.querySelector('#dk-judul').value, isian, slot: $$('[data-slot]', h.body).map(s => ({ slot: Number(s.dataset.slot), pejabatId: s.value })) });
      UI.busy(btn, false);
      if (!res.success) return UI.toast(res.message, 'err');
      LS.del('gp_dokdraf_' + t.id + '_' + (o.refId || ''));
      SWR.basi('doc'); h.tutup();
      const pdf = res.data && res.data.berkas && res.data.berkas.pdf;
      UI.toast(res.message, 'ok', pdf ? { aksi: { label: 'Buka PDF', fn: () => window.open(pdf.url, '_blank') }, ms: 9000 } : null);
      if (pdf) window.open(pdf.url, '_blank');
      if (o.selesai) o.selesai(res.data);
    };
  },
  async ttd(id, slot, bypass) {
    const v = await new Promise(res => UI.modal({ title: bypass ? 'Bypass tanda tangan (Super Admin)' : 'Tandatangani dokumen', size: 'sm',
      body: bypass ? '<div class="note warn small mb">' + icon('warn') + '<div>Bypass tercatat di audit log dan ditampilkan pada halaman verifikasi.</div></div><div class="fld"><label>Alasan bypass <span class="req">*</span></label><textarea class="inp" id="tt-c"></textarea></div>'
        : '<div class="small muted mb">Masukkan PIN 6 angka Anda. Identitas Anda diverifikasi dari login Google.</div><div class="fld"><label>PIN</label><input class="inp" id="tt-p" type="password" inputmode="numeric" maxlength="6" autocomplete="off" autofocus style="letter-spacing:.4em;font-size:20px;text-align:center"></div><div class="fld mt"><label>Catatan (opsional)</label><input class="inp" id="tt-c"></div>',
      foot: '<button class="btn pri" id="tt-ok">' + icon('sign') + (bypass ? 'Bypass' : 'Tandatangani') + '</button>', onClose: x => res(x),
      onOpen: h => { h.el.querySelector('#tt-ok').onclick = () => h.tutup({ pin: (h.el.querySelector('#tt-p') || {}).value, catatan: h.el.querySelector('#tt-c').value }); } }));
    if (!v) return;
    UI.toast('Memproses tanda tangan…', 'info', { ms: 4000 });
    const r = await API.call('doc.setujui', { dokumenId: id, slot: Number(slot), pin: v.pin, catatan: v.catatan, bypass: !!bypass });
    if (!r.success) return UI.toast(r.message, 'err');
    UI.toast(r.message); SWR.basi('doc'); App.setelahTulis('doc'); if (Router.cur && Router.cur.id === 'dokumen') Router.jalan();
  }
};
ACT['dk.umum'] = () => DokUI.buat({ modul: 'UMUM', selesai: () => Router.cur.id === 'dokumen' && Router.jalan() });
ACT['dk.ttd'] = el => DokUI.ttd(el.dataset.id, el.dataset.s, false);
ACT['dk.bypass'] = el => DokUI.ttd(el.dataset.id, el.dataset.s, true);
ACT['dk.link'] = el => { const base = (Store.set.APP_URL || location.origin + location.pathname).replace(/\/?(index\.html)?(#.*)?$/, '/'); const u = base + 'verifikasi.html?k=' + el.dataset.k; navigator.clipboard && navigator.clipboard.writeText(u); UI.toast('Tautan verifikasi disalin: ' + u, 'info'); };
ACT['dk.tarik'] = async el => { const a = await UI.prompt({ title: 'Tarik dokumen', msg: 'Dokumen yang ditarik akan tampil DITARIK saat QR diverifikasi.', label: 'Alasan', required: true, min: 5, ok: 'Tarik', danger: true }); if (!a) return; const r = await API.call('doc.tarik', { dokumenId: el.dataset.id, alasan: a }); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('doc'); Router.jalan(); };
ACT['dk.bawaan'] = async el => { UI.busy(el, true); UI.toast('Membuat template di Google Drive…', 'info'); const r = await API.call('doc.templateBawaan', {}); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('doc'); Router.jalan(); };
ACT['dk.tplStatus'] = async el => { const r = await API.call('doc.templateStatus', { id: el.dataset.id, aktif: !!el.dataset.a }); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); SWR.basi('doc'); Router.jalan(); };
ACT['dk.bantuan'] = () => UI.modal({ title: 'Cara membuat template dokumen', size: 'lg', body: '<ol class="small" style="line-height:1.8;padding-left:18px"><li>Buat dokumen di <b>Google Docs</b> (surat), <b>Google Sheets</b> (tabel/Excel), atau <b>Google Slides</b> (sertifikat) di akun Google yang sama dengan aplikasi.</li><li>Tulis penanda dengan kurung kurawal ganda, mis. <span class="mono">{{PERIHAL}}</span>, <span class="mono">{{NAMA_SOPIR|kapital}}</span>. Gaya huruf penanda ikut ke hasil.</li><li>Tabel berulang: tulis <span class="mono">{{#ITEM}}</span> di satu baris tabel, lalu <span class="mono">{{ITEM.NAMA}}</span>, <span class="mono">{{ITEM.QTY}}</span> di sel lain baris itu.</li><li>Penanda tangan: <span class="mono">{{NAMA_PEJABAT_1}} {{JABATAN_1}} {{TTD_1}}</span> (slot 2: akhiran _2). QR verifikasi: <span class="mono">{{QR}}</span> dan <span class="mono">{{KODE_VERIFIKASI}}</span>.</li><li>Pengubah: <span class="mono">|kapital |judul |rupiah |terbilang |tanggal |bawaan:teks</span>. Blok opsional: <span class="mono">{{?TEMBUSAN}}…{{/TEMBUSAN}}</span>.</li><li>Salin URL dokumen → Tambah Template → Pindai. Kolom isian dibuat otomatis.</li></ol><h4>Penanda otomatis</h4>' + Object.keys(AUTO_KEYS).map(k => '<div class="small mt-s"><b>' + (k === 'TRX' ? 'Transaksi' : k === 'OPNAME' ? 'Stok opname' : 'Umum') + ':</b> <span class="mono">' + esc(AUTO_KEYS[k]) + '</span></div>').join('') + '<div class="small mt-s"><b>Sistem:</b> <span class="mono">NOMOR, TANGGAL, HARI, BULAN, BULAN_ROMAWI, TAHUN, KOTA, INSTITUSI_NAMA, INSTITUSI_ALAMAT, INSTITUSI_TELEPON, NAMA_GUDANG</span></div>' });
ACT['dk.tpl'] = el => {
  const t = el.dataset.id ? (DokUI._tpl || []).find(x => x.id === el.dataset.id) : null, pj = DokUI._pj || [];
  if (!DokUI._pj) API.q('doc.pejabat', {}).then(r => { if (r.success) DokUI._pj = r.data; });
  UI.modal({ title: t ? 'Atur Template ' + t.kode : 'Tambah Template', size: 'xl',
    body: '<div class="form-g g3"><div class="fld"><label>Kode <span class="req">*</span></label><input class="inp" id="tp-kode" value="' + esc(t ? t.kode : '') + '" placeholder="SJ_OUT" ' + (t ? 'readonly' : '') + ' style="text-transform:uppercase"></div><div class="fld"><label>Nama template <span class="req">*</span></label><input class="inp" id="tp-nama" value="' + esc(t ? t.nama : '') + '"></div><div class="fld"><label>Modul</label><select class="inp" id="tp-modul">' + Object.keys(MODUL_DOK).map(m => '<option value="' + m + '" ' + (t && t.modul === m ? 'selected' : '') + '>' + MODUL_DOK[m] + '</option>').join('') + '</select></div>' +
      '<div class="fld full"><label>URL Google Docs / Sheets / Slides ' + (t ? '(kosongkan = pakai berkas lama, tetap dipindai ulang)' : '<span class="req">*</span>') + '</label><input class="inp" id="tp-url" placeholder="https://docs.google.com/document/d/…/edit"></div>' +
      '<div class="fld"><label>Keluaran</label><div class="row wrap">' + ['pdf', 'docx', 'xlsx', 'png'].map(f => '<label class="chk"><input type="checkbox" class="tp-out" value="' + f + '" ' + ((t ? t.keluaran : 'pdf').split(',').includes(f) ? 'checked' : '') + '> ' + f.toUpperCase() + '</label>').join('') + '</div></div><div class="fld"><label>Format nomor</label><input class="inp" id="tp-fmt" value="' + esc(t ? t.formatNomor : '{URUT}/{KODE}/{BULAN}/{TAHUN}') + '"></div><label class="chk"><input type="checkbox" id="tp-qr" ' + (t && t.qrPerTtd ? 'checked' : '') + '> QR per penanda tangan (menggantikan TTD)</label></div>' +
      (t ? '<h4 class="mt">Kolom isian (' + t.bidang.length + ')</h4>' + (t.bidang.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Penanda</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Bantuan / opsi (pisah koma)</th></tr></thead><tbody>' + t.bidang.map(b => '<tr data-b="' + esc(b.kunci) + '"><td class="mono small">{{' + esc(b.kunci) + '}}</td><td><input class="inp sm" data-k="label" value="' + esc(b.label) + '"></td><td><select class="inp sm" data-k="tipe">' + ['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'daftar', 'gambar'].map(x => '<option ' + (x === b.tipe ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></td><td><input type="checkbox" data-k="wajib" ' + (b.wajib ? 'checked' : '') + '></td><td><input class="inp sm" data-k="bantu" value="' + esc(b.tipe === 'pilihan' ? (b.opsi || []).join(', ') : b.bantu || '') + '"></td></tr>').join('') + '</tbody></table></div>' : '<div class="small muted">Tidak ada kolom isian manual.</div>') +
        '<h4 class="mt">Slot penanda tangan (' + t.slot.length + ')</h4>' + (t.slot.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slot</th><th>Label</th><th>Cara</th><th>Pejabat / jabatan</th><th>Tanda</th><th>Urutan</th><th>Wajib setuju (PIN)</th></tr></thead><tbody>' + t.slot.map(s => '<tr data-s="' + s.slot + '"><td class="b">' + s.slot + '</td><td><input class="inp sm" data-k="label" value="' + esc(s.label) + '"></td><td><select class="inp sm" data-k="cara">' + [['pilih', 'Dipilih saat buat'], ['tetap', 'Pejabat tetap'], ['jabatan', 'Berdasar jabatan']].map(x => '<option value="' + x[0] + '" ' + (x[0] === s.cara ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select></td><td><select class="inp sm" data-k="pejabatId"><option value="">—</option>' + pj.map(p => '<option value="' + p.id + '" ' + (p.id === s.pejabatId ? 'selected' : '') + '>' + esc(p.nama) + '</option>').join('') + '</select><input class="inp sm mt-s" data-k="jabatan" placeholder="jabatan (cara jabatan)" value="' + esc(s.jabatan || '') + '"></td><td><select class="inp sm" data-k="tanda">' + [['kosong', 'TTD basah'], ['spesimen', 'Spesimen'], ['qr', 'QR eTTD'], ['qr+spesimen', 'QR + spesimen']].map(x => '<option value="' + x[0] + '" ' + (x[0] === s.tanda ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select></td><td><input class="inp sm" type="number" data-k="urutan" value="' + s.urutan + '" style="width:64px"></td><td><input type="checkbox" data-k="wajibSetuju" ' + (s.wajibSetuju ? 'checked' : '') + '></td></tr>').join('') + '</tbody></table></div>' : '<div class="small muted">Tidak ada penanda NAMA_PEJABAT_n / TTD_n.</div>') : '<div class="note mt small">' + icon('info') + '<div>Setelah dipindai, kolom isian & slot TTD bisa diatur di sini (label, tipe, wajib, pejabat).</div></div>'),
    foot: '<button class="btn pri" id="tp-ok">' + icon('scan') + (t ? 'Pindai Ulang & Simpan' : 'Pindai & Simpan') + '</button>',
    onOpen: h => {
      h.el.querySelector('#tp-ok').onclick = async () => {
        const E = s => h.el.querySelector(s);
        const d = { id: t ? t.id : '', kode: E('#tp-kode').value, nama: E('#tp-nama').value, modul: E('#tp-modul').value, url: E('#tp-url').value, keluaran: $$('.tp-out:checked', h.el).map(c => c.value).join(',') || 'pdf', qrPerTtd: E('#tp-qr').checked, formatNomor: E('#tp-fmt').value };
        if (t) {
          d.bidang = $$('tr[data-b]', h.el).map(tr => { const g = k => tr.querySelector('[data-k=' + k + ']'); const tipe = g('tipe').value; return { kunci: tr.dataset.b, label: g('label').value, tipe, wajib: g('wajib').checked, bantu: tipe === 'pilihan' ? '' : g('bantu').value, opsi: tipe === 'pilihan' ? g('bantu').value.split(',').map(x => x.trim()).filter(Boolean) : [] }; });
          d.slot = $$('tr[data-s]', h.el).map(tr => { const g = k => tr.querySelector('[data-k=' + k + ']'); return { slot: Number(tr.dataset.s), label: g('label').value, cara: g('cara').value, pejabatId: g('pejabatId').value, jabatan: g('jabatan').value, tanda: g('tanda').value, urutan: Number(g('urutan').value), wajibSetuju: g('wajibSetuju').checked }; });
        }
        const b = E('#tp-ok'); UI.busy(b, true);
        const r = await API.call('doc.templateSimpan', d); UI.busy(b, false);
        if (!r.success) return UI.toast(r.message, 'err');
        UI.toast(r.message + (r.data.hilang && r.data.hilang.length ? ' Kolom hilang dari template: ' + r.data.hilang.join(', ') : '')); h.tutup(); SWR.basi('doc'); await Router.jalan();
        if (!t) setTimeout(() => ACT['dk.tpl']({ dataset: { id: r.data.template.id } }), 400);
      };
    } });
};
ACT['dk.pj'] = el => {
  const p = el.dataset.id ? (DokUI._pj || []).find(x => x.id === el.dataset.id) : null; let spes = null;
  UI.modal({ title: p ? 'Ubah Pejabat' : 'Tambah Pejabat', body: '<form id="pj-f" class="form-g"><div class="fld"><label>Nama <span class="req">*</span></label><input class="inp" name="nama" value="' + esc(p ? p.nama : '') + '"></div><div class="fld"><label>Gelar</label><input class="inp" name="gelar" value="' + esc(p ? p.gelar : '') + '"></div><div class="fld"><label>Jabatan <span class="req">*</span></label><input class="inp" name="jabatan" value="' + esc(p ? p.jabatan : '') + '" placeholder="Kepala Gudang"></div><div class="fld"><label>NIP / NIK</label><input class="inp" name="nip" value="' + esc(p ? p.nip : '') + '"></div><div class="fld full"><label>Email Google (untuk menandatangani)</label><input class="inp" type="email" name="email" value="' + esc(p ? p.email : '') + '"></div><div class="fld"><label>Mulai menjabat</label><input class="inp" type="date" name="mulai" value="' + esc(p ? p.mulai : '') + '"></div><div class="fld"><label>Selesai menjabat</label><input class="inp" type="date" name="selesai" value="' + esc(p ? p.selesai : '') + '"></div><div class="fld full"><label>Spesimen tanda tangan (PNG latar transparan)</label><div class="row"><button type="button" class="btn sm" id="pj-sp">' + icon('image') + 'Pilih gambar</button><span class="small muted" id="pj-sp-i">' + (p && p.adaSpesimen ? 'Sudah ada spesimen (pilih untuk mengganti)' : 'Belum ada') + '</span></div><div class="hint">Disimpan privat di Drive, hanya disisipkan server ke dokumen.</div></div><label class="chk"><input type="checkbox" name="aktif" ' + (!p || p.aktif ? 'checked' : '') + '> Aktif</label></form>',
    foot: '<button class="btn pri" id="pj-ok">' + icon('check') + 'Simpan</button>',
    onOpen: h => {
      h.el.querySelector('#pj-sp').onclick = async () => { const f = await Gambar.pilih('image/png,image/jpeg'); if (!f) return; spes = { base64: await Gambar.baca(f), mime: f.type, nama: f.name }; h.el.querySelector('#pj-sp-i').textContent = f.name; };
      h.el.querySelector('#pj-ok').onclick = async () => { const f = h.el.querySelector('#pj-f'), d = { id: p ? p.id : '' }; new FormData(f).forEach((v, k) => d[k] = v); d.aktif = f.aktif.checked; const b = h.el.querySelector('#pj-ok'); UI.busy(b, true); const r = await API.call('doc.pejabatSimpan', { pejabat: d, spesimen: spes }); UI.busy(b, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); h.tutup(); SWR.basi('doc'); Router.jalan(); };
    } });
};
