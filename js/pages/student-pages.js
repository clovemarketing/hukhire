/* =========================================================
   Student portal pages (exam workspace lives in exam-workspace.js)
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, pageHeader, metric, progress, load, empty, table, bindRowLinks, tabsHtml, bindTabs, toast, onAction, debounce } = HUK.ui;
  const S = HUK.studentService;
  const HOME = ['Dashboard', 'student/dashboard.html'];
  const EXAMS = ['Available exams', 'student/exams.html'];

  /* ---------- Shared exam card ---------- */
  function examActions(e) {
    const d = HUK.url('student/exam-details.html?id=' + e.id);
    switch (e.studentStatus) {
      case 'ready': return '<a class="btn btn-sm" href="' + d + '">Details</a><a class="btn btn-primary btn-sm" href="' + HUK.url('student/system-check.html?id=' + e.id) + '">Start exam</a>';
      case 'in_progress': return '<a class="btn btn-accent btn-sm" href="' + HUK.url('student/take-exam.html?id=' + e.id) + '">Resume exam</a>';
      case 'upcoming': return '<a class="btn btn-sm" href="' + d + '">Details</a><a class="btn btn-ghost btn-sm" href="' + HUK.url('student/system-check.html?id=' + e.id) + '">Check my device</a>';
      case 'completed': return e.resultId ? '<a class="btn btn-sm" href="' + HUK.url('student/result-detail.html?id=' + e.resultId) + '">View result</a>' : '<span class="subtle">Result not published yet</span>';
      default: return '<a class="btn btn-sm" href="' + d + '">Details</a>';
    }
  }
  function examCard(e) {
    const when = e.studentStatus === 'ready' || e.studentStatus === 'in_progress' ? 'Closes ' + fmt.rel(e.endAt) : e.studentStatus === 'upcoming' ? fmt.weekday(e.startAt) + ', ' + fmt.time(e.startAt) : fmt.date(e.startAt);
    return '<article class="card exam-card"><div class="between"><span class="exam-code">' + esc(e.code) + '</span>' + chip(e.studentStatus) + '</div><h3>' + esc(e.title) + '</h3>' +
      '<div class="exam-meta"><span>' + icon('calendar', 16) + esc(when) + '</span><span>' + icon('clock', 16) + e.durationMinutes + ' min</span><span>' + icon('exam', 16) + e.questionCount + ' questions</span>' + (e.proctoringMode !== 'none' ? '<span>' + icon('video', 16) + (e.proctoringMode === 'live' ? 'Live proctored' : 'Recorded') + '</span>' : '') + '</div>' +
      '<div class="exam-actions">' + examActions(e) + '</div></article>';
  }

  /* ---------------- Dashboard ---------------- */
  HUK.page('student-dashboard', {
    title: 'Dashboard',
    crumbs: [['Dashboard']],
    render(main, { user }) {
      main.innerHTML = '<div id="dash"></div>';
      let timer;
      load(main.querySelector('#dash'), () => S.dashboard(), (d) => {
        const n = d.nextExam;
        const hour = new Date().getHours();
        const greet = (hour < 12 ? 'Good morning, ' : hour < 17 ? 'Good afternoon, ' : 'Good evening, ') + user.name.split(' ')[0];
        let hero;
        if (n) {
          const target = n.studentStatus === 'upcoming' ? n.startAt : n.endAt;
          const lead = { ready: 'Your exam is open now', in_progress: 'You have an exam in progress', upcoming: 'Your next exam' }[n.studentStatus];
          const cta = n.studentStatus === 'in_progress' ? '<a class="btn btn-accent btn-lg" href="' + HUK.url('student/take-exam.html?id=' + n.id) + '">Resume exam</a>' : n.studentStatus === 'ready' ? '<a class="btn btn-accent btn-lg" href="' + HUK.url('student/system-check.html?id=' + n.id) + '">Start with system check</a><a class="btn btn-ghost btn-lg" href="' + HUK.url('student/exam-details.html?id=' + n.id) + '">View details</a>' : '<a class="btn btn-lg" href="' + HUK.url('student/exam-details.html?id=' + n.id) + '">View details</a><a class="btn btn-ghost btn-lg" href="' + HUK.url('student/system-check.html?id=' + n.id) + '">Check my device</a>';
          hero = '<section class="card card-inverse next-exam" aria-labelledby="next-t"><span class="bubble-pattern" aria-hidden="true"></span><span class="bubble-pattern b2" aria-hidden="true"></span><div style="position:relative"><p class="muted">' + lead + '</p><h2 id="next-t" style="font-size:var(--fs-xl);margin:6px 0 10px">' + esc(n.title) + '</h2><p class="muted">' + n.durationMinutes + ' minutes, ' + n.questionCount + ' questions' + (n.proctoringMode === 'live' ? ', live proctored' : '') + '</p><div class="row-wrap mt-3">' + cta + '</div></div>' +
            '<div style="position:relative"><p class="muted mb-2" style="font-size:var(--fs-sm)">' + (n.studentStatus === 'upcoming' ? 'Starts in' : 'Window closes in') + '</p><div class="countdown" data-target="' + target + '" role="timer" aria-live="off"></div></div></section>';
        } else hero = '<section class="card">' + empty({ title: 'No exams scheduled', text: 'When a recruiter assigns you an assessment it will appear here.', art: true }) + '</section>';
        const sc = d.systemCheck;
        return '<header class="page-header"><div class="ph-text"><h1>' + esc(greet) + '</h1><p>Here’s what’s next for your assessments.</p></div></header>' + hero +
          '<div class="grid g-4 mt-3 g-metrics-mobile-2">' + metric({ label: 'Available now', value: d.counts.available, icon: 'zap', href: HUK.url('student/exams.html?tab=available') }) + metric({ label: 'Upcoming', value: d.counts.upcoming, icon: 'calendar', href: HUK.url('student/exams.html?tab=upcoming') }) + metric({ label: 'Completed', value: d.counts.completed, icon: 'checkCircle', href: HUK.url('student/attempts.html') }) + metric({ label: 'Average score', value: d.counts.avgScore == null ? '—' : d.counts.avgScore + '%', icon: 'target', href: HUK.url('student/results.html') }) + '</div>' +
          '<div class="grid g-main-side mt-3"><div class="stack-lg">' +
            '<section aria-labelledby="ex-t"><div class="between mb-2"><h2 id="ex-t">Your exams</h2><a href="' + HUK.url('student/exams.html') + '">See all exams</a></div><div class="grid g-2">' + d.exams.slice(0, 4).map(examCard).join('') + '</div></section>' +
            '<section class="card" aria-labelledby="at-t"><div class="card-head"><h2 id="at-t">Recent attempts</h2><a href="' + HUK.url('student/attempts.html') + '">View history</a></div>' + (d.attempts.length ? '<ul class="list">' + d.attempts.map((a) => '<li class="list-item"><span class="metric-icon">' + icon(a.status === 'missed' ? 'x' : 'exam', 18) + '</span><div class="li-main"><div class="li-title">' + esc(a.examTitle) + '</div><div class="li-sub">' + (a.status === 'missed' ? 'Missed on ' + fmt.date(a.startedAt) : 'Submitted ' + fmt.date(a.submittedAt)) + '</div></div>' + chip(a.status === 'missed' ? 'missed' : a.resultStatus || a.status) + '</li>').join('') + '</ul>' : '<p class="muted">You haven’t taken any exams yet.</p>') + '</section>' +
          '</div><aside class="stack-lg">' +
            '<section class="card" aria-labelledby="sys-t"><div class="card-head"><h2 id="sys-t">System readiness</h2>' + chip(sc ? (sc.passed ? 'ok' : 'check') : 'check', sc ? (sc.passed ? 'Ready' : 'Needs attention') : 'Not checked') + '</div><p class="subtle">' + (sc ? 'Last checked ' + fmt.rel(sc.at) + ' in ' + esc(sc.browser || 'your browser') + '.' : 'Check your camera, microphone and connection before exam day.') + '</p><a class="btn btn-block mt-2" href="' + HUK.url('student/system-check.html') + '">' + icon('monitor', 18) + '<span>' + (sc ? 'Run again' : 'Run system check') + '</span></a></section>' +
            '<section class="card" aria-labelledby="rs-t"><div class="card-head"><h2 id="rs-t">Latest results</h2><a href="' + HUK.url('student/results.html') + '">All results</a></div>' + (d.results.length ? '<ul class="list">' + d.results.map((r) => '<li><a class="list-item" href="' + HUK.url('student/result-detail.html?id=' + r.id) + '"><div class="li-main"><div class="li-title">' + esc(r.examTitle) + '</div><div class="li-sub">' + (r.published ? r.percentage + '%' : 'Awaiting publication') + '</div></div>' + chip(r.status) + '</a></li>').join('') + '</ul>' : '<p class="muted">Results appear here once published.</p>') + '</section>' +
            '<section class="card" aria-labelledby="nt-t"><div class="card-head"><h2 id="nt-t">Notifications</h2><a href="' + HUK.url('shared/notifications.html') + '">Open inbox</a></div>' + (d.notifications.length ? '<ul class="list">' + d.notifications.map((x) => '<li class="list-item"><div class="li-main"><div class="li-title" style="font-size:var(--fs-sm)">' + esc(x.title) + '</div><div class="li-sub">' + fmt.rel(x.createdAt) + '</div></div>' + (x.read ? '' : '<span class="n-dot" style="width:8px;height:8px;border-radius:50%;background:var(--accent)" aria-label="Unread"></span>') + '</li>').join('') + '</ul>' : '<p class="muted">Nothing new.</p>') + '</section>' +
          '</aside></div>';
      }, { skeleton: 'page', after: () => {
        const cd = main.querySelector('.countdown');
        if (!cd) return;
        const tick = () => { const s = Math.max(0, (new Date(cd.dataset.target) - Date.now()) / 1000); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60); cd.innerHTML = (d ? '<div><strong>' + d + '</strong><span>days</span></div>' : '') + '<div><strong>' + String(h).padStart(2, '0') + '</strong><span>hours</span></div><div><strong>' + String(m).padStart(2, '0') + '</strong><span>min</span></div>' + (d ? '' : '<div><strong>' + String(sec).padStart(2, '0') + '</strong><span>sec</span></div>'); cd.setAttribute('aria-label', (d ? d + ' days ' : '') + h + ' hours ' + m + ' minutes'); };
        tick(); timer = setInterval(tick, 1000);
      } });
      window.addEventListener('pagehide', () => clearInterval(timer));
    }
  });

  /* ---------------- Exams list (available / upcoming / completed / missed) ---------------- */
  HUK.page('student-exams', {
    title: 'Available exams',
    crumbs: [HOME, ['Available exams']],
    render(main) {
      const tabs = { available: ['ready', 'in_progress'], upcoming: ['upcoming'], completed: ['completed'], missed: ['missed'], all: null };
      let tab = tabs.hasOwnProperty(HUK.qs('tab')) ? HUK.qs('tab') : 'available', q = '', all = [];
      main.innerHTML = pageHeader({ title: 'Exams', subtitle: 'Everything assigned to you, from open exams to past attempts.', actions: '<a class="btn" href="' + HUK.url('student/system-check.html') + '">' + icon('monitor', 18) + '<span>System check</span></a>' }) +
        '<div id="tabs"></div><div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="q">Search exams</label><input class="input" id="q" type="search" placeholder="Search by title or code"></div></div><div id="list"></div>';
      const list = main.querySelector('#list');
      const draw = () => {
        const count = (k) => all.filter((e) => !tabs[k] || tabs[k].includes(e.studentStatus)).length;
        main.querySelector('#tabs').innerHTML = tabsHtml([['available', 'Available', count('available')], ['upcoming', 'Upcoming', count('upcoming')], ['completed', 'Completed', count('completed')], ['missed', 'Missed', count('missed')], ['all', 'All', all.length]], tab, 'Filter exams');
        bindTabs(main.querySelector('#tabs'), (t) => { tab = t; HUK.setQuery({ tab: t }); draw(); main.querySelector('[role=tab][aria-selected=true]').focus(); });
        const rows = all.filter((e) => !tabs[tab] || tabs[tab].includes(e.studentStatus)).filter((e) => !q || (e.title + e.code).toLowerCase().includes(q));
        list.innerHTML = rows.length ? '<div class="grid g-auto">' + rows.map(examCard).join('') + '</div>' : '<div class="card">' + empty({ title: q ? 'No exams match “' + esc(q) + '”' : { available: 'No exams are open right now', upcoming: 'Nothing scheduled yet', completed: 'No completed exams yet', missed: 'You haven’t missed any exams', all: 'No exams assigned yet' }[tab], text: q ? 'Try a different title or exam code.' : 'New assignments appear here and in your notifications.', art: !q }) + '</div>';
      };
      main.querySelector('#q').addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 200));
      load(list, () => S.exams(), (d) => { all = d; return ''; }, { skeleton: 'cards', n: 3, after: draw, isEmpty: () => false });
    }
  });

  /* ---------------- Attempts (exam history) ---------------- */
  HUK.page('student-attempts', {
    title: 'My attempts',
    crumbs: [HOME, ['My attempts']],
    render(main) {
      main.innerHTML = pageHeader({ title: 'My attempts', subtitle: 'Every exam you’ve started, submitted or missed.' }) + '<div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      load(el, () => S.attempts(), (rows) => table({
        caption: 'Exam attempts', rows,
        columns: [
          { label: 'Exam', primary: true, render: (r) => '<div class="cell-main">' + esc(r.examTitle) + '</div><div class="cell-sub">' + esc(r.examCode) + '</div>' },
          { label: 'Date', render: (r) => fmt.date(r.startedAt) },
          { label: 'Time taken', render: (r) => r.submittedAt ? fmt.dur((new Date(r.submittedAt) - new Date(r.startedAt)) / 1000) : '—' },
          { label: 'Status', render: (r) => chip(r.status) },
          { label: 'Result', render: (r) => r.resultStatus ? chip(r.resultStatus, r.percentage != null ? r.percentage + '%' : null) : '<span class="subtle">—</span>' },
          { label: '', actions: true, align: 'right', render: (r) => r.resultId ? '<a class="btn btn-sm" href="' + HUK.url('student/result-detail.html?id=' + r.resultId) + '">View result</a>' : r.status === 'in_progress' ? '<a class="btn btn-accent btn-sm" href="' + HUK.url('student/take-exam.html?id=' + r.examId) + '">Resume</a>' : r.status === 'submitted' ? '<a class="btn btn-ghost btn-sm" href="' + HUK.url('student/submitted.html?attempt=' + r.id) + '">Receipt</a>' : '' }
        ]
      }), { empty: empty({ title: 'No attempts yet', text: 'When you start an exam it will be listed here.', action: '<a class="btn btn-primary" href="' + HUK.url('student/exams.html') + '">Browse exams</a>', art: true }) });
    }
  });

  /* ---------------- Exam details ---------------- */
  HUK.page('student-exam-detail', {
    title: 'Exam details',
    crumbs: [HOME, EXAMS, ['Exam details']],
    render(main) {
      const id = HUK.qs('id');
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => S.exam(id), (e) => {
        HUK.shell.setCrumbs([HOME, EXAMS, [e.title]]);
        const primary = { ready: '<a class="btn btn-primary btn-lg btn-block" href="' + HUK.url('student/system-check.html?id=' + e.id) + '">Continue to system check</a>', in_progress: '<a class="btn btn-accent btn-lg btn-block" href="' + HUK.url('student/take-exam.html?id=' + e.id) + '">Resume exam</a>', upcoming: '<a class="btn btn-lg btn-block" href="' + HUK.url('student/system-check.html?id=' + e.id) + '">Check my device early</a>', completed: e.resultId ? '<a class="btn btn-primary btn-lg btn-block" href="' + HUK.url('student/result-detail.html?id=' + e.resultId) + '">View result</a>' : '<p class="muted center">Your result will appear once it’s published.</p>', missed: '<p class="muted center">The window for this exam has closed. Contact your recruiter if you need a retake.</p>' }[e.studentStatus];
        return pageHeader({ title: e.title, subtitle: esc(e.code) + ', ' + esc(e.category) }) +
          '<div class="grid g-main-side"><div class="stack-lg">' +
            '<section class="card"><h2 style="font-size:var(--fs-md)">About this exam</h2><p class="muted mt-1">' + esc(e.description) + '</p><dl class="kv mt-3"><dt>Questions</dt><dd>' + e.questionCount + ' (' + e.totalMarks + ' marks)</dd><dt>Duration</dt><dd>' + e.durationMinutes + ' minutes</dd><dt>Passing score</dt><dd>' + e.passingScore + '%</dd><dt>Negative marking</dt><dd>' + (e.negativeMarking ? 'Yes, on objective questions' : 'No') + '</dd><dt>Attempts allowed</dt><dd>' + e.attemptsAllowed + '</dd></dl></section>' +
            '<section class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><h2 style="font-size:var(--fs-md)">Sections</h2></div>' + table({ caption: 'Sections', cards: false, rows: e.sections, columns: [{ label: 'Section', render: (s) => '<span class="cell-main">' + esc(s.title) + '</span>' }, { label: 'Questions', align: 'right', render: (s) => s.count }] }) + '</section>' +
            '<section class="card"><h2 style="font-size:var(--fs-md)">Rules</h2><ul class="stack-sm mt-2" style="padding-left:20px">' + e.instructions.map((i) => '<li class="muted">' + esc(i) + '</li>').join('') + '</ul></section>' +
          '</div><aside class="stack-lg"><section class="card"><div class="between">' + chip(e.studentStatus) + '<span class="subtle">' + esc(e.code) + '</span></div><dl class="kv mt-2"><dt>Opens</dt><dd>' + fmt.dateTime(e.startAt) + '</dd><dt>Closes</dt><dd>' + fmt.dateTime(e.endAt) + '</dd><dt>Grace period</dt><dd>' + e.graceMinutes + ' min</dd></dl><div class="mt-3">' + primary + '</div></section>' +
            '<section class="card"><h2 style="font-size:var(--fs-md)">Proctoring requirements</h2><ul class="list mt-1">' + [['video', 'Webcam on for the whole exam', e.proctoring.camera], ['mic', 'Microphone on', e.proctoring.mic], ['monitor', 'Screen activity shared', e.proctoring.screen], ['idCard', 'Photo ID check before you start', e.proctoring.idCheck], ['lock', 'Copy and paste disabled', !e.security.copyPaste], ['expand', 'Full-screen mode', e.security.fullscreen]].filter((x) => x[2]).map(([ic, t]) => '<li class="list-item" style="padding:10px 0">' + icon(ic, 18) + '<span>' + t + '</span></li>').join('') + '</ul></section></aside></div>';
      }, { skeleton: 'page' });
    }
  });

  /* ---------------- System check ---------------- */
  HUK.page('student-system-check', {
    title: 'System check',
    crumbs: () => (HUK.qs('id') ? [HOME, EXAMS, ['Exam details', 'student/exam-details.html?id=' + HUK.qs('id')], ['System check']] : [HOME, ['System check']]),
    render(main) {
      const examId = HUK.qs('id');
      const ua = navigator.userAgent;
      const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Google Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'your browser';
      const checks = [
        { id: 'browser', icon: 'monitor', title: 'Browser', desc: 'Chrome, Edge, Firefox or Safari (latest two versions).' },
        { id: 'network', icon: 'wifi', title: 'Internet connection', desc: 'At least 2 Mbps upload for live proctoring.' },
        { id: 'screen', icon: 'expand', title: 'Screen size and full screen', desc: 'A laptop or desktop screen at least 1024px wide is recommended.' },
        { id: 'camera', icon: 'video', title: 'Camera', desc: 'Your face must be clearly visible.' },
        { id: 'mic', icon: 'mic', title: 'Microphone', desc: 'Used to detect background voices.' }
      ];
      const state = {};
      main.innerHTML = pageHeader({ title: 'System check', subtitle: 'Make sure your device is ready before you start. This takes about 30 seconds.' }) +
        (examId ? '<ol class="row-wrap mb-2 subtle" aria-label="Exam start steps" style="list-style:none"><li><strong style="color:var(--text)">1. System check</strong></li><li aria-hidden="true">›</li><li>2. Instructions</li><li aria-hidden="true">›</li><li>3. Exam</li></ol>' : '') +
        '<div class="grid g-main-side"><section class="card" aria-labelledby="ck"><div class="card-head"><h2 id="ck">Checks</h2><button type="button" class="btn btn-sm" data-action="rerun">' + icon('refresh', 16) + '<span>Run again</span></button></div><div id="rows" aria-live="polite"></div>' +
        '<div class="alert mt-2 hide" id="perm-help" data-tone="warn">' + icon('info', 18) + '<div><strong>Camera or microphone blocked</strong>Allow access using the camera icon in your browser’s address bar, then choose Test camera and microphone again. You can continue in demo mode if you’re just exploring the prototype.</div></div></section>' +
        '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)">Camera preview</h2><div class="cam-preview mt-2" id="cam">' + icon('video', 32) + '<span class="sr-only">Camera preview not started</span></div><div class="mt-2"><span class="field-label">Microphone level</span><div class="mic-meter mt-1" id="meter" aria-hidden="true">' + '<i></i>'.repeat(16) + '</div></div><button type="button" class="btn btn-primary btn-block mt-2" data-action="media">' + icon('video', 18) + '<span>Test camera and microphone</span></button><button type="button" class="btn btn-ghost btn-block mt-1" data-action="simulate">Continue in demo mode</button></section>' +
        '<section class="card" id="result-card"><p class="muted">Complete all checks to continue.</p><button type="button" class="btn btn-primary btn-lg btn-block mt-2" id="go" disabled>' + (examId ? 'Continue to instructions' : 'Save and finish') + '</button></section></aside></div>';
      const rows = main.querySelector('#rows');
      const draw = () => {
        rows.innerHTML = checks.map((c) => { const s = state[c.id] || { st: 'pending', msg: 'Waiting…' }; return '<div class="check-row" data-state="' + s.st + '"><span class="check-icon">' + (s.st === 'running' ? icon('spinner', 20) : icon(s.st === 'ok' ? 'check' : s.st === 'bad' ? 'x' : s.st === 'warn' ? 'alert' : c.icon, 20)) + '</span><div class="grow"><div style="font-weight:650">' + c.title + '</div><div class="subtle">' + esc(s.msg || c.desc) + '</div></div>' + chip(s.st === 'ok' ? 'ok' : s.st === 'bad' ? 'failed' : s.st === 'warn' ? 'check' : 'not_started', s.st === 'ok' ? 'Passed' : s.st === 'bad' ? 'Failed' : s.st === 'warn' ? 'Warning' : s.st === 'running' ? 'Checking' : 'Pending') + '</div>'; }).join('');
        const done = checks.every((c) => state[c.id] && ['ok', 'warn'].includes(state[c.id].st));
        const go = main.querySelector('#go'); go.disabled = !done;
        main.querySelector('#result-card p').textContent = done ? 'Your device is ready.' : 'Complete all checks to continue.';
      };
      const set = (id, st, msg) => { state[id] = { st, msg }; draw(); };
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      async function runAuto() {
        ['browser', 'network', 'screen'].forEach((k) => set(k, 'running', 'Checking…'));
        await wait(500); set('browser', 'ok', browser + ' is supported.');
        await wait(600); const down = (navigator.connection && navigator.connection.downlink) || (8 + Math.round(Math.random() * 40));
        set('network', navigator.onLine ? (down >= 2 ? 'ok' : 'warn') : 'bad', navigator.onLine ? 'About ' + down + ' Mbps. ' + (down >= 2 ? 'Good for live proctoring.' : 'May be unstable during the exam.') : 'You appear to be offline.');
        await wait(400); const w = window.screen.width; set('screen', w >= 1024 ? 'ok' : 'warn', w + 'px wide. ' + (w >= 1024 ? 'Full screen is supported.' : 'A larger screen is recommended, but you can continue.'));
        if (!state.camera) { set('camera', 'pending', 'Choose Test camera and microphone.'); set('mic', 'pending', 'Choose Test camera and microphone.'); }
      }
      let stream, raf;
      onAction(main, {
        rerun: () => runAuto(),
        media: async () => {
          set('camera', 'running', 'Requesting access…'); set('mic', 'running', 'Requesting access…');
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cam = main.querySelector('#cam'); cam.innerHTML = '<video autoplay muted playsinline aria-label="Your camera preview"></video>'; cam.querySelector('video').srcObject = stream;
            set('camera', 'ok', 'Camera is working. Keep your face centred.');
            const ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.frequencyBinCount); const bars = [...main.querySelectorAll('#meter i')];
            const tick = () => { an.getByteFrequencyData(buf); const l = buf.reduce((t, v) => t + v, 0) / buf.length / 128; bars.forEach((b, i) => { b.style.height = (20 + Math.min(80, l * 140)) + '%'; b.style.background = i / 16 < l * 1.5 ? 'var(--text)' : ''; }); raf = requestAnimationFrame(tick); };
            tick(); set('mic', 'ok', 'Microphone is picking up sound.');
            main.querySelector('#perm-help').classList.add('hide');
          } catch (e) { set('camera', 'bad', 'Access was blocked or no camera was found.'); set('mic', 'bad', 'Access was blocked or no microphone was found.'); main.querySelector('#perm-help').classList.remove('hide'); }
        },
        simulate: () => { set('camera', 'ok', 'Demo mode: camera check simulated.'); set('mic', 'ok', 'Demo mode: microphone check simulated.'); main.querySelector('#cam').innerHTML = '<span>' + icon('user', 40) + '</span><span class="rec-dot">Demo</span>'; }
      });
      main.querySelector('#go').addEventListener('click', async (e) => {
        await HUK.ui.withLoading(e.currentTarget, () => S.saveSystemCheck({ passed: checks.every((c) => state[c.id].st === 'ok'), browser, results: state }));
        if (stream) stream.getTracks().forEach((t) => t.stop()); cancelAnimationFrame(raf);
        if (examId) HUK.go('student/instructions.html?id=' + examId); else { toast('System check saved. Your device is ready.'); HUK.go('student/dashboard.html'); }
      });
      window.addEventListener('pagehide', () => { if (stream) stream.getTracks().forEach((t) => t.stop()); });
      draw(); runAuto();
    }
  });

  /* ---------------- Instructions & consent ---------------- */
  HUK.page('student-instructions', {
    title: 'Instructions',
    crumbs: () => [HOME, EXAMS, ['Exam details', 'student/exam-details.html?id=' + HUK.qs('id')], ['Instructions']],
    render(main) {
      const id = HUK.qs('id');
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => S.exam(id), (e) => {
        if (!['ready', 'in_progress'].includes(e.studentStatus)) return '<div class="card">' + empty({ title: e.studentStatus === 'upcoming' ? 'This exam hasn’t opened yet' : 'This exam can’t be started', text: e.studentStatus === 'upcoming' ? 'It opens ' + fmt.dateTime(e.startAt) + '. Come back then.' : 'It is ' + HUK.ui.STATUS[e.studentStatus][0].toLowerCase() + '.', action: '<a class="btn btn-primary" href="' + HUK.url('student/exam-details.html?id=' + e.id) + '">Back to exam details</a>', iconName: 'clock' }) + '</div>';
        return pageHeader({ title: 'Before you begin', subtitle: esc(e.title) + '. The timer starts when you choose Start exam.' }) +
          '<ol class="row-wrap mb-2 subtle" aria-label="Exam start steps" style="list-style:none"><li>1. System check</li><li aria-hidden="true">›</li><li><strong style="color:var(--text)">2. Instructions</strong></li><li aria-hidden="true">›</li><li>3. Exam</li></ol>' +
          '<div class="grid g-main-side"><div class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)">Instructions</h2><ol class="stack-sm mt-2" style="padding-left:20px">' + e.instructions.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ol>' +
            '<div class="grid g-3 mt-3">' + [['clock', e.durationMinutes + ' minutes'], ['exam', e.questionCount + ' questions'], ['target', 'Pass at ' + e.passingScore + '%']].map(([ic, t]) => '<div class="card card-flat card-tight row">' + icon(ic, 20) + '<strong>' + t + '</strong></div>').join('') + '</div></section>' +
            '<section class="card"><h2 style="font-size:var(--fs-md)">Your agreement</h2><form id="consent" class="mt-1" novalidate>' +
              [['c1', 'I will stay on the exam page and not use other apps, tabs, devices or people for help.'], ['c2', 'I agree to camera, microphone and screen recording for the length of this exam.'], ['c3', 'The answers I submit will be my own work.']].map(([k, t]) => '<label class="check"><input type="checkbox" id="f-' + k + '" name="' + k + '" required aria-describedby="f-' + k + '-err"><span>' + t + '</span></label><span class="field-error" id="f-' + k + '-err" role="alert"></span>').join('') +
            '</form></section></div>' +
          '<aside class="stack-lg">' + (e.proctoring.idCheck ? '<section class="card"><h2 style="font-size:var(--fs-md)">Identity check</h2><p class="subtle mt-1">Hold your photo ID next to your face. Your proctor compares it with your registration photo.</p><div class="cam-preview mt-2" id="idcap">' + icon('idCard', 36) + '</div><button type="button" class="btn btn-block mt-2" id="cap">' + icon('video', 18) + '<span>Capture ID photo</span></button></section>' : '') +
          '<section class="card"><button type="button" class="btn btn-primary btn-lg btn-block" id="start" data-loading-text="Starting…">' + (e.studentStatus === 'in_progress' ? 'Resume exam' : 'Start exam') + '</button><p class="subtle center mt-1" id="start-hint">' + (e.proctoring.idCheck ? 'Capture your ID and accept all three statements to start.' : 'Accept all three statements to start.') + '</p></section></aside></div>';
      }, { skeleton: 'page', after: (e) => {
        const start = main.querySelector('#start'); if (!start) return;
        let captured = !e.proctoring.idCheck;
        const cap = main.querySelector('#cap');
        if (cap) cap.addEventListener('click', async () => { await HUK.ui.withLoading(cap, () => new Promise((r) => setTimeout(r, 700))); main.querySelector('#idcap').innerHTML = '<span style="text-align:center">' + icon('checkCircle', 36) + '<br><span style="font-size:var(--fs-sm)">ID photo captured</span></span>'; cap.innerHTML = icon('refresh', 18) + '<span>Retake ID photo</span>'; captured = true; HUK.ui.announce('ID photo captured.'); });
        start.addEventListener('click', () => {
          const f = main.querySelector('#consent');
          if (!HUK.ui.validate(f)) return;
          if (!captured) { toast('Capture your ID photo before starting.', { tone: 'warn' }); cap.focus(); return; }
          HUK.ui.setLoading(start, true);
          HUK.go('student/take-exam.html?id=' + e.id);
        });
      } });
    }
  });

  /* ---------------- Submitted / exam completed ---------------- */
  HUK.page('student-submitted', {
    title: 'Exam submitted',
    crumbs: [HOME, EXAMS, ['Submitted']],
    render(main) {
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => HUK.attemptService.receipt(HUK.qs('attempt')), (r) =>
        '<section class="card" style="max-width:760px;margin:0 auto;text-align:center;padding:40px 28px"><img class="brand-img" src="' + HUK.url('assets/doodles/doodle-candidates.webp') + '" alt="" style="width:220px;height:200px;object-fit:cover;border-radius:24px;margin:0 auto 22px"><h1>' + (r.summary.auto ? 'Time’s up. Your exam was submitted.' : 'Submission received') + '</h1><p class="muted mt-1">' + esc(r.examTitle) + ' was submitted ' + fmt.dateTime(r.summary.submittedAt) + '. You don’t need to do anything else.</p>' +
        '<div class="grid g-4 mt-3 g-metrics-mobile-2" style="text-align:left">' + metric({ label: 'Answered', value: r.summary.answered + '/' + r.summary.total }) + metric({ label: 'Marked for review', value: r.summary.review }) + metric({ label: 'Time taken', value: fmt.dur(r.summary.durationSeconds) }) + metric({ label: 'Confirmation', value: '<span style="font-size:1.05rem">' + esc(r.confirmation) + '</span>' }) + '</div>' +
        '<div class="row-wrap mt-3" style="justify-content:center">' + (r.published ? '<a class="btn btn-primary btn-lg" href="' + HUK.url('student/result-detail.html?id=' + r.resultId) + '">View my result</a>' : '<p class="muted">Your result will be published after review. We’ll notify you.</p>') + '<a class="btn btn-lg" href="' + HUK.url('student/dashboard.html') + '">Back to dashboard</a></div></section>', { skeleton: 'page' });
    }
  });

  /* ---------------- Results ---------------- */
  HUK.page('student-results', {
    title: 'Results',
    crumbs: [HOME, ['Results']],
    render(main) {
      main.innerHTML = pageHeader({ title: 'Results', subtitle: 'Results appear once your organisation publishes them.' }) + '<div id="l"></div>';
      load(main.querySelector('#l'), () => S.results(), (rows) => '<div class="grid g-auto">' + rows.map((r) => '<article class="card exam-card"><div class="between"><span class="exam-code">' + esc(r.examCode) + '</span>' + chip(r.status) + '</div><h3>' + esc(r.examTitle) + '</h3>' +
        (r.published ? '<div class="row" style="gap:16px"><div class="ring" style="--val:' + r.percentage + ';--size:76px"><div><strong style="font-size:1.1rem">' + r.percentage + '%</strong></div></div><div><div style="font-weight:700">' + r.score + ' / ' + r.maxScore + ' marks</div><div class="subtle">Published ' + fmt.date(r.publishedAt) + '</div></div></div><div class="exam-actions"><a class="btn btn-sm" href="' + HUK.url('student/result-detail.html?id=' + r.id) + '">View breakdown</a></div>'
          : '<p class="muted">Submitted ' + fmt.date(r.submittedAt) + '. Scores are being reviewed and will be released soon.</p>') + '</article>').join('') + '</div>',
        { skeleton: 'cards', n: 3, empty: '<div class="card">' + empty({ title: 'No results yet', text: 'After you take an exam, your result appears here once it’s published.', action: '<a class="btn btn-primary" href="' + HUK.url('student/exams.html') + '">See my exams</a>', art: true }) + '</div>' });
    }
  });

  HUK.page('student-result-detail', {
    title: 'Result',
    crumbs: [HOME, ['Results', 'student/results.html'], ['Result']],
    render(main) {
      main.innerHTML = '<div id="d"></div>';
      load(main.querySelector('#d'), () => S.result(HUK.qs('id')), (r) => {
        HUK.shell.setCrumbs([HOME, ['Results', 'student/results.html'], [r.examTitle]]);
        if (!r.published) return pageHeader({ title: r.examTitle }) + '<div class="card">' + empty({ title: 'Your result is under review', text: 'You submitted on ' + fmt.date(r.submittedAt) + '. We’ll notify you as soon as it’s published.', iconName: 'clock', action: '<a class="btn" href="' + HUK.url('student/results.html') + '">Back to results</a>' }) + '</div>';
        const optText = (q, ids) => (ids || []).map((id) => (q.options.find((o) => o.id === id) || {}).text).filter(Boolean).join(', ');
        const given = (q) => q.given == null || q.given === '' || (Array.isArray(q.given) && !q.given.length) ? '<em>Not answered</em>' : esc(Array.isArray(q.given) ? optText(q, q.given) : q.given);
        const correct = (q) => q.correct == null ? 'Reviewed manually' : esc(Array.isArray(q.correct) ? optText(q, q.correct) : q.correct);
        return pageHeader({ title: r.examTitle, subtitle: esc(r.examCode) + '. Published ' + fmt.date(r.publishedAt) + '.' }) +
          '<section class="card"><div class="result-hero">' + (r.percentage != null ? '<div class="ring" style="--val:' + r.percentage + '"><div><strong>' + r.percentage + '%</strong><span class="subtle">' + r.score + '/' + r.maxScore + '</span></div></div>' : '') +
          '<div class="grow"><div class="row-wrap">' + chip(r.status) + (r.rank ? '<span class="tag">Rank ' + r.rank + ' of ' + r.cohort + '</span>' : '') + '</div><h2 class="mt-1" style="font-size:var(--fs-xl)">' + (r.status === 'pass' ? 'You passed this assessment' : 'You didn’t reach the passing score this time') + '</h2><p class="muted mt-1">Passing score ' + r.passingScore + '%. Time taken ' + fmt.dur(r.durationSeconds) + '.</p></div></div></section>' +
          '<div class="grid g-2 mt-3" style="align-items:start">' + (r.sections ? '<section class="card"><h2 style="font-size:var(--fs-md)" class="mb-2">Section breakdown</h2>' + HUK.charts.hbars(r.sections.map((s) => ({ label: s.title, value: Math.round((s.score / (s.maxScore || 1)) * 100), max: 100 })), { suffix: '%' }) + '<ul class="list mt-2">' + r.sections.map((s) => '<li class="list-item" style="padding:8px 0"><span class="grow">' + esc(s.title) + '</span><strong class="tnum">' + s.score + ' / ' + s.maxScore + '</strong></li>').join('') + '</ul></section>' : '') +
          (r.feedback ? '<section class="card"><h2 style="font-size:var(--fs-md)">Feedback</h2><p class="mt-1">' + esc(r.feedback) + '</p></section>' : '') + '</div>' +
          (r.review ? '<section class="card mt-3"><h2 style="font-size:var(--fs-md)" class="mb-2">Answer review</h2>' + r.review.map((q, i) => '<div class="question-review"><div class="between"><strong>Question ' + (i + 1) + '</strong><span class="tag">' + (q.earned != null ? q.earned + ' / ' + q.marks + ' marks' : q.marks + ' marks') + '</span></div><p class="mt-1">' + esc(q.prompt) + '</p>' + (q.code ? '<pre class="mt-1" style="background:var(--surface-muted);padding:10px;border-radius:10px;overflow-x:auto">' + esc(q.code) + '</pre>' : '') + '<dl class="kv mt-2"><dt>Your answer</dt><dd>' + given(q) + '</dd><dt>Correct answer</dt><dd>' + correct(q) + '</dd>' + (q.explanation ? '<dt>Why</dt><dd style="font-weight:500">' + esc(q.explanation) + '</dd>' : '') + '</dl></div>').join('') + '</section>' : '<p class="subtle mt-3">Your organisation doesn’t share individual answers for this exam.</p>');
      }, { skeleton: 'page' });
    }
  });
})();
