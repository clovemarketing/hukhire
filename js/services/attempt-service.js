/* =========================================================
   attemptService: the exam-taking "answer service" (spec §9)
   Every answer change goes through saveAnswer() so it can
   become PATCH /api/attempts/:attemptId/answers/:questionId.
   Future endpoints:
     POST  /api/student/exams/:id/start
     GET   /api/attempts/:attemptId
     PATCH /api/attempts/:attemptId/answers/:questionId
     POST  /api/attempts/:attemptId/events   (tab switch, focus loss)
     POST  /api/attempts/:attemptId/submit
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);
  const me = () => HUK.auth.user().id;
  const strip = (q) => ({ id: q.id, type: q.type, prompt: q.prompt, code: q.code || null, options: q.options || [], marks: q.marks, negativeMarks: q.negativeMarks, sectionId: q.sectionId });
  const isAnswered = (a) => a && a.value !== undefined && a.value !== null && (Array.isArray(a.value) ? a.value.length > 0 : String(a.value).trim() !== '');

  function candidateFor(db, att) {
    const sess = db.sessions.find((s) => s.examId === att.examId && s.status === 'live');
    if (!sess) return {};
    return { sess, cand: sess.candidates.find((c) => c.studentId === att.studentId) };
  }
  function pushEvent(db, sess, cand, type, severity, message) {
    if (!sess || !cand) return;
    db.events.push({ id: M.id('ev'), sessionId: sess.id, candidateId: cand.id, type, severity, message, at: new Date().toISOString() });
    cand.lastEventAt = new Date().toISOString();
  }
  function grade(q, given) {
    if (!isAnswered({ value: given })) return 0;
    if (['single', 'truefalse', 'multi'].includes(q.type)) {
      const g = [...given].sort().join(','), c = [...(q.answer || [])].sort().join(',');
      return g === c ? q.marks : -(q.negativeMarks || 0);
    }
    if (q.type === 'numeric') return Number(given) === Number(q.answer) ? q.marks : 0;
    if (q.type === 'short') return String(given).trim().toLowerCase() === String(q.answer || '').toLowerCase() ? q.marks : 0;
    if (q.type === 'long') return String(given).trim().length > 80 ? Math.round(q.marks * 0.6 * 2) / 2 : 0; // provisional, pending manual review
    return 0;
  }

  HUK.attemptService = {
    isAnswered,
    /** POST /api/student/exams/:id/start: starts or resumes */
    start(examId) {
      if (live()) return A.post('/student/exams/' + examId + '/start');
      return M.mutate((db) => {
        const e = db.exams.find((x) => x.id === examId && x.candidateIds.includes(me()));
        if (!e) throw err(404, 'NOT_FOUND', 'This exam is not assigned to you.');
        let att = db.attempts.find((a) => a.examId === examId && a.studentId === me());
        if (att && att.status === 'submitted') throw err(409, 'ALREADY_SUBMITTED', 'You have already submitted this exam.');
        const now = Date.now();
        if (!att) {
          if (now < +new Date(e.startAt)) throw err(409, 'NOT_OPEN', 'This exam has not opened yet.');
          if (now > +new Date(e.endAt)) throw err(409, 'CLOSED', 'The exam window has closed.');
          att = { id: M.id('att'), examId, studentId: me(), status: 'in_progress', startedAt: new Date().toISOString(), endsAt: new Date(Math.min(now + e.durationMinutes * 60000, +new Date(e.endAt) + (e.graceMinutes || 0) * 60000)).toISOString(), answers: {}, tabSwitches: 0, saveState: 'saved' };
          db.attempts.push(att);
          const { sess, cand } = candidateFor(db, att);
          if (cand) { cand.status = 'active'; cand.joinedAt = att.startedAt; pushEvent(db, sess, cand, 'joined', 'low', 'Started the exam'); }
        }
        att.remainingSeconds = Math.max(0, Math.round((+new Date(att.endsAt) - now) / 1000));
        return {
          attempt: att,
          exam: { id: e.id, code: e.code, title: e.title, durationMinutes: e.durationMinutes, sections: e.sections, proctoringMode: e.proctoringMode, security: e.security },
          questions: e.questionIds.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean).map(strip)
        };
      });
    },
    /** PATCH /api/attempts/:attemptId/answers/:questionId */
    saveAnswer(attemptId, questionId, answer) {
      if (live()) return A.patch('/attempts/' + attemptId + '/answers/' + questionId, answer);
      return M.mutate((db) => {
        const att = db.attempts.find((a) => a.id === attemptId);
        if (!att || att.status !== 'in_progress') throw err(409, 'ATTEMPT_CLOSED', 'This attempt is no longer open.');
        att.answers[questionId] = { ...(att.answers[questionId] || {}), ...answer, savedAt: new Date().toISOString() };
        const { cand } = candidateFor(db, att);
        if (cand) cand.answered = Object.values(att.answers).filter(isAnswered).length;
        return { questionId, savedAt: att.answers[questionId].savedAt };
      });
    },
    /** POST /api/attempts/:attemptId/events */
    logEvent(attemptId, event) {
      if (live()) return A.post('/attempts/' + attemptId + '/events', event);
      return M.mutate((db) => {
        const att = db.attempts.find((a) => a.id === attemptId);
        if (!att) return { ok: false };
        const { sess, cand } = candidateFor(db, att);
        if (event.type === 'tab_switch') {
          att.tabSwitches = (att.tabSwitches || 0) + 1;
          if (cand) { cand.tabSwitches = att.tabSwitches; cand.risk = att.tabSwitches > 2 ? 'high' : 'medium'; }
          pushEvent(db, sess, cand, 'tab_switch', att.tabSwitches > 2 ? 'high' : 'medium', 'Switched away from the exam tab (' + att.tabSwitches + ' total)');
        } else if (event.type === 'offline') pushEvent(db, sess, cand, 'disconnect', 'medium', 'Connection lost');
        else if (event.type === 'online') pushEvent(db, sess, cand, 'reconnect', 'low', 'Reconnected');
        return { ok: true, tabSwitches: att.tabSwitches };
      });
    },
    /** POST /api/attempts/:attemptId/submit */
    submit(attemptId, { auto = false } = {}) {
      if (live()) return A.post('/attempts/' + attemptId + '/submit', { auto });
      return M.mutate((db) => {
        const att = db.attempts.find((a) => a.id === attemptId);
        if (!att) throw err(404, 'NOT_FOUND', 'Attempt not found.');
        if (att.status === 'submitted') return { attemptId, resultId: (db.results.find((r) => r.attemptId === attemptId) || {}).id };
        const e = db.exams.find((x) => x.id === att.examId);
        att.status = 'submitted'; att.submittedAt = new Date().toISOString(); att.autoSubmitted = auto;
        const qs = e.questionIds.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean);
        const per = {}; qs.forEach((q) => { per[q.id] = grade(q, (att.answers[q.id] || {}).value); });
        const maxScore = qs.reduce((t, q) => t + q.marks, 0);
        const score = Math.max(0, Math.round(Object.values(per).reduce((t, v) => t + v, 0) * 2) / 2);
        const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
        const published = e.resultRules.release === 'immediate';
        const res = {
          id: M.id('res'), examId: e.id, studentId: att.studentId, attemptId, score, maxScore, percentage: pct,
          status: published ? (pct >= e.resultRules.passingScore ? 'pass' : 'fail') : 'under_review', published, publishedAt: published ? new Date().toISOString() : null,
          sections: e.sections.map((s) => { const sq = qs.filter((q) => q.sectionId === s.id); return { sectionId: s.id, title: s.title, score: Math.max(0, sq.reduce((t, q) => t + per[q.id], 0)), maxScore: sq.reduce((t, q) => t + q.marks, 0) }; }),
          incidentLevel: att.tabSwitches > 2 ? 'medium' : att.tabSwitches ? 'low' : 'none', submittedAt: att.submittedAt,
          durationSeconds: Math.round((+new Date(att.submittedAt) - +new Date(att.startedAt)) / 1000), perQuestion: per,
          feedback: pct >= 75 ? 'Strong, consistent performance. Recommended for the technical interview round.' : pct >= 60 ? 'Meets the bar. Long-answer questions are provisionally scored and will be confirmed by a reviewer.' : 'Below the passing score this time. Long-answer questions are provisionally scored pending review.'
        };
        db.results.push(res);
        const { sess, cand } = candidateFor(db, att);
        if (cand) { cand.status = 'submitted'; pushEvent(db, sess, cand, 'submitted', 'low', auto ? 'Auto-submitted when time ran out' : 'Submitted the exam'); }
        const answered = qs.filter((q) => isAnswered(att.answers[q.id])).length;
        db.notifications.unshift({ id: M.id('ntf'), userId: att.studentId, type: 'exam', title: 'Submission received: ' + e.title, message: published ? 'Your result is ready.' : 'Your result will appear once it is published.', createdAt: new Date().toISOString(), read: false, actionLabel: published ? 'View result' : 'View attempts', actionUrl: published ? 'student/result-detail.html?id=' + res.id : 'student/attempts.html' });
        return { attemptId, resultId: res.id, published, confirmation: 'HH-' + attemptId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8), summary: { total: qs.length, answered, review: qs.filter((q) => (att.answers[q.id] || {}).review).length, durationSeconds: res.durationSeconds, submittedAt: att.submittedAt, auto }, examTitle: e.title };
      });
    },
    /** GET /api/attempts/:attemptId/receipt */
    receipt(attemptId) {
      if (live()) return A.get('/attempts/' + attemptId + '/receipt');
      return M.respond((db) => {
        const att = db.attempts.find((a) => a.id === attemptId && a.studentId === me());
        if (!att) throw err(404, 'NOT_FOUND', 'We could not find that submission.');
        const e = db.exams.find((x) => x.id === att.examId);
        const res = db.results.find((r) => r.attemptId === att.id);
        const answered = Object.values(att.answers || {}).filter(isAnswered).length;
        return { attemptId, examTitle: e.title, examCode: e.code, resultId: res ? res.id : null, published: !!(res && res.published), confirmation: 'HH-' + attemptId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8), summary: { total: e.questionIds.length, answered, review: Object.values(att.answers || {}).filter((a) => a.review).length, durationSeconds: Math.round((+new Date(att.submittedAt) - +new Date(att.startedAt)) / 1000), submittedAt: att.submittedAt, auto: !!att.autoSubmitted } };
      });
    }
  };
})();
