/* GudangPro OS — charts.js : grafik SVG ringan tanpa pustaka (instan, mengikuti tema). */
const Chart = {
  C: { teal: '#0E9AA7', navy: '#0B2545', navy2: '#12365F', coral: '#FF6B4A', ok: '#10B981', warn: '#F59E0B', grid: 'var(--line)', muted: 'var(--muted)', blue: '#2F6BD8' },
  nice(max) { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; },
  /** Batang berkelompok. o = {labels, series:[{name,color,data}], h, fmt, sorot} */
  bar(o) {
    const W = 520, H = o.h || 200, pl = 42, pb = 26, pt = 10, pr = 6, iw = W - pl - pr, ih = H - pt - pb;
    const max = Chart.nice(Math.max(1, ...o.series.flatMap(s => s.data)));
    const n = o.labels.length, gw = iw / n, k = o.series.length, bw = Math.min(16, (gw * 0.62) / k);
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-dasharray="' + (i ? '3 4' : '') + '"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + (o.fmt || Chart.kecil)(max * i / 4) + '</text>'; }
    o.labels.forEach((lb, i) => {
      const x0 = pl + gw * i + (gw - bw * k - 4 * (k - 1)) / 2;
      o.series.forEach((s, j) => { const v = s.data[i] || 0, h = Math.max(v > 0 ? 2 : 0, ih * v / max), x = x0 + j * (bw + 4), y = pt + ih - h;
        g += '<path d="M' + x + ' ' + (y + Math.min(4, h)) + 'q0 -' + Math.min(4, h) + ' ' + Math.min(4, bw / 2) + ' -' + Math.min(4, h) + 'h' + (bw - 2 * Math.min(4, bw / 2)) + 'q' + Math.min(4, bw / 2) + ' 0 ' + Math.min(4, bw / 2) + ' ' + Math.min(4, h) + 'v' + (h - Math.min(4, h)) + 'h-' + bw + 'z" fill="' + s.color + '"><title>' + esc(s.name + ' ' + lb + ': ' + F.num(v)) + '</title></path>'; });
      g += '<text x="' + (pl + gw * i + gw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="' + (o.sorot === i ? 'var(--teal)' : 'var(--muted)') + '" font-weight="' + (o.sorot === i ? 700 : 500) + '">' + esc(lb) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g + '</svg>';
  },
  kecil(v) { v = Number(v) || 0; const a = Math.abs(v); return a >= 1e9 ? F.num(v / 1e9, 1) + 'M' : a >= 1e6 ? F.num(v / 1e6, 1) + 'jt' : a >= 1e3 ? F.num(v / 1e3, 1) + 'rb' : F.num(v, 0); },
  /** Donat. data:[{label,value,color}] */
  donut(o) {
    const S = o.size || 150, r = S / 2 - 12, c = 2 * Math.PI * r, tot = o.data.reduce((t, d) => t + d.value, 0) || 1;
    let off = 0, seg = '';
    o.data.forEach(d => { const len = c * d.value / tot; if (len > 0) seg += '<circle r="' + r + '" cx="' + S / 2 + '" cy="' + S / 2 + '" fill="none" stroke="' + d.color + '" stroke-width="18" stroke-dasharray="' + Math.max(0, len - 2) + ' ' + (c - Math.max(0, len - 2)) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + S / 2 + ' ' + S / 2 + ')"><title>' + esc(d.label + ': ' + F.num(d.value, 0)) + '</title></circle>'; off += len; });
    return '<svg viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '"><circle r="' + r + '" cx="' + S / 2 + '" cy="' + S / 2 + '" fill="none" stroke="var(--line-2)" stroke-width="18"/>' + seg +
      '<text x="50%" y="48%" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text)">' + esc(o.v) + '</text><text x="50%" y="62%" text-anchor="middle" font-size="10.5" fill="var(--muted)">' + esc(o.l || '') + '</text></svg>';
  },
  /** Gauge setengah lingkaran. */
  gauge(o) {
    const W = 220, H = 128, r = 90, cx = W / 2, cy = 112, v = Math.max(0, Math.min(100, o.value == null ? 0 : o.value));
    const pt = a => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
    const [x1, y1] = pt(0), [x2, y2] = pt(1), [xv, yv] = pt(v / 100), [xt, yt] = pt((o.target || 0) / 100);
    const warna = o.value == null ? 'var(--line)' : v >= (o.target || 0) ? Chart.C.teal : Chart.C.coral;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" style="max-width:260px;margin:auto"><path d="M' + x1 + ' ' + y1 + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + y2 + '" fill="none" stroke="var(--line-2)" stroke-width="16" stroke-linecap="round"/>' +
      (o.value == null ? '' : '<path d="M' + x1 + ' ' + y1 + ' A' + r + ' ' + r + ' 0 0 1 ' + xv + ' ' + yv + '" fill="none" stroke="' + warna + '" stroke-width="16" stroke-linecap="round"/>') +
      (o.target ? '<circle cx="' + xt + '" cy="' + yt + '" r="4" fill="var(--navy)"/>' : '') +
      '<text x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="30" font-weight="800" fill="var(--text)">' + (o.value == null ? '—' : F.num(o.value, 1) + '%') + '</text><text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + esc(o.label || '') + '</text></svg>';
  },
  /** Cincin progres kecil untuk kartu KPI. */
  ring(p, size, warna) {
    const S = size || 46, r = S / 2 - 4, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p || 0));
    return '<svg width="' + S + '" height="' + S + '"><circle r="' + r + '" cx="' + S / 2 + '" cy="' + S / 2 + '" fill="none" stroke="var(--line-2)" stroke-width="4"/><circle r="' + r + '" cx="' + S / 2 + '" cy="' + S / 2 + '" fill="none" stroke="' + (warna || Chart.C.teal) + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (c * v / 100) + ' ' + c + '" transform="rotate(-90 ' + S / 2 + ' ' + S / 2 + ')"/><path d="M' + (S / 2 - 5) + ' ' + (S / 2) + 'l3.5 3.5 6.5 -7" fill="none" stroke="' + (warna || Chart.C.teal) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  },
  /** Area/garis dengan titik sorot. o = {labels, data, warna, h, fmt, sorot, garis} */
  area(o) {
    const W = 520, H = o.h || 170, pl = 8, pr = 8, pt = 26, pb = 24, iw = W - pl - pr, ih = H - pt - pb, n = o.data.length;
    if (!n) return '<div class="empty small">Belum ada data.</div>';
    const max = Math.max(1, ...o.data) * 1.12, min = Math.min(...o.data, 0);
    const x = i => pl + (n === 1 ? iw / 2 : iw * i / (n - 1)), y = v => pt + ih - ih * (v - min) / ((max - min) || 1);
    let d = ''; o.data.forEach((v, i) => { d += (i ? ' L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
    const w = o.warna || Chart.C.teal, id = 'g' + Math.random().toString(36).slice(2, 7);
    const s = o.sorot == null ? o.data.indexOf(Math.max(...o.data)) : o.sorot;
    const avg = o.data.reduce((a, b) => a + b, 0) / n;
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '"><defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + w + '" stop-opacity=".28"/><stop offset="1" stop-color="' + w + '" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(avg) + '" y2="' + y(avg) + '" stroke="var(--muted)" stroke-dasharray="4 5" opacity=".6"/>' +
      '<path d="' + d + ' L' + x(n - 1) + ' ' + (pt + ih) + ' L' + x(0) + ' ' + (pt + ih) + 'Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + w + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      o.data.map((v, i) => '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === s ? 5 : 3) + '" fill="' + (i === s ? 'var(--card)' : w) + '" stroke="' + w + '" stroke-width="2"><title>' + esc(o.labels[i] + ': ' + (o.fmt || F.num)(v)) + '</title></circle>').join('') +
      (s >= 0 && o.sorotLabel ? '<g transform="translate(' + Math.min(W - 120, Math.max(4, x(s) - 58)) + ',' + Math.max(0, y(o.data[s]) - 26) + ')"><rect width="116" height="19" rx="6" fill="var(--navy)"/><text x="58" y="13" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">' + esc(o.sorotLabel) + '</text></g>' : '') +
      o.labels.map((l, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) ? '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" font-size="10" fill="var(--muted)">' + esc(l) + '</text>' : '').join('') + '</svg>';
  }
};
