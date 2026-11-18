/* GudangPro OS — Antrean Approval (FR-25): mutasi, void, penyesuaian opname, outbound di atas ambang */
const JENIS_APPR = { MUTASI: ['Mutasi antar lokasi', 'mutasi', 'navy'], OUT_BESAR: ['Barang keluar > ambang', 'out', 'warn'], VOID: ['Void transaksi', 'no', 'bad'], OPNAME: ['Penyesuaian opname', 'opname', 'teal'], ADJ: ['Penyesuaian stok', 'scale', 'teal'] };
Page('approval', {
  title: 'Approval', roles: R_APPR,
  render(el) {
    this.el = el; this.tab = this.tab || 'Menunggu';
    el.innerHTML = '<div class="ph"><div><h1>Approval</h1><div class="sub">Setujui atau tolak pengajuan. Setiap keputusan tercatat di audit log beserta alasannya.</div></div></div>' +
      '<div class="tabs" id="ap-tabs"><button data-t="Menunggu" class="' + (this.tab === 'Menunggu' ? 'on' : '') + '">Menunggu <span class="c" id="ap-n" hidden></span></button><button data-t="Semua" class="' + (this.tab === 'Semua' ? 'on' : '') + '">Riwayat</button></div><div id="ap-isi">' + UI.sk(3) + '</div>';
    $('#ap-tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; this.tab = b.dataset.t; $$('#ap-tabs button').forEach(x => x.classList.toggle('on', x === b)); this.muat(); };
    this.muat();
  },
  muat() { SWR.get('approval.list', this.tab === 'Menunggu' ? {} : { status: 'Semua' }, { maxAge: 8000, onData: d => this.isi(d) }); },
  isi(d) {
    const box = $('#ap-isi'); if (!box || !d) return; const harga = lihatHarga();
    if (this.tab === 'Menunggu') { const n = $('#ap-n'); n.hidden = !d.length; n.textContent = d.length; Store.badge.approval = d.length; App.badge(); }
    box.innerHTML = d.length ? '<div class="col" style="gap:14px">' + d.map(a => {
      const j = JENIS_APPR[a.jenis] || [a.jenis, 'approval', 'navy'];
      return '<div class="card"><div class="row top wrap"><div class="kpi" style="flex:1;min-width:240px"><div class="ib ' + (j[2] === 'bad' ? 'coral' : j[2] === 'warn' ? 'coral' : j[2] === 'teal' ? '' : 'navy') + '">' + icon(j[1], 'lg') + '</div><div class="grow" style="min-width:0"><div class="row gap-s wrap"><span class="bdg ' + j[2] + ' nodot">' + esc(j[0]) + '</span>' + UI.bdg(a.status) + '<span class="small muted">' + F.rel(a.waktu) + '</span></div><div class="bb mt-s" style="font-size:16px">' + esc(a.ringkasan) + '</div><div class="small muted">Diajukan oleh <b>' + esc(Store.nama(a.oleh)) + '</b> · ' + F.tglJam(a.waktu) + (harga && a.nilai ? ' · nilai <b>' + F.rp(a.nilai) + '</b>' : '') + '</div>' +
        (a.catatan ? '<div class="small mt-s">“' + esc(a.catatan) + '”</div>' : '') + (a.jenis === 'VOID' && a.alasan && a.status === 'Menunggu' ? '<div class="note bad mt-s" style="padding:8px 12px">' + icon('alert') + '<div class="small">Alasan void: <b>' + esc(a.alasan) + '</b></div></div>' : '') + '</div></div>' +
        (a.status === 'Menunggu' ? '<div class="col" style="min-width:220px"><button class="btn pri" data-act="ap.ok" data-id="' + a.id + '" data-j="' + a.jenis + '">' + icon('check') + 'Setujui</button><button class="btn" data-act="ap.no" data-id="' + a.id + '">' + icon('x') + 'Tolak</button>' + (a.trx ? '<a class="btn ghost sm" href="#/trx/' + a.trx.trx_id + '">Lihat dokumen ' + icon('right', 'sm') + '</a>' : a.opname ? '<a class="btn ghost sm" href="#/opname/' + a.opname.id + '">Lihat hasil hitung ' + icon('right', 'sm') + '</a>' : '') + '</div>'
          : '<div class="small muted" style="min-width:200px">' + (a.penyetuju ? 'Oleh <b>' + esc(Store.nama(a.penyetuju)) + '</b><br>' + F.tglJam(a.proses) : '') + (a.alasan ? '<br>“' + esc(a.alasan) + '”' : '') + '</div>') + '</div>' +
        (a.items.length ? '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Barang</th><th>Batch</th><th>Lokasi</th><th class="n">Qty</th><th>Keterangan</th></tr></thead><tbody>' + a.items.map(i => '<tr><td><div class="b">' + esc((Store.barangOf(i.sku) || {}).nama_barang || i.sku) + '</div><div class="sub mono">' + esc(i.sku) + '</div></td><td class="mono small">' + esc(i.batch) + '</td><td>' + (i.tujuan && i.asal && i.tujuan !== i.asal ? '<span class="tagk">' + esc(Store.lok(i.asal).kode) + '</span> → <span class="tagk">' + esc(Store.lok(i.tujuan).kode) + '</span>' : '<span class="tagk">' + esc(Store.lok(i.asal || i.tujuan).kode) + '</span>') + '</td><td class="n b">' + F.num(i.qty) + '</td><td class="small">' + esc(i.alasan || '') + '</td></tr>').join('') + '</tbody></table></div>' : '') +
        (a.opname ? '<div class="row wrap mt"><span class="stat-pill"><span class="l">Baris dihitung</span><span class="v">' + F.num(a.opname.total_item, 0) + '</span></span><span class="stat-pill"><span class="l">Baris selisih</span><span class="v t-warn">' + F.num(a.opname.item_selisih, 0) + '</span></span>' + (harga ? '<span class="stat-pill"><span class="l">Nilai selisih</span><span class="v ' + (a.opname.nilai_selisih < 0 ? 't-bad' : '') + '">' + F.rp(a.opname.nilai_selisih) + '</span></span>' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>' : UI.empty('ok', this.tab === 'Menunggu' ? 'Tidak ada antrean' : 'Belum ada riwayat', this.tab === 'Menunggu' ? 'Semua pengajuan sudah diproses.' : '');
  }
});
ACT['ap.ok'] = async el => {
  const proses = el.dataset.j === 'MUTASI' || el.dataset.j === 'OUT_BESAR';
  const pesan = { OPNAME: 'Stok akan disesuaikan sesuai hasil hitung fisik (transaksi ADJ dibuat otomatis).', VOID: 'Efek stok dokumen akan dibalik dan dokumen berstatus Void.', MUTASI: 'Setujui mutasi ini?', OUT_BESAR: 'Setujui barang keluar ini?' }[el.dataset.j] || 'Setujui pengajuan ini?';
  let langsung = true;
  const ok = await new Promise(res => UI.modal({ title: 'Setujui pengajuan', size: 'sm', body: '<div>' + esc(pesan) + '</div>' + (proses ? '<label class="chk mt"><input type="checkbox" id="ap-pr" checked> Proses stok sekarang (barang sudah/segera dipindah)</label><div class="small muted mt-s">Bila tidak dicentang, status menjadi <b>Disetujui</b> dan staf memproses setelah pekerjaan fisik selesai.</div>' : '') + '<div class="fld mt"><label>Catatan (opsional)</label><input class="inp" id="ap-cat"></div>',
    foot: '<button class="btn" data-n>Batal</button><button class="btn pri" data-y>' + icon('check') + 'Setujui</button>', onClose: v => res(v),
    onOpen: h => { h.el.querySelector('[data-n]').onclick = () => h.tutup(null); h.el.querySelector('[data-y]').onclick = () => { langsung = proses ? h.el.querySelector('#ap-pr').checked : true; h.tutup({ alasan: h.el.querySelector('#ap-cat').value }); }; } }));
  if (!ok) return;
  UI.busy(el, true);
  const r = await API.call('approval.proses', { approval_id: el.dataset.id, keputusan: 'SETUJU', proses: langsung, alasan: ok.alasan });
  UI.busy(el, false);
  if (!r.success) return UI.toast(r.message, 'err');
  UI.toast(r.message); App.setelahTulis('approval'); Pages.approval.muat();
};
ACT['ap.no'] = async el => {
  const a = await UI.prompt({ title: 'Tolak pengajuan', label: 'Alasan penolakan (dikirim ke pengaju)', required: true, min: 3, textarea: true, ok: 'Tolak', danger: true }); if (!a) return;
  UI.busy(el, true);
  const r = await API.call('approval.proses', { approval_id: el.dataset.id, keputusan: 'TOLAK', alasan: a });
  UI.busy(el, false);
  if (!r.success) return UI.toast(r.message, 'err');
  UI.toast(r.message, 'warn'); App.setelahTulis('approval'); Pages.approval.muat();
};
