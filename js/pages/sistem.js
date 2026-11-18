/* GudangPro OS — Riwayat Aktivitas (FR-27), Pengaturan, Pengguna (FR-03), Keamanan, Sistem, Import & Migrasi, Profil */
Page('log', {
  title: 'Audit Log Aktivitas', roles: R_MAN,
  render(el) {
    this.el = el; this.f = { halaman: 1 };
    el.innerHTML = '<div class="ph"><div><h1>Audit Log Aktivitas</h1><div class="sub">Catatan append-only: siapa, kapan, aksi apa, dan nilai lama → baru. Tidak dapat diubah atau dihapus.</div></div><div class="acts"><button class="btn" data-act="lg.xls">' + icon('download') + 'Unduh Excel</button></div></div>' +
      '<div class="card p0"><div class="row wrap" style="padding:14px 16px;border-bottom:1px solid var(--line)"><select class="inp sm" style="width:auto" id="lg-u"><option value="">Semua pengguna</option>' + Object.keys(Store.users).map(e => '<option value="' + esc(e) + '">' + esc(Store.users[e].nama) + '</option>').join('') + '<option value="darurat">Akses Darurat</option><option value="system">Sistem</option></select><select class="inp sm" style="width:auto" id="lg-a"><option value="">Semua aksi</option></select><input class="inp sm" type="date" id="lg-d" style="width:auto"><input class="inp sm" type="date" id="lg-s" style="width:auto"><input class="inp sm grow" id="lg-q" placeholder="Cari id, nomor, nilai…" style="min-width:180px"></div><div id="lg-tbl">' + UI.sk(6) + '</div></div>';
    const ub = (id, k) => $(id).onchange = e => { this.f[k] = e.target.value; this.f.halaman = 1; this.muat(); };
    ub('#lg-u', 'user'); ub('#lg-a', 'aksi'); ub('#lg-d', 'dari'); ub('#lg-s', 'sampai');
    $('#lg-q').oninput = debounce(e => { this.f.q = e.target.value; this.f.halaman = 1; this.muat(); }, 350);
    this.muat();
  },
  muat() { SWR.get('log.list', this.f, { maxAge: 5000, onData: d => this.isi(d) }); },
  isi(d) {
    const box = $('#lg-tbl'); if (!box || !d) return; this.d = d;
    const sa = $('#lg-a'); if (sa && sa.options.length <= 1) sa.innerHTML = '<option value="">Semua aksi</option>' + Object.keys(d.aksi).sort().map(a => '<option>' + esc(a) + '</option>').join('');
    const fmtJ = s => { if (!s) return ''; try { const o = JSON.parse(s); return typeof o === 'object' ? Object.keys(o).map(k => '<span class="muted">' + esc(k) + ':</span> ' + esc(typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k])).join(' · ') : esc(s); } catch (e) { return esc(s); } };
    box.innerHTML = UI.tabel({ rows: d.rows, cols: [{ label: 'Waktu', r: l => '<span class="small">' + F.tglJam(l.waktu) + '</span>' }, { label: 'Pengguna', r: l => '<div class="small b">' + esc(l.nama) + '</div><div class="sub">' + esc(ROLE_LABEL[l.role] || l.role) + '</div>' },
      { label: 'Aksi', r: l => '<span class="bdg ' + (/GAGAL|VOID|TOLAK|DITOLAK|BATAL|TARIK|DARURAT/.test(l.aksi) ? 'bad' : /LOGIN|LOGOUT/.test(l.aksi) ? 'navy' : 'teal') + ' nodot">' + esc(l.aksi) + '</span><div class="sub">' + esc(l.entitas) + ' ' + esc(l.id_entitas) + '</div>' },
      { label: 'Perubahan (lama → baru)', r: l => '<div class="small" style="max-width:520px">' + (l.lama ? '<div class="t-bad">− ' + fmtJ(l.lama) + '</div>' : '') + (l.baru ? '<div class="t-ok">+ ' + fmtJ(l.baru) + '</div>' : '') + '</div>' }, { label: 'Perangkat', r: l => '<span class="tiny muted">' + esc(l.perangkat) + '</span>' }],
      kartu: l => '<div class="grow"><div class="row between"><span class="bdg teal nodot">' + esc(l.aksi) + '</span><span class="tiny muted">' + F.tglJam(l.waktu) + '</span></div><div class="small b mt-s">' + esc(l.nama) + '</div><div class="small">' + fmtJ(l.baru) + '</div></div>', kosong: UI.empty('history', 'Tidak ada log') }) + UI.pager(d.total, d.halaman, d.per, 'lg.hal');
  }
});
ACT['lg.hal'] = el => { Pages.log.f.halaman = +el.dataset.p; Pages.log.muat(); };
ACT['lg.xls'] = async el => { UI.busy(el, true); const r = await API.call('log.list', Object.assign({}, Pages.log.f, { halaman: 1, per: 500 })); UI.busy(el, false); if (!r.success) return UI.toast(r.message, 'err'); Ekspor.excel('Audit Log Aktivitas', [{ k: 'waktu', label: 'Waktu' }, { k: 'nama', label: 'Pengguna' }, { k: 'user', label: 'Email' }, { k: 'role', label: 'Peran' }, { k: 'aksi', label: 'Aksi' }, { k: 'entitas', label: 'Entitas' }, { k: 'id_entitas', label: 'ID' }, { k: 'lama', label: 'Nilai lama' }, { k: 'baru', label: 'Nilai baru' }, { k: 'perangkat', label: 'Perangkat' }], r.data.rows, '500 log terbaru sesuai filter').catch(UI.err); };

/* ---------------- PENGATURAN ---------------- */
const SET_GRUP = [
  ['Profil perusahaan', 'building', [['NAMA_PERUSAHAAN', 'Nama perusahaan'], ['NAMA_GUDANG', 'Nama gudang'], ['ALAMAT_PERUSAHAAN', 'Alamat', 'full'], ['KOTA', 'Kota (untuk tanggal surat)'], ['TELEPON_PERUSAHAAN', 'Telepon'], ['EMAIL_PERUSAHAAN', 'Email'], ['LOGO_URL', 'URL logo']]],
  ['Penomoran dokumen', 'file', [['PREFIX_IN', 'Prefix barang masuk'], ['PREFIX_OUT', 'Prefix barang keluar'], ['PREFIX_RETUR', 'Prefix retur'], ['PREFIX_MUTASI', 'Prefix mutasi'], ['PREFIX_ADJ', 'Prefix penyesuaian'], ['PREFIX_OPNAME', 'Prefix opname']]],
  ['Approval & opname', 'approval', [['APPROVAL_OUT_NILAI', 'Outbound di atas nilai (Rp) wajib approval', '', 'n'], ['APPROVAL_MUTASI_STAF', 'Mutasi oleh Staf wajib approval', '', 'yn'], ['OPNAME_AMBANG_NILAI', 'Selisih opname di atas (Rp) wajib alasan', '', 'n'], ['TARGET_AKURASI', 'Target akurasi stok (%)', '', 'n']]],
  ['Peringatan & analitik', 'bell', [['EXPIRED_H1', 'Peringatan kedaluwarsa tahap 1 (hari)', '', 'n'], ['EXPIRED_H2', 'Tahap 2 (hari)', '', 'n'], ['EXPIRED_H3', 'Tahap 3 (hari)', '', 'n'], ['MENIPIS_PERSEN', 'Menipis bila < minimum + (%)', '', 'n'], ['DEAD_STOCK_HARI', 'Dead stock bila tidak bergerak (hari)', '', 'n'], ['JAM_ALERT', 'Jam kirim ringkasan harian (0–23)', '', 'n']]],
  ['Sistem', 'settings', [['SESI_HARI', 'Masa berlaku login (hari)', '', 'n'], ['MAKS_LAMPIRAN_MB', 'Batas lampiran (MB)', '', 'n'], ['BACKUP_SIMPAN', 'Jumlah backup mingguan disimpan', '', 'n'], ['APP_URL', 'URL aplikasi (GitHub Pages)', 'full']]]
];
Page('pengaturan', {
  title: 'Pengaturan WMS', roles: ['SUPERADMIN', 'OWNER'],
  render(el, seg) {
    this.el = el; this.tab = seg[0] || 'umum';
    const tabs = [['umum', 'Umum', 'sliders'], ['pengguna', 'Pengguna', 'users']].concat(can('SUPERADMIN') ? [['keamanan', 'Keamanan & Login', 'lock'], ['sistem', 'Sistem & Performa', 'gauge']] : []);
    el.innerHTML = '<div class="ph"><div><h1>Pengaturan WMS</h1><div class="sub">' + (can('SUPERADMIN') ? 'Konfigurasi perusahaan, aturan approval, peringatan, pengguna, dan keamanan.' : 'Tampilan baca-saja untuk Owner. Perubahan dilakukan Super Admin.') + '</div></div></div>' +
      '<div class="tabs">' + tabs.map(t => '<button class="' + (t[0] === this.tab ? 'on' : '') + '" data-act="go" data-h="#/pengaturan/' + t[0] + '">' + icon(t[2], 'sm') + t[1] + '</button>').join('') + '</div><div id="st-isi"></div>';
    this['t_' + this.tab]($('#st-isi'));
  },
  t_umum(box) {
    const s = Store.set, ro = !can('SUPERADMIN');
    box.innerHTML = '<form id="st-f">' + SET_GRUP.map(g => '<div class="card mb"><div class="ch"><h3>' + icon(g[1], 'sm') + ' ' + g[0] + '</h3></div><div class="form-g g3">' + g[2].map(f => '<div class="fld ' + (f[2] || '') + '"><label>' + esc(f[1]) + '</label>' + (f[3] === 'yn' ? '<select class="inp" name="' + f[0] + '" ' + (ro ? 'disabled' : '') + '><option ' + (s[f[0]] === 'YA' ? 'selected' : '') + '>YA</option><option ' + (s[f[0]] === 'TIDAK' ? 'selected' : '') + '>TIDAK</option></select>' : '<input class="inp" name="' + f[0] + '" ' + (f[3] === 'n' ? 'type="number" step="any"' : '') + ' value="' + esc(s[f[0]] || '') + '" ' + (ro ? 'readonly' : '') + '>') + '</div>').join('') + '</div></div>').join('') + (ro ? '' : '<div class="row"><button class="btn pri lg" type="submit">' + icon('check') + 'Simpan Pengaturan</button></div>') + '</form>';
    $('#st-f').onsubmit = async e => {
      e.preventDefault(); const pairs = {}; new FormData(e.target).forEach((v, k) => { if (String(Store.set[k] || '') !== v) pairs[k] = v; });
      if (!Object.keys(pairs).length) return UI.toast('Tidak ada perubahan.', 'info');
      const b = e.target.querySelector('[type=submit]'); UI.busy(b, true); const r = await API.call('set.simpan', { pairs }); UI.busy(b, false);
      if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); App.setelahTulis('');
    };
  },
  async t_pengguna(box) {
    box.innerHTML = UI.sk(5);
    const r = await API.q('user.list', {}); if (!box.isConnected) return;
    if (!r.success) { box.innerHTML = UI.empty('alert', 'Gagal', esc(r.message)); return; }
    this.users = r.data;
    box.innerHTML = (can('SUPERADMIN') ? '<div class="row mb"><button class="btn pri" data-act="us.form">' + icon('useradd') + 'Tambah Pengguna</button><span class="small muted">Pengguna masuk dengan akun Google — tidak ada kata sandi yang disimpan.</span></div>' : '') +
      '<div class="card p0">' + UI.tabel({ rows: r.data, act: can('SUPERADMIN') ? 'us.form' : null, id: u => u.user_id, cols: [{ label: 'Nama', r: u => '<div class="row">' + UI.avatar(u.nama).replace('avatar"', 'avatar" style="width:34px;height:34px;font-size:12px"') + '<div><div class="b">' + esc(u.nama) + '</div><div class="sub">' + esc(u.jabatan || '') + '</div></div></div>' }, { label: 'Email Google', r: u => esc(u.email) },
        { label: 'Peran', r: u => '<span class="bdg ' + (u.role === 'SUPERADMIN' ? 'dark' : u.role === 'KEPALA' ? 'teal' : 'navy') + ' nodot">' + esc(ROLE_LABEL[u.role]) + '</span>' }, { label: 'WhatsApp', r: u => u.no_wa ? '<span class="mono small">' + esc(u.no_wa) + '</span>' : '—' }, { label: 'Login terakhir', r: u => '<span class="small">' + (u.last_login ? F.rel(u.last_login) : 'belum pernah') + '</span>' }, { label: 'Status', r: u => UI.bdg(u.status_aktif) }],
        kartu: u => '<div class="grow"><div class="row between"><b>' + esc(u.nama) + '</b>' + UI.bdg(u.status_aktif) + '</div><div class="small muted">' + esc(u.email) + ' · ' + esc(ROLE_LABEL[u.role]) + '</div></div>' }) + '</div>' +
      '<div class="card mt"><div class="ch"><h3>Matriks hak akses</h3></div><div class="small muted">Menu & tombol mengikuti peran; <b>setiap aksi juga diperiksa di server</b> (FR-02).</div><div class="tbl-wrap mt-s"><table class="tbl"><thead><tr><th>Fitur</th>' + Object.keys(ROLE_LABEL).map(r => '<th>' + ROLE_LABEL[r] + '</th>').join('') + '</tr></thead><tbody>' +
      [['Dashboard', '🔸', '✅', '🔸', '✅', '✅'], ['Valuasi & nilai', '❌', '✅', '❌', '✅', '✅'], ['Cek stok & lokasi', '👁', '✅', '👁', '👁', '✅'], ['Inbound / Outbound / Retur', '✅', '✅', '❌', '❌', '✅'], ['Mutasi', 'ajukan', 'setujui', '❌', '👁', '✅'], ['Stok opname', '✅', '✅', '❌', '👁', '✅'], ['Approval & penyesuaian', '❌', '✅', '❌', '✅', '✅'], ['Master data', '❌', '✅', '👁', '👁', '✅'], ['Hapus transaksi', '❌', 'void', '❌', '❌', 'void'], ['Log aktivitas', '❌', '👁', '❌', '👁', '✅'], ['Pengguna & pengaturan', '❌', '❌', '❌', '👁', '✅']].map(r => '<tr><td class="b">' + r[0] + '</td>' + r.slice(1).map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>';
  },
  async t_keamanan(box) {
    box.innerHTML = UI.sk(5);
    const r = await API.q('rahasia.status', {}); if (!box.isConnected) return;
    const s = r.success ? r.data : {}, cid = (s.GOOGLE_CLIENT_ID || {}).samar || '', origin = location.origin;
    box.innerHTML = '<div class="grid g2"><div class="card"><div class="ch"><h3>' + icon('key', 'sm') + ' Login Google (OAuth Client ID)</h3>' + UI.bdg(cid ? 'Aktif' : 'Belum', cid ? 'ok' : 'warn') + '</div>' +
      '<ol class="small" style="line-height:1.8;padding-left:18px;margin:0 0 12px"><li>Buka <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console → Credentials</a> (akun pemilik aplikasi).</li><li><b>Create credentials → OAuth client ID</b> → jenis <b>Web application</b>.</li><li>Pada <b>Authorized JavaScript origins</b> isi: <span class="mono b">' + esc(origin) + '</span> <button class="btn sm ghost" data-act="ks.salin" data-v="' + esc(origin) + '">' + icon('copy', 'sm') + '</button></li><li>Simpan, salin <b>Client ID</b> (berakhiran .apps.googleusercontent.com) ke kolom di bawah.</li></ol>' +
      '<div class="fld"><label>Google Client ID</label><input class="inp" id="ks-cid" value="' + esc(cid) + '" placeholder="1234-abc.apps.googleusercontent.com"></div><div class="row mt"><button class="btn pri" data-act="ks.cid">' + icon('check') + 'Simpan Client ID</button>' + (cid ? '<button class="btn ghost" data-act="ks.cidHapus">Hapus</button>' : '') + '</div><div class="small muted mt-s">Client ID bukan rahasia (dibutuhkan browser), tetapi disimpan di Script Properties agar bisa diganti tanpa mengubah kode.</div></div>' +
      '<div class="card"><div class="ch"><h3>' + icon('shieldx', 'sm') + ' Akses Darurat</h3>' + (s.darurat && s.darurat.terkunci ? UI.bdg('Terkunci', 'bad') : '') + '</div><div class="small muted mb">Dipakai Super Admin bila login Google bermasalah. Halaman: <span class="mono">' + esc(location.origin + location.pathname) + '#darurat</span> (tidak ditautkan di mana pun). 5× salah = terkunci 15 menit.</div>' +
      '<form id="ks-df" class="col"><div class="fld"><label>Nama pengguna</label><input class="inp" name="u" value="' + esc((s.darurat || {}).user || 'darurat') + '" autocomplete="off"></div><div class="fld"><label>Kata sandi baru (min. 12, huruf + angka)</label><input class="inp" type="password" name="p" autocomplete="new-password"></div><div class="fld"><label>Ulangi kata sandi</label><input class="inp" type="password" name="p2" autocomplete="new-password"></div><button class="btn danger" type="submit">' + icon('lock') + 'Rotasi Kredensial Darurat</button></form></div>' +
      '<div class="card"><div class="ch"><h3>' + icon('wa', 'sm') + ' Token WhatsApp (Fonnte)</h3>' + UI.bdg((s.FONNTE_TOKEN || {}).ada ? 'Aktif' : 'Belum', (s.FONNTE_TOKEN || {}).ada ? 'ok' : '') + '</div><div class="small">Tersimpan: <span class="mono">' + esc((s.FONNTE_TOKEN || {}).samar || '—') + '</span></div><a class="btn mt" href="#/notif/konfigurasi">' + icon('settings') + 'Kelola di Konfigurasi Notifikasi</a></div>' +
      '<div class="card"><div class="ch"><h3>' + icon('logout', 'sm') + ' Sesi</h3></div><div class="small muted mb">Token sesi berlaku ' + esc(Store.set.SESI_HARI || 3) + ' hari dan ditandatangani HMAC di server. Mengubah peran/menonaktifkan pengguna langsung mencabut aksesnya.</div><button class="btn" data-act="ks.semua">' + icon('shieldx') + 'Keluar dari semua perangkat saya</button></div></div>';
    $('#ks-df').onsubmit = async e => { e.preventDefault(); const f = e.target; if (f.p.value !== f.p2.value) return UI.toast('Kata sandi tidak sama.', 'warn'); if (!(await UI.confirm({ msg: 'Ganti kredensial darurat? Sesi darurat yang sedang aktif akan dicabut.', danger: true, ok: 'Ganti' }))) return; const b = f.querySelector('button'); UI.busy(b, true); const x = await API.call('keamanan.rotasiDarurat', { username: f.u.value, password: f.p.value }); UI.busy(b, false); f.p.value = f.p2.value = ''; UI.toast(x.message, x.success ? 'ok' : 'err'); if (x.success && Store.me.darurat) setTimeout(() => Auth.expired(), 1500); };
  },
  async t_sistem(box) {
    box.innerHTML = UI.sk(6);
    const r = await API.call('sistem.status', {}); if (!box.isConnected) return;
    if (!r.success) { box.innerHTML = UI.empty('alert', 'Gagal', esc(r.message)); return; }
    const s = r.data, perlu = ['prosesAntrianNotif', 'jobHarian', 'jobMalam', 'backupMingguan'];
    box.innerHTML = '<div class="grid g4"><div class="card ps"><div class="small muted">Versi backend</div><div class="bb" style="font-size:20px">v' + esc(s.versi) + '</div><div class="tiny muted">Frontend v' + APP_VER + ' · skema ' + s.skema + '</div></div><div class="card ps"><div class="small muted">Kuota email tersisa</div><div class="bb" style="font-size:20px">' + F.num(s.sisaKuotaEmail, 0) + '</div></div><div class="card ps"><div class="small muted">Script Properties</div><div class="bb" style="font-size:20px">' + s.propsKB + ' KB</div><div class="tiny muted">dari ±500 KB</div></div><div class="card ps"><div class="small muted">Cache hangat terakhir</div><div class="bb" style="font-size:15px">' + (s.warmLast ? F.rel(s.warmLast.at) : '—') + '</div><div class="tiny muted">' + esc(s.warmLast ? s.warmLast.scope : '') + '</div></div></div>' +
      '<div class="grid g2 mt"><div class="card"><div class="ch"><h3>Trigger otomatis</h3><button class="lk" data-act="sy.trigger">' + icon('refresh', 'sm') + 'Pasang ulang</button></div>' + perlu.map(t => '<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line-2)">' + (s.trigger.includes(t) ? '<span class="t-ok">' + icon('ok') + '</span>' : '<span class="t-bad">' + icon('alert') + '</span>') + '<span class="mono small grow">' + t + '</span><span class="small muted">' + { prosesAntrianNotif: 'tiap 1 menit · antrean & warmup', jobHarian: 'harian jam ' + (Store.set.JAM_ALERT || 7) + ' · alert', jobMalam: 'harian 01.00 · rekap', backupMingguan: 'Minggu 02.00 · backup' }[t] + '</span></div>').join('') + '<div class="small muted mt-s">Kuota trigger: ±90 menit/hari (Gmail) · ±6 jam (Workspace). Keep-warm: ' + esc(s.keepWarm) + '.</div></div>' +
      '<div class="card"><div class="ch"><h3>Data &amp; cadangan</h3></div><div class="row wrap"><a class="btn sm" target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '">' + icon('database', 'sm') + 'Buka Spreadsheet</a><a class="btn sm" target="_blank" rel="noopener" href="' + esc(s.folderUrl) + '">' + icon('archive', 'sm') + 'Folder Drive</a><button class="btn sm" data-act="sy.backup">' + icon('download', 'sm') + 'Backup sekarang</button><button class="btn sm" data-act="sy.rekap">' + icon('chart', 'sm') + 'Rekap ulang</button></div><div class="kv-list small mt"><span class="k">Backup terakhir</span><span>' + esc(s.backupTerakhir || '—') + '</span><span class="k">Rekap terakhir</span><span>' + esc(s.rekapTerakhir || '—') + '</span><span class="k">Antrean notifikasi</span><span>' + (s.antrean ? 'ada pesan menunggu' : 'kosong') + '</span></div>' +
      '<h4 class="mt">Jumlah baris per sheet</h4><div class="kv-list small">' + Object.keys(s.baris).map(k => '<span class="k mono">' + esc(k) + '</span><span class="num">' + F.num(s.baris[k], 0) + '</span>').join('') + '</div></div></div>' +
      '<div class="card mt"><div class="ch"><h3>Performa di perangkat ini</h3><button class="lk" data-act="sy.perf">Lihat di console</button></div><div class="small muted">Rata-rata waktu permintaan (total / kerja server) sejak aplikasi dibuka:</div><div class="kv-list small mt-s" id="sy-perf"></div></div>';
    const m = {}; Perf.log.forEach(x => { const a = m[x.aksi] = m[x.aksi] || { n: 0, t: 0, s: 0, c: 0 }; a.n++; a.t += x.total; a.s += x.server || 0; if (x.cache) a.c++; });
    $('#sy-perf').innerHTML = Object.keys(m).map(k => '<span class="k mono">' + esc(k) + '</span><span>' + m[k].n + '× · ' + Math.round(m[k].t / m[k].n) + ' ms total · ' + Math.round(m[k].s / m[k].n) + ' ms server · ' + m[k].c + ' dari cache</span>').join('') || '<span class="k">—</span><span>Belum ada data.</span>';
  }
});
ACT['us.form'] = el => {
  const u = el.dataset.id ? (Pages.pengaturan.users || []).find(x => x.user_id === el.dataset.id) : null;
  UI.modal({ title: u ? 'Ubah Pengguna' : 'Tambah Pengguna', body: '<form id="us-f" class="form-g"><div class="fld"><label>Nama lengkap *</label><input class="inp" name="nama" value="' + esc(u ? u.nama : '') + '" autofocus></div><div class="fld"><label>Email Google *</label><input class="inp" type="email" name="email" value="' + esc(u ? u.email : '') + '"></div><div class="fld"><label>Peran</label><select class="inp" name="role">' + Object.keys(ROLE_LABEL).map(r => '<option value="' + r + '" ' + (u && u.role === r ? 'selected' : !u && r === 'STAF' ? 'selected' : '') + '>' + ROLE_LABEL[r] + '</option>').join('') + '</select></div><div class="fld"><label>Jabatan</label><input class="inp" name="jabatan" value="' + esc(u ? u.jabatan : '') + '"></div><div class="fld"><label>WhatsApp (untuk notifikasi)</label><input class="inp" name="no_wa" inputmode="tel" value="' + esc(u ? u.no_wa : '') + '"></div><div class="fld"><label>Status</label><select class="inp" name="status_aktif"><option value="Y" ' + (!u || u.status_aktif === 'Y' ? 'selected' : '') + '>Aktif</option><option value="N" ' + (u && u.status_aktif === 'N' ? 'selected' : '') + '>Nonaktif</option></select></div></form>',
    foot: '<button class="btn pri" id="us-ok">' + icon('check') + 'Simpan</button>', onOpen: h => { h.el.querySelector('#us-ok').onclick = async e => { const d = { user_id: u ? u.user_id : '' }; new FormData(h.el.querySelector('#us-f')).forEach((v, k) => d[k] = v); UI.busy(e.target, true); const r = await API.call('user.simpan', d); UI.busy(e.target, false); if (!r.success) return UI.toast(r.message, 'err'); UI.toast(r.message); h.tutup(); App.setelahTulis(''); Router.jalan(); }; } });
};
ACT['ks.salin'] = el => { navigator.clipboard && navigator.clipboard.writeText(el.dataset.v); UI.toast('Disalin.', 'info'); };
ACT['ks.cid'] = async el => { UI.busy(el, true); const r = await API.call('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#ks-cid').value }); UI.busy(el, false); UI.toast(r.success ? 'Client ID tersimpan. Login Google aktif.' : r.message, r.success ? 'ok' : 'err'); };
ACT['ks.cidHapus'] = async () => { if (!(await UI.confirm({ msg: 'Hapus Client ID? Login Google akan nonaktif (hanya akses darurat).', danger: true, ok: 'Hapus' }))) return; const r = await API.call('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: '__HAPUS__' }); UI.toast(r.message, r.success ? 'ok' : 'err'); Router.jalan(); };
ACT['ks.semua'] = () => Auth.keluar(true);
ACT['sy.trigger'] = async el => { UI.busy(el, true); const r = await API.call('sistem.trigger', {}); UI.busy(el, false); UI.toast(r.message, r.success ? 'ok' : 'err'); Router.jalan(); };
ACT['sy.backup'] = async el => { UI.busy(el, true); const r = await API.call('sistem.backup', {}); UI.busy(el, false); UI.toast(r.message, r.success ? 'ok' : 'err'); Router.jalan(); };
ACT['sy.rekap'] = async el => { UI.busy(el, true); const r = await API.call('sistem.rekap', {}); UI.busy(el, false); UI.toast(r.success ? 'Rekap diperbarui: ' + r.data.hari + ' hari, ' + r.data.sku + ' SKU.' : r.message, r.success ? 'ok' : 'err'); SWR.basi('dash'); };
ACT['sy.perf'] = () => { Perf.summary(); UI.toast('Tekan F12 → Console untuk melihat tabel performa.', 'info'); };

/* ---------------- IMPORT & MIGRASI (skill gas-migrasi-database) ---------------- */
const IMPOR_JENIS = {
  barang: ['Master barang (SKU)', ['sku', 'nama_barang', 'kategori', 'satuan', 'barcode', 'harga_beli', 'harga_jual', 'stok_minimum', 'stok_maksimum', 'metode', 'pakai_batch', 'pakai_expired'], [['SKU-001', 'Contoh Barang 1', 'Makanan', 'dus', '8991234567890', 120000, 135000, 20, 200, 'FEFO', 'Y', 'Y']]],
  lokasi: ['Lokasi blok-rak-bin', ['kode_lokasi', 'blok', 'rak', 'bin', 'zona', 'kapasitas'], [['A-01-01', 'A', '01', '01', 'Zona A - Kering', 100]]],
  supplier: ['Supplier', ['nama', 'kontak', 'no_wa', 'email', 'alamat'], [['PT Contoh Pemasok', 'Budi', '081234567890', 'po@contoh.id', 'Jl. Contoh No. 1']]],
  saldo: ['Saldo awal stok', ['sku', 'kode_lokasi', 'qty', 'batch_no', 'tgl_expired', 'tgl_masuk', 'harga'], [['SKU-001', 'A-01-01', 50, 'B2611-01', '2027-06-30', '2026-11-01', 120000]]]
};
const MIGRASI_SHEET = ['Kategori', 'Satuan', 'Lokasi', 'Supplier', 'Barang', 'Users', 'Stok', 'Transaksi', 'Transaksi_Detail', 'Approval', 'Opname', 'Opname_Detail', 'DE_Pejabat', 'DE_Template', 'DE_Dokumen', 'CRM_Kontak', 'CRM_Interaksi', 'Log_Aktivitas'];
Page('import', {
  title: 'Import & Migrasi', roles: ['KEPALA', 'SUPERADMIN'],
  render(el, seg) {
    this.tab = seg[0] || 'impor'; if (this.tab === 'migrasi' && !can('SUPERADMIN')) this.tab = 'impor';
    el.innerHTML = '<div class="ph"><div><h1>Import &amp; Migrasi</h1><div class="sub">Impor data awal dari Excel/CSV (dengan pratinjau sebelum disimpan), atau pindahkan data dari spreadsheet GudangPro versi lama.</div></div></div><div class="tabs"><button class="' + (this.tab === 'impor' ? 'on' : '') + '" data-act="go" data-h="#/import/impor">' + icon('upload', 'sm') + 'Impor Excel/CSV</button>' + (can('SUPERADMIN') ? '<button class="' + (this.tab === 'migrasi' ? 'on' : '') + '" data-act="go" data-h="#/import/migrasi">' + icon('merge', 'sm') + 'Migrasi dari App Lama</button>' : '') + '</div><div id="im-isi"></div>';
    this['t_' + this.tab]($('#im-isi'));
  },
  t_impor(box) {
    const I = this; I.jenis = I.jenis || 'barang'; I.rows = null;
    box.innerHTML = '<div class="grid g-7-5"><div class="card"><div class="ch"><h3>1. Pilih jenis &amp; berkas</h3></div><div class="chips mb">' + Object.keys(IMPOR_JENIS).map(k => '<button class="chip ' + (k === I.jenis ? 'on' : '') + '" data-act="im.jenis" data-k="' + k + '">' + IMPOR_JENIS[k][0] + '</button>').join('') + '</div>' +
      '<div class="small muted mb">Kolom: <span class="mono">' + IMPOR_JENIS[I.jenis][1].join(', ') + '</span>. Nama kolom lain yang umum (mis. "Kode Barang", "Nama", "Harga", "Lokasi", "Jumlah", "Exp") dikenali otomatis. Tanggal boleh yyyy-mm-dd atau dd/mm/yyyy.</div>' +
      '<button class="btn sm mb" data-act="im.tpl">' + icon('download', 'sm') + 'Unduh template CSV</button><div class="drop" id="im-drop">' + icon('upload', 'xl') + '<div class="mt-s b">Klik atau seret berkas .xlsx / .csv</div><div class="small">Maks 2.000 baris per proses (berkas besar dipecah otomatis)</div></div>' +
      (I.jenis !== 'saldo' ? '<label class="chk mt"><input type="checkbox" id="im-timpa"> Perbarui data yang sudah ada (kode sama)</label>' : '<div class="note warn mt small">' + icon('info') + '<div>Saldo awal dicatat sebagai satu transaksi <b>ADJ SALDO_AWAL</b> sehingga muncul di kartu stok & audit log. Pastikan master barang & lokasi sudah diimpor.</div></div>') + '</div>' +
      '<div class="card"><div class="ch"><h3>2. Pratinjau &amp; jalankan</h3></div><div id="im-hasil">' + UI.empty('file', 'Belum ada berkas', 'Pilih berkas untuk melihat pratinjau.') + '</div></div></div><div class="card p0 mt hidden" id="im-prev"></div>';
    const d = $('#im-drop'), baca = async f => {
      try { await Lib.load('xlsx'); } catch (e) { return UI.err(e); }
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
      I.rows = rows; I.nama = f.name;
      const kol = Object.keys(rows[0] || {});
      $('#im-prev').classList.remove('hidden');
      $('#im-prev').innerHTML = '<div class="ch" style="padding:16px 18px 0"><h3>' + esc(f.name) + ' — ' + rows.length + ' baris</h3></div><div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>#</th>' + kol.map(k => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' + rows.slice(0, 20).map((r, i) => '<tr><td class="muted">' + (i + 2) + '</td>' + kol.map(k => '<td class="small">' + esc(r[k]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      I.jalan(true);
    };
    d.onclick = async () => { const f = await Gambar.pilih('.xlsx,.xls,.csv'); if (f) baca(f); };
    d.ondragover = e => { e.preventDefault(); d.classList.add('on'); }; d.ondragleave = () => d.classList.remove('on'); d.ondrop = e => { e.preventDefault(); d.classList.remove('on'); if (e.dataTransfer.files[0]) baca(e.dataTransfer.files[0]); };
  },
  async jalan(dry) {
    const I = this, box = $('#im-hasil'); if (!I.rows || !I.rows.length) return UI.toast('Berkas kosong.', 'warn');
    box.innerHTML = '<div class="row">' + icon('clock') + (dry ? 'Memeriksa ' : 'Mengimpor ') + I.rows.length + ' baris…</div><div class="progress mt-s"><i id="im-pg" style="width:5%"></i></div>';
    const tot = { ditambah: 0, diperbarui: 0, dilewati: 0, error: [], catatan: [] }, timpa = $('#im-timpa') && $('#im-timpa').checked;
    for (let i = 0; i < I.rows.length; i += 2000) {
      const r = await API.call('import.data', { jenis: I.jenis, rows: I.rows.slice(i, i + 2000), dryRun: dry, timpa });
      if (!r.success) { box.innerHTML = '<div class="note bad">' + icon('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
      ['ditambah', 'diperbarui', 'dilewati'].forEach(k => tot[k] += r.data[k]); tot.error = tot.error.concat(r.data.error.map(e => Object.assign(e, { baris: e.baris + i }))); tot.catatan = tot.catatan.concat(r.data.catatan);
      const pg = $('#im-pg'); if (pg) pg.style.width = Math.min(100, (i + 2000) / I.rows.length * 100) + '%';
    }
    box.innerHTML = '<div class="row wrap"><span class="stat-pill"><span class="l">' + (dry ? 'Akan ditambah' : 'Ditambah') + '</span><span class="v t-ok">' + tot.ditambah + '</span></span><span class="stat-pill"><span class="l">' + (dry ? 'Akan diperbarui' : 'Diperbarui') + '</span><span class="v">' + tot.diperbarui + '</span></span><span class="stat-pill"><span class="l">Dilewati</span><span class="v t-warn">' + tot.dilewati + '</span></span></div>' +
      (tot.catatan.length ? '<div class="note mt small">' + icon('info') + '<div>' + tot.catatan.slice(0, 8).map(esc).join('<br>') + '</div></div>' : '') +
      (tot.error.length ? '<div class="note bad mt small">' + icon('alert') + '<div><b>' + tot.error.length + ' baris bermasalah:</b><br>' + tot.error.slice(0, 15).map(e => 'Baris ' + e.baris + ': ' + esc(e.pesan)).join('<br>') + (tot.error.length > 15 ? '<br>…' : '') + '</div></div>' : '') +
      (dry ? '<button class="btn pri lg block mt" data-act="im.jalan" ' + (tot.ditambah + tot.diperbarui ? '' : 'disabled') + '>' + icon('check') + 'Jalankan Impor</button><div class="small muted mt-s">Pratinjau — belum ada data yang disimpan.</div>' : '<div class="note mt">' + icon('ok') + '<div><b>Impor selesai.</b> Data langsung tersedia di semua perangkat.</div></div>');
    if (!dry) App.setelahTulis('');
  },
  t_migrasi(box) {
    box.innerHTML = '<div class="grid g-7-5"><div class="card"><div class="ch"><h3>Migrasi dari spreadsheet GudangPro lama</h3></div><div class="note small mb">' + icon('lock') + '<div>Spreadsheet lama <b>hanya dibaca</b>. Data diupsert berdasarkan kunci (SKU, ID transaksi, email…), aman dijalankan berulang (delta sync) tanpa data dobel. Gunakan akun Google yang sama agar berkas Drive lama tetap terbaca.</div></div>' +
      '<div class="fld"><label>URL / ID spreadsheet lama</label><input class="inp" id="mg-src" placeholder="https://docs.google.com/spreadsheets/d/…/edit"></div><div class="lbl-f mt">Sheet yang dipindah</div><div class="chips mt-s" id="mg-sheets">' + MIGRASI_SHEET.map(s => '<button class="chip ' + (s !== 'Log_Aktivitas' ? 'on' : '') + '" data-s="' + s + '">' + s + '</button>').join('') + '</div><label class="chk mt"><input type="checkbox" id="mg-timpa"> Timpa data master yang sudah ada</label>' +
      '<div class="row mt"><button class="btn" data-act="mg.run" data-dry="1">' + icon('search') + 'Pindai (Dry-run)</button><button class="btn pri" data-act="mg.run">' + icon('merge') + 'Jalankan Migrasi</button></div></div>' +
      '<div class="card"><div class="ch"><h3>Checklist cutover</h3></div><ol class="small" style="line-height:1.9;padding-left:18px;margin:0"><li>Pindai → periksa jumlah per sheet.</li><li>Jalankan migrasi, cek stok, master, dan transaksi.</li><li>Uji dengan 1 akun Staf.</li><li>Tepat sebelum pindah: <b>jalankan migrasi sekali lagi</b> (delta).</li><li>Umumkan alamat baru; arsipkan deployment lama.</li></ol></div></div><div id="mg-hasil" class="mt"></div>';
    $('#mg-sheets').onclick = e => { const c = e.target.closest('.chip'); if (c) c.classList.toggle('on'); };
  }
});
ACT['im.jenis'] = el => { Pages.import.jenis = el.dataset.k; Pages.import.t_impor($('#im-isi')); };
ACT['im.tpl'] = () => { const j = IMPOR_JENIS[Pages.import.jenis]; Ekspor.csvTemplate('template-' + Pages.import.jenis + '.csv', j[1], j[2]); };
ACT['im.jalan'] = async el => { if (!(await UI.confirm({ msg: 'Jalankan impor ' + Pages.import.rows.length + ' baris sekarang?', ok: 'Impor' }))) return; UI.busy(el, true); await Pages.import.jalan(false); };
ACT['mg.run'] = async el => {
  const dry = !!el.dataset.dry, src = $('#mg-src').value.trim(); if (!src) return UI.toast('Tempel URL spreadsheet lama.', 'warn');
  if (!dry && !(await UI.confirm({ title: 'Jalankan migrasi?', msg: 'Data dari spreadsheet lama akan ditambahkan ke database ini. Aman diulang (tidak dobel).', ok: 'Jalankan' }))) return;
  UI.busy(el, true); const r = await API.call('migrasi.run', { source: src, dryRun: dry, timpa: $('#mg-timpa').checked, sheets: $$('#mg-sheets .chip.on').map(c => c.dataset.s) }, { timeout: 330000 }); UI.busy(el, false);
  const box = $('#mg-hasil'); if (!r.success) { box.innerHTML = '<div class="note bad">' + icon('alert') + '<div>' + esc(r.message) + '</div></div>'; return; }
  const d = r.data;
  box.innerHTML = '<div class="card p0"><div class="ch" style="padding:16px 18px 0"><h3>' + (d.dryRun ? 'Hasil pindai' : 'Hasil migrasi') + ' — ' + esc(d.source.name) + '</h3></div><table class="tbl"><thead><tr><th>Data</th><th class="n">Di app lama</th><th class="n">Ditambah</th><th class="n">Diperbarui</th><th class="n">Dilewati</th></tr></thead><tbody>' + Object.keys(d.report).map(k => '<tr><td class="b">' + esc(k) + '</td><td class="n">' + F.num(d.report[k].sumber, 0) + '</td><td class="n t-ok b">' + F.num(d.report[k].ditambah, 0) + '</td><td class="n">' + F.num(d.report[k].diperbarui, 0) + '</td><td class="n muted">' + F.num(d.report[k].dilewati, 0) + '</td></tr>').join('') + '</tbody></table>' + (d.warnings.length ? '<div class="note warn" style="margin:12px">' + icon('warn') + '<div class="small">' + d.warnings.map(esc).join('<br>') + '</div></div>' : '') + '</div>';
  if (!d.dryRun) { UI.toast('Migrasi selesai.'); App.setelahTulis(''); }
};

/* ---------------- PROFIL ---------------- */
Page('profil', {
  title: 'Profil Saya',
  render(el) {
    const me = Store.me;
    el.innerHTML = '<div class="ph"><div><h1>Profil Saya</h1><div class="sub">Akun, notifikasi WhatsApp, perangkat, dan tampilan.</div></div></div><div class="grid g2"><div class="card"><div class="row">' + UI.avatar(me.nama).replace('avatar"', 'avatar" style="width:56px;height:56px;font-size:20px"') + '<div><div class="bb" style="font-size:18px">' + esc(me.nama) + '</div><div class="small muted">' + esc(me.email) + '</div><span class="bdg teal nodot mt-s">' + esc(ROLE_LABEL[me.role]) + '</span></div></div>' +
      (me.darurat ? '<div class="note warn mt small">' + icon('warn') + '<div>Anda masuk dengan <b>akses darurat</b>. Segera atur login Google & rotasi sandi darurat di Pengaturan → Keamanan.</div></div>' : '<form id="pf-f" class="col mt"><div class="fld"><label>Nomor WhatsApp untuk notifikasi</label><input class="inp" name="no_wa" inputmode="tel" value="' + esc(me.no_wa || '') + '" placeholder="0812…"><div class="hint">Dipakai untuk alert approval, stok minimum, dan dokumen yang perlu ditandatangani.</div></div><button class="btn pri" type="submit">' + icon('check') + 'Simpan</button></form>') + '</div>' +
      '<div class="card"><div class="ch"><h3>Perangkat &amp; aplikasi</h3></div><div class="kv-list small"><span class="k">Versi</span><span>GudangPro OS v' + APP_VER + '</span><span class="k">Perangkat</span><span>' + esc(Device.label) + '</span><span class="k">Data lokal</span><span>' + F.num(Store.barang.length, 0) + ' SKU · ' + F.num(Store.stok.length, 0) + ' baris stok</span><span class="k">Koneksi</span><span>' + (API.online ? '<span class="t-ok">Online</span>' : '<span class="t-bad">Offline</span>') + '</span></div>' +
      '<div class="row wrap mt"><button class="btn pwa-install" data-act="pf.pasang">' + icon('phone') + 'Pasang di HP</button><button class="btn" data-act="pf.tema">' + icon('moon') + 'Ganti tema</button><a class="btn" href="#/dokumen/pin">' + icon('key') + 'PIN tanda tangan</a></div>' +
      '<div class="row wrap mt"><button class="btn" data-act="pf.keluar">' + icon('logout') + 'Keluar</button><button class="btn danger" data-act="ks.semua">' + icon('shieldx') + 'Keluar dari semua perangkat</button></div></div></div>';
    const f = $('#pf-f'); if (f) f.onsubmit = async e => { e.preventDefault(); const b = f.querySelector('button'); UI.busy(b, true); const r = await API.call('profil.simpan', { no_wa: f.no_wa.value }); UI.busy(b, false); if (!r.success) return UI.toast(r.message, 'err'); Store.me.no_wa = r.data.no_wa; Store.simpan(); UI.toast(r.message); };
  }
});
ACT['pf.pasang'] = () => PWA.pasang(); ACT['pf.tema'] = () => Tema.ganti(); ACT['pf.keluar'] = () => Auth.keluar(false);
