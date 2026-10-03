/* =========================================================
   Admin: results explorer, result detail, reports &
   analytics, proctoring incidents, system settings
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, sevChip, pageHeader, metric, field, switchRow, load, empty, table, bindRowLinks, paginate, pager, toast, modal, onAction, debounce, formData, validate, withLoading, avatar, tabsHtml, bindTabs } = HUK.ui;
  const R = HUK.resultService, A = HUK.adminService;
  const HOME = ['Dashboard', 'admin/dashboard.html'];
  const C = HUK.charts;

  /* ---------------- Results explorer ---------------- */
  HUK.page('admin-results', {
    title: 'Results',
    crumbs: [HOME, ['Results']],
    render(main) {
      let all = [], exams = [], page = 1, selected = new Set();
      const f = { examId: HUK.qs('exam') || '', status: '', incident: '', minScore: '', from: '', to: '', q: '' };
      main.innerHTML = pageHeader({ title: 'Results', subtitle: 'Scores, outcomes and integrity flags across every exam.', actions: '<button type="button" class="btn" data-action="export">' + icon('download', 18) + '<span>Export CSV</span></button>' }) +
        '<section class="card card-tight mb-2" aria-label="Filters"><form id="ff" class="grid g-4" style="gap:12px" onsubmit="return false">' +
          '<div class="field"><label for="f-examId">Exam</label><select class="select" id="f-examId" name="examId"><option value="">All exams</option></select></div>' +
          field({ name: 'status', label: 'Outcome', options: [['', 'All outcomes'], ['pass', 'Passed'], ['fail', 'Not passed'], ['under_review', 'Under review']] }) +
          field({ name: 'incident', label: 'Incident level', options: [['', 'Any'], ['none', 'None'], ['any', 'Any incident'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] }) +
          field({ name: 'minScore', label: 'Minimum score %', type: 'number', attrs: 'min="0" max="100"' }) +
          field({ name: 'from', label: 'Submitted from', type: 'date' }) + field({ name: 'to', label: 'Submitted to', type: 'date' }) +
          '<div class="field span-2"><label for="f-q">Student</label><div class="search">' + icon('search', 18) + '<input class="input" id="f-q" name="q" type="search" placeholder="Name or email"></div></div></form></section>' +
        '<div id="sum"></div><div class="card card-tight mb-2 hide" id="bulk"><div class="between"><strong id="bulk-n"></strong><div class="row-wrap"><button type="button" class="btn btn-sm btn-primary" data-action="publishSel">' + icon('send', 16) + '<span>Publish selected</span></button><button type="button" class="btn btn-sm btn-ghost" data-action="clearSel">Clear</button></div></div></div><div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const rows = () => all.filter((r) => (!f.examId || r.examId === f.examId) && (!f.status || r.status === f.status) && (!f.incident || (f.incident === 'any' ? r.incidentLevel !== 'none' : r.incidentLevel === f.incident)) && (f.minScore === '' || r.percentage >= Number(f.minScore)) && (!f.from || r.submittedAt >= f.from) && (!f.to || r.submittedAt <= f.to + 'T23:59:59') && (!f.q || (r.studentName + r.studentEmail).toLowerCase().includes(f.q.toLowerCase())));
      const draw = () => {
        const list = rows();
        const pub = list.filter((r) => r.published);
        const dist = [0, 0, 0, 0, 0]; pub.forEach((r) => { dist[Math.min(4, Math.floor(r.percentage / 20))]++; });
        const pass = pub.filter((r) => r.status === 'pass').length;
        main.querySelector('#sum').innerHTML = '<div class="grid g-4 g-metrics-mobile-2 mb-2">' + metric({ label: 'Results', value: list.length, icon: 'trophy' }) + metric({ label: 'Average score', value: pub.length ? Math.round(pub.reduce((t, r) => t + r.percentage, 0) / pub.length) + '%' : '—', icon: 'target' }) + metric({ label: 'Pass rate', value: pub.length ? Math.round(pass / pub.length * 100) + '%' : '—', icon: 'checkCircle' }) + metric({ label: 'Awaiting publication', value: list.filter((r) => !r.published).length, icon: 'clock' }) + '</div>' +
          (pub.length ? '<div class="grid g-2 mb-2"><section class="card"><div class="card-head"><h2>Score distribution</h2><span class="subtle">Published results</span></div>' + C.bars({ data: ['0–19', '20–39', '40–59', '60–79', '80–100'].map((l, i) => ({ label: l + '%', value: dist[i] })), highlightLast: false, label: 'Score distribution' }) + '</section><section class="card"><div class="card-head"><h2>Outcomes</h2></div>' + C.donut({ segments: [{ label: 'Passed', value: pass, color: 'var(--chart-1)' }, { label: 'Not passed', value: pub.length - pass, color: 'var(--chart-2)' }, { label: 'Under review', value: list.length - pub.length, color: 'var(--chart-3)' }], centre: pub.length ? Math.round(pass / pub.length * 100) + '%' : '—', sub: 'pass rate', label: 'Result outcomes' }) + '</section></div>' : '');
        const pg = paginate(list, page, 10);
        el.innerHTML = list.length ? table({ caption: 'Results', rows: pg.rows, rowHref: (r) => HUK.url('admin/result-detail.html?id=' + r.id), columns: [
          { label: '', select: true, render: (r) => r.published ? '' : '<input type="checkbox" data-sel="' + r.id + '"' + (selected.has(r.id) ? ' checked' : '') + ' aria-label="Select ' + esc(r.studentName) + '" style="width:18px;height:18px;accent-color:var(--primary)">' },
          { label: 'Student', primary: true, render: (r) => '<div class="row">' + avatar(r.studentName, 'avatar-sm') + '<div><div class="cell-main">' + esc(r.studentName) + '</div><div class="cell-sub">' + esc(r.studentEmail) + '</div></div></div>' },
          { label: 'Exam', render: (r) => '<span class="nowrap">' + esc(r.examCode) + '</span>' },
          { label: 'Score', render: (r) => '<strong class="tnum">' + r.percentage + '%</strong> <span class="subtle">' + r.score + '/' + r.maxScore + '</span>' },
          { label: 'Outcome', render: (r) => chip(r.status) },
          { label: 'Incidents', render: (r) => r.incidentLevel === 'none' ? '<span class="subtle">None</span>' : sevChip(r.incidentLevel) },
          { label: 'Submitted', render: (r) => '<span class="nowrap">' + fmt.date(r.submittedAt) + '</span>' }
        ] }) + pager(pg) : empty({ title: 'No results match these filters', text: 'Widen the date range or clear a filter.' });
        main.querySelector('#bulk').classList.toggle('hide', !selected.size);
        main.querySelector('#bulk-n').textContent = selected.size + ' unpublished result' + (selected.size === 1 ? '' : 's') + ' selected';
      };
      const reload = () => load(el, async () => { const [r, e] = await Promise.all([R.list(), HUK.examService.list()]); all = r; exams = e; return r; }, () => '', { after: () => {
        const sel = main.querySelector('#f-examId'); if (sel.options.length === 1) sel.insertAdjacentHTML('beforeend', exams.filter((e) => all.some((r) => r.examId === e.id)).map((e) => '<option value="' + e.id + '">' + esc(e.code + ': ' + e.title) + '</option>').join('')); sel.value = f.examId; draw();
      }, isEmpty: () => false });
      const ff = main.querySelector('#ff');
      ff.addEventListener('input', debounce(() => { Object.assign(f, formData(ff)); page = 1; HUK.setQuery({ exam: f.examId || null }); draw(); }, 200));
      bindRowLinks(el);
      el.addEventListener('change', (e) => { const c = e.target.closest('[data-sel]'); if (c) { c.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); draw(); } });
      main.addEventListener('click', (e) => { const p = e.target.closest('[data-pg]'); if (p) { page = Number(p.dataset.pg); draw(); } });
      onAction(main, {
        export: async () => { const list = rows(); await R.exportCsv(list); toast(list.length + ' results exported.'); },
        publishSel: (b) => withLoading(b, async () => { await R.publish([...selected]); toast(selected.size + ' results published. Students have been notified.'); selected.clear(); reload(); }),
        clearSel: () => { selected.clear(); draw(); }
      });
      reload();
    }
  });

  /* ---------------- Result detail ---------------- */
  HUK.page('admin-result-detail', {
    title: 'Result detail',
    crumbs: [HOME, ['Results', 'admin/results.html'], ['Result']],
    render(main) {
      const id = HUK.qs('id');
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      const reload = () => load(host, () => R.get(id), (r) => {
        HUK.shell.setCrumbs([HOME, ['Results', 'admin/results.html?exam=' + r.examId], [r.studentName]]);
        const better = r.cohort.filter((p) => p < r.percentage).length;
        const percentile = r.cohort.length > 1 ? Math.round(better / (r.cohort.length - 1) * 100) : 100;
        return pageHeader({ title: r.studentName, subtitle: esc(r.examTitle) + ' (' + esc(r.examCode) + ')', actions: (r.published ? '<button type="button" class="btn" data-action="withhold">' + icon('eyeOff', 18) + '<span>Withhold</span></button>' : '<button type="button" class="btn btn-primary" data-action="publish">' + icon('send', 18) + '<span>Publish result</span></button>') + '<button type="button" class="btn" data-action="export">' + icon('download', 18) + '<span>Export</span></button><a class="btn btn-ghost" href="' + HUK.url('admin/student-profile.html?id=' + r.studentId) + '">Student profile</a>' }) +
          '<section class="card"><div class="result-hero"><div class="ring" style="--val:' + r.percentage + '"><div><strong>' + r.percentage + '%</strong><span class="subtle">' + r.score + '/' + r.maxScore + '</span></div></div><div class="grow"><div class="row-wrap">' + chip(r.status) + chip(r.published ? 'published' : 'withheld', r.published ? 'Published ' + fmt.date(r.publishedAt) : 'Not published') + (r.incidentLevel !== 'none' ? sevChip(r.incidentLevel) : '') + '</div><h2 class="mt-1" style="font-size:var(--fs-xl)">' + (r.percentage >= r.passingScore ? 'Above' : 'Below') + ' the ' + r.passingScore + '% pass mark</h2><p class="muted mt-1">Rank ' + (r.rank || '—') + ' of ' + r.cohort.length + ', ahead of ' + percentile + '% of candidates. Release policy: ' + fmt.title(r.releasePolicy) + '.</p>' + (r.withheldReason ? '<p class="subtle mt-1">Withheld: ' + esc(r.withheldReason) + '</p>' : '') + '</div></div></section>' +
          '<div class="grid g-2 mt-3" style="align-items:start"><section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Section breakdown</h2>' + C.hbars(r.sections.map((s) => ({ label: s.title, value: Math.round(s.score / (s.maxScore || 1) * 100), max: 100 })), { suffix: '%' }) + '<ul class="list mt-2">' + r.sections.map((s) => '<li class="list-item" style="padding:8px 0"><span class="grow">' + esc(s.title) + '</span><strong class="tnum">' + s.score + ' / ' + s.maxScore + '</strong></li>').join('') + '</ul></section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Attempt</h2><dl class="kv"><dt>Started</dt><dd>' + fmt.dateTime(r.attempt.startedAt) + '</dd><dt>Submitted</dt><dd>' + fmt.dateTime(r.attempt.submittedAt) + (r.attempt.autoSubmitted ? ' (auto)' : '') + '</dd><dt>Time taken</dt><dd>' + fmt.dur(r.durationSeconds) + '</dd><dt>Tab switches</dt><dd>' + r.attempt.tabSwitches + '</dd><dt>IP address</dt><dd>' + esc(r.attempt.ip) + '</dd><dt>Device</dt><dd>' + esc(r.attempt.device) + '</dd><dt>Attempt ID</dt><dd><code>' + esc(r.attempt.id) + '</code></dd></dl></section>' +
          '<section class="card span-all"><h2 style="font-size:var(--fs-md)" class="mb-2">Incidents in this attempt</h2>' + (r.incidents.length ? table({ caption: 'Incidents', cards: true, rows: r.incidents, columns: [{ label: 'Type', primary: true, render: (i) => '<span class="cell-main">' + esc(HUK.proctorService.INCIDENT_TYPES[i.type] || i.type) + '</span>' }, { label: 'Severity', render: (i) => sevChip(i.severity) }, { label: 'Status', render: (i) => chip(i.status) }, { label: 'When', render: (i) => fmt.dateTime(i.timestamp) }, { label: 'Notes', render: (i) => '<span class="subtle">' + esc(i.resolution || i.description) + '</span>' }] }) : '<p class="subtle">No incidents were raised during this attempt.</p>') + '</section>' +
          (r.feedback ? '<section class="card span-all"><h2 style="font-size:var(--fs-md)">Feedback shown to the candidate</h2><p class="mt-1">' + esc(r.feedback) + '</p></section>' : '') + '</div>';
      }, { skeleton: 'page', after: (r) => onAction(host, {
        publish: (b) => withLoading(b, async () => { await R.publish([r.id]); toast('Result published. The student has been notified.'); reload(); }),
        withhold: () => modal({ title: 'Withhold this result?', body: '<p>The student won’t see the score until you publish it again.</p><form id="wf" class="mt-2">' + field({ name: 'reason', label: 'Reason (internal)', type: 'textarea', rows: 3, required: true }) + '</form>', primary: { label: 'Withhold result', cls: 'btn-danger-solid' }, onPrimary: async (dlg) => { const f = dlg.querySelector('#wf'); if (!validate(f)) return false; await R.withhold(r.id, f.reason.value); toast('Result withheld.', { tone: 'warn' }); reload(); } }),
        export: () => R.exportCsv([r], 'result-' + r.id + '.csv')
      }) });
      reload();
    }
  });

  /* ---------------- Reports & analytics ---------------- */
  HUK.page('admin-reports', {
    title: 'Reports',
    crumbs: [HOME, ['Reports']],
    render(main) {
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      load(host, () => A.analytics(), (a) => {
        const k = a.kpis, t = a.trend;
        const inc = Object.entries(a.incidentsByType);
        return pageHeader({ title: 'Reports and analytics', subtitle: 'Platform-wide performance over the last six months.', actions: '<a class="btn btn-primary" href="#generate">' + icon('download', 18) + '<span>Generate report</span></a>' }) +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Total students', value: fmt.num(k.totalStudents), icon: 'users' }) + metric({ label: 'Active exams', value: k.activeExams, icon: 'exam' }) + metric({ label: 'Completed exams', value: k.completedExams, icon: 'checkCircle' }) + metric({ label: 'Proctoring incidents', value: k.incidents, icon: 'flag' }) + metric({ label: 'Pass percentage', value: k.passPct + '%', icon: 'trophy' }) + metric({ label: 'Average score', value: k.avgScore + '%', icon: 'target' }) + metric({ label: 'Active proctors', value: k.activeProctors, icon: 'eye' }) + metric({ label: 'Attempts this month', value: fmt.num(t.attempts[t.attempts.length - 1]), icon: 'activity', foot: '<span class="delta up">+' + Math.round((t.attempts[5] / t.attempts[4] - 1) * 100) + '%</span> vs last month' }) + '</div>' +
          '<div class="grid g-2 mt-3"><section class="card"><div class="card-head"><h2>Attempts per month</h2></div>' + C.bars({ data: t.months.map((m, i) => ({ label: m, value: t.attempts[i] })), label: 'Attempts per month' }) + '</section>' +
          '<section class="card"><div class="card-head"><h2>Pass rate and average score</h2><div class="legend"><span><i style="background:var(--chart-1)"></i>Pass rate</span><span><i style="background:var(--chart-2)"></i>Avg score</span></div></div>' + C.line({ labels: t.months, series: [{ name: 'Pass rate', values: t.passRate, color: 'var(--chart-1)' }, { name: 'Average score', values: t.avgScore, color: 'var(--chart-2)', dashed: true }], max: 100, suffix: '%', label: 'Pass rate and average score' }) + '</section>' +
          '<section class="card"><div class="card-head"><h2>Performance by exam</h2><span class="subtle">Average score</span></div>' + C.hbars(a.byExam.map((e) => ({ label: e.code, value: e.avg, max: 100 })), { suffix: '%' }) + '<p class="subtle mt-2">' + a.byExam.map((e) => esc(e.code) + ': ' + e.pass + '% passed (' + e.n + ')').join('. ') + '</p></section>' +
          '<section class="card"><div class="card-head"><h2>Incidents by type</h2></div>' + C.donut({ segments: inc.map(([type, v], i) => ({ label: HUK.proctorService.INCIDENT_TYPES[type] || type, value: v, color: C.palette[i % 7] })), centre: String(inc.reduce((s, [, v]) => s + v, 0)), sub: 'incidents', label: 'Incidents by type' }) + '</section></div>' +
          '<section class="card mt-3" id="generate" aria-labelledby="gen-t"><h2 id="gen-t">Generate a report</h2><p class="subtle mt-1">Reports are built on the server and emailed when ready. In this prototype they download straight away.</p><form id="gf" class="form-grid mt-2" novalidate>' +
            field({ name: 'type', label: 'Report', options: [['results', 'Results by exam'], ['incidents', 'Proctoring incidents'], ['candidates', 'Candidate activity'], ['proctors', 'Proctor workload']] }) +
            field({ name: 'format', label: 'Format', options: [['csv', 'CSV'], ['xlsx', 'Excel (server only)'], ['pdf', 'PDF (server only)']] }) +
            field({ name: 'from', label: 'From', type: 'date', required: true, value: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) }) + field({ name: 'to', label: 'To', type: 'date', required: true, value: new Date().toISOString().slice(0, 10) }) +
            '<div class="full form-actions"><button type="submit" class="btn btn-primary" data-loading-text="Generating…">' + icon('download', 18) + '<span>Generate report</span></button></div></form></section>';
      }, { skeleton: 'page', after: () => {
        const gf = host.querySelector('#gf');
        gf.addEventListener('submit', (e) => { e.preventDefault(); if (!validate(gf)) return; const d = formData(gf); withLoading(gf.querySelector('[type=submit]'), async () => {
          // Future: POST /api/admin/reports { type, format, from, to } → job id, then poll / email
          if (d.type === 'results') { const rows = await R.list({ from: d.from, to: d.to }); await R.exportCsv(rows, 'huk-hire-results-' + d.from + '-to-' + d.to + '.csv'); toast(rows.length + ' rows exported.'); }
          else if (d.type === 'incidents') { const rows = await A.incidents(); HUK.ui.downloadText('Candidate,Exam,Type,Severity,Status,Time\n' + rows.map((i) => ['"' + i.studentName + '"', i.exam.code, i.type, i.severity, i.status, i.timestamp].join(',')).join('\n'), 'huk-hire-incidents.csv'); toast(rows.length + ' incidents exported.'); }
          else { await new Promise((r) => setTimeout(r, 900)); toast('Report queued. It will be emailed to you when ready.', { tone: 'info' }); }
          if (d.format !== 'csv') toast('Excel and PDF are generated by the backend; CSV was used for this preview.', { tone: 'info' });
        }); });
        if (location.hash === '#generate') setTimeout(() => host.querySelector('#generate').scrollIntoView(), 50);
      } });
    }
  });

  /* ---------------- Incidents ---------------- */
  HUK.page('admin-incidents', { title: 'Incidents', crumbs: [HOME, ['Incidents']], render: (main) => HUK.renderIncidents(main, { admin: true }) });

  /* ---------------- System settings ---------------- */
  HUK.page('admin-settings', {
    title: 'System settings',
    crumbs: [HOME, ['System settings']],
    render(main) {
      let s, tab = HUK.qs('tab') || 'organization';
      main.innerHTML = pageHeader({ title: 'System settings', subtitle: 'Organisation details, exam defaults and security policies.' }) + '<div id="d"></div>';
      const host = main.querySelector('#d');
      const forms = {
        organization: () => field({ name: 'name', label: 'Organisation name', value: s.organization.name, required: true }) + field({ name: 'legalName', label: 'Legal name', value: s.organization.legalName }) + field({ name: 'domain', label: 'Email domain', value: s.organization.domain, hint: 'Admins must use this domain.' }) + field({ name: 'supportEmail', label: 'Support email', type: 'email', value: s.organization.supportEmail, required: true }) + field({ name: 'timezone', label: 'Default time zone', value: s.organization.timezone, options: [['Asia/Kolkata', 'India (IST)'], ['Asia/Dubai', 'Gulf (GST)'], ['Europe/London', 'UK (GMT/BST)']] }) + field({ name: 'locale', label: 'Date and number format', value: s.organization.locale, options: [['en-IN', 'English (India)'], ['en-GB', 'English (UK)'], ['en-US', 'English (US)']] }),
        examDefaults: () => field({ name: 'durationMinutes', label: 'Default duration (minutes)', type: 'number', value: s.examDefaults.durationMinutes, attrs: 'min="5" max="480"' }) + field({ name: 'graceMinutes', label: 'Grace period (minutes)', type: 'number', value: s.examDefaults.graceMinutes, attrs: 'min="0" max="60"' }) + field({ name: 'attemptsAllowed', label: 'Attempts allowed', type: 'number', value: s.examDefaults.attemptsAllowed, attrs: 'min="1" max="5"' }) + field({ name: 'passingScore', label: 'Passing score (%)', type: 'number', value: s.examDefaults.passingScore, attrs: 'min="0" max="100"' }) + field({ name: 'proctoringMode', label: 'Proctoring mode', value: s.examDefaults.proctoringMode, options: [['live', 'Live'], ['recorded', 'Recorded'], ['none', 'None']] }) + field({ name: 'release', label: 'Result release', value: s.examDefaults.release, options: [['immediate', 'Immediately'], ['manual', 'After admin review'], ['scheduled', 'When the window closes']] }) + '<div class="full">' + switchRow({ name: 'negativeMarking', label: 'Negative marking on by default', checked: s.examDefaults.negativeMarking }) + '</div>',
        security: () => '<div class="full stack-sm">' + switchRow({ name: 'mfaForAdmins', label: 'Require two-step verification for admins', hint: 'Admins confirm sign-in with an emailed code.', checked: s.security.mfaForAdmins }) + '</div>' + field({ name: 'sessionTimeoutMinutes', label: 'Sign out after inactivity (minutes)', type: 'number', value: s.security.sessionTimeoutMinutes, attrs: 'min="5" max="240"' }) + field({ name: 'passwordMinLength', label: 'Minimum password length', type: 'number', value: s.security.passwordMinLength, attrs: 'min="8" max="64"' }) + field({ name: 'tabPolicy', label: 'Default tab-switch policy', value: s.security.tabPolicy, options: [['allow', 'Allow and log'], ['warn', 'Warn and alert proctor'], ['block', 'End attempt after the limit']] }) + field({ name: 'maxTabSwitches', label: 'Default tab-switch limit', type: 'number', value: s.security.maxTabSwitches, attrs: 'min="0" max="20"' }) + field({ name: 'ipAllowlist', label: 'Admin IP allowlist', value: s.security.ipAllowlist, hint: 'Comma-separated CIDR ranges. Leave blank to allow any network.' }) + field({ name: 'dataRetentionDays', label: 'Keep recordings for (days)', type: 'number', value: s.security.dataRetentionDays, attrs: 'min="30" max="1095"' }),
        notifications: () => '<div class="full stack-sm">' + switchRow({ name: 'emailCandidates', label: 'Email candidates about schedules and results', checked: s.notifications.emailCandidates }) + switchRow({ name: 'smsReminders', label: 'SMS reminders on exam day', checked: s.notifications.smsReminders }) + switchRow({ name: 'proctorAlerts', label: 'Push high-risk alerts to admins', checked: s.notifications.proctorAlerts }) + switchRow({ name: 'dailyDigest', label: 'Daily operations digest', checked: s.notifications.dailyDigest }) + '</div>'
      };
      const labels = { organization: 'Organisation', examDefaults: 'Exam defaults', security: 'Security policies', notifications: 'Notifications' };
      const draw = () => {
        host.innerHTML = tabsHtml(Object.entries(labels), tab, 'Settings sections') + '<section class="card" role="tabpanel"><form id="sf" class="form-grid" novalidate>' + forms[tab]() + '<div class="full form-actions"><button type="reset" class="btn btn-ghost">Discard changes</button><button type="submit" class="btn btn-primary" data-loading-text="Saving…">Save ' + labels[tab].toLowerCase() + '</button></div></form></section>';
        bindTabs(host, (t) => { tab = t; HUK.setQuery({ tab: t }); draw(); host.querySelector('[role=tab][aria-selected=true]').focus(); });
        const f = host.querySelector('#sf');
        f.addEventListener('reset', () => setTimeout(draw, 0));
        f.addEventListener('submit', (e) => { e.preventDefault(); if (!validate(f)) return; const d = formData(f); Object.keys(d).forEach((k) => { if (f.elements[k] && f.elements[k].type === 'number') d[k] = Number(d[k]); }); withLoading(f.querySelector('[type=submit]'), async () => { s = await A.saveSettings(tab, d); toast(labels[tab] + ' saved.'); }); });
      };
      load(host, () => A.settings(), (d) => { s = d; return ''; }, { skeleton: 'page', after: draw });
    }
  });
})();
