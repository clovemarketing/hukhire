/* =========================================================
   Admin: students, student profile, proctors, proctor
   profile, admins & roles
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, sevChip, pageHeader, metric, field, load, empty, table, bindRowLinks, paginate, pager, toast, confirm, modal, drawer, onAction, debounce, validate, formData, menu, avatar, parseCsv, downloadText, tabsHtml, bindTabs, withLoading } = HUK.ui;
  const A = HUK.adminService, E = HUK.examService;
  const HOME = ['Dashboard', 'admin/dashboard.html'];

  /* ---------- Shared student modals ---------- */
  const S = {
    edit(s = {}, done) {
      return modal({ title: s.id ? 'Edit ' + s.name : 'Add student', body: '<form id="sf" class="form-grid" novalidate>' + field({ name: 'name', label: 'Full name', value: s.name || '', required: true, full: true }) + field({ name: 'email', label: 'Email', type: 'email', value: s.email || '', required: true }) + field({ name: 'phone', label: 'Mobile', type: 'tel', value: s.phone || '' }) + field({ name: 'institution', label: 'College or company', value: s.institution || '' }) + field({ name: 'program', label: 'Programme', value: s.program || '' }) + field({ name: 'group', label: 'Cohort', value: s.group || '', full: true, hint: 'Used to assign exams to many students at once.' }) + (s.id ? '' : '<p class="subtle full">The student receives an email to set their password.</p>') + '</form>',
        primary: { label: s.id ? 'Save changes' : 'Add student' },
        onPrimary: async (dlg) => { const f = dlg.querySelector('#sf'); if (!validate(f)) return false; try { await A.saveStudent({ id: s.id, ...formData(f) }); } catch (e) { HUK.ui.setFieldError(f.email, e.message); f.email.focus(); return false; } toast(s.id ? 'Student updated.' : 'Student added and invited.'); done && done(); } });
    },
    async assign(ids, done) {
      const exams = (await E.list()).filter((e) => ['draft', 'scheduled', 'live'].includes(e.status));
      return modal({ title: 'Assign to an exam', body: '<p>' + ids.length + ' student' + (ids.length > 1 ? 's' : '') + ' selected.</p><form id="af" class="mt-2">' + field({ name: 'examId', label: 'Exam', options: exams.map((e) => [e.id, e.code + ': ' + e.title + ' (' + HUK.ui.STATUS[e.status][0] + ')']) }) + '</form>', primary: { label: 'Assign exam' },
        onPrimary: async (dlg) => { const examId = dlg.querySelector('[name=examId]').value; await A.assignExam(ids, examId); toast('Assigned to ' + exams.find((e) => e.id === examId).code + '.'); done && done(); } });
    },
    async toggleStatus(s, done) {
      const off = s.status !== 'deactivated';
      if (off && !await confirm({ title: 'Deactivate ' + s.name + '?', message: 'They won’t be able to sign in or start exams. Their results are kept. You can reactivate them later.', confirmLabel: 'Deactivate', danger: true })) return;
      await A.setUserStatus(s.id, off ? 'deactivated' : 'active'); toast(off ? 'Account deactivated.' : 'Account reactivated.'); done && done();
    },
    async reset(s) { await A.sendPasswordReset(s.id); toast('Password reset link sent to ' + s.email + '.'); },
    import(done) {
      let rows = [];
      return modal({ title: 'Import students', size: 'modal-lg', body: '<p>Upload a CSV with the columns <code>name</code>, <code>email</code>, <code>institution</code>, <code>group</code>. Existing emails are skipped.</p><div class="row-wrap mt-2"><label class="btn btn-primary" style="cursor:pointer">' + icon('upload', 18) + '<span>Choose CSV</span><input type="file" accept=".csv" id="sfile" class="sr-only"></label><button type="button" class="btn btn-ghost" id="stpl">' + icon('download', 18) + '<span>Template</span></button></div><div id="sprev" class="mt-2" aria-live="polite"></div>',
        primary: { label: 'Import students' },
        onOpen: (dlg) => {
          const p = dlg.querySelector('[data-primary]'); p.disabled = true;
          dlg.querySelector('#stpl').addEventListener('click', () => downloadText('name,email,institution,group\nAnjali Rao,anjali.rao@mail.com,Andhra University,"Campus Drive 2026, Batch C"\n', 'students-template.csv'));
          dlg.querySelector('#sfile').addEventListener('change', (e) => { const fr = new FileReader(); fr.onload = () => { rows = parseCsv(String(fr.result)).filter((r) => r.email && /@/.test(r.email) && r.name); dlg.querySelector('#sprev').innerHTML = rows.length ? '<div class="alert" data-tone="ok">' + icon('checkCircle', 18) + '<div>' + rows.length + ' valid rows found in ' + esc(e.target.files[0].name) + '.</div></div>' + table({ caption: 'Preview', cards: false, rows: rows.slice(0, 5), columns: [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Group', key: 'group' }] }) + (rows.length > 5 ? '<p class="subtle mt-1">and ' + (rows.length - 5) + ' more</p>' : '') : '<div class="alert" data-tone="bad">' + icon('alert', 18) + '<div>No valid rows. Each row needs a name and email.</div></div>'; p.disabled = !rows.length; }; fr.readAsText(e.target.files[0]); });
        },
        onPrimary: async () => { const r = await A.importStudents(rows); toast(r.added + ' students added' + (r.skipped ? ', ' + r.skipped + ' already existed' : '') + '.'); done && done(); } });
    }
  };

  /* ---------------- Students ---------------- */
  HUK.page('admin-students', {
    title: 'Students',
    crumbs: [HOME, ['Students']],
    render(main) {
      let all = [], q = '', status = '', group = '', page = 1, selected = new Set();
      main.innerHTML = pageHeader({ title: 'Students', subtitle: 'Candidate accounts, cohorts and exam assignments.', actions: '<button type="button" class="btn" data-action="import">' + icon('upload', 18) + '<span>Import CSV</span></button><button type="button" class="btn btn-primary" data-action="add">' + icon('plus', 18) + '<span>Add student</span></button>' }) +
        '<div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="q">Search students</label><input class="input" id="q" type="search" placeholder="Search name, email or college"></div><label class="sr-only" for="st">Status</label><select class="select" id="st" style="width:auto"><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="deactivated">Deactivated</option></select><label class="sr-only" for="gr">Cohort</label><select class="select" id="gr" style="width:auto"><option value="">All cohorts</option></select></div>' +
        '<div class="card card-tight mb-2 hide" id="bulk" role="region" aria-label="Bulk actions"><div class="between"><strong id="bulk-n"></strong><div class="row-wrap"><button type="button" class="btn btn-sm" data-action="bulkAssign">' + icon('exam', 16) + '<span>Assign exam</span></button><button type="button" class="btn btn-sm btn-ghost" data-action="clearSel">Clear selection</button></div></div></div>' +
        '<div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const draw = () => {
        const rows = all.filter((s) => (!status || s.status === status) && (!group || s.group === group) && (!q || (s.name + s.email + (s.institution || '')).toLowerCase().includes(q)));
        const pg = paginate(rows, page, 10);
        el.innerHTML = rows.length ? table({ caption: 'Students', rows: pg.rows, columns: [
          { label: '', select: true, render: (s) => '<input type="checkbox" data-sel="' + s.id + '"' + (selected.has(s.id) ? ' checked' : '') + ' aria-label="Select ' + esc(s.name) + '" style="width:18px;height:18px;accent-color:var(--primary)">' },
          { label: 'Student', primary: true, render: (s) => '<button type="button" class="link-btn row" style="color:inherit;text-align:left" data-action="peek" data-id="' + s.id + '">' + avatar(s.name, 'avatar-sm') + '<span><span class="cell-main" style="display:block">' + esc(s.name) + '</span><span class="cell-sub">' + esc(s.email) + '</span></span></button>' },
          { label: 'College', render: (s) => esc(s.institution || '—') },
          { label: 'Cohort', render: (s) => '<span class="subtle">' + esc(s.group || '—') + '</span>' },
          { label: 'Status', render: (s) => chip(s.status) },
          { label: 'Attempts', render: (s) => s.stats.attempts },
          { label: 'Avg score', render: (s) => s.stats.avg == null ? '—' : s.stats.avg + '%' },
          { label: '', actions: true, align: 'right', render: (s) => menu([{ label: 'View profile', icon: 'user', href: HUK.url('admin/student-profile.html?id=' + s.id) }, { label: 'Edit', icon: 'edit', action: 'edit', id: s.id }, { label: 'Assign exam', icon: 'exam', action: 'assign', id: s.id }, { label: 'Send password reset', icon: 'key', action: 'reset', id: s.id }, '-', { label: s.status === 'deactivated' ? 'Reactivate' : 'Deactivate', icon: s.status === 'deactivated' ? 'refresh' : 'lock', action: 'status', id: s.id, danger: s.status !== 'deactivated' }], { label: 'Actions for ' + s.name }) }
        ] }) + pager(pg) : empty({ title: all.length ? 'No students match' : 'No students yet', text: all.length ? 'Try a different search or filter.' : 'Add students one by one or import a CSV.', action: '<button type="button" class="btn btn-primary" data-action="add">Add student</button>' });
        main.querySelector('#bulk').classList.toggle('hide', !selected.size);
        main.querySelector('#bulk-n').textContent = selected.size + ' selected';
      };
      const reload = () => load(el, async () => { const [s, g] = await Promise.all([A.students(), A.groups()]); all = s; const sel = main.querySelector('#gr'); if (sel.options.length === 1) sel.insertAdjacentHTML('beforeend', g.map((x) => '<option>' + esc(x) + '</option>').join('')); return s; }, () => '', { after: draw, isEmpty: () => false });
      main.querySelector('#q').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); page = 1; draw(); }, 200));
      main.querySelector('#st').addEventListener('change', (e) => { status = e.target.value; page = 1; draw(); });
      main.querySelector('#gr').addEventListener('change', (e) => { group = e.target.value; page = 1; draw(); });
      el.addEventListener('change', (e) => { const c = e.target.closest('[data-sel]'); if (c) { c.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); draw(); } });
      main.addEventListener('click', (e) => { const p = e.target.closest('[data-pg]'); if (p) { page = Number(p.dataset.pg); draw(); } });
      const find = (b) => all.find((s) => s.id === b.dataset.id);
      onAction(main, {
        add: () => S.edit({}, reload), import: () => S.import(reload), edit: (b) => S.edit(find(b), reload), assign: (b) => S.assign([b.dataset.id], reload), reset: (b) => S.reset(find(b)), status: (b) => S.toggleStatus(find(b), reload),
        bulkAssign: () => S.assign([...selected], () => { selected.clear(); reload(); }), clearSel: () => { selected.clear(); draw(); },
        peek: (b) => { const s = find(b); drawer({ title: s.name, body: '<div class="profile-head mb-2">' + avatar(s.name, 'avatar-lg') + '<div><div class="row-wrap">' + chip(s.status) + '</div><p class="subtle mt-1">' + esc(s.email) + '</p></div></div><dl class="kv"><dt>College</dt><dd>' + esc(s.institution || '—') + '</dd><dt>Programme</dt><dd>' + esc(s.program || '—') + '</dd><dt>Cohort</dt><dd>' + esc(s.group || '—') + '</dd><dt>Phone</dt><dd>' + esc(s.phone || '—') + '</dd><dt>Joined</dt><dd>' + fmt.date(s.createdAt) + '</dd><dt>Last active</dt><dd>' + fmt.rel(s.lastActiveAt) + '</dd></dl><div class="grid g-3 mt-3" style="gap:8px">' + [['Assigned', s.stats.assigned], ['Attempts', s.stats.attempts], ['Avg', s.stats.avg == null ? '—' : s.stats.avg + '%']].map(([l, v]) => '<div class="card card-flat card-tight center"><strong style="font-size:1.25rem">' + v + '</strong><div class="subtle">' + l + '</div></div>').join('') + '</div>', primary: { label: 'Open full profile' }, secondary: { label: 'Close' } }).then((r) => { if (r === 'primary') HUK.go('admin/student-profile.html?id=' + s.id); }); }
      });
      if (HUK.qs('add')) S.edit({}, reload);
      reload();
    }
  });

  /* ---------------- Student profile ---------------- */
  HUK.page('admin-student-profile', {
    title: 'Student profile',
    crumbs: [HOME, ['Students', 'admin/students.html'], ['Profile']],
    render(main) {
      const id = HUK.qs('id');
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      const reload = () => load(host, () => A.student(id), (s) => {
        HUK.shell.setCrumbs([HOME, ['Students', 'admin/students.html'], [s.name]]);
        return '<header class="page-header"><div class="profile-head">' + avatar(s.name, 'avatar-xl') + '<div><h1>' + esc(s.name) + '</h1><p class="muted">' + esc(s.email) + '</p><div class="row-wrap mt-1">' + chip(s.status) + '<span class="tag">' + esc(s.group || 'No cohort') + '</span></div></div></div><div class="page-actions"><button type="button" class="btn" data-action="edit">' + icon('edit', 18) + '<span>Edit</span></button><button type="button" class="btn btn-primary" data-action="assign">' + icon('exam', 18) + '<span>Assign exam</span></button>' + menu([{ label: 'Send password reset', icon: 'key', action: 'reset' }, { label: s.status === 'deactivated' ? 'Reactivate' : 'Deactivate', icon: 'lock', action: 'status', danger: s.status !== 'deactivated' }], { label: 'More actions', triggerCls: 'btn btn-icon' }) + '</div></header>' +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Exams assigned', value: s.stats.assigned, icon: 'exam' }) + metric({ label: 'Attempts', value: s.stats.attempts, icon: 'clock' }) + metric({ label: 'Average score', value: s.stats.avg == null ? '—' : s.stats.avg + '%', icon: 'target' }) + metric({ label: 'Incidents', value: s.stats.incidents, icon: 'flag' }) + '</div>' +
          '<div class="grid g-main-side mt-3"><div class="stack-lg"><section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><h2>Assigned exams</h2></div>' + (s.exams.length ? table({ caption: 'Assigned exams', rows: s.exams, rowHref: (e) => HUK.url('admin/exam-detail.html?id=' + e.id), columns: [{ label: 'Exam', primary: true, render: (e) => '<div class="cell-main">' + esc(e.title) + '</div><div class="cell-sub">' + esc(e.code) + '</div>' }, { label: 'Date', render: (e) => fmt.date(e.startAt) }, { label: 'Exam status', render: (e) => chip(e.status) }, { label: 'Candidate status', render: (e) => chip(e.studentStatus) }] }) : empty({ title: 'No exams assigned' })) + '</section>' +
          '<section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><h2>Results</h2></div>' + (s.results.length ? table({ caption: 'Results', rows: s.results, rowHref: (r) => HUK.url('admin/result-detail.html?id=' + r.id), columns: [{ label: 'Exam', primary: true, render: (r) => '<span class="cell-main">' + esc(r.examTitle) + '</span>' }, { label: 'Score', render: (r) => r.percentage + '%' }, { label: 'Result', render: (r) => chip(r.status) }, { label: 'Published', render: (r) => r.published ? fmt.date(r.publishedAt) : '<span class="subtle">Not yet</span>' }] }) : empty({ title: 'No results yet' })) + '</section></div>' +
          '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Details</h2><dl class="kv"><dt>College</dt><dd>' + esc(s.institution || '—') + '</dd><dt>Programme</dt><dd>' + esc(s.program || '—') + '</dd><dt>Phone</dt><dd>' + esc(s.phone || '—') + '</dd><dt>Joined</dt><dd>' + fmt.date(s.createdAt) + '</dd><dt>Last active</dt><dd>' + fmt.rel(s.lastActiveAt) + '</dd></dl></section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Incidents</h2>' + (s.incidents.length ? '<ul class="list">' + s.incidents.map((i) => '<li class="list-item"><div class="li-main"><div class="li-title" style="font-size:var(--fs-sm)">' + esc(HUK.proctorService.INCIDENT_TYPES[i.type] || i.type) + '</div><div class="li-sub">' + fmt.date(i.timestamp) + '</div></div>' + sevChip(i.severity) + chip(i.status) + '</li>').join('') + '</ul><a class="btn btn-sm mt-2" href="' + HUK.url('admin/incidents.html') + '">Review incidents</a>' : '<p class="subtle">No incidents on record.</p>') + '</section></aside></div>';
      }, { skeleton: 'page', after: (s) => {
        bindRowLinks(host);
        onAction(host, { edit: () => S.edit(s, reload), assign: () => S.assign([s.id], reload), reset: () => S.reset(s), status: () => S.toggleStatus(s, reload) });
      } });
      reload();
    }
  });

  /* ---------- Proctor modals ---------- */
  const P = {
    edit(p = {}, done) {
      return modal({ title: p.id ? 'Edit ' + p.name : 'Add proctor', body: '<form id="pf" class="form-grid" novalidate>' + field({ name: 'name', label: 'Full name', value: p.name || '', required: true, full: true }) + field({ name: 'email', label: 'Email', type: 'email', value: p.email || '', required: true }) + field({ name: 'phone', label: 'Mobile', type: 'tel', value: p.phone || '' }) + field({ name: 'timezone', label: 'Time zone', value: p.timezone || 'Asia/Kolkata', options: [['Asia/Kolkata', 'India (IST)'], ['Asia/Dubai', 'Gulf (GST)'], ['Europe/London', 'UK (GMT/BST)']] }) + '</form>', primary: { label: p.id ? 'Save changes' : 'Add proctor' },
        onPrimary: async (dlg) => { const f = dlg.querySelector('#pf'); if (!validate(f)) return false; try { await A.saveProctor({ id: p.id, ...formData(f) }); } catch (e) { HUK.ui.setFieldError(f.email, e.message); return false; } toast(p.id ? 'Proctor updated.' : 'Proctor added. They’ll get an invite email.'); done && done(); } });
    },
    async toggle(p, done) {
      const off = p.status !== 'deactivated';
      if (off && !await confirm({ title: 'Deactivate ' + p.name + '?', message: 'They’ll be removed from future sessions and can’t sign in.', confirmLabel: 'Deactivate', danger: true })) return;
      await A.setUserStatus(p.id, off ? 'deactivated' : 'active'); toast(off ? 'Proctor deactivated.' : 'Proctor reactivated.'); done && done();
    },
    async assign(p, done) {
      const exams = (await E.list()).filter((e) => ['draft', 'scheduled'].includes(e.status));
      modal({ title: 'Assign ' + p.name + ' to an exam', body: '<form id="af">' + field({ name: 'examId', label: 'Exam', options: exams.map((e) => [e.id, e.code + ': ' + e.title]) }) + '</form>', primary: { label: 'Assign' },
        onPrimary: async (dlg) => { const id = dlg.querySelector('[name=examId]').value; const e = exams.find((x) => x.id === id); await E.saveDraft({ id, proctorIds: [...new Set((e.proctorIds || []).concat(p.id))] }); toast(p.name + ' assigned to ' + e.code + '.'); done && done(); } });
    }
  };
  const deviceChips = (d) => '<div class="row-wrap" style="gap:4px">' + chip(d.camera === 'ready' ? 'ok' : d.camera, 'Camera ' + (d.camera === 'ready' ? 'ready' : d.camera === 'failed' ? 'failed' : 'unchecked')) + chip(d.mic === 'ready' ? 'ok' : d.mic, 'Mic ' + (d.mic === 'ready' ? 'ready' : d.mic === 'failed' ? 'failed' : 'unchecked')) + '</div>';

  /* ---------------- Proctors ---------------- */
  HUK.page('admin-proctors', {
    title: 'Proctors',
    crumbs: [HOME, ['Proctors']],
    render(main) {
      let all = [], q = '', avail = '';
      main.innerHTML = pageHeader({ title: 'Proctors', subtitle: 'Availability, device readiness and session load.', actions: '<button type="button" class="btn btn-primary" data-action="add">' + icon('plus', 18) + '<span>Add proctor</span></button>' }) +
        '<div class="grid g-4 mb-2 g-metrics-mobile-2" id="kpi"></div><div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="q">Search proctors</label><input class="input" id="q" type="search" placeholder="Search proctors"></div><div class="filter-chips" role="group" aria-label="Availability">' + [['', 'All'], ['online', 'Online'], ['busy', 'Busy'], ['away', 'Away'], ['offline', 'Offline']].map(([k, l]) => '<button type="button" class="filter-chip" data-avail="' + k + '" aria-pressed="' + (k === avail) + '">' + l + '</button>').join('') + '</div></div><div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const draw = () => {
        main.querySelector('#kpi').innerHTML = metric({ label: 'Online now', value: all.filter((p) => p.availability === 'online').length, icon: 'eye' }) + metric({ label: 'In a session', value: all.filter((p) => p.stats.live).length, icon: 'video' }) + metric({ label: 'Device issues', value: all.filter((p) => p.device.camera !== 'ready' || p.device.mic !== 'ready').length, icon: 'alert' }) + metric({ label: 'Active proctors', value: all.filter((p) => p.status === 'active').length, icon: 'users' });
        const rows = all.filter((p) => (!avail || p.availability === avail) && (!q || (p.name + p.email).toLowerCase().includes(q)));
        el.innerHTML = rows.length ? table({ caption: 'Proctors', rows, rowHref: (p) => HUK.url('admin/proctor-profile.html?id=' + p.id), columns: [
          { label: 'Proctor', primary: true, render: (p) => '<div class="row">' + avatar(p.name, 'avatar-sm') + '<div><div class="cell-main">' + esc(p.name) + '</div><div class="cell-sub">' + esc(p.email) + '</div></div></div>' },
          { label: 'Availability', render: (p) => chip(p.availability) },
          { label: 'Devices', render: (p) => deviceChips(p.device) },
          { label: 'Sessions', render: (p) => '<span class="nowrap">' + p.stats.live + ' live, ' + p.stats.scheduled + ' upcoming</span>' },
          { label: 'Completed', render: (p) => p.sessionsCompleted },
          { label: 'Account', render: (p) => chip(p.status) },
          { label: '', actions: true, align: 'right', render: (p) => menu([{ label: 'View profile', icon: 'user', href: HUK.url('admin/proctor-profile.html?id=' + p.id) }, { label: 'Edit', icon: 'edit', action: 'edit', id: p.id }, { label: 'Assign to exam', icon: 'calendar', action: 'assign', id: p.id }, '-', { label: p.status === 'deactivated' ? 'Reactivate' : 'Deactivate', icon: 'lock', action: 'toggle', id: p.id, danger: p.status !== 'deactivated' }], { label: 'Actions for ' + p.name }) }
        ] }) : empty({ title: 'No proctors match', text: 'Change the availability filter or search.' });
      };
      const reload = () => load(el, () => A.proctors(), (d) => { all = d; return ''; }, { after: draw, isEmpty: () => false });
      bindRowLinks(el);
      main.querySelector('#q').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 200));
      main.addEventListener('click', (e) => { const b = e.target.closest('[data-avail]'); if (b) { avail = b.dataset.avail; main.querySelectorAll('[data-avail]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); } });
      const find = (b) => all.find((p) => p.id === b.dataset.id);
      onAction(main, { add: () => P.edit({}, reload), edit: (b) => P.edit(find(b), reload), toggle: (b) => P.toggle(find(b), reload), assign: (b) => P.assign(find(b), reload) });
      if (HUK.qs('add')) P.edit({}, reload);
      reload();
    }
  });

  /* ---------------- Proctor profile ---------------- */
  HUK.page('admin-proctor-profile', {
    title: 'Proctor profile',
    crumbs: [HOME, ['Proctors', 'admin/proctors.html'], ['Profile']],
    render(main) {
      const id = HUK.qs('id');
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      const reload = () => load(host, () => A.proctor(id), (p) => {
        HUK.shell.setCrumbs([HOME, ['Proctors', 'admin/proctors.html'], [p.name]]);
        return '<header class="page-header"><div class="profile-head">' + avatar(p.name, 'avatar-xl') + '<div><h1>' + esc(p.name) + '</h1><p class="muted">' + esc(p.email) + '</p><div class="row-wrap mt-1">' + chip(p.availability) + chip(p.status) + '</div></div></div><div class="page-actions"><button type="button" class="btn" data-action="edit">' + icon('edit', 18) + '<span>Edit</span></button><button type="button" class="btn btn-primary" data-action="assign">' + icon('calendar', 18) + '<span>Assign to exam</span></button><button type="button" class="btn ' + (p.status === 'deactivated' ? '' : 'btn-danger') + '" data-action="toggle">' + (p.status === 'deactivated' ? 'Reactivate' : 'Deactivate') + '</button></div></header>' +
          '<div class="grid g-4 g-metrics-mobile-2">' + metric({ label: 'Live sessions', value: p.stats.live, icon: 'video' }) + metric({ label: 'Upcoming', value: p.stats.scheduled, icon: 'calendar' }) + metric({ label: 'Sessions completed', value: p.sessionsCompleted, icon: 'checkCircle' }) + metric({ label: 'Candidate rating', value: p.rating ? p.rating + '/5' : '—', icon: 'trophy' }) + '</div>' +
          '<div class="grid g-main-side mt-3"><section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><h2>Sessions</h2></div>' + (p.sessions.length ? table({ caption: 'Sessions', rows: p.sessions, rowHref: (s) => HUK.url('admin/exam-detail.html?id=' + s.examId), columns: [{ label: 'Exam', primary: true, render: (s) => '<div class="cell-main">' + esc(s.exam.title) + '</div><div class="cell-sub">' + esc(s.exam.code) + '</div>' }, { label: 'Date', render: (s) => fmt.dateTime(s.startedAt) }, { label: 'Candidates', render: (s) => s.candidates.length || s.exam.candidateCount }, { label: 'Status', render: (s) => chip(s.status) }] }) : empty({ title: 'No sessions yet', iconName: 'video' })) + '</section>' +
          '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Device readiness</h2>' + deviceChips(p.device) + '<dl class="kv mt-2"><dt>Bandwidth</dt><dd>' + esc(p.device.bandwidth) + '</dd><dt>Last check</dt><dd>' + fmt.rel(new Date(Date.now() - 26 * 3600e3).toISOString()) + '</dd></dl>' + (p.device.camera === 'failed' || p.device.mic !== 'ready' ? '<div class="alert mt-2" data-tone="warn">' + icon('alert', 18) + '<div>Ask ' + esc(p.name.split(' ')[0]) + ' to re-run the device test in Settings before their next session.</div></div>' : '') + '</section>' +
          '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Details</h2><dl class="kv"><dt>Phone</dt><dd>' + esc(p.phone || '—') + '</dd><dt>Time zone</dt><dd>' + esc(p.timezone) + '</dd><dt>Incidents raised</dt><dd>' + p.incidents + '</dd><dt>Joined</dt><dd>' + fmt.date(p.createdAt) + '</dd></dl></section></aside></div>';
      }, { skeleton: 'page', after: (p) => { bindRowLinks(host); onAction(host, { edit: () => P.edit(p, reload), toggle: () => P.toggle(p, reload), assign: () => P.assign(p, reload) }); } });
      reload();
    }
  });

  /* ---------------- Admins & roles ---------------- */
  HUK.page('admin-admins', {
    title: 'Admins & roles',
    crumbs: [HOME, ['Admins & roles']],
    render(main, { user }) {
      let data, tab = 'admins';
      main.innerHTML = pageHeader({ title: 'Admins and roles', subtitle: 'Who can manage HUK HIRE and what each role is allowed to do.', actions: '<button type="button" class="btn btn-primary" data-action="invite">' + icon('mail', 18) + '<span>Invite admin</span></button>' }) + '<div id="d"></div>';
      const host = main.querySelector('#d');
      const roleName = (id) => (data.roles.find((r) => r.id === id) || {}).name || id;
      const panels = {
        admins: () => '<div class="card card-pad-0">' + table({ caption: 'Admins', rows: data.admins, columns: [
          { label: 'Admin', primary: true, render: (a) => '<div class="row">' + avatar(a.name, 'avatar-sm') + '<div><div class="cell-main">' + esc(a.name) + (a.id === user.id ? ' <span class="tag">You</span>' : '') + '</div><div class="cell-sub">' + esc(a.email) + '</div></div></div>' },
          { label: 'Role', render: (a) => a.id === user.id || a.status === 'revoked' ? esc(roleName(a.roleId)) : '<label class="sr-only" for="r-' + a.id + '">Role for ' + esc(a.name) + '</label><select class="select" id="r-' + a.id + '" data-role-for="' + a.id + '" style="min-height:38px;width:auto">' + data.roles.map((r) => '<option value="' + r.id + '"' + (r.id === a.roleId ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select>' },
          { label: 'Status', render: (a) => chip(a.status) },
          { label: 'Last active', render: (a) => a.lastActiveAt ? fmt.rel(a.lastActiveAt) : '<span class="subtle">Never</span>' },
          { label: '', actions: true, align: 'right', render: (a) => a.id === user.id ? '' : a.status === 'invited' ? '<button type="button" class="btn btn-sm" data-action="resend" data-id="' + a.id + '">Resend invite</button> <button type="button" class="btn btn-sm btn-danger" data-action="revoke" data-id="' + a.id + '">Cancel</button>' : a.status === 'revoked' ? '<button type="button" class="btn btn-sm" data-action="restore" data-id="' + a.id + '">Restore access</button>' : '<button type="button" class="btn btn-sm btn-danger" data-action="revoke" data-id="' + a.id + '">Revoke access</button>' }
        ] }) + '</div>',
        roles: () => '<div class="stack-lg">' + '<div class="grid g-3">' + data.roles.map((r) => '<div class="card card-tight"><h3>' + esc(r.name) + '</h3><p class="subtle mt-1">' + esc(r.description) + '</p><p class="mt-1"><span class="tag">' + data.admins.filter((a) => a.roleId === r.id).length + ' admins</span></p></div>').join('') + '</div>' +
          '<section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><div><h2>Permissions</h2><p class="subtle">Super admin always has every permission.</p></div><button type="button" class="btn btn-primary btn-sm" data-action="savePerms" data-loading-text="Saving…">Save permissions</button></div><div class="table-wrap"><table class="table matrix"><caption class="sr-only">Role permissions</caption><thead><tr><th scope="col">Permission</th>' + data.roles.map((r) => '<th scope="col">' + esc(r.name) + '</th>').join('') + '</tr></thead><tbody>' + data.permissions.map((p) => '<tr><th scope="row" style="font-weight:600;color:var(--text);font-size:var(--fs-sm);background:none">' + esc(p.label) + '</th>' + data.roles.map((r) => '<td><input type="checkbox" data-perm="' + r.id + ':' + p.id + '"' + (r.permissions.includes(p.id) ? ' checked' : '') + (r.id === 'super_admin' ? ' disabled' : '') + ' aria-label="' + esc(r.name + ': ' + p.label) + '"></td>').join('') + '</tr>').join('') + '</tbody></table></div></section></div>'
      };
      const draw = () => { host.innerHTML = tabsHtml([['admins', 'Admins', data.admins.length], ['roles', 'Roles and permissions']], tab, 'Admin settings') + '<div role="tabpanel" id="panel">' + panels[tab]() + '</div>'; bindTabs(host, (t) => { tab = t; host.querySelector('#panel').innerHTML = panels[t](); }); };
      const reload = () => load(host, () => A.admins(), (d) => { data = d; return ''; }, { skeleton: 'page', after: draw });
      host.addEventListener('change', async (e) => { const s = e.target.closest('[data-role-for]'); if (!s) return; await A.updateAdmin(s.dataset.roleFor, { roleId: s.value }); toast('Role changed to ' + roleName(s.value) + '.'); data.admins.find((a) => a.id === s.dataset.roleFor).roleId = s.value; });
      const find = (b) => data.admins.find((a) => a.id === b.dataset.id);
      onAction(main, {
        invite: () => modal({ title: 'Invite an admin', body: '<form id="if" class="stack" novalidate>' + field({ name: 'name', label: 'Full name', required: true }) + field({ name: 'email', label: 'Work email', type: 'email', required: true }) + field({ name: 'roleId', label: 'Role', options: data.roles.map((r) => [r.id, r.name + ': ' + r.description]) }) + '<p class="subtle">They’ll get an email with a link that expires in 7 days.</p></form>', primary: { label: 'Send invite' },
          onPrimary: async (dlg) => { const f = dlg.querySelector('#if'); if (!validate(f)) return false; try { await A.inviteAdmin(formData(f)); } catch (e) { HUK.ui.setFieldError(f.email, e.message); return false; } toast('Invite sent.'); reload(); } }),
        resend: (b) => toast('Invite resent to ' + find(b).email + '.'),
        revoke: async (b) => { const a = find(b); if (!await confirm({ title: 'Revoke ' + a.name + '’s access?', message: 'They’ll be signed out everywhere and can’t sign in as an admin.', confirmLabel: 'Revoke access', danger: true })) return; try { await A.updateAdmin(a.id, { status: 'revoked' }); toast('Access revoked.'); reload(); } catch (e) { toast(e.message, { tone: 'bad' }); } },
        restore: async (b) => { await A.updateAdmin(b.dataset.id, { status: 'active' }); toast('Access restored.'); reload(); },
        savePerms: (b) => withLoading(b, async () => { for (const r of data.roles.filter((x) => x.id !== 'super_admin')) { const perms = [...host.querySelectorAll('[data-perm^="' + r.id + ':"]:checked')].map((c) => c.dataset.perm.split(':')[1]); await A.updateRole(r.id, perms); r.permissions = perms; } toast('Permissions saved.'); })
      });
      reload();
    }
  });
})();
