/* =========================================================
   Admin: dashboard, exam list, exam detail/status, schedule
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, pageHeader, metric, progress, load, empty, table, bindRowLinks, paginate, pager, toast, confirm, onAction, debounce, tabsHtml, bindTabs, menu } = HUK.ui;
  const E = HUK.examService, A = HUK.adminService;
  const HOME = ['Dashboard', 'admin/dashboard.html'];
  const EXAMS = ['Exams', 'admin/exams.html'];

  /* ---------- Shared exam actions (list + detail) ---------- */
  HUK.adminExamActions = {
    async publish(id) { try { const e = await E.publish(id); toast(e.title + ' published. Status: ' + HUK.ui.STATUS[e.status][0] + '.'); return e; } catch (err) { toast(err.message, { tone: 'bad', timeout: 8000 }); return null; } },
    async duplicate(id) { const e = await E.duplicate(id); toast('Copy created as a draft.'); HUK.go('admin/exam-wizard.html?id=' + e.id); },
    async archive(id) { if (!await confirm({ title: 'Archive this exam?', message: 'Archived exams are hidden from candidates and proctors. Results stay available. You can restore it later.', confirmLabel: 'Archive exam', danger: true })) return null; const e = await E.archive(id); toast('Exam archived.'); return e; },
    async restore(id) { const e = await E.restore(id); toast('Exam restored as a draft.'); return e; },
    async remove(id) { if (!await confirm({ title: 'Delete this draft?', message: 'The draft and its settings are permanently removed. Questions stay in the bank.', confirmLabel: 'Delete draft', danger: true })) return false; await E.remove(id); toast('Draft deleted.'); return true; }
  };
  const examMenu = (e) => menu([
    { label: 'View details', icon: 'eye', href: HUK.url('admin/exam-detail.html?id=' + e.id) },
    { label: 'Edit', icon: 'edit', href: HUK.url('admin/exam-wizard.html?id=' + e.id) },
    { label: 'Duplicate', icon: 'copy', action: 'duplicate', id: e.id },
    e.status === 'draft' ? { label: 'Publish', icon: 'send', action: 'publish', id: e.id } : null,
    e.status === 'archived' ? { label: 'Restore', icon: 'refresh', action: 'restore', id: e.id } : { label: 'Archive', icon: 'archive', action: 'archive', id: e.id },
    e.status === 'draft' ? '-' : null,
    e.status === 'draft' ? { label: 'Delete draft', icon: 'trash', action: 'remove', id: e.id, danger: true } : null
  ].filter(Boolean), { label: 'Actions for ' + e.title });

  /* ---------------- Dashboard ---------------- */
  HUK.page('admin-dashboard', {
    title: 'Dashboard',
    crumbs: [['Dashboard']],
    render(main, { user }) {
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => A.dashboard(), (d) => {
        const k = d.kpis;
        return pageHeader({ title: 'Operations', subtitle: 'Good to see you, ' + esc(user.name.split(' ')[0]) + '. Here’s what’s running across HUK HIRE today.', actions: '<a class="btn btn-primary" href="' + HUK.url('admin/exam-wizard.html') + '">' + icon('plus', 18) + '<span>Create exam</span></a>' }) +
          '<div class="grid g-6">' + metric({ label: 'Students', value: fmt.num(k.students), icon: 'users', href: HUK.url('admin/students.html') }) + metric({ label: 'Active exams', value: k.activeExams, icon: 'exam', href: HUK.url('admin/exams.html?status=scheduled') }) + metric({ label: 'Live now', value: k.liveExams, icon: 'video', href: HUK.url('admin/exams.html?status=live') }) + metric({ label: 'Proctors online', value: k.proctorsOnline + '<span class="subtle" style="font-size:1rem">/' + k.proctorsTotal + '</span>', icon: 'eye', href: HUK.url('admin/proctors.html') }) + metric({ label: 'Pending reviews', value: k.pendingReviews, icon: 'flag', href: HUK.url('admin/incidents.html') }) + metric({ label: 'Completion rate', value: k.completionRate + '%', icon: 'checkCircle', href: HUK.url('admin/reports.html') }) + '</div>' +
          '<section class="card card-tight mt-3" aria-labelledby="qa-t"><h2 id="qa-t" class="sr-only">Quick actions</h2><div class="row-wrap">' +
            [['admin/exam-wizard.html', 'plus', 'Create exam'], ['admin/students.html?add=1', 'users', 'Add student'], ['admin/proctors.html?add=1', 'eye', 'Add proctor'], ['admin/exams.html?status=live', 'video', 'View live exams'], ['admin/reports.html#generate', 'download', 'Generate report']].map(([h, ic, l]) => '<a class="btn btn-ghost" href="' + HUK.url(h) + '">' + icon(ic, 18) + '<span>' + l + '</span></a>').join('') + '</div></section>' +
          '<div class="grid g-main-side mt-3"><div class="stack-lg">' +
            '<section class="card card-pad-0" aria-labelledby="lo-t"><div class="card-head" style="padding:20px 22px 0"><div><h2 id="lo-t">Live operations</h2><p class="subtle">Sessions running right now</p></div>' + chip('live', d.live.length + ' live') + '</div>' +
              (d.live.length ? table({ caption: 'Live sessions', rows: d.live, rowHref: (l) => HUK.url('admin/exam-detail.html?id=' + l.examId), columns: [
                { label: 'Exam', primary: true, render: (l) => '<div class="cell-main">' + esc(l.title) + '</div><div class="cell-sub">' + esc(l.code) + ', closes ' + fmt.rel(l.endAt) + '</div>' },
                { label: 'Proctor', render: (l) => esc(l.proctor) },
                { label: 'Progress', render: (l) => '<div style="min-width:120px">' + progress(l.inSession ? l.submitted / l.inSession * 100 : 0) + '<div class="cell-sub">' + l.active + ' active, ' + l.submitted + ' submitted</div></div>' },
                { label: 'Alerts', render: (l) => l.alerts ? chip('high', l.alerts + ' high risk') : chip('low', 'Clear') }
              ] }) : empty({ title: 'Nothing live right now', iconName: 'video' })) + '</section>' +
            '<section class="card" aria-labelledby="tr-t"><div class="card-head"><div><h2 id="tr-t">Attempts and pass rate</h2><p class="subtle">Last 6 months</p></div><div class="legend"><span><i style="background:var(--chart-1)"></i>Attempts (÷10)</span><span><i style="background:var(--chart-2)"></i>Pass rate %</span></div></div>' +
              HUK.charts.line({ labels: d.trend.months, series: [{ name: 'Attempts (tens)', values: d.trend.attempts.map((v) => Math.round(v / 10)), color: 'var(--chart-1)' }, { name: 'Pass rate', values: d.trend.passRate, color: 'var(--chart-2)' }], label: 'Attempts and pass rate trend' }) + '</section>' +
          '</div><aside class="stack-lg">' +
            '<section class="card" aria-labelledby="up-t"><div class="card-head"><h2 id="up-t">Upcoming exams</h2><a href="' + HUK.url('admin/schedule.html') + '">Calendar</a></div>' + (d.upcoming.length ? '<ol class="timeline">' + d.upcoming.map((e) => '<li data-tone="accent"><div class="tl-time">' + fmt.weekday(e.startAt) + ', ' + fmt.time(e.startAt) + '</div><a class="tl-title" style="color:var(--text)" href="' + HUK.url('admin/exam-detail.html?id=' + e.id) + '">' + esc(e.title) + '</a><div class="tl-text">' + e.candidateCount + ' candidates, ' + e.durationMinutes + ' min</div></li>').join('') + '</ol>' : '<p class="muted">No exams scheduled.</p>') + '</section>' +
            '<section class="card" aria-labelledby="ac-t"><div class="card-head"><h2 id="ac-t">Recent activity</h2></div><ol class="timeline">' + d.activity.map((a) => '<li data-tone="' + (a.tone || '') + '"><div class="tl-time">' + fmt.rel(a.at) + '</div><div class="tl-text"><strong style="color:var(--text)">' + esc(a.actor) + '</strong> ' + esc(a.text) + '</div></li>').join('') + '</ol></section>' +
          '</aside></div>';
      }, { skeleton: 'page', after: () => bindRowLinks(main) });
    }
  });

  /* ---------------- Exams list ---------------- */
  HUK.page('admin-exams', {
    title: 'Exams',
    crumbs: [HOME, ['Exams']],
    render(main) {
      const statuses = ['all', 'draft', 'scheduled', 'live', 'completed', 'archived'];
      let status = statuses.includes(HUK.qs('status')) ? HUK.qs('status') : 'all', q = '', page = 1, all = [];
      main.innerHTML = pageHeader({ title: 'Exams', subtitle: 'Create, schedule and manage every assessment.', actions: '<a class="btn" href="' + HUK.url('admin/schedule.html') + '">' + icon('calendar', 18) + '<span>Calendar</span></a><a class="btn btn-primary" href="' + HUK.url('admin/exam-wizard.html') + '">' + icon('plus', 18) + '<span>Create exam</span></a>' }) +
        '<div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="q">Search exams</label><input class="input" id="q" type="search" placeholder="Search by title or code"></div></div><div class="filter-chips mb-2" id="chips" role="group" aria-label="Filter by status"></div><div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const draw = () => {
        main.querySelector('#chips').innerHTML = statuses.map((s) => '<button type="button" class="filter-chip" data-status="' + s + '" aria-pressed="' + (s === status) + '">' + (s === 'all' ? 'All' : HUK.ui.STATUS[s][0]) + ' <span class="pill-count" style="background:transparent">' + (s === 'all' ? all.length : all.filter((e) => e.status === s).length) + '</span></button>').join('');
        const rows = all.filter((e) => (status === 'all' || e.status === status) && (!q || (e.title + e.code).toLowerCase().includes(q)));
        const pg = paginate(rows, page, 8);
        el.innerHTML = rows.length ? table({ caption: 'Exams', rows: pg.rows, rowHref: (e) => HUK.url('admin/exam-detail.html?id=' + e.id), columns: [
          { label: 'Exam', primary: true, render: (e) => '<div class="cell-main">' + esc(e.title) + '</div><div class="cell-sub">' + esc(e.code) + ', ' + esc(e.category) + '</div>' },
          { label: 'Status', render: (e) => chip(e.status) },
          { label: 'Window', render: (e) => e.startAt ? '<span class="nowrap">' + fmt.dateTime(e.startAt) + '</span>' : '<span class="subtle">Not scheduled</span>' },
          { label: 'Questions', render: (e) => e.questionCount },
          { label: 'Candidates', render: (e) => fmt.num(e.candidateCount) },
          { label: 'Proctors', render: (e) => e.proctors.length ? esc(e.proctors.map((p) => p.name.split(' ')[0]).join(', ')) : '<span class="subtle">None</span>' },
          { label: '', actions: true, align: 'right', render: examMenu }
        ] }) + pager(pg) : empty({ title: q || status !== 'all' ? 'No exams match' : 'No exams yet', text: q || status !== 'all' ? 'Try another status or search term.' : 'Create your first assessment to get started.', action: '<a class="btn btn-primary" href="' + HUK.url('admin/exam-wizard.html') + '">Create exam</a>', art: true });
      };
      const reload = () => load(el, () => E.list(), (d) => { all = d; return ''; }, { after: draw, isEmpty: () => false });
      main.querySelector('#q').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); page = 1; draw(); }, 200));
      main.addEventListener('click', (e) => {
        const c = e.target.closest('[data-status]'); if (c) { status = c.dataset.status; page = 1; HUK.setQuery({ status: status === 'all' ? null : status }); draw(); }
        const p = e.target.closest('[data-pg]'); if (p) { page = Number(p.dataset.pg); draw(); }
      });
      bindRowLinks(el);
      const X = HUK.adminExamActions;
      onAction(main, { publish: async (b) => { if (await X.publish(b.dataset.id)) reload(); }, duplicate: (b) => X.duplicate(b.dataset.id), archive: async (b) => { if (await X.archive(b.dataset.id)) reload(); }, restore: async (b) => { await X.restore(b.dataset.id); reload(); }, remove: async (b) => { if (await X.remove(b.dataset.id)) reload(); } });
      reload();
    }
  });

  /* ---------------- Exam detail / status ---------------- */
  HUK.page('admin-exam-detail', {
    title: 'Exam',
    crumbs: [HOME, EXAMS, ['Exam']],
    render(main) {
      const id = HUK.qs('id');
      let tab = 'overview', e = null;
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      const panels = {
        overview: () => '<div class="grid g-2" style="align-items:start"><section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Schedule</h2><dl class="kv"><dt>Opens</dt><dd>' + fmt.dateTime(e.startAt) + '</dd><dt>Closes</dt><dd>' + fmt.dateTime(e.endAt) + '</dd><dt>Time zone</dt><dd>' + esc(e.timezone) + '</dd><dt>Duration</dt><dd>' + e.durationMinutes + ' min (+' + e.graceMinutes + ' min grace)</dd><dt>Attempts allowed</dt><dd>' + e.attemptsAllowed + '</dd></dl><a class="btn btn-sm mt-2" href="' + HUK.url('admin/exam-wizard.html?id=' + e.id + '&step=2') + '">Edit schedule</a></section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Result rules</h2><dl class="kv"><dt>Passing score</dt><dd>' + e.resultRules.passingScore + '%</dd><dt>Release</dt><dd>' + fmt.title(e.resultRules.release) + '</dd><dt>Candidates see</dt><dd>' + ([e.resultRules.showScore && 'score', e.resultRules.showSectionBreakdown && 'section breakdown', e.resultRules.showAnswers && 'answers', e.resultRules.feedback && 'feedback'].filter(Boolean).join(', ') || 'status only') + '</dd><dt>Negative marking</dt><dd>' + (e.negativeMarking ? 'On' : 'Off') + '</dd></dl></section>' +
          '<section class="card span-all"><h2 style="font-size:var(--fs-md)">Description</h2><p class="muted mt-1">' + esc(e.description || 'No description yet.') + '</p></section></div>',
        questions: () => '<section class="card card-pad-0">' + (e.questions.length ? table({ caption: 'Questions in this exam', rows: e.questions, columns: [{ label: '#', render: (q) => e.questions.indexOf(q) + 1 }, { label: 'Question', primary: true, render: (q) => '<div class="cell-main truncate" style="max-width:52ch">' + esc(q.prompt) + '</div>' }, { label: 'Type', render: (q) => HUK.questionService.TYPES[q.type] }, { label: 'Marks', render: (q) => q.marks }, { label: '', actions: true, align: 'right', render: (q) => '<a class="btn btn-sm btn-ghost" href="' + HUK.url('admin/question-editor.html?id=' + q.id) + '">Edit</a>' }] }) : empty({ title: 'No questions yet', action: '<a class="btn btn-primary" href="' + HUK.url('admin/exam-wizard.html?id=' + e.id + '&step=3') + '">Add questions</a>' })) + '</section>',
        candidates: () => '<section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><p class="subtle">' + e.candidates.length + ' named candidates shown of ' + fmt.num(e.candidateCount) + ' assigned</p><a class="btn btn-sm" href="' + HUK.url('admin/exam-wizard.html?id=' + e.id + '&step=4') + '">Manage candidates</a></div>' + (e.candidates.length ? table({ caption: 'Candidates', rows: e.candidates, rowHref: (s) => HUK.url('admin/student-profile.html?id=' + s.id), columns: [{ label: 'Student', primary: true, render: (s) => '<div class="row">' + HUK.ui.avatar(s.name, 'avatar-sm') + '<div><div class="cell-main">' + esc(s.name) + '</div><div class="cell-sub">' + esc(s.email) + '</div></div></div>' }, { label: 'Institution', render: (s) => esc(s.institution) }, { label: 'Status', render: (s) => chip(HUK.studentService.statusFor(HUK.mockApi.peek(), HUK.mockApi.peek().exams.find((x) => x.id === e.id), s.id)) }] }) : empty({ title: 'No candidates assigned' })) + '</section>',
        proctoring: () => '<div class="grid g-2" style="align-items:start"><section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Proctoring</h2><dl class="kv"><dt>Mode</dt><dd>' + fmt.title(e.proctoringMode) + '</dd><dt>Camera</dt><dd>' + (e.proctoring.camera ? 'Required' : 'Off') + '</dd><dt>Microphone</dt><dd>' + (e.proctoring.mic ? 'Required' : 'Off') + '</dd><dt>Screen share</dt><dd>' + (e.proctoring.screen ? 'Required' : 'Off') + '</dd><dt>ID check</dt><dd>' + (e.proctoring.idCheck ? 'Required' : 'Off') + '</dd></dl><h3 class="mt-3 mb-1" style="font-size:var(--fs-base)">Proctors</h3>' + (e.proctors.length ? '<ul class="list">' + e.proctors.map((p) => '<li><a class="list-item" href="' + HUK.url('admin/proctor-profile.html?id=' + p.id) + '">' + HUK.ui.avatar(p.name, 'avatar-sm') + '<span class="li-main li-title">' + esc(p.name) + '</span>' + chip(p.availability) + '</a></li>').join('') + '</ul>' : '<p class="subtle">No proctors assigned.</p>') + '</section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Security</h2><dl class="kv"><dt>Tab switching</dt><dd>' + fmt.title(e.security.tabPolicy) + ' (limit ' + e.security.maxTabSwitches + ')</dd><dt>Copy and paste</dt><dd>' + (e.security.copyPaste ? 'Allowed' : 'Blocked') + '</dd><dt>Full screen</dt><dd>' + (e.security.fullscreen ? 'Required' : 'Optional') + '</dd><dt>Lockdown browser</dt><dd>' + (e.security.browserLock ? 'Required' : 'Not required') + '</dd><dt>IP restriction</dt><dd>' + esc(e.security.ipRestriction || 'None') + '</dd><dt>Devices per candidate</dt><dd>' + e.security.deviceLimit + '</dd></dl><a class="btn btn-sm mt-2" href="' + HUK.url('admin/exam-wizard.html?id=' + e.id + '&step=6') + '">Edit security</a></section></div>'
      };
      const draw = () => {
        HUK.shell.setCrumbs([HOME, EXAMS, [e.title]]);
        const actions = [
          '<a class="btn" href="' + HUK.url('admin/exam-wizard.html?id=' + e.id) + '">' + icon('edit', 18) + '<span>Edit</span></a>',
          e.status === 'draft' ? '<button type="button" class="btn btn-primary" data-action="publish">' + icon('send', 18) + '<span>Publish</span></button>' : '',
          ['completed', 'live'].includes(e.status) ? '<a class="btn btn-primary" href="' + HUK.url('admin/results.html?exam=' + e.id) + '">' + icon('trophy', 18) + '<span>View results</span></a>' : '',
          menu([{ label: 'Duplicate', icon: 'copy', action: 'duplicate' }, e.status === 'archived' ? { label: 'Restore', icon: 'refresh', action: 'restore' } : { label: 'Archive', icon: 'archive', action: 'archive' }], { label: 'More exam actions', triggerCls: 'btn btn-icon' })
        ].join('');
        const problems = e.status === 'draft' ? E.validate(e) : [];
        host.innerHTML = (HUK.qs('published') ? '<div class="alert mb-2" data-tone="ok" role="status">' + icon('checkCircle', 18) + '<div><strong>Published</strong>Candidates and proctors can now see this exam.</div></div>' : '') +
          pageHeader({ title: e.title, subtitle: '<span class="row-wrap" style="display:inline-flex">' + chip(e.status) + '<span>' + esc(e.code) + ', ' + esc(e.category) + '</span></span>', actions }) +
          (problems.length ? '<div class="alert mb-2" data-tone="warn">' + icon('alert', 18) + '<div><strong>Before you can publish</strong>' + problems.map((p) => esc(p.replace(/^./, (c) => c.toUpperCase()))).join('. ') + '.</div></div>' : '') +
          '<div class="grid g-4 g-metrics-mobile-2 mb-2">' + metric({ label: 'Questions', value: e.questionCount, icon: 'book' }) + metric({ label: 'Total marks', value: e.totalMarks, icon: 'target' }) + metric({ label: 'Candidates', value: fmt.num(e.candidateCount), icon: 'users' }) + metric({ label: 'Incidents', value: e.incidentCount, icon: 'flag', href: HUK.url('admin/incidents.html') }) + '</div>' +
          (e.session ? '<section class="card card-tight mb-2"><div class="between"><div class="row">' + chip('live') + '<strong>' + e.session.candidates.filter((c) => c.status === 'active').length + ' active, ' + e.session.candidates.filter((c) => c.status === 'submitted').length + ' submitted, ' + e.session.candidates.filter((c) => c.risk === 'high').length + ' high-risk</strong></div><span class="subtle">Proctor: ' + esc((e.proctors[0] || {}).name || '—') + '</span></div><div class="mt-1">' + progress(e.session.candidates.filter((c) => c.status === 'submitted').length / Math.max(1, e.session.candidates.length) * 100, { accent: true }) + '</div></section>' : '') +
          tabsHtml([['overview', 'Overview'], ['questions', 'Questions', e.questionCount], ['candidates', 'Candidates'], ['proctoring', 'Proctoring & security']], tab, 'Exam sections') + '<div id="panel" role="tabpanel"></div>';
        host.querySelector('#panel').innerHTML = panels[tab]();
        bindTabs(host, (t) => { tab = t; host.querySelector('#panel').innerHTML = panels[t](); });
        bindRowLinks(host);
      };
      load(host, () => E.get(id), (d) => { e = d; return ''; }, { skeleton: 'page', after: draw });
      const X = HUK.adminExamActions;
      const refresh = async () => { e = await E.get(id); draw(); };
      onAction(main, { publish: async () => { if (await X.publish(id)) refresh(); }, duplicate: () => X.duplicate(id), archive: async () => { if (await X.archive(id)) refresh(); }, restore: async () => { await X.restore(id); refresh(); } });
    }
  });

  /* ---------------- Schedule (calendar) ---------------- */
  HUK.page('admin-schedule', {
    title: 'Exam schedule',
    crumbs: [HOME, EXAMS, ['Schedule']],
    render(main) {
      const now = new Date();
      let y = now.getFullYear(), m = now.getMonth(), exams = [];
      main.innerHTML = pageHeader({ title: 'Exam schedule', subtitle: 'Every scheduled, live and completed exam by date.', actions: '<a class="btn btn-primary" href="' + HUK.url('admin/exam-wizard.html') + '">' + icon('plus', 18) + '<span>Create exam</span></a>' }) +
        '<section class="card"><div class="between mb-2"><div class="row"><button type="button" class="btn btn-icon btn-sm" data-nav="-1" aria-label="Previous month">' + icon('chevronLeft', 18) + '</button><h2 id="month" aria-live="polite" style="min-width:170px;text-align:center"></h2><button type="button" class="btn btn-icon btn-sm" data-nav="1" aria-label="Next month">' + icon('chevronRight', 18) + '</button><button type="button" class="btn btn-sm" data-nav="0">Today</button></div><div class="legend"><span><i style="background:var(--live-bg);border:1px solid var(--live-fg)"></i>Live</span><span><i style="background:var(--info-bg);border:1px solid var(--info-fg)"></i>Scheduled</span><span><i style="background:var(--ok-bg);border:1px solid var(--ok-fg)"></i>Completed</span></div></div><div id="cal"></div></section>';
      const cal = main.querySelector('#cal');
      const draw = () => {
        const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
        main.querySelector('#month').textContent = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const tone = { live: 'live', scheduled: 'info', completed: 'ok' };
        const dayExams = (d) => exams.filter((e) => e.startAt && new Date(e.startAt).toDateString() === d.toDateString());
        let html = '<div class="cal" role="grid" aria-label="Exam calendar">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => '<div class="cal-dow" role="columnheader">' + d + '</div>').join('');
        for (let i = 0; i < 42; i++) {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const ev = dayExams(d);
          html += '<div class="cal-day' + (d.getMonth() !== m ? ' out' : '') + (d.toDateString() === now.toDateString() ? ' today' : '') + '" role="gridcell" aria-label="' + d.toDateString() + (ev.length ? ', ' + ev.length + ' exams' : '') + '"><span class="d">' + d.getDate() + '</span>' + ev.map((e) => '<a class="cal-ev" data-tone="' + (tone[e.status] || '') + '" href="' + HUK.url('admin/exam-detail.html?id=' + e.id) + '" title="' + esc(e.title) + '">' + fmt.time(e.startAt) + ' ' + esc(e.code) + '</a>').join('') + '</div>';
        }
        html += '</div>';
        const monthEx = exams.filter((e) => e.startAt && new Date(e.startAt).getMonth() === m && new Date(e.startAt).getFullYear() === y).sort((a, b) => a.startAt.localeCompare(b.startAt));
        html += '<ul class="list cal-list">' + (monthEx.length ? monthEx.map((e) => '<li><a class="list-item" href="' + HUK.url('admin/exam-detail.html?id=' + e.id) + '"><div class="li-main"><div class="li-title">' + esc(e.title) + '</div><div class="li-sub">' + fmt.weekday(e.startAt) + ', ' + fmt.time(e.startAt) + '</div></div>' + chip(e.status) + '</a></li>').join('') : '<li class="subtle">No exams this month.</li>') + '</ul>';
        cal.innerHTML = html;
      };
      main.addEventListener('click', (e) => { const b = e.target.closest('[data-nav]'); if (!b) return; const n = Number(b.dataset.nav); if (n === 0) { y = now.getFullYear(); m = now.getMonth(); } else { m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } } draw(); });
      load(cal, () => E.list(), (d) => { exams = d.filter((e) => e.status !== 'archived'); return ''; }, { after: draw, isEmpty: () => false });
    }
  });
})();
