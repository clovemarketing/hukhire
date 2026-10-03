/* =========================================================
   Incidents explorer, shared by Proctor and Admin.
   Filters, table/cards, review drawer with evidence and
   resolution workflow (open → reviewing → resolved/escalated).
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, sevChip, pageHeader, load, empty, table, drawer, field, toast, debounce, metric } = HUK.ui;

  HUK.renderIncidents = function (main, { admin = false } = {}) {
    const P = HUK.proctorService;
    let all = [], sev = '', status = '', q = '';
    main.innerHTML = pageHeader({ title: admin ? 'Proctoring incidents' : 'Incidents and flags', subtitle: admin ? 'Every incident raised across live and past sessions. Review evidence and record an outcome.' : 'Incidents you’ve raised in your sessions.' }) +
      '<div class="grid g-4 mb-2 g-metrics-mobile-2" id="kpi"></div>' +
      '<div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="iq">Search incidents</label><input class="input" id="iq" type="search" placeholder="Search by candidate or exam"></div>' +
      '<label class="sr-only" for="isev">Severity</label><select class="select" id="isev" style="width:auto"><option value="">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>' +
      '<label class="sr-only" for="ist">Status</label><select class="select" id="ist" style="width:auto"><option value="">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></div>' +
      '<div class="card card-pad-0" id="t"></div>';
    const el = main.querySelector('#t');
    const draw = () => {
      main.querySelector('#kpi').innerHTML = metric({ label: 'Open', value: all.filter((i) => i.status === 'open').length, icon: 'flag' }) + metric({ label: 'In review', value: all.filter((i) => i.status === 'reviewing').length, icon: 'eye' }) + metric({ label: 'Escalated', value: all.filter((i) => i.status === 'escalated').length, icon: 'shield' }) + metric({ label: 'Resolved', value: all.filter((i) => ['resolved', 'dismissed'].includes(i.status)).length, icon: 'checkCircle' });
      const rows = all.filter((i) => (!sev || i.severity === sev) && (!status || i.status === status) && (!q || (i.studentName + ' ' + i.exam.title + ' ' + i.exam.code).toLowerCase().includes(q)));
      el.innerHTML = rows.length ? table({ caption: 'Incidents', rows, columns: [
        { label: 'Candidate', primary: true, render: (i) => '<div class="row">' + HUK.ui.avatar(i.studentName, 'avatar-sm') + '<div><div class="cell-main">' + esc(i.studentName) + '</div><div class="cell-sub">' + esc(i.exam.code) + '</div></div></div>' },
        { label: 'Type', render: (i) => esc(P.INCIDENT_TYPES[i.type] || i.type) },
        { label: 'Severity', render: (i) => sevChip(i.severity) },
        { label: 'Status', render: (i) => chip(i.status) },
        { label: 'Raised', render: (i) => '<span class="nowrap">' + fmt.dateTime(i.timestamp) + '</span>' },
        { label: '', actions: true, align: 'right', render: (i) => '<button type="button" class="btn btn-sm" data-review="' + i.id + '">Review</button>' }
      ] }) : empty({ title: all.length ? 'No incidents match these filters' : 'No incidents recorded', text: all.length ? 'Clear a filter to see more.' : 'Incidents flagged during sessions appear here.', iconName: 'flag' });
    };
    const reload = () => load(el, () => P.incidents({ all: admin }), (d) => { all = d; return ''; }, { after: draw, isEmpty: () => false });
    main.querySelector('#iq').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 150));
    main.querySelector('#isev').addEventListener('change', (e) => { sev = e.target.value; draw(); });
    main.querySelector('#ist').addEventListener('change', (e) => { status = e.target.value; draw(); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-review]'); if (!b) return;
      const i = all.find((x) => x.id === b.dataset.review);
      drawer({
        title: (P.INCIDENT_TYPES[i.type] || i.type) + ': ' + i.studentName,
        body: '<div class="row-wrap mb-2">' + sevChip(i.severity) + chip(i.status) + '</div><dl class="kv"><dt>Exam</dt><dd>' + esc(i.exam.title) + '</dd><dt>Raised</dt><dd>' + fmt.dateTime(i.timestamp) + '</dd><dt>Session</dt><dd>' + esc(i.sessionId) + '</dd></dl><h3 class="mt-3" style="font-size:var(--fs-base)">Description</h3><p class="mt-1">' + esc(i.description) + '</p>' +
          '<h3 class="mt-3 mb-2" style="font-size:var(--fs-base)">Evidence</h3><div class="evidence">' + i.evidence.map((ev) => '<div>' + icon('video', 16) + '<br>' + esc(ev.label) + '</div>').join('') + '</div>' +
          '<form id="rf" class="stack mt-3">' + field({ name: 'status', label: 'Outcome', value: i.status, options: [['open', 'Open'], ['reviewing', 'Reviewing'], ['escalated', 'Escalated'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed (no misconduct)']] }) + field({ name: 'resolution', label: 'Resolution notes', type: 'textarea', value: i.resolution, rows: 4 }) + '</form>' +
          (admin ? '<p class="mt-2"><a href="' + HUK.url('admin/student-profile.html?id=' + i.studentId) + '">Open student profile</a></p>' : (i.sessionId && i.status !== 'resolved' ? '<p class="mt-2"><a href="' + HUK.url('proctor/candidate.html?session=' + i.sessionId + '&candidate=' + i.candidateId) + '">Open candidate monitor</a></p>' : '')),
        primary: { label: 'Save outcome' },
        onPrimary: async (dlg) => { const f = HUK.ui.formData(dlg.querySelector('#rf')); const u = await P.updateIncident(i.id, f); Object.assign(i, u); draw(); toast('Incident updated.'); }
      });
    });
    reload();
  };
})();
