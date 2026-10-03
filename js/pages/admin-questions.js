/* =========================================================
   Admin: question bank, question editor (add/edit),
   CSV import, sections/categories
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, diffChip, pageHeader, field, load, empty, table, paginate, pager, toast, confirm, modal, onAction, debounce, validate, formData, setLoading, menu, parseCsv, downloadText } = HUK.ui;
  const Q = HUK.questionService;
  const HOME = ['Dashboard', 'admin/dashboard.html'];
  const BANK = ['Question bank', 'admin/question-bank.html'];
  const KEYS = 'ABCDEFGH';
  const CHOICE = ['single', 'multi', 'truefalse'];

  /** Student-style preview of a question with the correct answer marked. */
  function preview(q, { showAnswer = true } = {}) {
    const ans = Array.isArray(q.answer) ? q.answer : [];
    let body = '';
    if (CHOICE.includes(q.type)) body = '<div class="q-options" style="margin-top:16px">' + (q.options || []).map((o, i) => '<div class="q-option' + (q.type === 'multi' ? ' multi' : '') + '" style="cursor:default' + (showAnswer && ans.includes(o.id) ? ';border-color:var(--ok)' : '') + '"><span class="opt-key"' + (showAnswer && ans.includes(o.id) ? ' style="background:var(--ok-bg);color:var(--ok-fg)"' : '') + '>' + KEYS[i] + '</span><span class="grow">' + esc(o.text || 'Option ' + KEYS[i]) + '</span>' + (showAnswer && ans.includes(o.id) ? chip('ok', 'Correct') : '') + '</div>').join('') + '</div>';
    else if (['short', 'numeric'].includes(q.type)) body = '<div class="input mt-2" style="color:var(--text-3);max-width:320px">Candidate types ' + (q.type === 'numeric' ? 'a number' : 'a short answer') + '</div>' + (showAnswer && q.answer ? '<p class="mt-1">' + chip('ok', 'Accepted: ' + q.answer) + '</p>' : '');
    else if (q.type === 'long') body = '<div class="textarea mt-2" style="color:var(--text-3)">Candidate writes a long answer. Scored by a reviewer.</div>';
    else body = '<div class="alert mt-2">' + icon('info', 18) + '<div>' + esc(Q.TYPES[q.type]) + ' editor appears here in the full product.</div></div>';
    return '<div class="row-wrap mb-2"><span class="tag">' + esc(Q.TYPES[q.type] || q.type) + '</span><span class="tag">' + (q.marks || 0) + ' marks</span>' + (q.negativeMarks ? '<span class="tag">−' + q.negativeMarks + ' if wrong</span>' : '') + (q.difficulty ? diffChip(q.difficulty) : '') + '</div><p class="q-prompt" style="font-size:1.05rem">' + esc(q.prompt || 'Your question appears here.') + '</p>' + (q.code ? '<pre style="background:var(--surface-muted);padding:12px;border-radius:12px;overflow-x:auto;margin-top:10px"><code>' + esc(q.code) + '</code></pre>' : '') + body + (showAnswer && q.explanation ? '<p class="subtle mt-2"><strong>Explanation:</strong> ' + esc(q.explanation) + '</p>' : '');
  }
  HUK.questionPreview = preview;

  /* ---------------- Question bank ---------------- */
  HUK.page('admin-question-bank', {
    title: 'Question bank',
    crumbs: [HOME, ['Question bank']],
    render(main) {
      let all = [], sections = [], f = { q: '', type: '', difficulty: '', sectionId: '' }, page = 1;
      main.innerHTML = pageHeader({ title: 'Question bank', subtitle: 'Reusable questions, organised by section, type and difficulty.', actions: '<a class="btn" href="' + HUK.url('admin/sections.html') + '">' + icon('layers', 18) + '<span>Sections</span></a><a class="btn" href="' + HUK.url('admin/question-import.html') + '">' + icon('upload', 18) + '<span>Import</span></a><a class="btn btn-primary" href="' + HUK.url('admin/question-editor.html') + '">' + icon('plus', 18) + '<span>Add question</span></a>' }) +
        '<div class="toolbar"><div class="search">' + icon('search', 18) + '<label class="sr-only" for="q">Search questions</label><input class="input" id="q" type="search" placeholder="Search text or tags"></div>' +
        '<label class="sr-only" for="ft">Type</label><select class="select" id="ft" style="width:auto"><option value="">All types</option>' + Object.entries(Q.TYPES).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select>' +
        '<label class="sr-only" for="fd">Difficulty</label><select class="select" id="fd" style="width:auto"><option value="">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>' +
        '<label class="sr-only" for="fs">Section</label><select class="select" id="fs" style="width:auto"><option value="">All sections</option></select></div><div class="card card-pad-0" id="t"></div>';
      const el = main.querySelector('#t');
      const draw = () => {
        const rows = all.filter((x) => (!f.type || x.type === f.type) && (!f.difficulty || x.difficulty === f.difficulty) && (!f.sectionId || x.sectionId === f.sectionId) && (!f.q || (x.prompt + ' ' + (x.tags || []).join(' ')).toLowerCase().includes(f.q)));
        const pg = paginate(rows, page, 10);
        el.innerHTML = rows.length ? table({ caption: 'Questions', rows: pg.rows, columns: [
          { label: 'Question', primary: true, render: (x) => '<div class="cell-main" style="max-width:56ch;white-space:normal">' + esc(x.prompt) + '</div><div class="row-wrap mt-1" style="gap:4px">' + (x.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' },
          { label: 'Type', render: (x) => '<span class="nowrap">' + esc(Q.TYPES[x.type]) + '</span>' },
          { label: 'Section', render: (x) => esc((x.section || {}).name || '—') },
          { label: 'Difficulty', render: (x) => diffChip(x.difficulty) },
          { label: 'Marks', render: (x) => x.marks },
          { label: 'Used in', render: (x) => x.usedIn + (x.usedIn === 1 ? ' exam' : ' exams') },
          { label: '', actions: true, align: 'right', render: (x) => menu([{ label: 'Preview', icon: 'eye', action: 'preview', id: x.id }, { label: 'Edit', icon: 'edit', href: HUK.url('admin/question-editor.html?id=' + x.id) }, { label: 'Duplicate', icon: 'copy', action: 'dup', id: x.id }, '-', { label: 'Delete', icon: 'trash', action: 'del', id: x.id, danger: true }], { label: 'Actions for question' }) }
        ] }) + pager(pg) : empty({ title: all.length ? 'No questions match these filters' : 'Your question bank is empty', text: all.length ? 'Clear a filter or search for something else.' : 'Add questions one at a time or import a CSV.', action: '<a class="btn btn-primary" href="' + HUK.url('admin/question-editor.html') + '">Add question</a>' });
      };
      const reload = () => load(el, async () => { const [qs, secs] = await Promise.all([Q.list(), Q.sections()]); all = qs; sections = secs; return qs; }, () => '', { after: () => { const sel = main.querySelector('#fs'); if (sel.options.length === 1) sel.insertAdjacentHTML('beforeend', sections.map((s) => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('')); if (HUK.qs('section')) { sel.value = HUK.qs('section'); f.sectionId = sel.value; } draw(); }, isEmpty: () => false });
      main.querySelector('#q').addEventListener('input', debounce((e) => { f.q = e.target.value.trim().toLowerCase(); page = 1; draw(); }, 200));
      [['#ft', 'type'], ['#fd', 'difficulty'], ['#fs', 'sectionId']].forEach(([s, k]) => main.querySelector(s).addEventListener('change', (e) => { f[k] = e.target.value; page = 1; draw(); }));
      main.addEventListener('click', (e) => { const p = e.target.closest('[data-pg]'); if (p) { page = Number(p.dataset.pg); draw(); } });
      onAction(main, {
        preview: (b) => { const x = all.find((y) => y.id === b.dataset.id); modal({ title: 'Question preview', body: preview(x), size: 'modal-lg', primary: { label: 'Edit question' }, secondary: { label: 'Close' } }).then((r) => { if (r === 'primary') HUK.go('admin/question-editor.html?id=' + x.id); }); },
        dup: async (b) => { const x = all.find((y) => y.id === b.dataset.id); const { id, section, usedIn, createdAt, updatedAt, ...rest } = x; await Q.save({ ...rest, prompt: rest.prompt + ' (copy)' }); toast('Question duplicated.'); reload(); },
        del: async (b) => { if (!await confirm({ title: 'Delete this question?', message: 'It will be removed from the bank. Exams that already finished keep their copy.', confirmLabel: 'Delete question', danger: true })) return; try { await Q.remove(b.dataset.id); toast('Question deleted.'); reload(); } catch (e) { toast(e.message, { tone: 'bad', timeout: 7000 }); } }
      });
      reload();
    }
  });

  /* ---------------- Question editor (add / edit) ---------------- */
  HUK.page('admin-question-editor', {
    title: () => (HUK.qs('id') ? 'Edit question' : 'Add question'),
    crumbs: () => [HOME, BANK, [HUK.qs('id') ? 'Edit question' : 'Add question']],
    render(main) {
      const id = HUK.qs('id');
      let q, sections;
      main.innerHTML = '<div id="d"></div>';
      const host = main.querySelector('#d');
      load(host, async () => {
        sections = await Q.sections();
        q = id ? await Q.get(id) : { type: 'single', prompt: '', code: '', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], answer: [], marks: 2, negativeMarks: 0.5, sectionId: HUK.qs('section') || (sections[0] || {}).id, difficulty: 'medium', tags: [], explanation: '' };
        return q;
      }, () => '', { skeleton: 'page', after: draw });

      function optionsEditor() {
        if (q.type === 'truefalse') return '<fieldset class="field full"><legend class="field-label">Correct answer</legend><div class="segmented mt-1">' + ['True', 'False'].map((t, i) => '<label><input type="radio" name="tf" value="' + 'ab'[i] + '"' + ((q.answer || [])[0] === 'ab'[i] ? ' checked' : '') + '><span>' + t + '</span></label>').join('') + '</div><span class="field-error" id="opt-err" role="alert"></span></fieldset>';
        if (CHOICE.includes(q.type)) return '<fieldset class="field full"><legend class="field-label">Options <span class="subtle" style="font-weight:500">(' + (q.type === 'multi' ? 'tick every correct option' : 'select the correct option') + ')</span></legend><div class="stack-sm mt-1" id="opts">' + q.options.map((o, i) => '<div class="row"><input type="' + (q.type === 'multi' ? 'checkbox' : 'radio') + '" name="correct" value="' + o.id + '"' + ((q.answer || []).includes(o.id) ? ' checked' : '') + ' aria-label="Option ' + KEYS[i] + ' is correct" style="width:20px;height:20px;accent-color:var(--primary);flex:none"><span class="opt-key" style="width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--surface-muted);font-weight:700;flex:none" aria-hidden="true">' + KEYS[i] + '</span><label class="sr-only" for="opt-' + i + '">Option ' + KEYS[i] + ' text</label><input class="input" id="opt-' + i + '" data-opt="' + i + '" value="' + esc(o.text) + '" placeholder="Option ' + KEYS[i] + '"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="' + i + '" aria-label="Remove option ' + KEYS[i] + '"' + (q.options.length <= 2 ? ' disabled' : '') + '>' + icon('trash', 16) + '</button></div>').join('') + '</div>' + (q.options.length < 8 ? '<button type="button" class="btn btn-sm btn-ghost mt-1" data-add-opt>' + icon('plus', 16) + '<span>Add option</span></button>' : '') + '<span class="field-error" id="opt-err" role="alert"></span></fieldset>';
        if (q.type === 'short' || q.type === 'numeric') return field({ name: 'answerText', label: 'Accepted answer', value: q.answer || '', required: true, full: true, type: q.type === 'numeric' ? 'number' : 'text', attrs: 'step="any"', hint: q.type === 'short' ? 'Matching ignores case and surrounding spaces.' : 'Exact numeric match.' });
        return '<p class="subtle full">Long answers are scored by a reviewer. Use the explanation field for the marking rubric.</p>';
      }
      function draw() {
        host.innerHTML = pageHeader({ title: id ? 'Edit question' : 'Add question', subtitle: id ? 'Changes apply to future exams. Completed exams keep the version candidates saw.' : 'Write the question, set the answer and see the candidate view on the right.' }) +
          '<div class="grid g-2" style="align-items:start"><section class="card"><form id="qf" class="form-grid" novalidate>' +
            field({ name: 'type', label: 'Question type', value: q.type, options: Object.entries(Q.TYPES) }) +
            field({ name: 'sectionId', label: 'Section', value: q.sectionId, options: sections.map((s) => [s.id, s.name]), required: true }) +
            field({ name: 'prompt', label: 'Question', type: 'textarea', value: q.prompt, required: true, full: true, rows: 4 }) +
            field({ name: 'code', label: 'Code snippet (optional)', type: 'textarea', value: q.code || '', full: true, rows: 3, attrs: 'style="font-family:ui-monospace,Menlo,monospace;font-size:.85rem"' }) +
            optionsEditor() +
            field({ name: 'marks', label: 'Marks', type: 'number', value: q.marks, required: true, attrs: 'min="0.5" max="50" step="0.5"' }) +
            field({ name: 'negativeMarks', label: 'Negative marks', type: 'number', value: q.negativeMarks || 0, attrs: 'min="0" max="10" step="0.25"', hint: 'Deducted for a wrong objective answer.' }) +
            field({ name: 'difficulty', label: 'Difficulty', value: q.difficulty, options: [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] }) +
            field({ name: 'tags', label: 'Tags', value: (q.tags || []).join(', '), hint: 'Comma separated.' }) +
            field({ name: 'explanation', label: q.type === 'long' ? 'Marking rubric' : 'Explanation', type: 'textarea', value: q.explanation || '', full: true, rows: 3, hint: 'Shown to candidates only if the exam allows answer review.' }) +
            '<div class="full form-actions"><a class="btn btn-ghost" href="' + HUK.url('admin/question-bank.html') + '">Cancel</a>' + (id ? '' : '<button type="button" class="btn" data-save-another>Save and add another</button>') + '<button type="submit" class="btn btn-primary" data-loading-text="Saving…">' + (id ? 'Save changes' : 'Save question') + '</button></div></form></section>' +
          '<aside class="card" style="position:sticky;top:calc(var(--topbar-h) + 20px)" aria-labelledby="pv"><h2 id="pv" style="font-size:var(--fs-md)" class="mb-2">Candidate preview</h2><div id="preview" aria-live="polite"></div></aside></div>';
        bind(); updatePreview();
      }
      function readForm() {
        const f = host.querySelector('#qf');
        q.type = f.type.value; q.sectionId = f.sectionId.value; q.prompt = f.prompt.value; q.code = f.code.value;
        q.marks = Number(f.marks.value); q.negativeMarks = Number(f.negativeMarks.value || 0); q.difficulty = f.difficulty.value;
        q.tags = f.tags.value.split(',').map((t) => t.trim()).filter(Boolean); q.explanation = f.explanation.value;
        if (q.type === 'truefalse') { const c = f.querySelector('[name=tf]:checked'); q.answer = c ? [c.value] : []; }
        else if (CHOICE.includes(q.type)) { f.querySelectorAll('[data-opt]').forEach((inp) => { q.options[Number(inp.dataset.opt)].text = inp.value; }); q.answer = [...f.querySelectorAll('[name=correct]:checked')].map((x) => x.value); }
        else if (f.answerText) q.answer = f.answerText.value.trim();
        else q.answer = null;
      }
      const updatePreview = () => { host.querySelector('#preview').innerHTML = preview(q); };
      function bind() {
        const f = host.querySelector('#qf');
        f.addEventListener('input', () => { readForm(); updatePreview(); });
        f.type.addEventListener('change', () => {
          readForm();
          if (q.type === 'truefalse') { q.options = [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]; q.answer = []; }
          else if (CHOICE.includes(q.type)) { if (q.options.length < 2 || q.options[0].text === 'True') q.options = 'abcd'.split('').map((k) => ({ id: k, text: '' })); q.answer = q.type === 'single' ? (q.answer || []).slice(0, 1) : q.answer || []; }
          else { q.options = []; q.answer = ''; }
          draw(); host.querySelector('#f-type').focus();
        });
        f.addEventListener('click', (e) => {
          if (e.target.closest('[data-add-opt]')) { readForm(); q.options.push({ id: 'abcdefgh'[q.options.length], text: '' }); draw(); host.querySelector('#opt-' + (q.options.length - 1)).focus(); }
          const rm = e.target.closest('[data-rm]');
          if (rm) { readForm(); const i = Number(rm.dataset.rm); const removed = q.options[i].id; q.options.splice(i, 1); const map = {}; q.options.forEach((o, k) => { map[o.id] = 'abcdefgh'[k]; o.id = 'abcdefgh'[k]; }); q.answer = (q.answer || []).filter((a) => a !== removed).map((a) => map[a]); draw(); }
        });
        const submit = async (another, btn) => {
          readForm();
          if (!validate(f)) return;
          const optErr = host.querySelector('#opt-err');
          if (optErr) {
            let msg = '';
            if (CHOICE.includes(q.type) && q.type !== 'truefalse' && q.options.some((o) => !o.text.trim())) msg = 'Fill in every option or remove the empty ones.';
            else if (CHOICE.includes(q.type) && !(q.answer || []).length) msg = 'Mark the correct ' + (q.type === 'multi' ? 'options.' : 'option.');
            optErr.innerHTML = msg ? icon('alert', 14) + '<span>' + msg + '</span>' : '';
            if (msg) { (host.querySelector('#opts input,[name=tf]') || f).focus(); HUK.ui.announce(msg); return; }
          }
          setLoading(btn, true);
          try {
            await Q.save({ ...q });
            toast(id ? 'Question updated.' : 'Question saved to the bank.');
            if (another) { q = { ...q, id: undefined, prompt: '', code: '', explanation: '', answer: CHOICE.includes(q.type) ? [] : '', options: q.type === 'truefalse' ? q.options : q.options.map((o) => ({ ...o, text: '' })) }; draw(); host.querySelector('#f-prompt').focus(); }
            else HUK.go('admin/question-bank.html');
          } catch (e) { setLoading(btn, false); toast(e.message, { tone: 'bad' }); }
        };
        f.addEventListener('submit', (e) => { e.preventDefault(); submit(false, f.querySelector('[type=submit]')); });
        const a = f.querySelector('[data-save-another]'); if (a) a.addEventListener('click', () => submit(true, a));
      }
    }
  });

  /* ---------------- Import questions ---------------- */
  HUK.page('admin-question-import', {
    title: 'Import questions',
    crumbs: [HOME, BANK, ['Import']],
    render(main) {
      const COLS = ['type', 'prompt', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'marks', 'negative_marks', 'section', 'difficulty', 'tags'];
      let sections = [], parsed = [];
      main.innerHTML = pageHeader({ title: 'Import questions', subtitle: 'Upload a CSV to add many questions at once. Nothing is saved until you confirm.' }) +
        '<div class="grid g-main-side"><div class="stack-lg"><section class="card"><div class="dropzone" id="dz"><span class="empty-icon" style="margin:0 auto 12px">' + icon('upload', 26) + '</span><h2 style="font-size:var(--fs-md)">Drop a CSV file here</h2><p class="muted mt-1">or</p><label class="btn btn-primary mt-1" style="cursor:pointer">' + icon('upload', 18) + '<span>Choose file</span><input type="file" accept=".csv,text/csv" id="file" class="sr-only"></label><p class="subtle mt-2">Up to 500 rows. UTF-8 encoded.</p></div></section><section id="pv" aria-live="polite"></section></div>' +
        '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)">1. Get the template</h2><p class="subtle mt-1">Columns: ' + COLS.map((c) => '<code>' + c + '</code>').join(' ') + '</p><p class="subtle mt-1"><code>type</code> is single, multi, truefalse, short, long or numeric. <code>correct</code> is the option letter(s) like <code>b</code> or <code>a;c</code>, or the answer text.</p><button type="button" class="btn btn-block mt-2" id="tpl">' + icon('download', 18) + '<span>Download template</span></button></section>' +
        '<section class="card"><h2 style="font-size:var(--fs-md)">2. Sections</h2><p class="subtle mt-1">Use a section name that already exists:</p><ul class="mt-1" id="secs" style="padding-left:18px"></ul></section></aside></div>';
      Q.sections().then((s) => { sections = s; main.querySelector('#secs').innerHTML = s.map((x) => '<li class="subtle">' + esc(x.name) + '</li>').join(''); });
      main.querySelector('#tpl').addEventListener('click', () => downloadText(COLS.join(',') + '\nsingle,"Which keyword declares a constant in Java?",static,final,const,let,b,2,0.5,Core Java,easy,"keywords;basics"\ntruefalse,"HashMap allows one null key.",,,,,a,1,0.25,Core Java,medium,collections\nnumeric,"What is 15% of 240?",,,,,36,2,0,Quantitative Aptitude,easy,percentages\n', 'huk-hire-question-template.csv'));
      function validateRow(r, i) {
        const errs = [];
        const type = (r.type || '').toLowerCase();
        if (!Q.TYPES[type]) errs.push('unknown type “' + (r.type || '') + '”');
        if (!r.prompt) errs.push('missing question text');
        const sec = sections.find((s) => s.name.toLowerCase() === (r.section || '').toLowerCase());
        if (!sec) errs.push('section “' + (r.section || '') + '” not found');
        const opts = ['a', 'b', 'c', 'd'].map((k) => ({ id: k, text: r['option_' + k] || '' })).filter((o) => o.text);
        let answer = r.correct || '';
        if (type === 'truefalse') { answer = [String(answer).toLowerCase().startsWith('f') || answer === 'b' ? 'b' : 'a']; }
        else if (['single', 'multi'].includes(type)) { answer = String(answer).toLowerCase().split(/[;|]/).map((x) => x.trim()).filter(Boolean); if (opts.length < 2) errs.push('needs at least two options'); if (!answer.length || answer.some((a) => !opts.some((o) => o.id === a))) errs.push('correct must match an option letter'); if (type === 'single' && answer.length > 1) errs.push('single choice has one correct option'); }
        if (!(Number(r.marks) > 0)) errs.push('marks must be a positive number');
        return { line: i + 2, errs, data: { type, prompt: r.prompt, options: type === 'truefalse' ? [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }] : opts, answer, marks: Number(r.marks), negativeMarks: Number(r.negative_marks || 0), sectionId: sec && sec.id, difficulty: ['easy', 'medium', 'hard'].includes((r.difficulty || '').toLowerCase()) ? r.difficulty.toLowerCase() : 'medium', tags: (r.tags || '').split(/[;|]/).map((t) => t.trim()).filter(Boolean), explanation: '' } };
      }
      function handle(file) {
        if (!file) return;
        if (!/\.csv$/i.test(file.name)) { toast('Choose a .csv file.', { tone: 'bad' }); return; }
        const r = new FileReader();
        r.onload = () => {
          parsed = parseCsv(String(r.result)).map(validateRow);
          const ok = parsed.filter((p) => !p.errs.length), bad = parsed.filter((p) => p.errs.length);
          main.querySelector('#pv').innerHTML = '<div class="card card-pad-0"><div class="card-head" style="padding:20px 22px 0"><div><h2>' + esc(file.name) + '</h2><p class="subtle">' + parsed.length + ' rows read</p></div><div class="row-wrap">' + chip('ok', ok.length + ' ready') + (bad.length ? chip('failed', bad.length + ' with errors') : '') + '</div></div>' +
            (parsed.length ? table({ caption: 'Import preview', rows: parsed, columns: [{ label: 'Row', render: (p) => p.line }, { label: 'Question', primary: true, render: (p) => '<div class="cell-main" style="white-space:normal">' + esc(p.data.prompt || '—') + '</div>' }, { label: 'Type', render: (p) => esc(Q.TYPES[p.data.type] || p.data.type) }, { label: 'Check', render: (p) => p.errs.length ? '<span class="text-bad" style="font-size:var(--fs-xs);font-weight:600">' + esc(p.errs.join('; ')) + '</span>' : chip('ok', 'Ready') }] }) : empty({ title: 'The file has no rows', text: 'Check that the first line is the header row.' })) +
            '<div class="form-actions" style="padding:16px 22px"><button type="button" class="btn" id="reset">Choose another file</button><button type="button" class="btn btn-primary" id="go"' + (ok.length ? '' : ' disabled') + ' data-loading-text="Importing…">Import ' + ok.length + ' question' + (ok.length === 1 ? '' : 's') + '</button></div></div>';
          main.querySelector('#reset').addEventListener('click', () => { main.querySelector('#pv').innerHTML = ''; main.querySelector('#file').value = ''; main.querySelector('#file').focus(); });
          main.querySelector('#go').addEventListener('click', async (e) => {
            setLoading(e.currentTarget, true);
            try { const res = await Q.importRows(ok.map((p) => p.data)); main.querySelector('#pv').innerHTML = '<div class="card">' + empty({ title: res.imported + ' questions imported', text: bad.length ? bad.length + ' rows were skipped because of errors. Fix them and import the file again.' : 'They’re now in the question bank and ready to use in exams.', iconName: 'checkCircle', action: '<a class="btn btn-primary" href="' + HUK.url('admin/question-bank.html') + '">Open question bank</a>' }) + '</div>'; toast(res.imported + ' questions imported.'); }
            catch (err) { setLoading(e.currentTarget, false); toast(err.message, { tone: 'bad' }); }
          });
        };
        r.readAsText(file);
      }
      const dz = main.querySelector('#dz');
      main.querySelector('#file').addEventListener('change', (e) => handle(e.target.files[0]));
      ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); }));
      dz.addEventListener('drop', (e) => handle(e.dataTransfer.files[0]));
    }
  });

  /* ---------------- Sections / categories ---------------- */
  HUK.page('admin-sections', {
    title: 'Sections',
    crumbs: [HOME, BANK, ['Sections']],
    render(main) {
      let all = [];
      main.innerHTML = pageHeader({ title: 'Sections and categories', subtitle: 'Group questions by topic. Exams are built section by section.', actions: '<button type="button" class="btn btn-primary" data-action="add">' + icon('plus', 18) + '<span>Add section</span></button>' }) + '<div id="l"></div>';
      const el = main.querySelector('#l');
      const reload = () => load(el, () => Q.sections(), (rows) => { all = rows; return '<div class="grid g-auto">' + rows.map((s) => '<article class="card exam-card"><div class="between"><span class="exam-code">' + esc(s.subject) + '</span><span class="tag">' + s.questionCount + ' questions</span></div><h3>' + esc(s.name) + '</h3><p class="muted" style="font-size:var(--fs-sm)">' + esc(s.description || '') + '</p><div class="exam-actions"><a class="btn btn-sm" href="' + HUK.url('admin/question-bank.html?section=' + s.id) + '">View questions</a><button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="' + s.id + '">' + icon('edit', 16) + '<span>Edit</span></button><button type="button" class="btn btn-sm btn-ghost" data-action="del" data-id="' + s.id + '" aria-label="Delete ' + esc(s.name) + '">' + icon('trash', 16) + '</button></div></article>').join('') + '</div>'; },
        { skeleton: 'cards', n: 3, empty: '<div class="card">' + empty({ title: 'No sections yet', text: 'Create a section such as “Core Java” or “Quantitative Aptitude”.', iconName: 'layers' }) + '</div>' });
      const form = (s = {}) => modal({ title: s.id ? 'Edit section' : 'Add section', body: '<form id="sf" class="stack" novalidate>' + field({ name: 'name', label: 'Section name', value: s.name || '', required: true }) + field({ name: 'subject', label: 'Subject', value: s.subject || '', required: true, hint: 'Used to group sections, e.g. Java, Aptitude.' }) + field({ name: 'description', label: 'Description', type: 'textarea', rows: 3, value: s.description || '' }) + '</form>', primary: { label: s.id ? 'Save section' : 'Add section' },
        onPrimary: async (dlg) => { const f = dlg.querySelector('#sf'); if (!validate(f)) return false; await Q.saveSection({ id: s.id, ...formData(f) }); toast(s.id ? 'Section updated.' : 'Section added.'); reload(); } });
      onAction(main, {
        add: () => form(),
        edit: (b) => form(all.find((s) => s.id === b.dataset.id)),
        del: async (b) => { const s = all.find((x) => x.id === b.dataset.id); if (!await confirm({ title: 'Delete ' + s.name + '?', message: 'Only empty sections can be deleted.', confirmLabel: 'Delete section', danger: true })) return; try { await Q.removeSection(s.id); toast('Section deleted.'); reload(); } catch (e) { toast(e.message, { tone: 'bad' }); } }
      });
      reload();
    }
  });
})();
