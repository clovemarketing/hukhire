/* =========================================================
   Proctor portal: live queue, assignments, live sessions,
   incidents, session history, session summary, reports
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, sevChip, pageHeader, metric, progress, load, empty, table, tabsHtml, bindTabs, toast, onAction, field, withLoading } = HUK.ui;
  const P = HUK.proctorService;
  const HOME = ['Live queue', 'proctor/dashboard.html'];

  function sessionCard(s) {
    const st = s.stats;
    return '<article class="card exam-card"><div class="between"><span class="exam-code">' + esc(s.exam.code) + '</span>' + chip('live') + '</div><h3>' + esc(s.exam.title) + '</h3>' +
      '<div class="exam-meta"><span>' + icon('users', 16) + st.total + ' in room</span><span>' + icon('clock', 16) + 'Closes ' + fmt.rel(s.exam.endAt) + '</span></div>' +
      '<div class="grid g-3" style="gap:8px">' + [['Active', st.active], ['High risk', st.highRisk], ['Incidents', st.openIncidents]].map(([l, v]) => '<div class="card card-flat card-tight center" style="padding:10px"><strong style="font-size:1.25rem">' + v + '</strong><div class="subtle">' + l + '</div></div>').join('') + '</div>' +
      progress(st.total ? st.submitted / st.total * 100 : 0, { label: st.submitted + ' of ' + st.total + ' submitted' }) +
      '<div class="exam-actions"><a class="btn btn-primary" href="' + HUK.url('proctor/console.html?session=' + s.id) + '">' + icon('video', 18) + '<span>Open console</span></a></div></article>';
  }

  /* ---------------- Dashboard / live queue ---------------- */
  HUK.page('proctor-dashboard', {
    title: 'Live queue',
    crumbs: [['Live queue']],
    render(main, { user }) {
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => P.dashboard(), (d) => {
        const liveCands = d.live.reduce((t, s) => t + s.stats.active, 0);
        const high = d.live.reduce((t, s) => t + s.stats.highRisk, 0);
        const open = d.incidents.filter((i) => ['open', 'reviewing'].includes(i.status));
        return pageHeader({ title: 'Live queue', subtitle: 'Hi ' + esc(user.name.split(' ')[0]) + '. Sessions that need you right now are at the top.', actions: '<div class="segmented" role="group" aria-label="Your availability">' + [['online', 'Online'], ['busy', 'Busy'], ['away', 'Away']].map(([k, l]) => '<button type="button" data-avail="' + k + '" aria-pressed="' + (d.availability === k) + '">' + l + '</button>').join('') + '</div>' }) +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Live sessions', value: d.live.length, icon: 'video', href: HUK.url('proctor/live-sessions.html') }) + metric({ label: 'Candidates active', value: liveCands, icon: 'users' }) + metric({ label: 'High-risk now', value: high, icon: 'alert' }) + metric({ label: 'Open incidents', value: open.length, icon: 'flag', href: HUK.url('proctor/incidents.html') }) + '</div>' +
          '<div class="grid g-main-side mt-3"><div class="stack-lg"><section aria-labelledby="ls-t"><div class="between mb-2"><h2 id="ls-t">Sessions needing attention</h2><a href="' + HUK.url('proctor/live-sessions.html') + '">All live sessions</a></div>' +
            (d.live.length ? '<div class="grid g-2">' + d.live.sort((a, b) => b.stats.highRisk - a.stats.highRisk).map(sessionCard).join('') + '</div>' : '<div class="card">' + empty({ title: 'No live sessions right now', text: 'Your next assignment is listed on the right.', iconName: 'video' }) + '</div>') + '</section>' +
            '<section class="card" aria-labelledby="al-t"><div class="card-head"><h2 id="al-t">Recent alerts</h2></div>' + (d.recentEvents.length ? '<ul class="list">' + d.recentEvents.map((e) => '<li class="list-item"><span class="metric-icon">' + icon((P.EVENT_META[e.type] || ['alert'])[0], 18) + '</span><div class="li-main"><div class="li-title">' + esc(e.candidateName) + '</div><div class="li-sub">' + esc(e.message) + ', ' + esc(e.examCode) + '</div></div><span class="subtle nowrap">' + fmt.rel(e.at) + '</span>' + sevChip(e.severity) + '</li>').join('') + '</ul>' : '<p class="muted">No alerts in your live sessions.</p>') + '</section></div>' +
          '<aside class="stack-lg"><section class="card" aria-labelledby="up-t"><div class="card-head"><h2 id="up-t">Assignment timeline</h2><a href="' + HUK.url('proctor/assigned-exams.html') + '">All</a></div>' + (d.upcoming.length ? '<ol class="timeline">' + d.upcoming.map((s) => '<li data-tone="accent"><div class="tl-time">' + fmt.weekday(s.exam.startAt) + ', ' + fmt.time(s.exam.startAt) + '</div><div class="tl-title">' + esc(s.exam.title) + '</div><div class="tl-text">' + s.exam.durationMinutes + ' min, ' + s.exam.candidateCount + ' candidates</div></li>').join('') + '</ol>' : '<p class="muted">Nothing scheduled.</p>') + '</section>' +
          '<section class="card" aria-labelledby="is-t"><div class="card-head"><h2 id="is-t">Incident summary</h2><a href="' + HUK.url('proctor/incidents.html') + '">Review</a></div>' + HUK.charts.hbars([['open', 'Open'], ['reviewing', 'Reviewing'], ['escalated', 'Escalated'], ['resolved', 'Resolved']].map(([k, l]) => ({ label: l, value: d.incidents.filter((i) => i.status === k).length, max: Math.max(1, d.incidents.length) }))) + '</section></aside></div>';
      }, { skeleton: 'page', after: () => {
        main.querySelectorAll('[data-avail]').forEach((b) => b.addEventListener('click', async () => {
          main.querySelectorAll('[data-avail]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          try { await P.setAvailability(b.dataset.avail); toast('You’re now ' + b.textContent.toLowerCase() + '.'); } catch (e) { toast(e.message, { tone: 'bad' }); }
        }));
      } });
    }
  });

  /* ---------------- Assigned exams ---------------- */
  HUK.page('proctor-assigned', {
    title: 'Assigned exams',
    crumbs: [HOME, ['Assigned exams']],
    render(main) {
      let tab = 'upcoming', all = [];
      main.innerHTML = pageHeader({ title: 'Assigned exams', subtitle: 'Sessions you’re the proctor for.' }) + '<div id="tabs"></div><div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const map = { live: 'live', upcoming: 'scheduled', completed: 'completed' };
      const draw = () => {
        main.querySelector('#tabs').innerHTML = tabsHtml([['live', 'Live', all.filter((s) => s.status === 'live').length], ['upcoming', 'Upcoming', all.filter((s) => s.status === 'scheduled').length], ['completed', 'Completed', all.filter((s) => s.status === 'completed').length]], tab, 'Filter assignments');
        bindTabs(main.querySelector('#tabs'), (t) => { tab = t; draw(); main.querySelector('[role=tab][aria-selected=true]').focus(); });
        const rows = all.filter((s) => s.status === map[tab]);
        el.innerHTML = rows.length ? table({ caption: 'Assigned exams', rows, columns: [
          { label: 'Exam', primary: true, render: (s) => '<div class="cell-main">' + esc(s.exam.title) + '</div><div class="cell-sub">' + esc(s.exam.code) + '</div>' },
          { label: 'Window', render: (s) => '<span class="nowrap">' + fmt.dateTime(s.exam.startAt) + '</span>' },
          { label: 'Duration', render: (s) => s.exam.durationMinutes + ' min' },
          { label: 'Candidates', render: (s) => s.exam.candidateCount },
          { label: 'Status', render: (s) => chip(s.status) },
          { label: '', actions: true, align: 'right', render: (s) => s.status === 'live' ? '<a class="btn btn-primary btn-sm" href="' + HUK.url('proctor/console.html?session=' + s.id) + '">Open console</a>' : s.status === 'completed' ? '<a class="btn btn-sm" href="' + HUK.url('proctor/session-summary.html?session=' + s.id) + '">Summary</a>' : '<button type="button" class="btn btn-sm" data-action="prep" data-id="' + s.id + '">Prepare</button>' }
        ] }) : empty({ title: 'Nothing here', text: tab === 'upcoming' ? 'New assignments from admins appear here.' : 'No sessions in this state.', iconName: 'calendar' });
      };
      load(el, () => P.assignments(), (d) => { all = d; tab = d.some((s) => s.status === 'live') ? 'live' : 'upcoming'; return ''; }, { after: draw, isEmpty: () => false });
      onAction(main, { prep: (b) => { const s = all.find((x) => x.id === b.dataset.id); HUK.ui.modal({ title: 'Prepare for ' + s.exam.code, body: '<ul class="stack-sm" style="padding-left:20px"><li>Test your camera and microphone in Settings.</li><li>Join 10 minutes before ' + fmt.time(s.exam.startAt) + ' on ' + fmt.date(s.exam.startAt) + '.</li><li>Review the exam rules: ' + s.exam.durationMinutes + ' minutes, ' + (s.exam.proctoringMode === 'live' ? 'live proctoring' : 'recorded proctoring') + '.</li><li>Keep the escalation desk number handy: +91 891 000 4400.</li></ul>', primary: { label: 'Test my devices' }, secondary: { label: 'Close' } }).then((r) => { if (r === 'primary') HUK.go('shared/settings.html'); }); } });
    }
  });

  /* ---------------- Live sessions ---------------- */
  HUK.page('proctor-live', {
    title: 'Live sessions',
    crumbs: [HOME, ['Live sessions']],
    render(main) {
      main.innerHTML = pageHeader({ title: 'Live sessions', subtitle: 'Open a console to monitor candidates in real time.' }) + '<div id="l"></div>';
      load(main.querySelector('#l'), () => P.sessions('live'), (rows) => '<div class="grid g-auto">' + rows.map(sessionCard).join('') + '</div>', { skeleton: 'cards', n: 2, empty: '<div class="card">' + empty({ title: 'No live sessions', text: 'When an assigned exam opens, its session appears here.', action: '<a class="btn" href="' + HUK.url('proctor/assigned-exams.html') + '">See assignments</a>', iconName: 'video' }) + '</div>' });
    }
  });

  /* ---------------- Incidents ---------------- */
  HUK.page('proctor-incidents', { title: 'Incidents', crumbs: [HOME, ['Incidents']], render: (main) => HUK.renderIncidents(main, { admin: false }) });

  /* ---------------- Session history ---------------- */
  HUK.page('proctor-history', {
    title: 'Session history',
    crumbs: [HOME, ['Session history']],
    render(main) {
      main.innerHTML = pageHeader({ title: 'Session history', subtitle: 'Completed sessions and their summaries.' }) + '<div class="card card-pad-0" id="t"></div>';
      load(main.querySelector('#t'), () => P.sessions('completed'), (rows) => table({ caption: 'Completed sessions', rows, rowHref: (s) => HUK.url('proctor/session-summary.html?session=' + s.id), columns: [
        { label: 'Exam', primary: true, render: (s) => '<div class="cell-main">' + esc(s.exam.title) + '</div><div class="cell-sub">' + esc(s.exam.code) + '</div>' },
        { label: 'Date', render: (s) => fmt.date(s.startedAt) },
        { label: 'Duration', render: (s) => fmt.dur((new Date(s.endedAt) - new Date(s.startedAt)) / 1000) },
        { label: 'Candidates', render: (s) => s.stats.total },
        { label: 'Flagged', render: (s) => s.stats.flagged },
        { label: '', actions: true, align: 'right', render: (s) => '<a class="btn btn-sm" href="' + HUK.url('proctor/session-summary.html?session=' + s.id) + '">View summary</a>' }
      ] }), { empty: empty({ title: 'No completed sessions yet', text: 'Sessions move here after you end them.', iconName: 'clock' }), after: (d, el) => HUK.ui.bindRowLinks(el) });
    }
  });

  /* ---------------- Session summary ---------------- */
  HUK.page('proctor-session-summary', {
    title: 'Session summary',
    crumbs: [HOME, ['Session history', 'proctor/session-history.html'], ['Summary']],
    render(main) {
      const sid = HUK.qs('session');
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => P.session(sid), (s) => {
        HUK.shell.setCrumbs([HOME, ['Session history', 'proctor/session-history.html'], [s.exam.code + ' summary']]);
        const st = s.stats;
        return (HUK.qs('ended') ? '<div class="alert mb-2" data-tone="ok" role="status">' + icon('checkCircle', 18) + '<div><strong>Session ended</strong>Monitoring has stopped. Review the summary and submit your report.</div></div>' : '') +
          pageHeader({ title: s.exam.title, subtitle: 'Session ' + esc(s.id) + ', ' + fmt.dateTime(s.startedAt) + (s.endedAt ? ' to ' + fmt.time(s.endedAt) : ''), actions: '<button type="button" class="btn" data-action="export">' + icon('download', 18) + '<span>Download report</span></button><button type="button" class="btn btn-primary" data-action="submit">' + icon('send', 18) + '<span>Submit report</span></button>' }) +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Candidates', value: st.total, icon: 'users' }) + metric({ label: 'Submitted', value: st.submitted, icon: 'checkCircle' }) + metric({ label: 'Flagged', value: st.flagged, icon: 'flag' }) + metric({ label: 'Warnings sent', value: st.warnings, icon: 'alert' }) + '</div>' +
          '<div class="grid g-main-side mt-3"><section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><h2>Candidates</h2></div>' + table({ caption: 'Candidate outcomes', rows: s.candidates, columns: [
            { label: 'Candidate', primary: true, render: (c) => '<div class="row">' + HUK.ui.avatar(c.name, 'avatar-sm') + '<span class="cell-main">' + esc(c.name) + '</span></div>' },
            { label: 'Status', render: (c) => chip(c.status) }, { label: 'Risk', render: (c) => chip(c.risk) }, { label: 'Warnings', render: (c) => c.warnings }, { label: 'Identity', render: (c) => chip(c.identity) }
          ] }) + '</section>' +
          '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)">Session notes</h2><form id="nf" class="stack mt-2">' + field({ name: 'notes', label: 'Notes for admins', type: 'textarea', value: s.notes, rows: 5 }) + '<div class="form-actions"><button class="btn" type="submit">Save notes</button></div></form></section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Incidents</h2>' + (s.incidents.length ? '<ul class="list">' + s.incidents.map((i) => '<li class="list-item"><div class="li-main"><div class="li-title" style="font-size:var(--fs-sm)">' + esc(i.studentName) + '</div><div class="li-sub">' + esc(P.INCIDENT_TYPES[i.type] || i.type) + '</div></div>' + sevChip(i.severity) + chip(i.status) + '</li>').join('') + '</ul>' : '<p class="subtle">No incidents in this session.</p>') + '<a class="btn btn-sm mt-2" href="' + HUK.url('proctor/incidents.html') + '">Review incidents</a></section></aside></div>';
      }, { skeleton: 'page', after: (s) => {
        const nf = main.querySelector('#nf');
        nf.addEventListener('submit', (e) => { e.preventDefault(); withLoading(nf.querySelector('[type=submit]'), async () => { await P.saveSessionNotes(sid, nf.notes.value); toast('Notes saved.'); }); });
        onAction(main, {
          export: () => { HUK.ui.downloadText(['Candidate,Status,Risk,Warnings,Identity'].concat(s.candidates.map((c) => [c.name, c.status, c.risk, c.warnings, c.identity].join(','))).join('\n'), 'session-' + sid + '.csv'); toast('Report downloaded.'); },
          submit: async (b) => { await withLoading(b, () => P.saveSessionNotes(sid, nf.notes.value)); toast('Report submitted to admins.'); }
        });
      } });
    }
  });

  /* ---------------- Reports ---------------- */
  HUK.page('proctor-reports', {
    title: 'Reports',
    crumbs: [HOME, ['Reports']],
    render(main) {
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => P.reports(), (r) => {
        const types = Object.entries(r.byType);
        return pageHeader({ title: 'Proctoring reports', subtitle: 'Your sessions, incidents and outcomes.', actions: '<button type="button" class="btn" data-action="export">' + icon('download', 18) + '<span>Export CSV</span></button>' }) +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Sessions', value: r.totals.sessions, icon: 'video' }) + metric({ label: 'Candidates monitored', value: r.totals.candidates, icon: 'users' }) + metric({ label: 'Incidents raised', value: r.totals.incidents, icon: 'flag' }) + metric({ label: 'Resolved', value: r.totals.incidents ? Math.round(r.totals.resolved / r.totals.incidents * 100) + '%' : '—', icon: 'checkCircle' }) + '</div>' +
          '<div class="grid g-2 mt-3"><section class="card"><div class="card-head"><h2>Sessions per week</h2><span class="subtle">Last 7 weeks</span></div>' + HUK.charts.bars({ data: r.weekly.map((v, i) => ({ label: 'W' + (i + 1), value: v })), label: 'Sessions per week' }) + '</section>' +
          '<section class="card"><div class="card-head"><h2>Incidents by type</h2></div>' + (types.length ? HUK.charts.donut({ segments: types.map(([k, v], i) => ({ label: P.INCIDENT_TYPES[k] || k, value: v, color: HUK.charts.palette[i % 7] })), centre: String(r.totals.incidents), sub: 'incidents', label: 'Incidents by type' }) : '<p class="muted">No incidents yet.</p>') + '</section></div>' +
          '<section class="card card-pad-0 mt-3"><div class="card-head" style="padding:20px 22px 0"><h2>Completed sessions</h2></div>' + (r.sessions.length ? table({ caption: 'Completed sessions', rows: r.sessions, columns: [{ label: 'Exam', primary: true, render: (s) => '<span class="cell-main">' + esc(s.exam.title) + '</span>' }, { label: 'Date', render: (s) => fmt.date(s.startedAt) }, { label: 'Candidates', render: (s) => s.stats.total }, { label: 'Warnings', render: (s) => s.stats.warnings }, { label: 'Flagged', render: (s) => s.stats.flagged }, { label: '', actions: true, align: 'right', render: (s) => '<a class="btn btn-sm" href="' + HUK.url('proctor/session-summary.html?session=' + s.id) + '">Open</a>' }] }) : empty({ title: 'No completed sessions' })) + '</section>';
      }, { skeleton: 'page', after: (r) => onAction(main, { export: () => { HUK.ui.downloadText(['Exam,Date,Candidates,Warnings,Flagged'].concat(r.sessions.map((s) => ['"' + s.exam.title + '"', s.startedAt.slice(0, 10), s.stats.total, s.stats.warnings, s.stats.flagged].join(','))).join('\n'), 'proctor-report.csv'); toast('Report exported.'); } }) });
    }
  });
})();
