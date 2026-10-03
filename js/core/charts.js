/* =========================================================
   Lightweight SVG charts (no library). Colours come from CSS
   tokens so both themes work. Each chart has a text summary
   for screen readers.
   ========================================================= */
(function () {
  const esc = (s) => HUK.ui.esc(s);
  HUK.charts = {
    /** Line/area chart. series: [{ name, values, color }] */
    line({ labels, series, height = 220, max, suffix = '', label = 'Trend chart' }) {
      const W = 600, H = height, P = { t: 14, r: 12, b: 28, l: 36 };
      const all = series.flatMap((s) => s.values);
      const hi = max || Math.ceil(Math.max(...all) * 1.15 / 10) * 10, lo = 0;
      const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, labels.length - 1);
      const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo));
      let g = '';
      for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; g += '<line class="grid-line" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (P.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + suffix + '</text>'; }
      labels.forEach((l, i) => { g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
      series.forEach((s, si) => {
        const pts = s.values.map((v, i) => x(i) + ',' + y(v));
        if (si === 0) g += '<polygon points="' + P.l + ',' + y(lo) + ' ' + pts.join(' ') + ' ' + x(s.values.length - 1) + ',' + y(lo) + '" fill="' + s.color + '" opacity="0.08"/>';
        g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"' + (s.dashed ? ' stroke-dasharray="5 5"' : '') + '/>';
        s.values.forEach((v, i) => { g += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="var(--surface-solid)" stroke="' + s.color + '" stroke-width="2"><title>' + esc(s.name + ' ' + labels[i] + ': ' + v + suffix) + '</title></circle>'; });
      });
      const summary = series.map((s) => s.name + ': ' + labels.map((l, i) => l + ' ' + s.values[i] + suffix).join(', ')).join('. ');
      return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label + '. ' + summary) + '">' + g + '</svg>';
    },
    /** Vertical bars. data: [{ label, value }] */
    bars({ data, height = 200, color = 'var(--chart-1)', highlightLast = true, suffix = '', label = 'Bar chart' }) {
      const W = 600, H = height, P = { t: 14, r: 8, b: 28, l: 8 };
      const hi = Math.max(...data.map((d) => d.value)) * 1.12 || 1;
      const bw = (W - P.l - P.r) / data.length;
      let g = '';
      data.forEach((d, i) => {
        const h = (H - P.t - P.b) * d.value / hi, x = P.l + i * bw + bw * 0.2, y = H - P.b - h;
        const fill = highlightLast && i === data.length - 1 ? 'var(--chart-2)' : color;
        g += '<rect x="' + x + '" y="' + y + '" width="' + bw * 0.6 + '" height="' + h + '" rx="6" fill="' + fill + '"><title>' + esc(d.label + ': ' + d.value + suffix) + '</title></rect>';
        g += '<text x="' + (x + bw * 0.3) + '" y="' + (y - 6) + '" text-anchor="middle" style="font-weight:600;fill:var(--text-2)">' + d.value + suffix + '</text>';
        g += '<text x="' + (x + bw * 0.3) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.label) + '</text>';
      });
      return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label + ': ' + data.map((d) => d.label + ' ' + d.value + suffix).join(', ')) + '">' + g + '</svg>';
    },
    /** Donut with legend. segments: [{ label, value, color }] */
    donut({ segments, size = 160, centre = '', sub = '', label = 'Breakdown' }) {
      const total = segments.reduce((t, s) => t + s.value, 0) || 1, r = 60, c = 2 * Math.PI * r;
      let off = 0, arcs = '';
      segments.forEach((s) => { const len = c * s.value / total; arcs += '<circle r="' + r + '" cx="80" cy="80" fill="none" stroke="' + s.color + '" stroke-width="20" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 80 80)"><title>' + esc(s.label + ': ' + s.value) + '</title></circle>'; off += len; });
      const svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 160 160" role="img" aria-label="' + esc(label + ': ' + segments.map((s) => s.label + ' ' + s.value).join(', ')) + '"><circle r="' + r + '" cx="80" cy="80" fill="none" stroke="var(--surface-sunken)" stroke-width="20"/>' + arcs + '<text x="80" y="80" text-anchor="middle" style="font-size:24px;font-weight:800;fill:var(--text)">' + esc(centre) + '</text><text x="80" y="100" text-anchor="middle" style="font-size:11px;fill:var(--text-3)">' + esc(sub) + '</text></svg>';
      const legend = '<div class="legend" style="flex-direction:column;gap:8px">' + segments.map((s) => '<span><i style="background:' + s.color + '"></i>' + esc(s.label) + ' <strong style="color:var(--text)">' + s.value + '</strong></span>').join('') + '</div>';
      return '<div class="row-wrap" style="gap:24px;align-items:center">' + svg + legend + '</div>';
    },
    /** Horizontal bar rows. rows: [{ label, value, max, suffix }] */
    hbars(rows, { suffix = '' } = {}) {
      const hi = Math.max(...rows.map((r) => r.max || r.value)) || 1;
      return rows.map((r) => '<div class="bar-row"><span class="truncate">' + esc(r.label) + '</span><div class="bar" role="img" aria-label="' + esc(r.label + ' ' + r.value + suffix) + '"><span style="width:' + (100 * r.value / (r.max || hi)) + '%"></span></div><strong class="tnum t-right">' + r.value + suffix + '</strong></div>').join('');
    },
    palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)']
  };
})();
