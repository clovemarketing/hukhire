/* =========================================================
   Proctor live console + focused candidate monitor
   Live updates come from proctorService.subscribe(), which
   is a WebSocket in production and a mock event generator now.
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, avatar, sevChip, pageHeader, progress, signal, load, empty, toast, modal, drawer, onAction, debounce, field, announce } = HUK.ui;
  const P = HUK.proctorService;
  const HOME = ['Live queue', 'proctor/dashboard.html'];
  const LIVE = ['Live sessions', 'proctor/live-sessions.html'];
  const RISK_ORDER = { high: 0, medium: 1, low: 2 };

  function eventRow(ev, name, isNew = false) {
    const [ic, label] = P.EVENT_META[ev.type] || ['info', HUK.ui.fmt.title(ev.type)];
    return '<li class="event' + (isNew ? ' is-new' : '') + '" data-sev="' + ev.severity + '"><span class="ev-icon">' + icon(ic, 16) + '</span><div class="grow"><div class="between" style="align-items:flex-start"><strong style="font-size:var(--fs-sm)">' + esc(name || label) + '</strong><time class="subtle nowrap" datetime="' + ev.at + '">' + fmt.time(ev.at) + '</time></div><div class="subtle">' + esc(ev.message) + '</div></div></li>';
  }
  function videoTile(c, { large = false } = {}) {
    const off = c.status === 'disconnected';
    return '<div class="video-tile' + (off ? ' disconnected' : '') + (large ? ' focus-video' : '') + '" role="img" aria-label="' + esc(c.name) + ' camera feed placeholder, ' + (off ? 'disconnected' : 'live') + '">' + avatar(c.name) +
      '<span class="vt-label">' + (off ? 'Reconnecting…' : c.faceStatus === 'missing' ? 'Face not detected' : c.faceStatus === 'multiple' ? 'Multiple faces' : '') + '</span>' +
      '<span class="vt-status">' + (c.status === 'submitted' ? chip('submitted') : off ? chip('disconnected') : c.status === 'not_started' ? chip('not_started') : '<span class="rec-dot" style="position:static">Live</span>') + '</span>' +
      '<span class="vt-icons"><span class="' + (c.camera ? '' : 'off') + '" title="Camera ' + (c.camera ? 'on' : 'off') + '">' + icon(c.camera ? 'video' : 'videoOff', 14) + '</span><span class="' + (c.mic ? '' : 'off') + '" title="Microphone ' + (c.mic ? 'on' : 'off') + '">' + icon(c.mic ? 'mic' : 'micOff', 14) + '</span></span></div>';
  }

  /* ======================= Console ======================= */
  HUK.page('proctor-console', {
    title: 'Live console',
    crumbs: [HOME, LIVE, ['Console']],
    render(main) {
      const sid = HUK.qs('session');
      let sess = null, events = [], filter = 'all', sort = 'risk', q = '', view = window.matchMedia('(max-width: 767px)').matches ? 'list' : 'grid', unsub = null;
      main.innerHTML = '<div id="c"></div>';
      const host = main.querySelector('#c');

      const visible = () => sess.candidates
        .filter((c) => filter === 'all' || (filter === 'attention' && (c.risk !== 'low' || c.flagged)) || (filter === 'disconnected' && c.status === 'disconnected') || (filter === 'submitted' && c.status === 'submitted') || (filter === 'active' && c.status === 'active'))
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .sort((a, b) => sort === 'risk' ? RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.warnings - a.warnings : sort === 'warnings' ? b.warnings - a.warnings : sort === 'progress' ? b.answered / b.total - a.answered / a.total : a.name.localeCompare(b.name));
      const candHref = (c) => HUK.url('proctor/candidate.html?session=' + sid + '&candidate=' + c.id);

      function drawGrid() {
        const rows = visible();
        const g = host.querySelector('#grid');
        if (!rows.length) { g.innerHTML = '<div class="card">' + empty({ title: 'No candidates match', text: 'Change the filter or search to see more candidates.' }) + '</div>'; return; }
        g.innerHTML = view === 'grid'
          ? '<div class="cand-grid">' + rows.map((c) => '<a class="card cand-card" data-cid="' + c.id + '" data-risk="' + c.risk + '" href="' + candHref(c) + '" style="color:inherit;text-decoration:none" aria-label="' + esc(c.name) + ', ' + HUK.ui.STATUS[c.risk][0] + ', ' + c.warnings + ' warnings. Open candidate.">' + videoTile(c) +
              '<div class="cand-meta"><span class="name truncate">' + esc(c.name) + '</span>' + (c.flagged ? '<span data-tip="Flagged">' + icon('flag', 16) + '</span>' : '') + '</div>' +
              '<div class="row-wrap" style="padding:0 4px;gap:6px">' + chip(c.risk) + (c.tabSwitches ? '<span class="tag">' + c.tabSwitches + ' tab switch' + (c.tabSwitches > 1 ? 'es' : '') + '</span>' : '') + (c.warnings ? '<span class="tag">' + c.warnings + ' warning' + (c.warnings > 1 ? 's' : '') + '</span>' : '') + '</div>' +
              '<div class="cand-stats">' + signal(c.network) + '<div class="progress" aria-hidden="true"><span style="width:' + (c.answered / c.total * 100) + '%"></span></div><span class="tnum">' + c.answered + '/' + c.total + '</span></div></a>').join('') + '</div>'
          : '<div class="card card-pad-0"><ul class="list">' + rows.map((c) => '<li><a class="list-item" style="padding:14px 18px" href="' + candHref(c) + '">' + avatar(c.name) + '<div class="li-main"><div class="li-title">' + esc(c.name) + (c.flagged ? ' ' + icon('flag', 14) : '') + '</div><div class="li-sub">' + c.answered + '/' + c.total + ' answered, ' + c.warnings + ' warnings, ' + c.tabSwitches + ' tab switches</div><div class="row-wrap mt-1" style="gap:6px">' + chip(c.status) + chip(c.risk) + '</div></div>' + signal(c.network) + '</a></li>').join('') + '</ul></div>';
      }
      function drawHealth() {
        const s = sess.stats;
        host.querySelector('#health').innerHTML = [['Active', s.active], ['Submitted', s.submitted], ['Disconnected', s.disconnected], ['High risk', s.highRisk], ['Warnings sent', s.warnings], ['Open incidents', s.openIncidents]].map(([l, v]) => '<div><strong>' + v + '</strong><span>' + l + '</span></div>').join('');
        host.querySelectorAll('[data-filter]').forEach((b) => { const k = b.dataset.filter; const n = k === 'all' ? sess.candidates.length : k === 'attention' ? sess.candidates.filter((c) => c.risk !== 'low' || c.flagged).length : sess.candidates.filter((c) => c.status === k).length; b.querySelector('.n').textContent = n; });
      }
      function drawEvents() {
        const nameOf = (id) => (sess.candidates.find((c) => c.id === id) || {}).name;
        host.querySelector('#stream').innerHTML = events.length ? events.slice(0, 40).map((e) => eventRow(e, nameOf(e.candidateId))).join('') : '<li class="subtle">No events yet.</li>';
      }

      load(host, async () => { const [s, ev] = await Promise.all([P.session(sid), P.events(sid)]); return { s, ev }; }, ({ s, ev }) => {
        sess = s; events = ev;
        HUK.shell.setCrumbs([HOME, LIVE, [s.exam.code + ' console']]);
        const ended = s.status !== 'live';
        return pageHeader({ title: s.exam.title, subtitle: (ended ? 'This session has ended.' : 'Live now. Window closes ' + fmt.rel(s.exam.endAt) + '.') + ' ' + s.candidates.length + ' candidates in this room.',
            actions: ended ? '<a class="btn btn-primary" href="' + HUK.url('proctor/session-summary.html?session=' + sid) + '">View session summary</a>' : '<button type="button" class="btn" data-action="fullscreen">' + icon('expand', 18) + '<span>Full screen</span></button><button type="button" class="btn btn-danger" data-action="end">' + icon('stop', 18) + '<span>End session</span></button>' }) +
          '<div class="console" id="console">' +
            '<div><div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="cq">Search candidates</label><input class="input" id="cq" type="search" placeholder="Search candidates"></div>' +
              '<label class="sr-only" for="sort">Sort candidates</label><select class="select" id="sort" style="width:auto"><option value="risk">Sort by risk</option><option value="warnings">Sort by warnings</option><option value="progress">Sort by progress</option><option value="name">Sort by name</option></select>' +
              '<div class="segmented" role="group" aria-label="Layout"><button type="button" data-view="grid" aria-pressed="' + (view === 'grid') + '" aria-label="Video grid">' + icon('grid', 16) + '</button><button type="button" data-view="list" aria-pressed="' + (view === 'list') + '" aria-label="List">' + icon('list', 16) + '</button></div></div>' +
              '<div class="filter-chips mb-2" role="group" aria-label="Filter candidates">' + [['all', 'All'], ['attention', 'Needs attention'], ['active', 'Active'], ['disconnected', 'Disconnected'], ['submitted', 'Submitted']].map(([k, l]) => '<button type="button" class="filter-chip" data-filter="' + k + '" aria-pressed="' + (k === filter) + '">' + l + ' <span class="n"></span></button>').join('') + '</div>' +
              '<div id="grid" aria-live="polite"></div></div>' +
            '<aside class="stack-lg"><section class="card card-tight"><h2 style="font-size:var(--fs-md)" class="mb-2">Session health</h2><div class="health" id="health"></div></section>' +
              '<section class="card card-tight"><div class="between mb-1"><h2 style="font-size:var(--fs-md)">Event stream</h2>' + (ended ? '' : '<span class="chip" data-tone="live">Live</span>') + '</div><ul class="event-stream" id="stream" aria-live="polite" aria-relevant="additions"></ul></section></aside>' +
          '</div>';
      }, { skeleton: 'page', after: () => {
        drawGrid(); drawHealth(); drawEvents();
        host.querySelector('#cq').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); drawGrid(); }, 150));
        host.querySelector('#sort').addEventListener('change', (e) => { sort = e.target.value; drawGrid(); });
        host.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; host.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawGrid(); }));
        host.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; host.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawGrid(); }));
        if (sess.status !== 'live') return;
        const refresh = debounce(async () => { try { sess = await P.session(sid); drawGrid(); drawHealth(); } catch (e) {} }, 300);
        unsub = P.subscribe(sid, (ev) => {
          events.unshift(ev);
          const c = sess.candidates.find((x) => x.id === ev.candidateId);
          const stream = host.querySelector('#stream');
          stream.insertAdjacentHTML('afterbegin', eventRow(ev, c && c.name, true));
          if (ev.severity === 'high') { toast((c ? c.name + ': ' : '') + ev.message, { tone: 'bad', title: 'High-risk alert' }); }
          refresh();
          setTimeout(() => { const card = host.querySelector('[data-cid="' + ev.candidateId + '"]'); if (card) { card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 900); } }, 400);
        });
      } });

      onAction(main, {
        fullscreen: () => { const el = main.querySelector('#console'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Full screen isn’t available in this browser.', { tone: 'warn' })); },
        end: async () => {
          const active = sess.candidates.filter((c) => ['active', 'idle', 'disconnected'].includes(c.status)).length;
          await modal({ title: 'End this session?', body: (active ? '<div class="alert" data-tone="warn">' + icon('alert', 18) + '<div>' + active + ' candidate' + (active > 1 ? 's are' : ' is') + ' still in the exam. Ending the session stops live monitoring for them; their attempts continue to be recorded.</div></div>' : '<p>All candidates have submitted.</p>') +
            '<form id="endf" class="mt-2">' + field({ name: 'notes', label: 'Session notes', type: 'textarea', value: sess.notes || '', hint: 'Shared with admins in the session summary.' }) + '</form>',
            primary: { label: 'End session', cls: 'btn-danger-solid' },
            onPrimary: async (dlg) => { await P.endSession(sid, dlg.querySelector('[name=notes]').value); if (unsub) unsub(); HUK.go('proctor/session-summary.html?session=' + sid + '&ended=1'); return true; } });
        }
      });
      window.addEventListener('pagehide', () => unsub && unsub());
    }
  });

  /* ======================= Candidate ======================= */
  HUK.page('proctor-candidate', {
    title: 'Candidate monitor',
    crumbs: [HOME, LIVE, ['Candidate']],
    render(main) {
      const sid = HUK.qs('session'), cid = HUK.qs('candidate');
      let data = null, events = [], unsub = null;
      main.innerHTML = '<div id="c"></div>';
      const host = main.querySelector('#c');
      const statusPanel = (c) => '<dl class="kv"><dt>Connection</dt><dd class="row" style="gap:8px">' + signal(c.network) + (['Offline', 'Poor', 'Fair', 'Good'][c.network]) + '</dd><dt>Camera</dt><dd>' + (c.camera ? 'On' : '<span class="text-bad">Off</span>') + '</dd><dt>Microphone</dt><dd>' + (c.mic ? 'On' : '<span class="text-bad">Off</span>') + '</dd><dt>Face detection</dt><dd>' + ({ ok: 'One face visible', missing: '<span class="text-bad">Face not detected</span>', multiple: '<span class="text-bad">Multiple faces</span>' }[c.faceStatus]) + '</dd><dt>Tab switches</dt><dd>' + c.tabSwitches + '</dd><dt>Warnings sent</dt><dd>' + c.warnings + '</dd><dt>Joined</dt><dd>' + fmt.time(c.joinedAt) + '</dd></dl>';
      const draw = () => {
        const { candidate: c, session: s, incidents } = data;
        HUK.shell.setCrumbs([HOME, LIVE, [s.exam.code + ' console', 'proctor/console.html?session=' + sid], [c.name]]);
        const live = s.status === 'live' && c.status !== 'submitted';
        host.innerHTML =
          '<header class="page-header"><div class="profile-head">' + HUK.ui.avatar(c.name, 'avatar-lg') + '<div><h1>' + esc(c.name) + '</h1><div class="row-wrap mt-1">' + chip(c.status) + chip(c.risk) + chip(c.identity) + (c.flagged ? chip('open', 'Flagged') : '') + '</div></div></div><div class="page-actions"><a class="btn" href="' + HUK.url('proctor/console.html?session=' + sid) + '">' + icon('arrowLeft', 18) + '<span>Back to console</span></a></div></header>' +
          '<div class="grid g-main-side"><div class="stack-lg">' +
            '<section class="card card-tight" aria-labelledby="feed-t"><div class="between mb-2"><h2 id="feed-t" style="font-size:var(--fs-md)">Camera and screen</h2><span class="subtle">Placeholders for live WebRTC feeds</span></div><div class="grid g-2">' + videoTile(c, { large: true }) + '<div class="screen-tile" role="img" aria-label="Screen share placeholder"><span class="tag">Screen share</span><div class="fake-line" style="width:70%;margin-top:14px"></div><div class="fake-line" style="width:90%"></div><div class="fake-line" style="width:55%"></div><div class="fake-line" style="width:80%"></div><div class="fake-line" style="width:40%"></div></div></div></section>' +
            '<section class="card" aria-labelledby="prog-t"><div class="between"><h2 id="prog-t" style="font-size:var(--fs-md)">Exam progress</h2><span class="subtle">Answers are never shown to proctors</span></div><div class="mt-2">' + progress(c.answered / c.total * 100, { label: c.answered + ' of ' + c.total + ' questions answered' }) + '</div></section>' +
            '<section class="card" aria-labelledby="tl-t"><div class="between mb-2"><h2 id="tl-t" style="font-size:var(--fs-md)">Event timeline</h2><button type="button" class="btn btn-sm" data-action="evidence">' + icon('layers', 16) + '<span>Evidence</span></button></div><ol class="timeline" id="tl" aria-live="polite">' + (events.length ? events.map((e) => '<li data-tone="' + ({ high: 'bad', medium: 'warn' }[e.severity] || '') + '"><div class="tl-time">' + fmt.time(e.at) + '</div><div class="tl-title">' + esc((P.EVENT_META[e.type] || [0, fmt.title(e.type)])[1]) + '</div><div class="tl-text">' + esc(e.message) + '</div></li>').join('') : '<li><div class="tl-text">No events recorded.</div></li>') + '</ol></section>' +
            '<section class="card" aria-labelledby="nt-t"><h2 id="nt-t" style="font-size:var(--fs-md)">Incident notes</h2><form id="notef" class="stack mt-2" novalidate>' + field({ name: 'note', label: 'Add a note', type: 'textarea', rows: 3, required: true, placeholder: 'What did you observe? Include times if possible.' }) + '<div class="form-actions"><button type="submit" class="btn btn-primary">Save note</button></div></form><ul class="list mt-2">' + (c.notes || []).map((n) => '<li class="list-item"><div class="li-main"><div style="font-size:var(--fs-sm)">' + esc(n.text) + '</div><div class="li-sub">' + esc(n.by) + ', ' + fmt.time(n.at) + '</div></div></li>').join('') + '</ul></section>' +
          '</div><aside class="stack-lg">' +
            '<section class="card card-tight" aria-labelledby="act-t"><h2 id="act-t" style="font-size:var(--fs-md)" class="mb-2">Actions</h2><div class="action-rail">' +
              '<button type="button" class="btn" data-action="warn"' + (live ? '' : ' disabled') + '>' + icon('alert', 18) + '<span>Warn</span></button>' +
              '<button type="button" class="btn" data-action="message"' + (live ? '' : ' disabled') + '>' + icon('message', 18) + '<span>Message</span></button>' +
              '<button type="button" class="btn" data-action="flag">' + icon('flag', 18) + '<span>Flag incident</span></button>' +
              '<button type="button" class="btn" data-action="identity">' + icon('idCard', 18) + '<span>Verify ID</span></button>' +
              '<button type="button" class="btn btn-danger" data-action="escalate">' + icon('shield', 18) + '<span>Escalate</span></button>' +
              '<button type="button" class="btn btn-danger" data-action="terminate"' + (live ? '' : ' disabled') + '>' + icon('stop', 18) + '<span>End attempt</span></button>' +
            '</div></section>' +
            '<section class="card card-tight" aria-labelledby="id-t"><h2 id="id-t" style="font-size:var(--fs-md)" class="mb-2">Identity</h2><div class="grid g-2" style="gap:10px"><div class="evidence" style="grid-template-columns:1fr"><div>Registration photo</div></div><div class="evidence" style="grid-template-columns:1fr"><div>ID captured at check-in</div></div></div><dl class="kv mt-2"><dt>Email</dt><dd>' + esc(c.email) + '</dd><dt>Institution</dt><dd>' + esc(c.institution || '—') + '</dd><dt>Status</dt><dd>' + chip(c.identity) + '</dd></dl></section>' +
            '<section class="card card-tight" aria-labelledby="st-t"><h2 id="st-t" style="font-size:var(--fs-md)" class="mb-2">Live status</h2><div id="status">' + statusPanel(c) + '</div></section>' +
            '<section class="card card-tight"><h2 style="font-size:var(--fs-md)" class="mb-2">Incidents</h2>' + (incidents.length ? '<ul class="list">' + incidents.map((i) => '<li class="list-item"><div class="li-main"><div class="li-title" style="font-size:var(--fs-sm)">' + esc(P.INCIDENT_TYPES[i.type] || i.type) + '</div><div class="li-sub">' + fmt.time(i.timestamp) + '</div></div>' + sevChip(i.severity) + chip(i.status) + '</li>').join('') + '</ul>' : '<p class="subtle">No incidents for this candidate.</p>') + '</section>' +
          '</aside></div>';
        const nf = host.querySelector('#notef');
        nf.addEventListener('submit', async (e) => { e.preventDefault(); if (!HUK.ui.validate(nf)) return; await HUK.ui.withLoading(nf.querySelector('[type=submit]'), () => P.addNote(sid, cid, nf.note.value.trim())); toast('Note saved to the incident log.'); reload(); });
      };
      const fetchAll = async () => { const [d, ev] = await Promise.all([P.candidate(sid, cid), P.events(sid, { candidateId: cid })]); data = d; events = ev; return d; };
      const reload = async () => { try { await fetchAll(); draw(); } catch (e) { toast(e.message, { tone: 'bad' }); } };
      load(host, fetchAll, () => '', { skeleton: 'page', after: () => {
        draw();
        if (data.session.status === 'live') unsub = P.subscribe(sid, (ev) => { if (ev.candidateId === cid) { if (ev.severity === 'high') toast(ev.message, { tone: 'bad', title: data.candidate.name }); reload(); announce('New event: ' + ev.message); } });
      } });

      const templates = ['Please keep your face centred in the camera.', 'Please return to the exam tab and stay on it.', 'Please make sure you are alone in the room.', 'Please keep your microphone unmuted.'];
      onAction(main, {
        warn: () => modal({ title: 'Send a warning to ' + data.candidate.name, body: '<form id="wf" class="stack">' + field({ name: 'tpl', label: 'Message', options: templates.map((t) => [t, t]).concat([['custom', 'Write my own…']]) }) + field({ name: 'custom', label: 'Custom message', type: 'textarea', rows: 3 }) + '<p class="subtle">The candidate sees this on screen. It is counted as warning ' + (data.candidate.warnings + 1) + '.</p></form>', primary: { label: 'Send warning' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#wf'); const msg = f.tpl.value === 'custom' ? f.custom.value.trim() : f.tpl.value; if (!msg) { HUK.ui.setFieldError(f.custom, 'Write a message or choose a template.'); return false; } await P.warn(sid, cid, msg); toast('Warning sent.'); reload(); } }),
        message: () => modal({ title: 'Message ' + data.candidate.name, body: '<form id="mf">' + field({ name: 'msg', label: 'Message', type: 'textarea', rows: 3, required: true }) + '</form>', primary: { label: 'Send message' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#mf'); if (!HUK.ui.validate(f)) return false; await P.message(sid, cid, f.msg.value.trim()); toast('Message sent.'); reload(); } }),
        flag: () => modal({ title: 'Flag an incident', body: '<form id="ff" class="form-grid">' + field({ name: 'type', label: 'Type', options: Object.entries(P.INCIDENT_TYPES) }) + field({ name: 'severity', label: 'Severity', options: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], value: 'medium' }) + field({ name: 'description', label: 'What happened', type: 'textarea', required: true, full: true, rows: 4 }) + '<p class="subtle full">A snapshot and the event log are attached automatically.</p></form>', primary: { label: 'Flag incident', cls: 'btn-accent' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#ff'); if (!HUK.ui.validate(f)) return false; await P.flag(sid, cid, HUK.ui.formData(f)); toast('Incident flagged and added to the timeline.'); reload(); } }),
        identity: () => modal({ title: 'Verify identity', body: '<p>Compare the live camera with the registration photo and the ID captured at check-in.</p><div class="grid g-2 mt-2"><div class="evidence" style="grid-template-columns:1fr"><div>Registration photo</div></div><div class="evidence" style="grid-template-columns:1fr"><div>Live capture</div></div></div>', primary: { label: 'Identity matches' }, secondary: { label: 'Doesn’t match' } })
          .then(async (r) => { if (!r) return; await P.verifyIdentity(sid, cid, r === 'primary' ? 'verified' : 'mismatch'); toast(r === 'primary' ? 'Identity verified.' : 'Identity mismatch recorded.', { tone: r === 'primary' ? 'ok' : 'warn' }); reload(); }),
        escalate: () => modal({ title: 'Escalate to an admin', body: '<form id="ef">' + field({ name: 'reason', label: 'Reason', type: 'textarea', rows: 4, required: true, hint: 'Admins are notified immediately and open incidents move to Escalated.' }) + '</form>', primary: { label: 'Escalate', cls: 'btn-danger-solid' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#ef'); if (!HUK.ui.validate(f)) return false; await P.escalate(sid, cid, f.reason.value.trim()); toast('Escalated. Admins have been notified.', { tone: 'warn' }); reload(); } }),
        terminate: () => modal({ title: 'End ' + data.candidate.name + '’s attempt?', body: '<p>The candidate is removed from the exam and their answers so far are submitted. Use this only for serious misconduct.</p><form id="tf" class="mt-2">' + field({ name: 'reason', label: 'Reason', type: 'textarea', rows: 3, required: true }) + '</form>', primary: { label: 'End attempt', cls: 'btn-danger-solid' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#tf'); if (!HUK.ui.validate(f)) return false; await P.terminate(sid, cid, f.reason.value.trim()); toast('Attempt ended.', { tone: 'warn' }); reload(); } }),
        evidence: () => drawer({ title: 'Evidence for ' + data.candidate.name, body: '<p class="subtle">Snapshots are captured automatically on every medium or high event. Recording playback opens here in the full product.</p><div class="evidence mt-2">' + (events.filter((e) => e.severity !== 'low').map((e) => '<div>' + esc((P.EVENT_META[e.type] || [0, e.type])[1]) + '<br>' + fmt.time(e.at) + '</div>').join('') || '<div>No snapshots</div>') + '</div>', primary: null, secondary: { label: 'Close' } })
      });
      window.addEventListener('pagehide', () => unsub && unsub());
    }
  });
})();
