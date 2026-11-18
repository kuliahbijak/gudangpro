/* GudangPro OS — WhatsApp & Notifikasi + CRM Kontak (skill gas-notifikasi-wa-crm) */
Page('notif', {
  title: 'WhatsApp & Notifikasi', roles: R_MAN,
  render(el, seg) {
    this.el = el; this.tab = seg[0] || 'blast';
    if (this.tab === 'konfigurasi' && !can('SUPERADMIN')) this.tab = 'blast';
    el.innerHTML = '<div class="ph"><div><h1>WhatsApp &amp; Notifikasi</h1><div class="sub">Alert stok minimum, kedaluwarsa, approval, dan blast WhatsApp per batch lewat Fonnte — dikirim dari antrean agar aplikasi tetap cepat.</div></div><div class="acts"><a class="btn" href="#/crm">' + icon('users') + 'CRM Kontak</a></div></div>' +
      '<div class="tabs">' + [['blast', 'Blast WhatsApp', 'send'], ['antrean', 'Antrean & Riwayat', 'list']].concat(can('SUPERADMIN') ? [['konfigurasi', 'Konfigurasi', 'settings']] : []).map(t => '<button class="' + (t[0] === this.tab ? 'on' : '') + '" data-act="go" data-h="#/notif/' + t[0] + '">' + icon(t[2], 'sm') + t[1] + '</button>').join('') + '</div><div id="nt-isi"></div>';
    this['t_' + this.tab]($('#nt-isi'));
  },
  leave() { clearInterval(Blast.timer); },
  t_blast(box) {
    const B = Blast; B.pesan = B.pesan || 'Assalamu\'alaikum {nama},\n\n\n— {institusi}'; B.ukuran = B.ukuran || Number(Store.set.WA_BATCH_DEFAULT || 20); B.jeda = B.jeda || Store.set.WA_JEDA_DETIK || '5';
    box.innerHTML = '<div id="bl-aktif"></div><div class="grid g2"><div class="card"><div class="ch"><h3>1. Pilih Sasaran</h3></div><div class="form-g"><div class="fld"><label>Sumber</label><select class="inp" id="bl-sumber"><option value="">CRM — semua segmen</option><option value="seg:Staf">CRM — Staf</option><option value="seg:Supplier">CRM — Supplier</option><option value="seg:Pelanggan">CRM — Pelanggan</option><option value="manual">Tempel manual</option></select></div><div class="fld"><label>Tag (opsional)</label><input class="inp" id="bl-tag" placeholder="mis. vip"></div>' +
      '<div class="fld full hidden" id="bl-man-f"><label>Nomor (satu per baris: <span class="mono">0812…|Nama</span>)</label><textarea class="inp" id="bl-man"></textarea></div></div>' +
      '<div class="row wrap mt"><button class="btn" data-act="bl.muat">' + icon('users') + 'Muat Penerima</button><button class="btn" data-act="bl.deteksi">' + icon('phone') + 'Deteksi Nomor WA</button><label class="chk small"><input type="checkbox" id="bl-hanya"> Kirim hanya ke nomor terdeteksi WhatsApp</label></div><div id="bl-ring" class="row wrap mt"></div><div id="bl-tbl" class="mt"></div></div>' +
      '<div class="card"><div class="ch"><h3>2. Tulis Pesan</h3></div><div class="fld"><label>Judul internal</label><input class="inp" id="bl-judul" placeholder="mis. Info libur gudang"></div><div class="row wrap mt-s">' + ['{nama}', '{institusi}', '{link}', '{segmen}'].map(v => '<button class="chip" data-act="bl.var" data-v="' + v + '">' + v + '</button>').join('') + '</div>' +
      '<textarea class="inp mt-s" id="bl-pesan" style="min-height:150px">' + esc(B.pesan) + '</textarea><div class="small muted mt-s">Pratinjau:</div><div class="wa-preview mt-s" id="bl-prev"></div>' +
      '<div class="ch mt"><h3>3. Ukuran Batch &amp; Jeda</h3></div><div class="row wrap"><div class="seg" id="bl-uk">' + [10, 20, 50].map(n => '<button class="' + (n === B.ukuran ? 'on' : '') + '" data-v="' + n + '">' + n + '</button>').join('') + '</div><div class="fld"><input class="inp sm" id="bl-jeda" value="' + esc(B.jeda) + '" style="width:110px" title="Jeda antarpesan (detik), boleh 3-8"></div><span class="small muted">detik jeda (boleh acak "3-8")</span></div><div class="small muted mt-s" id="bl-est"></div>' +
      '<button class="btn pri lg block mt" data-act="bl.mulai" id="bl-go">' + icon('send') + 'Mulai Blast</button><div class="note mt small">' + icon('info') + '<div>Tips anti-banned: mulai batch 10, jeda acak ≥ 5 detik, gunakan nomor WA yang sudah "hangat", hindari tautan yang sama ke ratusan orang dalam 1 jam.</div></div></div></div>' +
      '<div class="card p0 mt"><div class="ch" style="padding:16px 18px 0"><h3>Riwayat Blast</h3></div><div id="bl-riw">' + UI.sk(2) + '</div></div>';
    const prev = () => { B.pesan = $('#bl-pesan').value; const p = (B.rows || []).find(r => r.valid) || { nama: 'Budi', segmen: 'Pelanggan' }; $('#bl-prev').textContent = B.pesan.replace(/\{nama\}/g, p.nama || 'Bapak/Ibu').replace(/\{institusi\}/g, Store.set.NAMA_PERUSAHAAN || '').replace(/\{link\}/g, Store.set.APP_URL || '').replace(/\{segmen\}/g, p.segmen || ''); B.est(); };
    $('#bl-pesan').oninput = prev; $('#bl-sumber').onchange = e => $('#bl-man-f').classList.toggle('hidden', e.target.value !== 'manual');
    $('#bl-uk').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; B.ukuran = Number(b.dataset.v); $$('#bl-uk button').forEach(x => x.classList.toggle('on', x === b)); B.est(); };
    $('#bl-jeda').oninput = () => { B.jeda = $('#bl-jeda').value; B.est(); }; $('#bl-hanya').onchange = () => B.tabel();
    prev(); B.riwayat();
  },
  t_antrean(box) {
    box.innerHTML = '<div id="aq-kpi" class="grid g4"></div><div class="card p0 mt"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><select class="inp sm" style="width:auto" id="aq-st"><option value="">Semua status</option><option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="inp sm" style="width:auto" id="aq-k"><option value="">Semua kanal</option><option>WA</option><option>EMAIL</option></select><button class="btn sm ml-auto" data-act="aq.proses">' + icon('play') + 'Proses Sekarang</button>' + (can('SUPERADMIN') ? '<button class="btn sm" data-act="aq.ulang">' + icon('refresh') + 'Ulangi yang Gagal</button>' : '') + '</div><div id="aq-tbl">' + UI.sk(4) + '</div></div>';
    const muat = () => SWR.get('notif.queue', { status: $('#aq-st').value, kanal: $('#aq-k').value }, { maxAge: 5000, onData: d => {
      if (!d || !$('#aq-tbl')) return; const R = d.ringkas;
      $('#aq-kpi').innerHTML = [['Menunggu', R.Antri, 'clock', 'navy'], ['Terkirim', R.Terkirim, 'ok', 'ok'], ['Gagal', R.Gagal, 'alert', 'coral'], ['Dibatalkan', R.Batal, 'x', '']].map(k => '<div class="card kpi"><div class="ib ' + k[3] + '">' + icon(k[2], 'lg') + '</div><div><div class="lbl">' + k[0] + '</div><div class="val">' + F.num(k[1] || 0, 0) + '</div></div></div>').join('');
      $('#aq-tbl').innerHTML = UI.tabel({ rows: d.rows, cols: [{ label: 'Waktu', r: x => '<span class="small">' + F.tglJam(x.dikirim || x.dibuat) + '</span>' }, { label: 'Kanal', r: x => '<span class="bdg ' + (x.kanal === 'WA' ? 'ok' : 'navy') + ' nodot">' + x.kanal + '</span>' }, { label: 'Tujuan', r: x => '<div class="small b">' + esc(x.nama || '') + '</div><div class="sub mono">' + esc(x.tujuan) + '</div>' }, { label: 'Event', r: x => '<span class="small">' + esc(x.event) + '</span>' }, { label: 'Pesan', r: x => '<div class="small" style="max-width:360px">' + esc(x.pesan) + '</div>' }, { label: 'Status', r: x => UI.bdg(x.status) + (x.respon && x.status !== 'Terkirim' ? '<div class="sub">' + esc(x.respon) + '</div>' : '') }],
        kartu: x => '<div class="grow"><div class="row between"><b class="small">' + esc(x.nama || x.tujuan) + '</b>' + UI.bdg(x.status) + '</div><div class="small muted">' + x.kanal + ' · ' + esc(x.event) + ' · ' + F.tglJam(x.dikirim || x.dibuat) + '</div><div class="small">' + esc(x.pesan) + '</div></div>', kosong: UI.empty('mail', 'Antrean kosong', 'Aktifkan notifikasi di Konfigurasi.') });
    } });
    $('#aq-st').onchange = muat; $('#aq-k').onchange = muat; Pages.notif._muatAq = muat; muat();
  },
  async t_konfigurasi(box) {
    box.innerHTML = UI.sk(6, true);
    const r = await API.q('notif.config', {}); if (!box.isConnected) return;
    if (!r.success) { box.innerHTML = UI.empty('alert', 'Gagal memuat', esc(r.message)); return; }
    const c = this.cfg = r.data;
    box.innerHTML = '<div class="grid g2"><div class="card"><div class="ch"><h3>' + icon('wa', 'sm') + ' WhatsApp (Fonnte)</h3><label class="switch ml-auto"><input type="checkbox" id="cf-wa" ' + (c.waAktif ? 'checked' : '') + '><span></span></label></div><div class="form-g"><div class="fld full"><label>Token Fonnte</label><input class="inp" type="password" id="cf-token" autocomplete="off" placeholder="' + esc(c.tokenAda ? c.token + ' (tersimpan — kosongkan bila tidak diubah)' : 'tempel token dari fonnte.com → Device') + '"><div class="hint">Disimpan di Script Properties server; tidak pernah ditampilkan utuh.</div></div>' +
      '<div class="fld"><label>Batch default blast</label><select class="inp" id="cf-batch">' + [10, 20, 50].map(n => '<option ' + (n === c.batchDefault ? 'selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="fld"><label>Jeda antarpesan (detik)</label><input class="inp" id="cf-jeda" value="' + esc(c.jeda) + '"></div>' +
      '<label class="chk full"><input type="checkbox" id="cf-det" ' + (c.deteksiOtomatis ? 'checked' : '') + '> Deteksi otomatis nomor kontak baru terdaftar WhatsApp</label></div><div class="row wrap mt"><button class="btn sm" data-act="cf.device">' + icon('phone') + 'Cek Perangkat</button><button class="btn sm" data-act="cf.tesWa">' + icon('send') + 'Kirim Tes WA</button>' + (c.tokenAda ? '<button class="btn sm ghost" data-act="cf.hapusToken">' + icon('trash') + 'Hapus token</button>' : '') + '</div><div id="cf-dev" class="small mt-s"></div></div>' +
      '<div class="card"><div class="ch"><h3>' + icon('mail', 'sm') + ' Email (Gmail)</h3><label class="switch ml-auto"><input type="checkbox" id="cf-em" ' + (c.emailAktif ? 'checked' : '') + '><span></span></label></div><div class="form-g"><div class="fld"><label>Nama pengirim</label><input class="inp" id="cf-nama" value="' + esc(c.namaPengirim) + '"></div><div class="fld"><label>Sisa kuota email hari ini</label><div class="bb" style="font-size:20px">' + F.num(c.sisaKuotaEmail, 0) + '</div><div class="hint">Gmail biasa ±100/hari · Workspace ±1.500/hari. Alert digabung 1 email per penerima per hari.</div></div><div class="fld full"><label>URL aplikasi (untuk {link} & QR verifikasi)</label><input class="inp" id="cf-url" value="' + esc(c.appUrl) + '" placeholder="https://username.github.io/gudangpro/"></div></div>' +
      '<div class="row wrap mt"><button class="btn sm" data-act="cf.tesEmail">' + icon('send') + 'Kirim Tes Email</button><span class="small ' + (c.trigger ? 't-ok' : 't-bad') + '">' + icon(c.trigger ? 'ok' : 'alert', 'sm') + ' Trigger antrean 1 menit ' + (c.trigger ? 'aktif' : 'belum aktif — buka Pengaturan → Sistem') + '</span></div></div></div>' +
      '<div class="card mt"><div class="ch"><div><h3>Matriks Notifikasi Otomatis</h3><div class="d">Pilih kejadian yang dikirim per kanal. Saklar kanal utama di atas harus aktif.</div></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>WhatsApp</th><th>Email</th><th></th></tr></thead><tbody>' +
      Object.values(c.matriks).map(m => '<tr data-ev="' + m.kode + '"><td><div class="b">' + esc(m.label) + '</div><div class="sub mono">' + m.kode + '</div></td><td><label class="switch"><input type="checkbox" data-k="wa" ' + (m.wa ? 'checked' : '') + '><span></span></label></td><td><label class="switch"><input type="checkbox" data-k="email" ' + (m.email ? 'checked' : '') + '><span></span></label></td><td><button class="btn sm ghost" data-act="cf.tpl" data-ev="' + m.kode + '">' + icon('edit', 'sm') + 'Ubah pesan</button></td></tr><tr class="hidden" id="cfx-' + m.kode + '"><td colspan="4"><div class="form-g"><div class="fld full"><label>Subjek email</label><input class="inp sm" data-k="subjek" value="' + esc(m.subjek) + '"></div><div class="fld full"><label>Isi pesan</label><textarea class="inp" data-k="pesan">' + esc(m.pesan) + '</textarea><div class="hint">Variabel: {nama} {institusi} {link} + variabel kejadian di template bawaan. <a href="#" data-act="cf.reset" data-ev="' + m.kode + '">↺ Kembalikan bawaan</a></div></div></div></td></tr>').join('') +
      '</tbody></table></div><div class="row mt"><button class="btn pri lg" data-act="cf.simpan">' + icon('check') + 'Simpan Konfigurasi</button></div></div>';
  }
});
const Blast = {
  rows: null, timer: null,
  est() { const n = this.target().length, b = this.ukuran, j = String(this.jeda || '5').split('-').map(Number), avg = j.length > 1 ? (j[0] + j[1]) / 2 : j[0] || 5; const e = $('#bl-est'); if (e) e.textContent = n ? n + ' penerima → ' + Math.ceil(n / b) + ' batch · ±' + Math.ceil(n * avg / 60) + ' menit' : 'Muat penerima terlebih dahulu.'; const g = $('#bl-go'); if (g) g.innerHTML = icon('send') + 'Mulai Blast (' + n + ' nomor)'; },
  target() { const hanya = $('#bl-hanya') && $('#bl-hanya').checked; return (this.rows || []).filter(r => r.pilih && r.valid && !r.ganda && !r.optOut && (!hanya || r.statusWA === 'Terdaftar')); },
  async muat(btn) {
    const s = $('#bl-sumber').value, p = s === 'manual' ? { sumber: 'manual', teks: $('#bl-man').value } : { segmen: s.startsWith('seg:') ? s.slice(4) : '', tag: $('#bl-tag').value.trim().toLowerCase() };
    if (this.idsPilih) { p.ids = this.idsPilih; this.idsPilih = null; }
    UI.busy(btn, true); const r = await API.call('wa.audience', p); UI.busy(btn, false);
    if (!r.success) return UI.toast(r.message, 'err');
    this.rows = r.data.rows.map(x => Object.assign(x, { pilih: x.valid && !x.ganda && !x.optOut }));
    const R = r.data.ringkas; $('#bl-ring').innerHTML = [['total', 'Total'], ['valid', 'Valid'], ['tidakValid', 'Tidak valid'], ['ganda', 'Ganda'], ['optOut', 'Opt-out'], ['terdaftarWA', '✓ WA'], ['tidakTerdaftarWA', '✕ bukan WA']].map(k => '<span class="chip">' + k[1] + ' <span class="c">' + (R[k[0]] || 0) + '</span></span>').join('');
    this.tabel(); $('#bl-pesan').dispatchEvent(new Event('input'));
  },
  tabel() {
    const box = $('#bl-tbl'); if (!box || !this.rows) return;
    box.innerHTML = '<div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th><input type="checkbox" id="bl-all" checked></th><th>Nama</th><th>Nomor</th><th>WA</th></tr></thead><tbody>' + this.rows.slice(0, 1000).map((r, i) => '<tr style="opacity:' + (r.valid && !r.ganda && !r.optOut ? 1 : .45) + '"><td><input type="checkbox" data-i="' + i + '" ' + (r.pilih ? 'checked' : '') + ' ' + (r.valid && !r.ganda && !r.optOut ? '' : 'disabled') + '></td><td class="small">' + esc(r.nama || '-') + (r.optOut ? ' <span class="bdg bad nodot">opt-out</span>' : '') + '</td><td class="mono small">' + esc(r.hp || '-') + (r.ganda ? ' <span class="tiny muted">ganda</span>' : '') + '</td><td><span class="wa-badge ' + (r.statusWA === 'Terdaftar' ? 'ya' : r.statusWA ? 'tidak' : 'belum') + '">' + (r.statusWA === 'Terdaftar' ? '✓ WA' : r.statusWA ? '✕ bukan WA' : '? belum dicek') + '</span></td></tr>').join('') + '</tbody></table></div>';
    box.onchange = e => { if (e.target.id === 'bl-all') { this.rows.forEach(r => { if (r.valid && !r.ganda && !r.optOut) r.pilih = e.target.checked; }); this.tabel(); } else if (e.target.dataset.i) this.rows[+e.target.dataset.i].pilih = e.target.checked; this.est(); };
    this.est();
  },
  async deteksi(btn) {
    if (!this.rows) return UI.toast('Muat penerima dulu.', 'warn');
    const nomor = [...new Set(this.rows.filter(r => r.valid && !r.statusWA).map(r => r.hp))];
    if (!nomor.length) return UI.toast('Semua nomor sudah dicek.', 'info');
    UI.busy(btn, true);
    for (let i = 0; i < nomor.length; i += 50) {
      btn.lastChild.textContent = ' Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length;
      const r = await API.call('wa.validate', { nomor: nomor.slice(i, i + 50) });
      if (!r.success) { UI.busy(btn, false); return UI.toast(r.message, 'err'); }
      this.rows.forEach(x => { if (r.data.hasil[x.hp]) x.statusWA = r.data.hasil[x.hp]; });
    }
    UI.busy(btn, false); btn.innerHTML = icon('phone') + 'Deteksi Nomor WA'; this.tabel(); UI.toast('Deteksi selesai.');
  },
  async mulai(btn) {
    const t = this.target(), judul = $('#bl-judul').value.trim();
    if (!t.length) return UI.toast('Belum ada penerima terpilih.', 'warn'); if (!judul) return UI.toast('Isi judul internal blast.', 'warn');
    if (!(await UI.confirm({ title: 'Mulai blast?', msg: 'Kirim ke <b>' + t.length + '</b> nomor dalam <b>' + Math.ceil(t.length / this.ukuran) + '</b> batch (' + this.ukuran + ' per batch, jeda ' + esc(this.jeda) + ' dtk). Server tetap mengirim 1 batch/menit walau halaman ditutup.', ok: 'Mulai Blast' }))) return;
    UI.busy(btn, true);
    const r = await API.call('wa.blastCreate', { judul, pesan: $('#bl-pesan').value, ukuranBatch: this.ukuran, jeda: this.jeda, sasaran: $('#bl-sumber').selectedOptions[0].text, penerima: t.map(x => ({ hp: x.hp, nama: x.nama, segmen: x.segmen })) });
    UI.busy(btn, false);
    if (!r.success) return UI.toast(r.message, 'err');
    UI.toast(r.message); this.aktif = r.data.blastId; this.riwayat(); this.kirim();
  },
  async riwayat() {
    const r = await API.q('wa.blastList', {}); const box = $('#bl-riw'); if (!box || !r.success) return;
    box.innerHTML = UI.tabel({ rows: r.data, cols: [{ label: 'Judul', r: b => '<b>' + esc(b.judul) + '</b><div class="sub">' + esc(b.sasaran) + ' · ' + F.tglJam(b.tanggal) + '</div>' }, { label: 'Batch · Jeda', r: b => b.batch + ' · ' + esc(b.jeda) + ' dtk' }, { label: 'Progres', r: b => '<div class="progress" style="width:140px"><i style="width:' + b.persen + '%"></i></div><div class="sub">' + b.terkirim + ' terkirim · ' + b.gagal + ' gagal · ' + b.sisa + ' sisa</div>' }, { label: 'Status', r: b => UI.bdg(b.status) }, { label: '', r: b => b.status === 'Berjalan' ? '<button class="btn sm" data-act="bl.pantau" data-id="' + b.id + '">Pantau</button><button class="btn sm ghost" data-act="bl.stop" data-id="' + b.id + '">Hentikan</button>' : '' }], kosong: UI.empty('send', 'Belum ada blast') });
    const jalan = r.data.find(b => b.status === 'Berjalan'); if (jalan && !this.aktif) this.aktif = jalan.id;
    this.kartu(r.data.find(b => b.id === this.aktif));
  },
  kartu(b) {
    const box = $('#bl-aktif'); if (!box) return;
    if (!b) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="card mb" style="border-color:var(--teal)"><div class="row between wrap"><div><div class="small muted">Blast aktif</div><div class="bb">' + esc(b.judul) + '</div></div>' + UI.bdg(b.status) + '</div><div class="progress mt"><i style="width:' + b.persen + '%"></i></div><div class="row wrap small mt-s"><span>' + b.terkirim + ' terkirim</span><span class="t-bad">' + b.gagal + ' gagal</span><span>' + (b.sisa || 0) + ' sisa</span><span class="muted ml-auto">Server mengirim 1 batch/menit walau halaman ditutup.</span></div>' +
      (b.status === 'Berjalan' ? '<div class="row wrap mt"><button class="btn pri" data-act="bl.kirim">' + icon('play') + 'Kirim Batch Berikutnya Sekarang</button><label class="chk"><input type="checkbox" id="bl-auto" ' + (this.timer ? 'checked' : '') + '> Otomatis <span id="bl-cd" class="muted small"></span></label><button class="btn" data-act="bl.stop" data-id="' + b.id + '">' + icon('stop') + 'Hentikan</button></div>' : '') + '</div>';
    const a = $('#bl-auto'); if (a) a.onchange = () => this.otomatis(a.checked);
  },
  async kirim(btn) {
    if (!this.aktif) return; if (btn) UI.busy(btn, true);
    const r = await API.call('wa.blastProcess', { blastId: this.aktif }); if (btn) UI.busy(btn, false);
    if (!r.success) return UI.toast(r.message, 'err');
    if (r.data.blast) { this.kartu(Object.assign({ judul: (($('#bl-aktif .bb') || {}).textContent) || '', sisa: r.data.blast.total - r.data.blast.terkirim - r.data.blast.gagal }, r.data.blast)); if (r.data.blast.status !== 'Berjalan') { this.otomatis(false); this.riwayat(); UI.toast('Blast selesai.'); } }
  },
  otomatis(on) {
    clearInterval(this.timer); this.timer = null; if (!on) return;
    const j = String(this.jeda || '5').split('-').map(Number), tunggu = Math.max(30, Math.round((this.ukuran || 20) * (j.length > 1 ? (j[0] + j[1]) / 2 : j[0])));
    let n = tunggu; this.timer = setInterval(() => { n--; const cd = $('#bl-cd'); if (cd) cd.textContent = '(' + n + ' dtk)'; if (n <= 0) { n = tunggu; this.kirim(); } }, 1000);
  }
};
ACT['bl.muat'] = el => Blast.muat(el); ACT['bl.deteksi'] = el => Blast.deteksi(el); ACT['bl.mulai'] = el => Blast.mulai(el); ACT['bl.kirim'] = el => Blast.kirim(el);
ACT['bl.var'] = el => { const t = $('#bl-pesan'), p = t.selectionStart; t.value = t.value.slice(0, p) + el.dataset.v + t.value.slice(t.selectionEnd); t.focus(); t.dispatchEvent(new Event('input')); };
ACT['bl.pantau'] = el => { Blast.aktif = el.dataset.id; Blast.riwayat(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
ACT['bl.stop'] = async el => { if (!(await UI.confirm({ msg: 'Hentikan blast? Pesan yang belum terkirim dibatalkan.', ok: 'Hentikan', danger: true }))) return; const r = await API.call('wa.blastStop', { blastId: el.dataset.id }); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); Blast.otomatis(false); Blast.riwayat(); };
ACT['aq.proses'] = async el => { UI.busy(el, true); const r = await API.call('notif.processNow', {}); UI.busy(el, false); UI.toast(r.message || (r.success ? 'Diproses.' : 'Gagal'), r.success ? 'ok' : 'err'); SWR.basi('notif.queue'); Pages.notif._muatAq && Pages.notif._muatAq(); };
ACT['aq.ulang'] = async el => { const r = await API.call('notif.retry', {}); UI.toast(r.message, r.success ? 'ok' : 'err'); SWR.basi('notif.queue'); Pages.notif._muatAq && Pages.notif._muatAq(); };
ACT['cf.tpl'] = el => $('#cfx-' + el.dataset.ev).classList.toggle('hidden');
ACT['cf.reset'] = el => { const m = Pages.notif.cfg.matriks[el.dataset.ev], row = $('#cfx-' + el.dataset.ev); row.querySelector('[data-k=subjek]').value = m.subjekDefault; row.querySelector('[data-k=pesan]').value = m.pesanDefault; };
ACT['cf.device'] = async el => { UI.busy(el, true); const r = await API.call('wa.device', {}); UI.busy(el, false); $('#cf-dev').innerHTML = r.success ? '<span class="bdg ' + (r.data.status === 'connect' ? 'ok' : 'bad') + '">' + esc(r.data.status) + '</span> Nomor ' + esc(r.data.nomor) + ' · paket ' + esc(r.data.paket) + ' · kuota ' + esc(r.data.kuota) + ' · s.d. ' + esc(r.data.kedaluwarsa) : '<span class="t-bad">' + esc(r.message) + '</span>'; };
ACT['cf.tesWa'] = async el => { const n = await UI.prompt({ title: 'Kirim tes WhatsApp', label: 'Nomor tujuan', value: Store.me.no_wa || '', type: 'tel', required: true, ok: 'Kirim' }); if (!n) return; UI.busy(el, true); const r = await API.call('wa.test', { nomor: n }); UI.busy(el, false); UI.toast(r.message, r.success ? 'ok' : 'err'); };
ACT['cf.tesEmail'] = async el => { const n = await UI.prompt({ title: 'Kirim tes email', label: 'Email tujuan', value: /@/.test(Store.me.email) ? Store.me.email : '', type: 'email', required: true, ok: 'Kirim' }); if (!n) return; UI.busy(el, true); const r = await API.call('email.test', { email: n }); UI.busy(el, false); UI.toast(r.message, r.success ? 'ok' : 'err'); };
ACT['cf.hapusToken'] = async () => { if (!(await UI.confirm({ msg: 'Hapus token Fonnte? Notifikasi WhatsApp akan berhenti.', danger: true, ok: 'Hapus' }))) return; const r = await API.call('notif.configSave', Object.assign(ACT._cfgData(), { token: '__HAPUS__', waAktif: false })); UI.toast(r.success ? 'Token dihapus.' : r.message, r.success ? 'ok' : 'err'); Router.jalan(); };
ACT._cfgData = () => { const matriks = {}; $$('tr[data-ev]').forEach(tr => { const k = tr.dataset.ev, x = $('#cfx-' + k); matriks[k] = { wa: tr.querySelector('[data-k=wa]').checked, email: tr.querySelector('[data-k=email]').checked, subjek: x.querySelector('[data-k=subjek]').value, pesan: x.querySelector('[data-k=pesan]').value }; }); return { waAktif: $('#cf-wa').checked, emailAktif: $('#cf-em').checked, token: $('#cf-token').value.trim(), batchDefault: Number($('#cf-batch').value), jeda: $('#cf-jeda').value.trim(), deteksiOtomatis: $('#cf-det').checked, namaPengirim: $('#cf-nama').value, appUrl: $('#cf-url').value.trim(), matriks }; };
ACT['cf.simpan'] = async el => { UI.busy(el, true); const r = await API.call('notif.configSave', ACT._cfgData()); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast('Konfigurasi notifikasi tersimpan.'); $('#cf-token').value = ''; Store.sync(); Pages.notif.t_konfigurasi($('#nt-isi')); };

/* =====================================================================
   CRM KONTAK
   ===================================================================== */
Page('crm', {
  title: 'CRM Kontak', roles: R_MAN,
  render(el) {
    this.el = el; this.f = this.f || { halaman: 1 }; this.pilih = new Set();
    el.innerHTML = '<div class="ph"><div><h1>CRM Kontak</h1><div class="sub">Satu daftar Nama · Email · WhatsApp dari pengguna, supplier, dan kontak impor — siap untuk notifikasi & blast.</div></div><div class="acts"><button class="btn" data-act="crm.sync">' + icon('refresh') + 'Sinkron</button><button class="btn" data-act="crm.import">' + icon('upload') + 'Impor CSV</button><button class="btn" data-act="crm.dup">' + icon('merge') + 'Periksa Duplikat</button>' + (can('OWNER', 'SUPERADMIN') ? '<button class="btn" data-act="crm.ekspor">' + icon('download') + 'Ekspor</button>' : '') + '<button class="btn pri" data-act="crm.baru">' + icon('useradd') + 'Tambah Kontak</button></div></div>' +
      '<div class="grid g3" id="crm-kpi" style="grid-template-columns:repeat(6,minmax(0,1fr))"></div><div class="card p0 mt"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="chips" id="crm-seg"></div><select class="inp sm" style="width:auto" id="crm-wa"><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum dicek</option></select><div class="inp-ic grow" style="min-width:200px">' + icon('search') + '<input class="inp sm" id="crm-q" placeholder="Cari nama, email, nomor, tag…" style="padding-left:36px"></div></div><div id="crm-bulk"></div><div id="crm-tbl">' + UI.sk(5) + '</div></div>';
    $('#crm-q').oninput = debounce(e => { this.f.cari = e.target.value; this.f.halaman = 1; this.muat(); }, 350);
    $('#crm-wa').onchange = e => { this.f.statusWA = e.target.value; this.f.halaman = 1; this.muat(); };
    this.kpi(); this.muat();
  },
  kpi() {
    SWR.get('crm.stats', {}, { maxAge: 30000, onData: s => {
      const box = $('#crm-kpi'); if (!box || !s) return;
      box.innerHTML = [['Total Kontak', s.total, 'users', '', {}], ['WA Terverifikasi', s.terdaftarWA, 'ok', 'ok', { statusWA: 'Terdaftar' }], ['Email Valid', s.emailValid, 'mail', 'navy', { emailValid: 'YA' }], ['Belum Dicek WA', s.belumCek, 'clock', '', { statusWA: 'Belum dicek' }], ['Opt-out', s.optOut, 'no', 'coral', { optOut: 1 }], ['Duplikat', s.duplikat, 'merge', 'coral', { duplikat: 1 }]]
        .map(k => '<div class="card kpi" style="cursor:pointer;padding:14px" data-act="crm.kpi" data-f=\'' + JSON.stringify(k[4]) + '\'><div class="ib ' + k[3] + '" style="width:36px;height:36px">' + icon(k[2]) + '</div><div><div class="lbl">' + k[0] + '</div><div class="val" style="font-size:20px">' + F.num(k[1], 0) + '</div></div></div>').join('');
      $('#crm-seg').innerHTML = '<button class="chip ' + (!this.f.segmen ? 'on' : '') + '" data-act="crm.seg" data-s="">Semua <span class="c">' + s.total + '</span></button>' + Object.keys(s.segmen).map(g => '<button class="chip ' + (this.f.segmen === g ? 'on' : '') + '" data-act="crm.seg" data-s="' + esc(g) + '">' + esc(g) + ' <span class="c">' + s.segmen[g] + '</span></button>').join('');
      this.stat = s;
    } });
  },
  muat() { SWR.get('crm.list', this.f, { maxAge: 10000, onData: d => this.isi(d) }); },
  isi(d) {
    const box = $('#crm-tbl'); if (!box || !d) return; this.d = d;
    box.innerHTML = UI.tabel({ rows: d.rows, kelas: k => (!k.wa || k.emailValid === 'TIDAK' || k.dup ? 'warnrow' : ''),
      cols: [{ label: '', w: '36px', r: k => '<input type="checkbox" data-cid="' + k.id + '" ' + (this.pilih.has(k.id) ? 'checked' : '') + '>' }, { label: 'Nama', r: k => '<div class="row" data-act="crm.detail" data-id="' + k.id + '" style="cursor:pointer">' + UI.avatar(k.nama).replace('avatar"', 'avatar" style="width:32px;height:32px;font-size:12px"') + '<div><div class="b">' + esc(k.nama) + '</div><span class="bdg navy nodot">' + esc(k.segmen) + '</span>' + (k.dup ? ' <span class="bdg warn nodot">duplikat</span>' : '') + '</div></div>' },
        { label: 'Email', r: k => k.email ? '<span class="small">' + esc(k.email) + '</span> ' + (k.emailValid === 'YA' ? '<span class="t-ok">✓</span>' : '<span class="t-warn">⚠</span>') : '<span class="muted">—</span>' },
        { label: 'WhatsApp', r: k => k.wa ? '<span class="mono small">' + esc(k.wa) + '</span> <span class="wa-badge ' + (k.statusWA === 'Terdaftar' ? 'ya' : k.statusWA ? 'tidak' : 'belum') + '">' + (k.statusWA === 'Terdaftar' ? '✓ WA' : k.statusWA ? '✕' : '?') + '</span> <a href="https://wa.me/' + esc(k.wa.replace(/^0/, '62')) + '" target="_blank" rel="noopener" title="Buka WhatsApp">' + icon('ext', 'sm') + '</a>' : '<span class="muted">—</span>' },
        { label: 'Tag', r: k => k.tag ? k.tag.split(',').map(t => '<span class="bdg nodot">' + esc(t) + '</span>').join(' ') : '' }, { label: 'Terakhir dihubungi', r: k => '<span class="small">' + (k.terakhir ? F.rel(k.terakhir) : '—') + '</span>' }, { label: 'Pesan', n: 1, r: k => F.num(k.jumlah, 0) + (k.optOut ? ' <span class="bdg bad nodot">opt-out</span>' : '') }],
      kartu: k => '<input type="checkbox" data-cid="' + k.id + '" ' + (this.pilih.has(k.id) ? 'checked' : '') + '><div class="grow" data-act="crm.detail" data-id="' + k.id + '"><div class="row between"><b>' + esc(k.nama) + '</b><span class="bdg navy nodot">' + esc(k.segmen) + '</span></div><div class="small muted">' + esc([k.wa, k.email].filter(Boolean).join(' · ') || 'tanpa kontak') + '</div></div>',
      kosong: UI.empty('users', 'Belum ada kontak', 'Klik Sinkron untuk menarik data pengguna & supplier.') }) + UI.pager(d.total, d.halaman, d.per, 'crm.hal');
    box.onchange = e => { const id = e.target.dataset.cid; if (!id) return; if (e.target.checked) this.pilih.add(id); else this.pilih.delete(id); this.bulk(); };
    this.bulk();
  },
  bulk() {
    const n = this.pilih.size, box = $('#crm-bulk'); if (!box) return;
    box.innerHTML = n ? '<div class="row wrap" style="padding:10px 16px;background:var(--teal-50);border-bottom:1px solid var(--line)"><b>' + n + ' dipilih</b><button class="btn sm" data-act="crm.b" data-a="deteksiWA">' + icon('phone', 'sm') + 'Deteksi WA</button><button class="btn sm" data-act="crm.b" data-a="tag">' + icon('tag', 'sm') + 'Beri Tag</button><button class="btn sm" data-act="crm.b" data-a="blast">' + icon('send', 'sm') + 'Blast ke Terpilih</button><button class="btn sm" data-act="crm.b" data-a="optout">' + icon('no', 'sm') + 'Opt-out</button><button class="btn sm" data-act="crm.b" data-a="optin">Opt-in</button><button class="btn sm ghost ml-auto" data-act="crm.b" data-a="batal">Batal pilih</button></div>' : '';
  }
});
ACT['crm.hal'] = el => { Pages.crm.f.halaman = +el.dataset.p; Pages.crm.muat(); };
ACT['crm.seg'] = el => { const p = Pages.crm; p.f.segmen = el.dataset.s; p.f.halaman = 1; $$('#crm-seg .chip').forEach(c => c.classList.toggle('on', c === el)); p.muat(); };
ACT['crm.kpi'] = el => { const p = Pages.crm; p.f = Object.assign({ halaman: 1, segmen: p.f.segmen }, JSON.parse(el.dataset.f)); p.muat(); };
ACT['crm.sync'] = async el => { UI.busy(el, true); const r = await API.call('crm.sync', {}); UI.busy(el, false); UI.toast(r.message, r.success ? 'ok' : 'err'); SWR.basi('crm'); Pages.crm.kpi(); Pages.crm.muat(); };
ACT['crm.b'] = async el => {
  const p = Pages.crm, ids = [...p.pilih], a = el.dataset.a;
  if (a === 'batal') { p.pilih.clear(); p.isi(p.d); return; }
  if (a === 'blast') { Blast.idsPilih = ids; Router.go('#/notif/blast'); setTimeout(() => { const b = $('[data-act="bl.muat"]'); if (b) Blast.muat(b); }, 400); return; }
  if (a === 'deteksiWA') { const nomor = p.d.rows.filter(k => p.pilih.has(k.id) && k.wa).map(k => k.wa); UI.busy(el, true); const r = await API.call('wa.validate', { nomor: nomor.slice(0, 50) }); UI.busy(el, false); UI.toast(r.success ? r.message : r.message, r.success ? 'ok' : 'err'); SWR.basi('crm'); p.muat(); return; }
  let nilai = ''; if (a === 'tag') { nilai = await UI.prompt({ title: 'Beri tag', label: 'Nama tag', required: true, ok: 'Terapkan' }); if (!nilai) return; }
  const r = await API.call('crm.bulk', { ids, aksi: a, nilai }); UI.toast(r.message, r.success ? 'ok' : 'err'); p.pilih.clear(); SWR.basi('crm'); p.kpi(); p.muat();
};
ACT['crm.detail'] = async el => {
  const h = UI.drawer({ title: 'Detail Kontak', body: UI.sk(5) });
  const r = await API.q('crm.detail', { kontakId: el.dataset.id }); if (!h.el.isConnected) return;
  if (!r.success) { h.body.innerHTML = UI.empty('alert', 'Gagal', esc(r.message)); return; }
  const k = r.data.kontak, manual = k.sumber === 'manual';
  h.body.innerHTML = '<div class="row">' + UI.avatar(k.nama) + '<div><div class="bb" style="font-size:17px">' + esc(k.nama) + '</div><div class="small muted">' + esc(k.segmen) + ' · sumber ' + esc(k.sumber) + (k.info && k.info.role ? ' · ' + esc(ROLE_LABEL[k.info.role] || k.info.role) : '') + '</div></div></div>' +
    '<div class="row wrap mt">' + (k.wa ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(k.wa.replace(/^0/, '62')) + '">' + icon('wa', 'sm') + 'WhatsApp</a>' : '') + (k.email ? '<a class="btn sm" href="mailto:' + esc(k.email) + '">' + icon('mail', 'sm') + 'Email</a>' : '') + '</div>' +
    '<form id="ck-f" class="form-g mt"><div class="fld"><label>Nama</label><input class="inp" name="nama" value="' + esc(k.nama) + '" ' + (manual ? '' : 'readonly') + '></div><div class="fld"><label>Segmen</label><input class="inp" name="segmen" value="' + esc(k.segmen) + '" ' + (manual ? '' : 'readonly') + '></div><div class="fld"><label>WhatsApp</label><input class="inp" name="wa" value="' + esc(k.wa) + '" ' + (manual ? '' : 'readonly') + '></div><div class="fld"><label>Email</label><input class="inp" name="email" value="' + esc(k.email) + '" ' + (manual ? '' : 'readonly') + '></div>' +
    '<div class="fld full"><label>Tag (pisah koma)</label><input class="inp" name="tag" value="' + esc(k.tag) + '"></div><div class="fld full"><label>Catatan</label><textarea class="inp" name="catatan">' + esc(k.catatan || '') + '</textarea></div><label class="chk"><input type="checkbox" name="optOut" ' + (k.optOut ? 'checked' : '') + '> Opt-out (tidak menerima blast)</label>' + (manual ? '' : '<div class="small muted full">Nama/email/WA diubah dari menu ' + (k.sumber === 'staf' ? 'Pengaturan → Pengguna' : 'Master Data → Supplier') + '.</div>') + '<button class="btn pri full" type="submit">' + icon('check') + 'Simpan</button></form>' +
    '<h4 class="mt">Catat interaksi</h4><div class="row gap-s"><select class="inp sm" id="ck-kanal" style="width:auto"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Email</option><option>Catatan</option></select><input class="inp sm" id="ck-ring" placeholder="Ringkasan…"><button class="btn sm" id="ck-int">Catat</button></div>' +
    '<h4 class="mt">Linimasa</h4><div class="vtl">' + (r.data.timeline.map(t => '<div class="it ' + (t.kanal === 'WA' ? 'wa' : t.kanal === 'EMAIL' ? 'em' : '') + '"><div class="row small"><b>' + esc(t.kanal) + '</b>' + (t.status ? UI.bdg(t.status) : '') + '<span class="muted ml-auto">' + F.tglJam(t.waktu) + '</span></div><div class="small">' + esc(t.ringkasan) + '</div>' + (t.oleh ? '<div class="tiny muted">' + esc(t.oleh) + '</div>' : '') + '</div>').join('') || '<div class="small muted">Belum ada interaksi.</div>') + '</div>';
  h.body.querySelector('#ck-f').onsubmit = async e => { e.preventDefault(); const f = e.target, d = { id: k.id }; new FormData(f).forEach((v, x) => d[x] = v); d.optOut = f.optOut.checked; const r2 = await API.call('crm.save', { kontak: d }); UI.toast(r2.message, r2.success ? 'ok' : 'err'); if (r2.success) { SWR.basi('crm'); Pages.crm.muat(); } };
  h.body.querySelector('#ck-int').onclick = async () => { const ring = h.body.querySelector('#ck-ring').value.trim(); if (!ring) return; const r2 = await API.call('crm.interaksi', { kontakId: k.id, kanal: h.body.querySelector('#ck-kanal').value, ringkasan: ring }); UI.toast(r2.message, r2.success ? 'ok' : 'err'); if (r2.success) { h.tutup(); SWR.basi('crm'); ACT['crm.detail'](el); } };
};
ACT['crm.baru'] = () => UI.modal({ title: 'Tambah Kontak', body: '<form id="cb-f" class="form-g"><div class="fld"><label>Nama *</label><input class="inp" name="nama" autofocus></div><div class="fld"><label>Segmen</label><input class="inp" name="segmen" value="Pelanggan"></div><div class="fld"><label>WhatsApp</label><input class="inp" name="wa" inputmode="tel"></div><div class="fld"><label>Email</label><input class="inp" name="email" type="email"></div><div class="fld full"><label>Tag</label><input class="inp" name="tag"></div></form>', foot: '<button class="btn pri" id="cb-ok">Simpan</button>', onOpen: h => { h.el.querySelector('#cb-ok').onclick = async () => { const d = {}; new FormData(h.el.querySelector('#cb-f')).forEach((v, k) => d[k] = v); const r = await API.call('crm.save', { kontak: d }); UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { h.tutup(); SWR.basi('crm'); Pages.crm.kpi(); Pages.crm.muat(); } }; } });
ACT['crm.import'] = () => UI.modal({ title: 'Impor Kontak dari CSV / Excel', body: '<div class="small muted mb">Kolom: <span class="mono">nama, wa, email, segmen, tag</span>. Nomor 62/+62 otomatis diubah ke 08…; ganda dilewati.</div><button class="btn sm mb" id="ci-tpl">' + icon('download', 'sm') + 'Unduh template CSV</button><div class="drop" id="ci-drop">' + icon('upload', 'lg') + '<div class="mt-s">Klik atau seret berkas .csv / .xlsx</div></div><div id="ci-res" class="mt"></div>', foot: '<button class="btn pri" id="ci-ok" disabled>Impor</button>',
  onOpen: h => {
    let rows = [];
    h.el.querySelector('#ci-tpl').onclick = () => Ekspor.csvTemplate('template-kontak.csv', ['nama', 'wa', 'email', 'segmen', 'tag'], [['Toko Barokah Jaya', '081234567890', 'toko@contoh.id', 'Pelanggan', 'grosir']]);
    const baca = async f => { await Lib.load('xlsx'); const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }); const r = await API.call('crm.import', { rows, dryRun: true }); h.el.querySelector('#ci-res').innerHTML = r.success ? '<div class="note">' + icon('info') + '<div>' + rows.length + ' baris dibaca: <b>' + r.data.ditambah + '</b> akan ditambah, ' + r.data.ganda + ' ganda, ' + r.data.dilewati + ' tidak valid.</div></div>' : esc(r.message); h.el.querySelector('#ci-ok').disabled = !(r.success && r.data.ditambah); };
    const d = h.el.querySelector('#ci-drop'); d.onclick = async () => { const f = await Gambar.pilih('.csv,.xlsx,.xls'); if (f) baca(f); };
    d.ondragover = e => { e.preventDefault(); d.classList.add('on'); }; d.ondragleave = () => d.classList.remove('on'); d.ondrop = e => { e.preventDefault(); d.classList.remove('on'); if (e.dataTransfer.files[0]) baca(e.dataTransfer.files[0]); };
    h.el.querySelector('#ci-ok').onclick = async e => { UI.busy(e.target, true); const r = await API.call('crm.import', { rows }); UI.busy(e.target, false); UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { h.tutup(); SWR.basi('crm'); Pages.crm.kpi(); Pages.crm.muat(); } };
  } });
ACT['crm.dup'] = async () => {
  const s = Pages.crm.stat || (await API.q('crm.stats', {})).data; const g = (s && s.grupDuplikat) || [];
  UI.modal({ title: 'Kontak Duplikat', desc: 'Kontak dengan nomor WA atau email yang sama. Gabungkan agar tidak menerima pesan ganda.', size: 'lg', body: g.length ? g.map((x, i) => '<div class="card ps mb"><div class="row between"><b>' + x.jenis + ': <span class="mono">' + esc(x.kunci) + '</span></b><button class="btn sm pri" data-gi="' + i + '">' + icon('merge', 'sm') + 'Gabungkan</button></div><div class="small muted mt-s">' + x.ids.length + ' kontak: ' + x.ids.join(', ') + '</div></div>').join('') : UI.empty('ok', 'Tidak ada duplikat'),
    onOpen: h => h.body.onclick = async e => { const b = e.target.closest('[data-gi]'); if (!b) return; const x = g[+b.dataset.gi]; const r = await API.call('crm.merge', { utama: x.ids[0], gabung: x.ids.slice(1) }); UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { b.disabled = true; SWR.basi('crm'); Pages.crm.kpi(); Pages.crm.muat(); } } });
};
ACT['crm.ekspor'] = async el => { UI.busy(el, true); const r = await API.call('crm.export', { segmen: Pages.crm.f.segmen || '' }); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); const kol = Object.keys(r.data.rows[0] || { Nama: '' }).map(k => ({ k, label: k })); Ekspor.excel('Kontak CRM', kol, r.data.rows, 'Ekspor ' + F.tglP(today())).catch(UI.err); };
