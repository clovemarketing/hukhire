/* =========================================================
   HUK.ui: reusable components rendered as HTML strings plus
   small behaviour helpers (modal, drawer, toast, menus, forms,
   async states). Pages compose these; they never fetch data.
   ========================================================= */
(function () {
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    exam: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    userX: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 14-5.3"/><path d="m17 15 5 5M22 15l-5 5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    bar: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    shieldCheck: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    videoOff: '<path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m4 0h4a2 2 0 0 1 2 2v3.3l6-4.3v12"/><path d="M2 2l20 20"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
    micOff: '<path d="M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M19 10a7 7 0 0 1-1.1 3.8M5 10a7 7 0 0 0 11.3 5.5M12 17v5M2 2l20 20"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><path d="M12 19.5h.01"/>',
    wifiOff: '<path d="M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 4.2-2.8M10.7 5.1A15 15 0 0 1 22 9M5 12.5a10 10 0 0 1 5.2-2.8M2 2l20 20"/><path d="M12 19.5h.01"/>',
    monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
    idCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
    cloudCheck: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/><path d="m9.5 13 2 2 3.5-3.5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    building: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    spinner: '<path d="M21 12a9 9 0 1 1-6.2-8.6" />'
  };

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, size = 20, cls = '') => '<svg class="' + (name === 'spinner' ? 'spinner ' : '') + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.info) + '</svg>';

  /* ---------- Formatting ---------- */
  const locale = 'en-IN';
  const fmt = {
    date: (iso) => iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    dateShort: (iso) => iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—',
    time: (iso) => iso ? new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '—',
    dateTime: (iso) => iso ? new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—',
    weekday: (iso) => iso ? new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '—',
    rel(iso) {
      if (!iso) return '—';
      const d = (new Date(iso).getTime() - Date.now()) / 1000, a = Math.abs(d);
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      if (a < 45) return d < 0 ? 'just now' : 'in a moment';
      if (a < 3600) return rtf.format(Math.round(d / 60), 'minute');
      if (a < 86400) return rtf.format(Math.round(d / 3600), 'hour');
      if (a < 86400 * 30) return rtf.format(Math.round(d / 86400), 'day');
      return fmt.date(iso);
    },
    dur(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + ' min'; },
    clock(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; const p = (n) => String(n).padStart(2, '0'); return (h ? h + ':' + p(m) : p(m)) + ':' + p(s); },
    num: (n) => n == null ? '—' : Number(n).toLocaleString(locale),
    pct: (n) => n == null ? '—' : n + '%',
    title: (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  };

  /* ---------- Status chips (text + tone, never colour alone) ---------- */
  const STATUS = {
    draft: ['Draft', ''], scheduled: ['Scheduled', 'info'], live: ['Live', 'live'], completed: ['Completed', 'ok'], archived: ['Archived', ''],
    ready: ['Ready to start', 'live'], upcoming: ['Upcoming', 'info'], in_progress: ['In progress', 'warn'], missed: ['Missed', 'bad'], submitted: ['Submitted', 'ok'],
    pass: ['Passed', 'ok'], fail: ['Not passed', 'bad'], under_review: ['Under review', 'warn'], published: ['Published', 'ok'], withheld: ['Withheld', 'warn'],
    active: ['Active', 'ok'], deactivated: ['Deactivated', ''], pending: ['Pending', 'warn'], invited: ['Invite sent', 'info'], revoked: ['Revoked', 'bad'],
    online: ['Online', 'ok'], busy: ['Busy', 'warn'], away: ['Away', ''], offline: ['Offline', ''],
    idle: ['Idle', 'warn'], disconnected: ['Disconnected', 'bad'], not_started: ['Not started', ''],
    low: ['Low risk', 'ok'], medium: ['Medium risk', 'warn'], high: ['High risk', 'bad'],
    open: ['Open', 'bad'], reviewing: ['Reviewing', 'warn'], resolved: ['Resolved', 'ok'], escalated: ['Escalated', 'bad'], dismissed: ['Dismissed', ''],
    verified: ['ID verified', 'ok'], mismatch: ['ID mismatch', 'bad'],
    none: ['None', ''], easy: ['Easy', 'ok'], hard: ['Hard', 'bad'],
    ok: ['Ready', 'ok'], ready_dev: ['Ready', 'ok'], check: ['Needs check', 'warn'], failed: ['Failed', 'bad']
  };
  function chip(status, label, opts = {}) {
    const s = STATUS[status] || [fmt.title(status), ''];
    return '<span class="chip' + (opts.noDot ? ' no-dot' : '') + '" data-tone="' + (opts.tone || s[1]) + '">' + esc(label || s[0]) + '</span>';
  }
  const sevChip = (sev) => chip(sev, { low: 'Low', medium: 'Medium', high: 'High' }[sev] || sev);
  const diffChip = (d) => chip(d === 'medium' ? 'pending' : d, fmt.title(d), { tone: { easy: 'ok', medium: 'warn', hard: 'bad' }[d] });

  /* ---------- Avatar ---------- */
  const TINTS = [['#FFE4D1', '#9A3412'], ['#E0E7FF', '#3730A3'], ['#DCFCE7', '#166534'], ['#FCE7F3', '#9D174D'], ['#E0F2FE', '#075985'], ['#FEF9C3', '#854D0E'], ['#EDE9FE', '#5B21B6']];
  function avatar(name, cls = '') {
    const n = String(name || '?');
    const initials = n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [bg, fg] = TINTS[h % TINTS.length];
    return '<span class="avatar ' + cls + '" style="--av-bg:' + bg + ';--av-fg:' + fg + '" aria-hidden="true">' + esc(initials) + '</span>';
  }

  /* ---------- Layout pieces ---------- */
  function pageHeader({ title, subtitle = '', actions = '' }) {
    return '<header class="page-header"><div class="ph-text"><h1>' + esc(title) + '</h1>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</header>';
  }
  function metric({ label, value, icon: ic, foot = '', href }) {
    const inner = '<div class="metric-top"><span>' + esc(label) + '</span>' + (ic ? '<span class="metric-icon">' + icon(ic, 18) + '</span>' : '') + '</div><div class="metric-value">' + value + '</div>' + (foot ? '<div class="metric-foot">' + foot + '</div>' : '');
    return href ? '<a class="card metric" href="' + href + '">' + inner + '</a>' : '<div class="card metric">' + inner + '</div>';
  }
  function progress(value, { label = '', accent = false, showValue = false } = {}) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (label || showValue ? '<div class="progress-label"><span>' + esc(label) + '</span><span>' + v + '%</span></div>' : '') +
      '<div class="progress' + (accent ? ' accent' : '') + '" role="progressbar" aria-valuenow="' + v + '" aria-valuemin="0" aria-valuemax="100"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><span style="width:' + v + '%"></span></div>';
  }
  const signal = (level) => '<span class="sig" data-level="' + level + '" role="img" aria-label="Network ' + (['offline', 'poor', 'fair', 'good'][level] || 'unknown') + '"><i></i><i></i><i></i></span>';
  const btn = (label, { cls = '', icon: ic, href, attrs = '', type = 'button' } = {}) => {
    const inner = (ic ? icon(ic, 18) : '') + (label ? '<span>' + esc(label) + '</span>' : '');
    return href ? '<a class="btn ' + cls + '" href="' + href + '" ' + attrs + '>' + inner + '</a>' : '<button type="' + type + '" class="btn ' + cls + '" ' + attrs + '>' + inner + '</button>';
  };

  /* ---------- Async states ---------- */
  function skeleton(kind = 'list', n = 4) {
    if (kind === 'cards') return '<div class="grid g-auto" aria-hidden="true">' + Array.from({ length: n }, () => '<div class="skeleton sk-block"></div>').join('') + '</div>';
    if (kind === 'metrics') return '<div class="grid g-4" aria-hidden="true">' + Array.from({ length: n }, () => '<div class="skeleton" style="height:112px;border-radius:var(--r-lg)"></div>').join('') + '</div>';
    if (kind === 'page') return '<div class="stack-lg" aria-hidden="true"><div class="skeleton" style="height:36px;width:40%"></div>' + skeleton('metrics', 4) + '<div class="skeleton" style="height:280px;border-radius:var(--r-lg)"></div></div>';
    return '<div class="card" aria-hidden="true">' + Array.from({ length: n }, (_, i) => '<div class="skeleton sk-line" style="width:' + (92 - (i % 3) * 18) + '%"></div>').join('') + '</div>';
  }
  function empty({ title, text = '', action = '', art = false, iconName = 'search' }) {
    return '<div class="empty">' + (art ? '<img src="' + HUK.url('assets/doodles/doodle-scout.webp') + '" alt="">' : '<span class="empty-icon">' + icon(iconName, 26) + '</span>') + '<h3>' + esc(title) + '</h3>' + (text ? '<p>' + text + '</p>' : '') + (action ? '<div class="mt-1">' + action + '</div>' : '') + '</div>';
  }
  function errorState(message) {
    return '<div class="card"><div class="empty" role="alert"><span class="empty-icon">' + icon('wifiOff', 26) + '</span><h3>This section didn’t load</h3><p>' + esc(message || 'Something went wrong while loading data.') + '</p><div class="mt-1"><button type="button" class="btn btn-primary" data-retry>' + icon('refresh', 18) + '<span>Try again</span></button></div></div></div>';
  }
  /**
   * Standard loading → success/empty/error flow for any data region.
   * load(el, () => service.call(), (data) => html, { skeleton, isEmpty, empty, after })
   */
  async function load(el, fetcher, render, opts = {}) {
    el.setAttribute('aria-busy', 'true');
    el.innerHTML = skeleton(opts.skeleton || 'list', opts.n || 4);
    try {
      const data = await fetcher();
      el.removeAttribute('aria-busy');
      const isEmpty = opts.isEmpty ? opts.isEmpty(data) : (Array.isArray(data) && data.length === 0);
      el.innerHTML = isEmpty && opts.empty ? opts.empty : render(data);
      if (opts.after) opts.after(data, el);
      return data;
    } catch (e) {
      el.removeAttribute('aria-busy');
      el.innerHTML = errorState(e.message);
      const r = el.querySelector('[data-retry]');
      if (r) r.addEventListener('click', () => load(el, fetcher, render, opts));
      if (opts.onError) opts.onError(e);
      return null;
    }
  }

  /* ---------- Data table (becomes cards < 768px) ---------- */
  function table({ columns, rows, rowHref, caption, cards = true, id = '' }) {
    const head = '<thead><tr>' + columns.map((c) => '<th scope="col" class="' + (c.align === 'right' ? 't-right' : '') + '">' + (c.label ? esc(c.label) : '<span class="sr-only">Actions</span>') + '</th>').join('') + '</tr></thead>';
    const body = '<tbody>' + rows.map((r) => '<tr' + (rowHref ? ' data-href="' + rowHref(r) + '"' : '') + '>' + columns.map((c) => '<td data-label="' + esc(c.label || '') + '" class="' + (c.primary ? 'td-primary ' : '') + (c.actions ? 'td-actions ' : '') + (c.select ? 'td-select ' : '') + (c.align === 'right' ? 't-right' : '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    return '<div class="table-wrap"><table class="table' + (cards ? ' table-cards' : '') + '"' + (id ? ' id="' + id + '"' : '') + '>' + (caption ? '<caption class="sr-only">' + esc(caption) + '</caption>' : '') + head + body + '</table></div>';
  }
  /** Makes rows with data-href navigable by click (links inside still work). */
  function bindRowLinks(root) {
    root.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-href]');
      if (!tr || e.target.closest('a,button,input,select,label')) return;
      location.href = tr.dataset.href;
    });
  }
  function paginate(rows, page, size) {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const p = Math.min(Math.max(1, page), pages);
    return { rows: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length, from: rows.length ? (p - 1) * size + 1 : 0, to: Math.min(p * size, rows.length) };
  }
  function pager(pg) {
    return '<nav class="pager" aria-label="Pagination"><span>Showing ' + pg.from + '–' + pg.to + ' of ' + pg.total + '</span><div class="pager-btns"><button type="button" class="btn btn-sm" data-pg="' + (pg.page - 1) + '"' + (pg.page <= 1 ? ' disabled' : '') + '>' + icon('chevronLeft', 16) + '<span>Previous</span></button><button type="button" class="btn btn-sm" data-pg="' + (pg.page + 1) + '"' + (pg.page >= pg.pages ? ' disabled' : '') + '><span>Next</span>' + icon('chevronRight', 16) + '</button></div></nav>';
  }

  /* ---------- Live region ---------- */
  function announce(msg) {
    let r = document.getElementById('sr-live');
    if (!r) { r = document.createElement('div'); r.id = 'sr-live'; r.className = 'sr-only'; r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 60);
  }

  /* ---------- Toast ---------- */
  function toast(message, { tone = 'ok', title = '', timeout = 4200 } = {}) {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast'; t.dataset.tone = tone;
    t.innerHTML = icon({ ok: 'checkCircle', bad: 'alert', warn: 'alert', info: 'info' }[tone] || 'info', 20) + '<div class="grow">' + (title ? '<strong>' + esc(title) + '</strong><br>' : '') + esc(message) + '</div><button type="button" class="toast-close" aria-label="Dismiss notification">' + icon('x', 16) + '</button>';
    host.appendChild(t);
    const kill = () => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); };
    t.querySelector('.toast-close').addEventListener('click', kill);
    if (timeout) setTimeout(kill, timeout);
  }

  /* ---------- Modal (accessible dialog with focus trap) ---------- */
  let openCount = 0;
  function trapFocus(container, onEscape) {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const handler = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onEscape(); return; }
      if (e.key !== 'Tab') return;
      const f = [...container.querySelectorAll(sel)].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    container.addEventListener('keydown', handler);
  }
  /**
   * modal({ title, body, primary: {label, cls}, secondary, size, onPrimary(el) })
   * Resolves 'primary' | 'secondary' | null. If onPrimary returns false the dialog stays open.
   */
  function modal({ title, body, primary, secondary = { label: 'Cancel' }, size = '', onOpen, onPrimary, drawer = false, describedBy = true }) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'overlay' + (drawer ? ' drawer-overlay' : '');
      const id = 'dlg-' + Math.random().toString(36).slice(2, 8);
      ov.innerHTML = '<div class="' + (drawer ? 'drawer' : 'modal ' + size) + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t"' + (describedBy ? ' aria-describedby="' + id + '-b"' : '') + '>' +
        '<div class="modal-head"><h2 id="' + id + '-t">' + esc(title) + '</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">' + icon('x', 18) + '</button></div>' +
        '<div class="modal-body" id="' + id + '-b">' + body + '</div>' +
        (primary || secondary ? '<div class="modal-foot">' + (secondary ? '<button type="button" class="btn" data-secondary>' + esc(secondary.label) + '</button>' : '') + (primary ? '<button type="button" class="btn ' + (primary.cls || 'btn-primary') + '" data-primary>' + esc(primary.label) + '</button>' : '') + '</div>' : '') + '</div>';
      document.body.appendChild(ov);
      openCount++; document.body.style.overflow = 'hidden';
      const dlg = ov.firstElementChild;
      const close = (val) => { ov.remove(); if (--openCount <= 0) { openCount = 0; document.body.style.overflow = ''; } if (prev && prev.focus) prev.focus(); resolve(val); };
      trapFocus(dlg, () => close(null));
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(null); });
      dlg.querySelector('[data-close]').addEventListener('click', () => close(null));
      const sec = dlg.querySelector('[data-secondary]'); if (sec) sec.addEventListener('click', () => close('secondary'));
      const pri = dlg.querySelector('[data-primary]');
      if (pri) pri.addEventListener('click', async () => {
        if (!onPrimary) return close('primary');
        setLoading(pri, true);
        try { const keep = await onPrimary(dlg); if (keep !== false) close('primary'); }
        catch (e) { toast(e.message, { tone: 'bad' }); }
        finally { if (document.body.contains(pri)) setLoading(pri, false); }
      });
      if (onOpen) onOpen(dlg, close);
      const first = dlg.querySelector('input,select,textarea') || pri || dlg.querySelector('[data-close]');
      setTimeout(() => first && first.focus(), 30);
    });
  }
  const drawer = (opts) => modal({ ...opts, drawer: true });
  const confirm = ({ title, message, confirmLabel = 'Confirm', danger = false }) =>
    modal({ title, body: '<p>' + message + '</p>', primary: { label: confirmLabel, cls: danger ? 'btn-danger-solid' : 'btn-primary' } }).then((r) => r === 'primary');

  /* ---------- Buttons with loading state ---------- */
  function setLoading(button, on) {
    if (!button) return;
    if (on) { button.dataset.label = button.innerHTML; button.classList.add('is-loading'); button.setAttribute('aria-busy', 'true'); button.innerHTML = icon('spinner', 16) + '<span>' + esc(button.dataset.loadingText || button.textContent.trim()) + '</span>'; }
    else if (button.dataset.label) { button.innerHTML = button.dataset.label; button.classList.remove('is-loading'); button.removeAttribute('aria-busy'); }
  }
  async function withLoading(button, fn) { setLoading(button, true); try { return await fn(); } finally { setLoading(button, false); } }

  /* ---------- Forms ---------- */
  function field({ name, label, type = 'text', value = '', required = false, hint = '', placeholder = '', options = null, attrs = '', full = false, rows = 4 }) {
    const id = 'f-' + name;
    const req = required ? ' required' : '';
    const desc = ' aria-describedby="' + id + '-err' + (hint ? ' ' + id + '-hint' : '') + '"';
    let control;
    if (options) control = '<select class="select" id="' + id + '" name="' + name + '"' + req + desc + ' ' + attrs + '>' + options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
    else if (type === 'textarea') control = '<textarea class="textarea" id="' + id + '" name="' + name + '" rows="' + rows + '"' + req + desc + ' placeholder="' + esc(placeholder) + '" ' + attrs + '>' + esc(value) + '</textarea>';
    else control = '<input class="input" id="' + id + '" name="' + name + '" type="' + type + '" value="' + esc(value) + '"' + req + desc + ' placeholder="' + esc(placeholder) + '" ' + attrs + '>';
    return '<div class="field' + (full ? ' full' : '') + '"><label for="' + id + '">' + esc(label) + (required ? '<span class="req" aria-hidden="true">*</span>' : '') + '</label>' + control + (hint ? '<span class="field-hint" id="' + id + '-hint">' + hint + '</span>' : '') + '<span class="field-error" id="' + id + '-err" role="alert"></span></div>';
  }
  function switchRow({ name, label, hint = '', checked = false }) {
    return '<label class="switch"><span><span style="font-weight:600;display:block">' + esc(label) + '</span>' + (hint ? '<span class="subtle">' + esc(hint) + '</span>' : '') + '</span><input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '><span class="track" aria-hidden="true"></span></label>';
  }
  function setFieldError(input, message) {
    const err = input.form ? input.form.querySelector('#' + input.id + '-err') : document.getElementById(input.id + '-err');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) err.innerHTML = message ? icon('alert', 14) + '<span>' + esc(message) + '</span>' : '';
  }
  /** Validates native constraints + data-match="otherName" + data-min-length. Returns true if valid. */
  function validate(form) {
    let first = null;
    form.querySelectorAll('input,select,textarea').forEach((el) => {
      if (!el.id || el.type === 'hidden') return;
      let msg = '';
      const label = (form.querySelector('label[for="' + el.id + '"]') || {}).textContent || 'This field';
      const name = label.replace('*', '').trim();
      if (el.required && el.type === 'checkbox' && !el.checked) msg = 'Please confirm to continue.';
      else if (el.required && !String(el.value).trim()) msg = name + ' is required.';
      else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) msg = 'Enter an email address like name@company.com.';
      else if (el.dataset.minLength && el.value.length < Number(el.dataset.minLength)) msg = name + ' must be at least ' + el.dataset.minLength + ' characters.';
      else if (el.dataset.match && el.value !== (form.elements[el.dataset.match] || {}).value) msg = 'Passwords don’t match.';
      else if (el.type === 'number' && el.value !== '' && ((el.min !== '' && Number(el.value) < Number(el.min)) || (el.max !== '' && Number(el.value) > Number(el.max)))) msg = name + ' must be between ' + el.min + ' and ' + el.max + '.';
      setFieldError(el, msg);
      if (msg && !first) first = el;
    });
    if (first) { first.focus(); announce('Please fix the highlighted fields.'); }
    return !first;
  }
  function formData(form) {
    const out = {};
    [...form.elements].forEach((el) => {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') { if (form.querySelectorAll('[name="' + el.name + '"]').length > 1) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); } else out[el.name] = el.checked; }
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  }

  /* ---------- Tabs (roving, keyboard) ---------- */
  function bindTabs(root, onChange) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); select(n); }
      });
    });
    function select(t) { tabs.forEach((x) => { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); x.tabIndex = x === t ? 0 : -1; }); onChange(t.dataset.tab); }
  }
  const tabsHtml = (items, active, label = 'Sections') => '<div class="tabs" role="tablist" aria-label="' + esc(label) + '">' + items.map(([k, l, count]) => '<button type="button" class="tab" role="tab" data-tab="' + k + '" aria-selected="' + (k === active) + '" tabindex="' + (k === active ? 0 : -1) + '">' + esc(l) + (count != null ? '<span class="count">' + count + '</span>' : '') + '</button>').join('') + '</div>';

  /* ---------- Menus (data-menu-trigger → next .menu) ---------- */
  document.addEventListener('click', (e) => {
    const trig = e.target.closest('[data-menu-trigger]');
    document.querySelectorAll('.menu:not([hidden])').forEach((m) => { if (!trig || m !== trig.nextElementSibling) { m.hidden = true; const t = m.previousElementSibling; if (t) t.setAttribute('aria-expanded', 'false'); } });
    if (trig) { const m = trig.nextElementSibling; m.hidden = !m.hidden; trig.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) { const f = m.querySelector('a,button'); if (f) f.focus(); } }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = document.querySelector('.menu:not([hidden])');
    if (m) { m.hidden = true; const t = m.previousElementSibling; if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); } }
  });
  const menu = (items, { label = 'More actions', triggerCls = 'btn btn-ghost btn-icon btn-sm', triggerHtml } = {}) =>
    '<div class="menu-wrap"><button type="button" class="' + triggerCls + '" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="' + esc(label) + '">' + (triggerHtml || icon('more', 18)) + '</button><div class="menu" hidden role="menu">' +
    items.map((it) => it === '-' ? '<hr>' : it.href ? '<a role="menuitem" href="' + it.href + '"' + (it.danger ? ' class="menu-danger"' : '') + '>' + icon(it.icon || 'chevronRight', 16) + esc(it.label) + '</a>' : '<button type="button" role="menuitem" data-action="' + it.action + '"' + (it.id ? ' data-id="' + it.id + '"' : '') + (it.danger ? ' class="menu-danger"' : '') + '>' + icon(it.icon || 'chevronRight', 16) + esc(it.label) + '</button>').join('') + '</div></div>';

  /* ---------- Misc ---------- */
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  /** Delegated click handling for [data-action] buttons inside a root. */
  function onAction(root, handlers) {
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || !root.contains(el) || !handlers[el.dataset.action]) return;
      e.preventDefault();
      handlers[el.dataset.action](el, e);
    });
  }
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
    return head ? body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()]))) : [];
  }
  function downloadText(text, filename, type = 'text/csv') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  }

  HUK.ui = { esc, icon, fmt, chip, sevChip, diffChip, avatar, pageHeader, metric, progress, signal, btn, skeleton, empty, errorState, load, table, bindRowLinks, paginate, pager, announce, toast, modal, drawer, confirm, setLoading, withLoading, field, switchRow, setFieldError, validate, formData, bindTabs, tabsHtml, menu, debounce, onAction, parseCsv, downloadText, STATUS };
})();
