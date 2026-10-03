/* =========================================================
   Student exam workspace (layout = focus, no app sidebar)
   - countdown timer with low/critical states and auto-submit
   - question palette (not visited / visited / answered /
     marked / answered + marked / current)
   - autosave through HUK.attemptService.saveAnswer
     (local state → "Saving…" → "Saved"), offline queue
   - tab-switch logging, copy/paste guard, submit confirmation
   ========================================================= */
(function () {
  const { icon, esc, fmt, toast, modal, announce } = HUK.ui;
  const AS = HUK.attemptService;
  const KEYS = 'ABCDEFGH';

  HUK.page('student-take-exam', {
    title: 'Exam in progress',
    async render(root) {
      const examId = HUK.qs('id');
      root.innerHTML = '<div class="status-page"><div class="card status-card" aria-busy="true"><div class="status-icon">' + icon('spinner', 28) + '</div><h1 style="font-size:var(--fs-lg)">Preparing your exam…</h1><p class="muted mt-1">Loading questions and restoring any saved answers.</p></div></div>';
      let data;
      try { data = await AS.start(examId); }
      catch (e) {
        const done = e.code === 'ALREADY_SUBMITTED';
        root.innerHTML = '<div class="status-page"><main id="main" class="card status-card"><div class="status-icon">' + icon(done ? 'checkCircle' : 'alert', 28) + '</div><h1 style="font-size:var(--fs-xl)">' + (done ? 'You’ve already submitted this exam' : 'We couldn’t start this exam') + '</h1><p class="muted mt-1">' + esc(e.message) + '</p><div class="row-wrap mt-3" style="justify-content:center"><a class="btn btn-primary" href="' + HUK.url(done ? 'student/attempts.html' : 'student/exam-details.html?id=' + examId) + '">' + (done ? 'View my attempts' : 'Back to exam details') + '</a>' + (done ? '' : '<button class="btn" type="button" onclick="location.reload()">Try again</button>') + '</div></main></div>';
        return;
      }

      const { attempt, exam, questions } = data;
      const CACHE = 'huk_attempt_cache_' + attempt.id;
      let cached = {}; try { cached = JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch (e) {}
      const answers = { ...attempt.answers };
      Object.entries(cached).forEach(([qid, a]) => { if (!answers[qid] || (a.savedAt || '') > (answers[qid].savedAt || '')) answers[qid] = a; });
      let cur = Math.max(0, Math.min(questions.length - 1, Number(sessionStorage.getItem(CACHE + '_cur')) || 0));
      let saveState = 'saved', lastSaved = null, submitting = false;
      const queue = new Map();
      const deadline = new Date(attempt.endsAt).getTime();
      const sectionOf = (q) => (exam.sections.find((s) => s.id === q.sectionId) || {}).title || 'General';
      const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

      root.innerHTML =
        '<a class="skip-link" href="#q-card">Skip to question</a>' +
        '<div class="exam-shell">' +
          '<header class="exam-top">' +
            '<span class="brand-mark" aria-hidden="true"></span>' +
            '<div class="exam-title grow"><strong>' + esc(exam.title) + '</strong><span id="q-pos"></span></div>' +
            '<div class="exam-top-right">' +
              '<span class="save-state" id="save" role="status" aria-live="polite"></span>' +
              '<span class="hide-mobile" id="net" data-tip="Connection">' + HUK.ui.signal(3) + '</span>' +
              '<div class="timer" id="timer" role="timer" aria-label="Time remaining">' + icon('clock', 18) + '<span id="clock">--:--</span></div>' +
              '<button type="button" class="btn btn-icon palette-fab" id="pal-fab" aria-controls="palette" aria-expanded="false" aria-label="Show question palette">' + icon('grid', 20) + '</button>' +
              '<button type="button" class="btn btn-primary hide-mobile" id="submit-top">Submit exam</button>' +
            '</div>' +
          '</header>' +
          '<div class="exam-progress" aria-hidden="true"><span id="bar"></span></div>' +
          '<div class="exam-body" id="body">' +
            '<main id="main"><div class="sr-only" id="q-announce" aria-live="polite"></div><section class="card q-card" id="q-card" tabindex="-1" aria-labelledby="q-prompt"></section>' +
              '<div class="q-actions" role="group" aria-label="Question actions">' +
                '<button type="button" class="btn q-secondary" id="prev">' + icon('chevronLeft', 18) + '<span>Previous</span></button>' +
                '<button type="button" class="btn q-secondary" id="review" aria-pressed="false">' + icon('bookmark', 18) + '<span>Mark for review</span></button>' +
                '<button type="button" class="btn btn-ghost q-secondary" id="clear">' + icon('x', 18) + '<span>Clear response</span></button>' +
                '<span class="spacer"></span>' +
                '<button type="button" class="btn btn-primary" id="next"><span>Save &amp; next</span>' + icon('chevronRight', 18) + '</button>' +
              '</div></main>' +
            '<aside class="card palette" id="palette" aria-label="Question palette">' +
              '<div class="between mb-2"><h2 style="font-size:var(--fs-md)">Questions</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" id="pal-close" aria-label="Hide question palette">' + icon('x', 18) + '</button></div>' +
              '<div id="pal-summary" class="row-wrap mb-2" style="font-size:var(--fs-sm)"></div>' +
              '<div id="pal-groups"></div>' +
              '<div class="pal-legend" aria-label="Legend">' +
                '<span><i class="pal-btn"></i>Not visited</span><span><i class="pal-btn" data-state="visited"></i>Not answered</span><span><i class="pal-btn" data-state="answered"></i>Answered</span><span><i class="pal-btn" data-state="review"></i>For review</span><span><i class="pal-btn" data-state="answered-review"></i>Answered, for review</span><span><i class="pal-btn" aria-current="true"></i>Current</span>' +
              '</div>' +
              (exam.proctoringMode !== 'none' ? '<div class="self-view mt-3" role="img" aria-label="Your camera is being shared with the proctor">' + icon('user', 34) + '<span class="rec-dot">Proctored</span></div>' : '') +
              '<button type="button" class="btn btn-primary btn-block mt-3" id="submit-pal">Submit exam</button>' +
            '</aside>' +
          '</div>' +
        '</div>';

      const $ = (s) => root.querySelector(s);
      const answered = (q) => AS.isAnswered(answers[q.id]);
      const stateOf = (q, i) => { const a = answers[q.id] || {}; const ans = answered(q); return a.review ? (ans ? 'answered-review' : 'review') : ans ? 'answered' : a.visited || i === cur ? 'visited' : ''; };
      const counts = () => ({ answered: questions.filter(answered).length, review: questions.filter((q) => (answers[q.id] || {}).review).length, total: questions.length });

      /* ---------- Save pipeline ---------- */
      function setSave(s) {
        saveState = s;
        const el = $('#save');
        el.dataset.state = s;
        el.innerHTML = s === 'saving' ? icon('spinner', 14) + '<span>Saving…</span>' : s === 'error' ? icon('alert', 14) + '<span>Not saved, retrying</span>' : s === 'offline' ? icon('wifiOff', 14) + '<span>Offline, saved on device</span>' : icon('cloudCheck', 14) + '<span>' + (lastSaved ? 'Saved ' + fmt.time(lastSaved) : 'All changes saved') + '</span>';
      }
      const persistLocal = () => { try { localStorage.setItem(CACHE, JSON.stringify(answers)); } catch (e) {} };
      async function flush() {
        if (!navigator.onLine) { setSave('offline'); return; }
        if (!queue.size) return;
        setSave('saving');
        const items = [...queue.entries()]; queue.clear();
        try {
          for (const [qid, payload] of items) await AS.saveAnswer(attempt.id, qid, payload);
          lastSaved = new Date().toISOString(); setSave(queue.size ? 'saving' : 'saved');
        } catch (e) {
          if (e.code === 'ATTEMPT_CLOSED') { toast('This attempt is closed.', { tone: 'bad' }); return; }
          items.forEach(([k, v]) => { if (!queue.has(k)) queue.set(k, v); }); setSave('error'); setTimeout(flush, 3000);
        }
      }
      const flushSoon = HUK.ui.debounce(flush, 500);
      function update(qid, patch, { immediate = false } = {}) {
        answers[qid] = { ...(answers[qid] || {}), ...patch, savedAt: new Date().toISOString() };
        persistLocal();
        queue.set(qid, { value: answers[qid].value, review: !!answers[qid].review, visited: true });
        setSave(navigator.onLine ? 'saving' : 'offline');
        drawPalette();
        immediate ? flush() : flushSoon();
      }

      /* ---------- Question rendering ---------- */
      function answerUi(q) {
        const a = answers[q.id] || {}; const v = a.value;
        if (['single', 'truefalse', 'multi'].includes(q.type)) {
          const multi = q.type === 'multi';
          return '<fieldset class="q-options"><legend class="sr-only">' + (multi ? 'Select all that apply' : 'Choose one answer') + '</legend>' + (multi ? '<p class="subtle" style="margin-bottom:2px">Select all that apply.</p>' : '') +
            q.options.map((o, i) => '<label class="q-option' + (multi ? ' multi' : '') + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="ans" value="' + o.id + '"' + ((v || []).includes(o.id) ? ' checked' : '') + '><span class="opt-key" aria-hidden="true">' + KEYS[i] + '</span><span>' + esc(o.text) + '</span></label>').join('') + '</fieldset>';
        }
        if (q.type === 'numeric') return '<div class="field mt-3" style="max-width:320px"><label for="ans-num">Your answer (number)</label><input class="input" id="ans-num" inputmode="decimal" autocomplete="off" value="' + esc(v || '') + '" aria-describedby="num-err"><span class="field-error" id="num-err" role="alert"></span></div>';
        if (q.type === 'short') return '<div class="field mt-3"><label for="ans-short">Your answer</label><input class="input" id="ans-short" maxlength="200" autocomplete="off" value="' + esc(v || '') + '"><span class="field-hint">A word or short phrase.</span></div>';
        if (q.type === 'long') return '<div class="field mt-3"><label for="ans-long">Your answer</label><textarea class="textarea" id="ans-long" rows="9" aria-describedby="wc">' + esc(v || '') + '</textarea><span class="field-hint" id="wc"></span></div>';
        return '<div class="alert mt-3">' + icon('info', 18) + '<div>This question type opens in a dedicated editor in the full product.</div></div>';
      }
      function drawQuestion(focus = false) {
        const q = questions[cur]; const a = answers[q.id] || {};
        if (!a.visited) { answers[q.id] = { ...a, visited: true }; persistLocal(); }
        $('#q-card').innerHTML = '<div class="q-head"><span class="q-num">Question ' + (cur + 1) + ' of ' + questions.length + '</span><div class="row-wrap"><span class="tag">' + esc(sectionOf(q)) + '</span><span class="tag">' + q.marks + (q.marks === 1 ? ' mark' : ' marks') + '</span>' + (q.negativeMarks ? '<span class="tag">−' + q.negativeMarks + ' if wrong</span>' : '') + '</div></div>' +
          '<div class="q-prompt" id="q-prompt">' + esc(q.prompt) + (q.code ? '<pre><code>' + esc(q.code) + '</code></pre>' : '') + '</div>' + answerUi(q);
        $('#q-pos').textContent = 'Question ' + (cur + 1) + ' of ' + questions.length + ', ' + sectionOf(q);
        $('#prev').disabled = cur === 0;
        const last = cur === questions.length - 1;
        $('#next').innerHTML = last ? '<span>Save &amp; review</span>' + icon('check', 18) : '<span>Save &amp; next</span>' + icon('chevronRight', 18);
        $('#review').setAttribute('aria-pressed', String(!!(answers[q.id] || {}).review));
        $('#review').querySelector('span').textContent = (answers[q.id] || {}).review ? 'Marked for review' : 'Mark for review';
        bindInputs(q);
        drawPalette();
        try { sessionStorage.setItem(CACHE + '_cur', cur); } catch (e) {}
        $('#q-announce').textContent = 'Question ' + (cur + 1) + ' of ' + questions.length;
        if (focus) $('#q-card').focus({ preventScroll: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      function bindInputs(q) {
        const card = $('#q-card');
        card.querySelectorAll('input[name="ans"]').forEach((inp) => inp.addEventListener('change', () => {
          const vals = [...card.querySelectorAll('input[name="ans"]:checked')].map((x) => x.value);
          update(q.id, { value: vals }, { immediate: true });
        }));
        const num = card.querySelector('#ans-num');
        if (num) num.addEventListener('input', () => { const ok = num.value === '' || /^-?\d*\.?\d*$/.test(num.value.trim()); HUK.ui.setFieldError(num, ok ? '' : 'Enter digits only, with an optional decimal point.'); if (ok) update(q.id, { value: num.value.trim() }); });
        const sh = card.querySelector('#ans-short');
        if (sh) sh.addEventListener('input', () => update(q.id, { value: sh.value }));
        const lg = card.querySelector('#ans-long');
        if (lg) { const wc = () => { const n = lg.value.trim() ? lg.value.trim().split(/\s+/).length : 0; card.querySelector('#wc').textContent = n + (n === 1 ? ' word' : ' words'); }; wc(); lg.addEventListener('input', () => { wc(); update(q.id, { value: lg.value }); }); }
        if (exam.security && exam.security.copyPaste === false) {
          ['copy', 'cut', 'paste'].forEach((ev) => card.addEventListener(ev, (e) => { e.preventDefault(); toast('Copy and paste are turned off for this exam.', { tone: 'warn', timeout: 2500 }); }));
        }
      }
      function drawPalette() {
        const c = counts();
        $('#pal-summary').innerHTML = '<span class="tag">' + c.answered + ' answered</span><span class="tag">' + (c.total - c.answered) + ' left</span><span class="tag">' + c.review + ' for review</span>';
        $('#bar').style.width = (c.answered / c.total * 100) + '%';
        $('#pal-groups').innerHTML = exam.sections.map((s) => {
          const idx = questions.map((q, i) => [q, i]).filter(([q]) => q.sectionId === s.id);
          if (!idx.length) return '';
          return '<h3 class="subtle" style="margin:12px 0 8px;font-weight:650">' + esc(s.title) + '</h3><div class="palette-grid">' + idx.map(([q, i]) => { const st = stateOf(q, i); const lbl = 'Question ' + (i + 1) + ', ' + ({ '': 'not visited', visited: 'not answered', answered: 'answered', review: 'marked for review', 'answered-review': 'answered and marked for review' }[st]) + (i === cur ? ', current' : ''); return '<button type="button" class="pal-btn" data-q="' + i + '" data-state="' + st + '"' + (i === cur ? ' aria-current="true"' : '') + ' aria-label="' + lbl + '">' + (i + 1) + '</button>'; }).join('') + '</div>';
        }).join('');
      }
      const go = (i) => { if (i < 0 || i >= questions.length) return; flush(); cur = i; drawQuestion(true); if (isMobile()) togglePalette(false); };

      /* ---------- Palette show/hide ---------- */
      function togglePalette(show) {
        const pal = $('#palette'), body = $('#body'), fab = $('#pal-fab');
        if (isMobile()) { pal.classList.toggle('open', show); fab.setAttribute('aria-expanded', String(show)); if (show) pal.querySelector('.pal-btn[aria-current]')?.focus(); }
        else { body.classList.toggle('palette-collapsed', !show); fab.style.display = show ? '' : 'inline-flex'; fab.setAttribute('aria-expanded', String(show)); }
      }
      $('#pal-fab').addEventListener('click', () => togglePalette(isMobile() ? !$('#palette').classList.contains('open') : $('#body').classList.contains('palette-collapsed')));
      $('#pal-close').addEventListener('click', () => { togglePalette(false); $('#pal-fab').focus(); });
      $('#pal-groups').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) go(Number(b.dataset.q)); });

      /* ---------- Actions ---------- */
      $('#prev').addEventListener('click', () => go(cur - 1));
      $('#next').addEventListener('click', () => { if (cur === questions.length - 1) openSubmit(); else go(cur + 1); });
      $('#review').addEventListener('click', () => { const q = questions[cur]; const r = !(answers[q.id] || {}).review; update(q.id, { review: r }, { immediate: true }); drawQuestion(); announce(r ? 'Marked for review' : 'Review mark removed'); });
      $('#clear').addEventListener('click', () => { const q = questions[cur]; update(q.id, { value: Array.isArray((answers[q.id] || {}).value) ? [] : '' }, { immediate: true }); drawQuestion(); announce('Response cleared'); });
      $('#submit-top').addEventListener('click', openSubmit);
      $('#submit-pal').addEventListener('click', openSubmit);

      async function openSubmit() {
        await flush();
        const c = counts(); const left = c.total - c.answered;
        const res = await modal({
          title: 'Submit your exam?',
          body: '<p>You can’t change your answers after you submit.</p><div class="grid g-3 mt-2" style="gap:10px">' + [['Answered', c.answered], ['Not answered', left], ['For review', c.review]].map(([l, v]) => '<div class="card card-flat card-tight center"><div class="metric-value" style="font-size:1.5rem">' + v + '</div><div class="subtle">' + l + '</div></div>').join('') + '</div>' +
            (left ? '<div class="alert mt-2" data-tone="warn">' + icon('alert', 18) + '<div>You have ' + left + ' unanswered question' + (left === 1 ? '' : 's') + '. Unanswered questions score zero.</div></div>' : '') +
            '<p class="subtle mt-2">Time remaining: ' + fmt.clock((deadline - Date.now()) / 1000) + '</p><label class="check mt-1"><input type="checkbox" id="confirm-submit"><span>I’ve finished and want to submit my answers.</span></label>',
          primary: { label: 'Submit exam', cls: 'btn-accent' }, secondary: { label: 'Keep working' },
          onOpen: (dlg) => { const p = dlg.querySelector('[data-primary]'); p.disabled = true; dlg.querySelector('#confirm-submit').addEventListener('change', (e) => { p.disabled = !e.target.checked; }); },
          onPrimary: async () => { await submit(false); return true; }
        });
        return res;
      }
      async function submit(auto) {
        if (submitting) return; submitting = true;
        clearInterval(timerId);
        await flush();
        try {
          const r = await AS.submit(attempt.id, { auto });
          try { localStorage.removeItem(CACHE); sessionStorage.removeItem(CACHE + '_cur'); } catch (e) {}
          window.removeEventListener('beforeunload', guard);
          location.href = HUK.url('student/submitted.html?attempt=' + r.attemptId);
        } catch (e) { submitting = false; toast('We couldn’t submit yet: ' + e.message + ' Your answers are safe; try again.', { tone: 'bad', timeout: 8000 }); throw e; }
      }

      /* ---------- Timer ---------- */
      let warned5 = false, warned1 = false;
      const tick = () => {
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        $('#clock').textContent = fmt.clock(left);
        const t = $('#timer'); t.dataset.state = left <= 60 ? 'critical' : left <= 300 ? 'low' : '';
        t.setAttribute('aria-label', 'Time remaining ' + fmt.dur(left));
        if (left <= 300 && !warned5) { warned5 = true; toast('5 minutes left. Review flagged questions and submit.', { tone: 'warn', timeout: 7000 }); announce('5 minutes remaining'); }
        if (left <= 60 && !warned1) { warned1 = true; toast('1 minute left. Your exam submits automatically at zero.', { tone: 'warn', timeout: 7000 }); announce('1 minute remaining'); }
        if (left <= 0) { clearInterval(timerId); toast('Time’s up. Submitting your answers…', { tone: 'info' }); submit(true).catch(() => {}); }
      };
      const timerId = setInterval(tick, 1000); tick();

      /* ---------- Integrity & network ---------- */
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'hidden' || submitting) return;
        try {
          const r = await AS.logEvent(attempt.id, { type: 'tab_switch', at: new Date().toISOString() });
          const limit = (exam.security || {}).maxTabSwitches || 3;
          const show = () => modal({ title: 'Tab switch recorded', body: '<p>You left the exam page. This has been recorded and shared with your proctor (' + r.tabSwitches + ' of ' + limit + ' allowed).</p>' + (r.tabSwitches >= limit ? '<div class="alert mt-2" data-tone="bad">' + icon('alert', 18) + '<div>You’ve reached the limit. Further switches may end your attempt.</div></div>' : ''), primary: { label: 'Return to exam' }, secondary: null });
          if (document.visibilityState === 'visible') show(); else document.addEventListener('visibilitychange', function once() { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', once); show(); } });
        } catch (e) {}
      });
      const net = $('#net');
      window.addEventListener('offline', () => { net.innerHTML = HUK.ui.signal(0); setSave('offline'); AS.logEvent(attempt.id, { type: 'offline' }).catch(() => {}); });
      window.addEventListener('online', () => { net.innerHTML = HUK.ui.signal(3); AS.logEvent(attempt.id, { type: 'online' }).catch(() => {}); flush(); });
      const guard = (e) => { if (queue.size && !submitting) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', guard);
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
        if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
        if (e.key === 'Escape' && $('#palette').classList.contains('open')) togglePalette(false);
      });

      setSave('saved');
      drawQuestion();
      if (attempt.startedAt && Object.keys(attempt.answers || {}).length) toast('Welcome back. Your saved answers have been restored.', { tone: 'info' });
    }
  });
})();
