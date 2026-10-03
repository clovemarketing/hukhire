/* =========================================================
   Admin: 8-step exam wizard (create + edit), save draft,
   resume, review & publish (spec §7).
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, pageHeader, field, switchRow, toast, empty, load, validate, formData, setLoading, avatar, debounce } = HUK.ui;
  const E = HUK.examService, Q = HUK.questionService, A = HUK.adminService;
  const STEPS = ['Basics', 'Schedule', 'Questions', 'Candidates', 'Proctoring', 'Security', 'Result rules', 'Review & publish'];
  const toLocal = (iso) => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const fromLocal = (v) => v ? new Date(v).toISOString() : null;

  HUK.page('admin-exam-wizard', {
    title: () => (HUK.qs('id') ? 'Edit exam' : 'Create exam'),
    crumbs: () => [['Dashboard', 'admin/dashboard.html'], ['Exams', 'admin/exams.html'], [HUK.qs('id') ? 'Edit exam' : 'Create exam']],
    render(main) {
      const id = HUK.qs('id');
      let ex, bank, sections, students, proctors, step = 1, dirty = false, qFilter = { q: '', sec: '' }, sFilter = '';
      main.innerHTML = '<div id="w"></div>';
      const host = main.querySelector('#w');

      load(host, async () => {
        const [exam, qs, secs, studs, procs, settings] = await Promise.all([id ? E.get(id) : null, Q.list(), Q.sections(), A.students(), A.proctors(), A.settings()]);
        bank = qs; sections = secs; students = studs.filter((s) => s.status !== 'deactivated'); proctors = procs.filter((p) => p.status === 'active');
        const d = settings.examDefaults;
        ex = exam || {
          title: '', code: '', category: 'Technical', description: '', instructions: ['Keep your face clearly visible to the camera for the whole exam.', 'Do not switch tabs or use other devices.', 'Answers save automatically.', 'The exam submits automatically when the timer reaches zero.'],
          startAt: null, endAt: null, timezone: 'Asia/Kolkata', durationMinutes: d.durationMinutes, graceMinutes: d.graceMinutes, attemptsAllowed: d.attemptsAllowed,
          questionIds: [], sections: [], negativeMarking: d.negativeMarking, candidateIds: [], groups: [],
          proctoringMode: d.proctoringMode, proctorIds: [], proctoring: { camera: true, mic: true, screen: true, idCheck: true },
          security: { tabPolicy: 'warn', maxTabSwitches: 3, copyPaste: false, fullscreen: true, browserLock: false, ipRestriction: '', deviceLimit: 1 },
          resultRules: { passingScore: d.passingScore, release: d.release, showScore: true, showSectionBreakdown: true, showAnswers: false, feedback: true }
        };
        step = Number(HUK.qs('step')) || (exam && exam.status === 'draft' && exam.draftStep) || 1;
        return ex;
      }, () => '', { skeleton: 'page', after: () => { draw(); if (id && ex.status === 'draft' && !HUK.qs('step') && ex.draftStep > 1) toast('Resumed your draft at step ' + step + '.', { tone: 'info' }); } });

      /* ---------- Derived helpers ---------- */
      const qById = (qid) => bank.find((q) => q.id === qid);
      function syncSections() {
        const used = [...new Set(ex.questionIds.map((qid) => (qById(qid) || {}).sectionId).filter(Boolean))];
        const kept = ex.sections.filter((s) => used.includes(s.id));
        used.filter((sid) => !kept.some((s) => s.id === sid)).forEach((sid) => kept.push({ id: sid, title: (sections.find((s) => s.id === sid) || {}).name || sid }));
        ex.sections = kept;
        ex.questionIds = kept.flatMap((s) => ex.questionIds.filter((qid) => (qById(qid) || {}).sectionId === s.id));
      }
      const totalMarks = () => ex.questionIds.reduce((t, qid) => t + ((qById(qid) || {}).marks || 0), 0);
      const markDirty = () => { dirty = true; };

      /* ---------- Step bodies ---------- */
      const bodies = {
        1: () => '<form id="sf" class="form-grid" novalidate>' + field({ name: 'title', label: 'Exam title', value: ex.title, required: true, full: true, placeholder: 'e.g. Java Developer Assessment' }) +
          field({ name: 'code', label: 'Exam code', value: ex.code, required: true, hint: 'Short unique code shown to candidates, e.g. JAVA-201.' }) +
          field({ name: 'category', label: 'Category', value: ex.category, options: ['Technical', 'Aptitude', 'Analytics', 'Databases', 'Communication', 'Other'] }) +
          field({ name: 'description', label: 'Description', type: 'textarea', value: ex.description, full: true, rows: 3, hint: 'Shown on the exam details page.' }) +
          field({ name: 'instructions', label: 'Candidate instructions', type: 'textarea', value: (ex.instructions || []).join('\n'), full: true, rows: 6, hint: 'One instruction per line. Shown before the exam starts.' }) + '</form>',
        2: () => '<form id="sf" class="form-grid" novalidate>' + field({ name: 'startAt', label: 'Opens', type: 'datetime-local', value: toLocal(ex.startAt), required: true }) + field({ name: 'endAt', label: 'Closes', type: 'datetime-local', value: toLocal(ex.endAt), required: true, hint: 'Candidates must start before this time.' }) +
          field({ name: 'timezone', label: 'Time zone', value: ex.timezone, options: [['Asia/Kolkata', 'India (IST, UTC+5:30)'], ['Asia/Dubai', 'Gulf (GST, UTC+4)'], ['Europe/London', 'UK (GMT/BST)'], ['America/New_York', 'US Eastern']] }) +
          field({ name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', value: ex.durationMinutes, required: true, attrs: 'min="5" max="480"' }) +
          field({ name: 'graceMinutes', label: 'Grace period (minutes)', type: 'number', value: ex.graceMinutes, attrs: 'min="0" max="60"', hint: 'Extra time after the window closes for candidates already in progress.' }) +
          field({ name: 'attemptsAllowed', label: 'Attempts allowed', type: 'number', value: ex.attemptsAllowed, attrs: 'min="1" max="5"' }) + '<p class="subtle full" id="win-hint"></p></form>',
        3: () => {
          const rows = bank.filter((q) => (!qFilter.sec || q.sectionId === qFilter.sec) && (!qFilter.q || q.prompt.toLowerCase().includes(qFilter.q)));
          return '<div class="grid g-2" style="align-items:start"><div><div class="toolbar"><div class="search" style="flex:1 1 180px">' + icon('search', 18) + '<label class="sr-only" for="qq">Search questions</label><input class="input" id="qq" type="search" placeholder="Search the bank" value="' + esc(qFilter.q) + '"></div><label class="sr-only" for="qs">Section</label><select class="select" id="qs" style="width:auto"><option value="">All sections</option>' + sections.map((s) => '<option value="' + s.id + '"' + (qFilter.sec === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select></div>' +
            '<fieldset><legend class="sr-only">Questions from the bank</legend><div class="pick-list" id="qpick">' + (rows.length ? rows.map((q) => '<label><input type="checkbox" value="' + q.id + '"' + (ex.questionIds.includes(q.id) ? ' checked' : '') + '><span class="grow"><span style="display:block;font-weight:600">' + esc(q.prompt) + '</span><span class="subtle">' + esc(Q.TYPES[q.type]) + ', ' + q.marks + ' marks, ' + esc((q.section || {}).name || '') + '</span></span>' + HUK.ui.diffChip(q.difficulty) + '</label>').join('') : '<p class="subtle" style="padding:16px">No questions match.</p>') + '</div></fieldset>' +
            '<p class="subtle mt-1">Need something new? <a href="' + HUK.url('admin/question-editor.html') + '" target="_blank" rel="noopener">Add a question</a> (opens in a new tab), then reload this step.</p></div>' +
            '<div class="card card-flat"><div class="between"><h3>Selected</h3><span class="tag">' + ex.questionIds.length + ' questions, ' + totalMarks() + ' marks</span></div>' +
            (ex.sections.length ? '<p class="subtle mt-1">Order sections as candidates will see them.</p><ol class="list mt-1" id="secorder">' + ex.sections.map((s, i) => '<li class="list-item"><span class="pill-count">' + (i + 1) + '</span><span class="grow"><strong>' + esc(s.title) + '</strong><span class="subtle" style="display:block">' + ex.questionIds.filter((qid) => (qById(qid) || {}).sectionId === s.id).length + ' questions</span></span><button type="button" class="btn btn-icon btn-sm" data-move="' + i + ':-1" aria-label="Move ' + esc(s.title) + ' up"' + (i === 0 ? ' disabled' : '') + '>' + icon('chevronUp', 16) + '</button><button type="button" class="btn btn-icon btn-sm" data-move="' + i + ':1" aria-label="Move ' + esc(s.title) + ' down"' + (i === ex.sections.length - 1 ? ' disabled' : '') + '>' + icon('chevronDown', 16) + '</button></li>').join('') + '</ol>' : '<p class="muted mt-2">Pick questions on the left to build the exam.</p>') +
            '<hr><form id="sf">' + switchRow({ name: 'negativeMarking', label: 'Negative marking', hint: 'Deduct each question’s negative marks for wrong objective answers.', checked: ex.negativeMarking }) + '</form></div></div>';
        },
        4: () => {
          const groups = [...new Set(students.map((s) => s.group).filter(Boolean))];
          const rows = students.filter((s) => !sFilter || (s.name + s.email + (s.institution || '')).toLowerCase().includes(sFilter));
          return '<div class="row-wrap mb-2"><span class="subtle">Add a whole cohort:</span>' + groups.map((g) => '<button type="button" class="btn btn-sm" data-group="' + esc(g) + '">' + icon('plus', 14) + '<span>' + esc(g) + '</span></button>').join('') + '<button type="button" class="btn btn-sm btn-ghost" data-clear-cands>Clear all</button></div>' +
            '<div class="grid g-2" style="align-items:start"><div><div class="search mb-2">' + icon('search', 18) + '<label class="sr-only" for="sq">Search students</label><input class="input" id="sq" type="search" placeholder="Search students" value="' + esc(sFilter) + '"></div><fieldset><legend class="sr-only">Students</legend><div class="pick-list" id="spick">' + rows.map((s) => '<label><input type="checkbox" value="' + s.id + '"' + (ex.candidateIds.includes(s.id) ? ' checked' : '') + '>' + avatar(s.name, 'avatar-sm') + '<span class="grow"><span style="display:block;font-weight:600">' + esc(s.name) + '</span><span class="subtle">' + esc(s.email) + '</span></span></label>').join('') + '</div></fieldset></div>' +
            '<div class="stack"><div class="card card-flat"><div class="metric-value">' + ex.candidateIds.length + '</div><div class="subtle">candidates assigned</div></div>' +
            '<div class="card card-flat"><h3>Import by email</h3><p class="subtle mt-1">Paste emails or upload a CSV with an <code>email</code> column. Only existing student accounts are matched.</p><label class="sr-only" for="emails">Emails</label><textarea class="textarea mt-2" id="emails" rows="4" placeholder="neha.reddy@mail.com&#10;rohan.gupta@mail.com"></textarea><div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-add-emails>Add emails</button><label class="btn btn-sm btn-ghost" style="cursor:pointer">' + icon('upload', 16) + '<span>Upload CSV</span><input type="file" accept=".csv,text/csv" id="ccsv" class="sr-only"></label></div><p class="subtle mt-1" id="imp-msg" aria-live="polite"></p></div></div></div>';
        },
        5: () => '<form id="sf" class="stack-lg"><fieldset><legend class="field-label mb-2">Proctoring mode</legend><div class="grid g-3">' + [['live', 'Live', 'A proctor watches in real time and can intervene.'], ['recorded', 'Recorded', 'Sessions are recorded and reviewed afterwards.'], ['none', 'None', 'No camera or proctor. For practice tests only.']].map(([v, t, d]) => '<label class="choice"><input type="radio" name="proctoringMode" value="' + v + '"' + (ex.proctoringMode === v ? ' checked' : '') + '><span class="choice-body"><span><strong>' + t + '</strong><span class="subtle" style="display:block">' + d + '</span></span></span></label>').join('') + '</div></fieldset>' +
          '<div class="grid g-2" style="align-items:start"><fieldset class="stack-sm"><legend class="field-label">Candidate requirements</legend>' + switchRow({ name: 'camera', label: 'Camera on', checked: ex.proctoring.camera }) + switchRow({ name: 'mic', label: 'Microphone on', checked: ex.proctoring.mic }) + switchRow({ name: 'screen', label: 'Screen sharing', checked: ex.proctoring.screen }) + switchRow({ name: 'idCheck', label: 'Photo ID check before starting', checked: ex.proctoring.idCheck }) + '</fieldset>' +
          '<fieldset><legend class="field-label mb-1">Proctors</legend><p class="subtle mb-2">The first proctor selected leads the live session.</p><div class="pick-list">' + proctors.map((p) => '<label><input type="checkbox" name="proctorIds" value="' + p.id + '"' + (ex.proctorIds.includes(p.id) ? ' checked' : '') + '>' + avatar(p.name, 'avatar-sm') + '<span class="grow"><span style="display:block;font-weight:600">' + esc(p.name) + '</span><span class="subtle">' + p.stats.scheduled + ' upcoming sessions</span></span>' + chip(p.availability) + '</label>').join('') + '</div></fieldset></div></form>',
        6: () => '<form id="sf" class="form-grid" novalidate>' + field({ name: 'tabPolicy', label: 'When a candidate leaves the exam tab', value: ex.security.tabPolicy, options: [['allow', 'Allow and log it'], ['warn', 'Warn the candidate and alert the proctor'], ['block', 'End the attempt after the limit']] }) +
          field({ name: 'maxTabSwitches', label: 'Tab-switch limit', type: 'number', value: ex.security.maxTabSwitches, attrs: 'min="0" max="20"' }) +
          '<div class="full stack-sm">' + switchRow({ name: 'copyPaste', label: 'Allow copy and paste', hint: 'Off blocks copy, cut and paste inside questions.', checked: ex.security.copyPaste }) + switchRow({ name: 'fullscreen', label: 'Require full screen', checked: ex.security.fullscreen }) + switchRow({ name: 'browserLock', label: 'Require the lockdown browser', hint: 'Candidates must install the HUK HIRE secure browser.', checked: ex.security.browserLock }) + '</div>' +
          field({ name: 'ipRestriction', label: 'Allowed IP ranges', value: ex.security.ipRestriction, placeholder: 'e.g. 103.48.0.0/16', hint: 'Leave blank to allow any network. Separate ranges with commas.' }) +
          field({ name: 'deviceLimit', label: 'Devices per candidate', type: 'number', value: ex.security.deviceLimit, attrs: 'min="1" max="3"' }) + '</form>',
        7: () => '<form id="sf" class="form-grid" novalidate>' + field({ name: 'passingScore', label: 'Passing score (%)', type: 'number', value: ex.resultRules.passingScore, required: true, attrs: 'min="0" max="100"' }) +
          field({ name: 'release', label: 'Result release', value: ex.resultRules.release, options: [['immediate', 'Immediately after submission'], ['manual', 'After an admin publishes them'], ['scheduled', 'When the exam window closes']] }) +
          '<fieldset class="full stack-sm"><legend class="field-label">Candidates can see</legend>' + switchRow({ name: 'showScore', label: 'Score and percentage', checked: ex.resultRules.showScore }) + switchRow({ name: 'showSectionBreakdown', label: 'Section breakdown', checked: ex.resultRules.showSectionBreakdown }) + switchRow({ name: 'showAnswers', label: 'Their answers and the correct answers', checked: ex.resultRules.showAnswers }) + switchRow({ name: 'feedback', label: 'Written feedback', checked: ex.resultRules.feedback }) + '</fieldset></form>',
        8: () => {
          const problems = E.validate(ex);
          const sec = (n, rows) => '<section class="card card-flat"><div class="between mb-2"><h3>' + STEPS[n - 1] + '</h3><button type="button" class="btn btn-sm btn-ghost" data-goto="' + n + '">' + icon('edit', 16) + '<span>Edit</span></button></div><dl class="kv">' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl></section>';
          return (problems.length ? '<div class="alert mb-2" data-tone="warn" role="alert">' + icon('alert', 18) + '<div><strong>' + problems.length + ' thing' + (problems.length > 1 ? 's' : '') + ' to fix before publishing</strong><ul style="padding-left:18px;margin-top:4px">' + problems.map((p) => '<li>' + esc(p.replace(/^./, (c) => c.toUpperCase())) + '</li>').join('') + '</ul></div></div>' : '<div class="alert mb-2" data-tone="ok">' + icon('checkCircle', 18) + '<div><strong>Ready to publish</strong>Candidates will see this exam on their dashboard and proctors will see the assignment.</div></div>') +
            '<div class="grid g-2">' + sec(1, [['Title', esc(ex.title || '—')], ['Code', esc(ex.code || '—')], ['Category', esc(ex.category)], ['Instructions', (ex.instructions || []).length + ' lines']]) +
            sec(2, [['Opens', fmt.dateTime(ex.startAt)], ['Closes', fmt.dateTime(ex.endAt)], ['Duration', ex.durationMinutes + ' min'], ['Grace', ex.graceMinutes + ' min'], ['Attempts', ex.attemptsAllowed]]) +
            sec(3, [['Questions', ex.questionIds.length], ['Total marks', totalMarks()], ['Sections', esc(ex.sections.map((s) => s.title).join(', ') || '—')], ['Negative marking', ex.negativeMarking ? 'On' : 'Off']]) +
            sec(4, [['Candidates', ex.candidateIds.length]]) +
            sec(5, [['Mode', fmt.title(ex.proctoringMode)], ['Proctors', esc(ex.proctorIds.map((pid) => (proctors.find((p) => p.id === pid) || {}).name).filter(Boolean).join(', ') || 'None')], ['Requirements', ['camera', 'mic', 'screen', 'idCheck'].filter((k) => ex.proctoring[k]).map((k) => ({ camera: 'camera', mic: 'microphone', screen: 'screen', idCheck: 'ID check' }[k])).join(', ') || 'None']]) +
            sec(6, [['Tab policy', fmt.title(ex.security.tabPolicy) + ' (limit ' + ex.security.maxTabSwitches + ')'], ['Copy and paste', ex.security.copyPaste ? 'Allowed' : 'Blocked'], ['Full screen', ex.security.fullscreen ? 'Required' : 'Optional']]) +
            sec(7, [['Passing score', ex.resultRules.passingScore + '%'], ['Release', fmt.title(ex.resultRules.release)]]) + '</div>';
        }
      };

      /* ---------- Collect form values into ex ---------- */
      function collect() {
        const f = host.querySelector('#sf');
        if (!f) return true;
        if ([1, 2, 7].includes(step) && !validate(f)) return false;
        const d = formData(f);
        if (step === 1) Object.assign(ex, { title: d.title.trim(), code: d.code.trim().toUpperCase(), category: d.category, description: d.description, instructions: d.instructions.split('\n').map((s) => s.trim()).filter(Boolean) });
        if (step === 2) {
          if (new Date(d.endAt) <= new Date(d.startAt)) { HUK.ui.setFieldError(f.endAt, 'Closing time must be after the opening time.'); f.endAt.focus(); return false; }
          Object.assign(ex, { startAt: fromLocal(d.startAt), endAt: fromLocal(d.endAt), timezone: d.timezone, durationMinutes: Number(d.durationMinutes), graceMinutes: Number(d.graceMinutes || 0), attemptsAllowed: Number(d.attemptsAllowed || 1) });
        }
        if (step === 3) ex.negativeMarking = d.negativeMarking;
        if (step === 5) Object.assign(ex, { proctoringMode: d.proctoringMode, proctorIds: d.proctorIds || [], proctoring: { camera: d.camera, mic: d.mic, screen: d.screen, idCheck: d.idCheck } });
        if (step === 6) ex.security = { tabPolicy: d.tabPolicy, maxTabSwitches: Number(d.maxTabSwitches), copyPaste: d.copyPaste, fullscreen: d.fullscreen, browserLock: d.browserLock, ipRestriction: d.ipRestriction.trim(), deviceLimit: Number(d.deviceLimit) };
        if (step === 7) ex.resultRules = { passingScore: Number(d.passingScore), release: d.release, showScore: d.showScore, showSectionBreakdown: d.showSectionBreakdown, showAnswers: d.showAnswers, feedback: d.feedback };
        return true;
      }

      /* ---------- Render ---------- */
      function draw(focus) {
        const editing = !!ex.id;
        host.innerHTML = pageHeader({ title: editing ? 'Edit ' + (ex.title || 'exam') : 'Create exam', subtitle: editing ? chip(ex.status) + ' <span class="subtle">Last saved ' + fmt.rel(ex.updatedAt) + '</span>' : 'Work through each step. Save a draft at any point and come back later.' }) +
          '<div class="wizard"><nav class="wizard-nav card card-tight" aria-label="Exam setup steps"><ol class="stepper">' + STEPS.map((s, i) => '<li><button type="button" data-goto="' + (i + 1) + '"' + (step === i + 1 ? ' aria-current="step"' : '') + ' class="' + (i + 1 < step ? 'done' : '') + '"><span class="step-num">' + (i + 1 < step ? icon('check', 14) : i + 1) + '</span><span class="step-label">' + s + '</span></button></li>').join('') + '</ol></nav>' +
          '<section class="card" aria-labelledby="step-t"><div class="between mb-2"><div><p class="subtle">Step ' + step + ' of ' + STEPS.length + '</p><h2 id="step-t" tabindex="-1">' + STEPS[step - 1] + '</h2></div></div>' + bodies[step]() +
          '<div class="wizard-foot"><button type="button" class="btn" data-prev' + (step === 1 ? ' disabled' : '') + '>' + icon('chevronLeft', 18) + '<span>Back</span></button><span class="spacer"></span><button type="button" class="btn btn-ghost" data-save data-loading-text="Saving…">' + icon('cloud', 18) + '<span>Save draft</span></button>' +
          (step < 8 ? '<button type="button" class="btn btn-primary" data-next><span>Continue</span>' + icon('chevronRight', 18) + '</button>' : '<button type="button" class="btn btn-accent" data-publish data-loading-text="Publishing…"' + (E.validate(ex).length || ex.status === 'archived' ? ' disabled' : '') + '>' + icon('send', 18) + '<span>' + (ex.status && !['draft'].includes(ex.status) ? 'Save and update' : 'Publish exam') + '</span></button>') + '</div></section></div>';
        bindStep();
        if (focus) host.querySelector('#step-t').focus();
      }
      function bindStep() {
        const f = host.querySelector('#sf');
        if (f) f.addEventListener('input', markDirty);
        if (step === 2) {
          const hint = () => { const s = f.startAt.value, e = f.endAt.value; host.querySelector('#win-hint').textContent = s && e && new Date(e) > new Date(s) ? 'Window length: ' + fmt.dur((new Date(e) - new Date(s)) / 1000) + '. Candidates can start any time in this window.' : ''; };
          f.addEventListener('input', hint); hint();
        }
        if (step === 3) {
          host.querySelector('#qpick').addEventListener('change', (e) => { const v = e.target.value; ex.questionIds = e.target.checked ? ex.questionIds.concat(v) : ex.questionIds.filter((x) => x !== v); syncSections(); markDirty(); redrawKeepScroll('#qpick'); });
          host.querySelector('#qq').addEventListener('input', debounce((e) => { qFilter.q = e.target.value.trim().toLowerCase(); redrawKeepFocus('#qq'); }, 250));
          host.querySelector('#qs').addEventListener('change', (e) => { qFilter.sec = e.target.value; redrawKeepFocus('#qs'); });
          host.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => { const [i, d] = b.dataset.move.split(':').map(Number); const s = ex.sections; [s[i], s[i + d]] = [s[i + d], s[i]]; syncSections(); markDirty(); draw(); HUK.ui.announce('Section moved'); }));
        }
        if (step === 4) {
          host.querySelector('#spick').addEventListener('change', (e) => { const v = e.target.value; ex.candidateIds = e.target.checked ? ex.candidateIds.concat(v) : ex.candidateIds.filter((x) => x !== v); markDirty(); redrawKeepScroll('#spick'); });
          host.querySelector('#sq').addEventListener('input', debounce((e) => { sFilter = e.target.value.trim().toLowerCase(); redrawKeepFocus('#sq'); }, 250));
          host.querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => { const ids = students.filter((s) => s.group === b.dataset.group).map((s) => s.id); ex.candidateIds = [...new Set(ex.candidateIds.concat(ids))]; markDirty(); draw(); toast(ids.length + ' students from ' + b.dataset.group + ' added.'); }));
          host.querySelector('[data-clear-cands]').addEventListener('click', () => { ex.candidateIds = []; markDirty(); draw(); });
          const addEmails = (text) => { const emails = text.toLowerCase().match(/[^\s,;"]+@[^\s,;"]+/g) || []; const found = students.filter((s) => emails.includes(s.email.toLowerCase())).map((s) => s.id); ex.candidateIds = [...new Set(ex.candidateIds.concat(found))]; markDirty(); const miss = emails.length - found.length; draw(); host.querySelector('#imp-msg').textContent = found.length + ' matched' + (miss ? ', ' + miss + ' not found (they need a student account first)' : '') + '.'; };
          host.querySelector('[data-add-emails]').addEventListener('click', () => addEmails(host.querySelector('#emails').value));
          host.querySelector('#ccsv').addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => addEmails(r.result); r.readAsText(file); });
        }
      }
      function redrawKeepScroll(sel) { const top = host.querySelector(sel).scrollTop; draw(); host.querySelector(sel).scrollTop = top; }
      function redrawKeepFocus(sel) { const el = host.querySelector(sel); const pos = el.selectionStart; draw(); const n = host.querySelector(sel); n.focus(); if (pos != null && n.setSelectionRange) try { n.setSelectionRange(pos, pos); } catch (e) {} }

      async function save(btn, { quiet = false } = {}) {
        if (!collect()) return null;
        if (!ex.title) { toast('Add a title on step 1 before saving.', { tone: 'warn' }); return null; }
        setLoading(btn, true);
        try {
          const saved = await E.saveDraft({ ...ex, draftStep: step });
          ex = { ...ex, ...saved }; dirty = false;
          if (!HUK.qs('id')) HUK.setQuery({ id: ex.id });
          if (!quiet) toast(ex.status === 'draft' ? 'Draft saved. You can resume it from the Exams list.' : 'Changes saved.');
          return ex;
        } catch (e) { toast(e.message, { tone: 'bad' }); return null; } finally { setLoading(btn, false); }
      }
      const goto = (n) => { if (n === step) return; if (n > step && !collect()) return; if (n < step) collect(); step = n; HUK.setQuery({ step: n }); draw(true); window.scrollTo({ top: 0 }); };

      host.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-goto],[data-prev],[data-next],[data-save],[data-publish]'); if (!t) return;
        if (t.dataset.goto) goto(Number(t.dataset.goto));
        else if (t.hasAttribute('data-prev')) goto(step - 1);
        else if (t.hasAttribute('data-next')) goto(step + 1);
        else if (t.hasAttribute('data-save')) save(t);
        else if (t.hasAttribute('data-publish')) {
          const saved = await save(t, { quiet: true }); if (!saved) return;
          if (ex.status !== 'draft') { toast('Exam updated.'); HUK.go('admin/exam-detail.html?id=' + ex.id); return; }
          setLoading(t, true);
          try { await E.publish(ex.id); dirty = false; HUK.go('admin/exam-detail.html?id=' + ex.id + '&published=1'); }
          catch (err) { setLoading(t, false); toast(err.message, { tone: 'bad', timeout: 8000 }); }
        }
      });
      window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    }
  });
})();
