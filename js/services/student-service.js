/* =========================================================
   studentService: everything the Student portal reads
   Future endpoints:
     GET /api/student/dashboard
     GET /api/student/exams, GET /api/student/exams/:id
     GET /api/student/attempts
     GET /api/student/results, GET /api/student/results/:id
     POST /api/student/system-checks
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);
  const me = () => HUK.auth.user().id;

  function statusFor(db, e, sid) {
    const att = db.attempts.find((a) => a.examId === e.id && a.studentId === sid);
    if (att && att.status === 'submitted') return 'completed';
    if (att && att.status === 'in_progress') return 'in_progress';
    const now = Date.now(), s = +new Date(e.startAt), en = +new Date(e.endAt);
    if (now >= s && now < en && ['live', 'scheduled'].includes(e.status)) return 'ready';
    if (now < s) return 'upcoming';
    return 'missed';
  }
  function summary(db, e, sid) {
    const att = db.attempts.find((a) => a.examId === e.id && a.studentId === sid);
    const res = db.results.find((r) => r.examId === e.id && r.studentId === sid);
    const qs = e.questionIds.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean);
    return {
      id: e.id, code: e.code, title: e.title, description: e.description, category: e.category,
      startAt: e.startAt, endAt: e.endAt, durationMinutes: e.durationMinutes, graceMinutes: e.graceMinutes,
      questionCount: qs.length, totalMarks: qs.reduce((t, q) => t + q.marks, 0), negativeMarking: e.negativeMarking,
      sections: e.sections.map((s) => ({ ...s, count: qs.filter((q) => q.sectionId === s.id).length })),
      instructions: e.instructions, proctoringMode: e.proctoringMode, proctoring: e.proctoring, security: e.security,
      passingScore: e.resultRules.passingScore, attemptsAllowed: e.attemptsAllowed,
      studentStatus: statusFor(db, e, sid), attemptId: att ? att.id : null,
      resultId: res && res.published ? res.id : null, resultPending: !!(res && !res.published)
    };
  }
  function myExams(db, sid) {
    return db.exams.filter((e) => (e.candidateIds || []).includes(sid) && !['draft', 'archived'].includes(e.status)).map((e) => summary(db, e, sid));
  }
  function myResults(db, sid) {
    return db.results.filter((r) => r.studentId === sid).map((r) => {
      const e = db.exams.find((x) => x.id === r.examId);
      const base = { id: r.id, examId: r.examId, examTitle: e.title, examCode: e.code, submittedAt: r.submittedAt, published: r.published, publishedAt: r.publishedAt };
      return r.published ? { ...base, score: r.score, maxScore: r.maxScore, percentage: r.percentage, status: r.status } : { ...base, status: 'under_review' };
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  HUK.studentService = {
    statusFor,
    /** GET /api/student/dashboard */
    dashboard() {
      if (live()) return A.get('/student/dashboard');
      return M.respond((db) => {
        const sid = me();
        const exams = myExams(db, sid);
        const order = { in_progress: 0, ready: 1, upcoming: 2 };
        const next = exams.filter((e) => e.studentStatus in order).sort((a, b) => order[a.studentStatus] - order[b.studentStatus] || a.startAt.localeCompare(b.startAt))[0] || null;
        const results = myResults(db, sid);
        const published = results.filter((r) => r.published);
        return {
          nextExam: next,
          exams: exams.sort((a, b) => (order[a.studentStatus] ?? 9) - (order[b.studentStatus] ?? 9)),
          counts: {
            available: exams.filter((e) => ['ready', 'in_progress'].includes(e.studentStatus)).length,
            upcoming: exams.filter((e) => e.studentStatus === 'upcoming').length,
            completed: exams.filter((e) => e.studentStatus === 'completed').length,
            avgScore: published.length ? Math.round(published.reduce((t, r) => t + r.percentage, 0) / published.length) : null
          },
          attempts: HUK.studentService._attempts(db, sid).slice(0, 4),
          results: results.slice(0, 3),
          systemCheck: (db.systemChecks || {})[sid] || null,
          notifications: db.notifications.filter((n) => n.userId === sid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
        };
      });
    },
    /** GET /api/student/exams */
    exams() {
      if (live()) return A.get('/student/exams');
      return M.respond((db) => myExams(db, me()), { list: true });
    },
    /** GET /api/student/exams/:id */
    exam(id) {
      if (live()) return A.get('/student/exams/' + id);
      return M.respond((db) => {
        const e = db.exams.find((x) => x.id === id && (x.candidateIds || []).includes(me()));
        if (!e) throw err(404, 'NOT_FOUND', 'This exam is not assigned to you, or the link is incorrect.');
        return summary(db, e, me());
      });
    },
    _attempts(db, sid) {
      const rows = db.attempts.filter((a) => a.studentId === sid).map((a) => {
        const e = db.exams.find((x) => x.id === a.examId);
        const r = db.results.find((x) => x.attemptId === a.id);
        return { id: a.id, examId: a.examId, examTitle: e.title, examCode: e.code, status: a.status, startedAt: a.startedAt, submittedAt: a.submittedAt, durationMinutes: e.durationMinutes, resultId: r && r.published ? r.id : null, percentage: r && r.published ? r.percentage : null, resultStatus: r ? (r.published ? r.status : 'under_review') : null };
      });
      myExams(db, sid).filter((e) => e.studentStatus === 'missed').forEach((e) => rows.push({ id: 'missed_' + e.id, examId: e.id, examTitle: e.title, examCode: e.code, status: 'missed', startedAt: e.startAt, submittedAt: null, durationMinutes: e.durationMinutes }));
      return rows.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    },
    /** GET /api/student/attempts */
    attempts() {
      if (live()) return A.get('/student/attempts');
      return M.respond((db) => HUK.studentService._attempts(db, me()), { list: true });
    },
    /** GET /api/student/results */
    results() {
      if (live()) return A.get('/student/results');
      return M.respond((db) => myResults(db, me()), { list: true });
    },
    /** GET /api/student/results/:id: server enforces publication + visibility flags */
    result(id) {
      if (live()) return A.get('/student/results/' + id);
      return M.respond((db) => {
        const r = db.results.find((x) => x.id === id && x.studentId === me());
        if (!r) throw err(404, 'NOT_FOUND', 'Result not found.');
        const e = db.exams.find((x) => x.id === r.examId);
        if (!r.published) return { id: r.id, examId: e.id, examTitle: e.title, examCode: e.code, published: false, submittedAt: r.submittedAt };
        const rules = e.resultRules;
        const out = { id: r.id, examId: e.id, examTitle: e.title, examCode: e.code, published: true, publishedAt: r.publishedAt, submittedAt: r.submittedAt, durationSeconds: r.durationSeconds, status: r.status, passingScore: rules.passingScore, rules, feedback: rules.feedback ? r.feedback : null, rank: r.rank, cohort: db.results.filter((x) => x.examId === e.id).length };
        if (rules.showScore) Object.assign(out, { score: r.score, maxScore: r.maxScore, percentage: r.percentage });
        if (rules.showSectionBreakdown) out.sections = r.sections;
        if (rules.showAnswers) {
          const att = db.attempts.find((a) => a.id === r.attemptId);
          if (att && att.answers && Object.keys(att.answers).length) {
            out.review = e.questionIds.map((qid) => db.questions.find((q) => q.id === qid)).filter(Boolean).map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, code: q.code, options: q.options, marks: q.marks, correct: q.answer, explanation: q.explanation, given: (att.answers[q.id] || {}).value, earned: (r.perQuestion || {})[q.id] }));
          }
        }
        return out;
      });
    },
    /** POST /api/student/system-checks */
    saveSystemCheck(report) {
      if (live()) return A.post('/student/system-checks', report);
      return M.mutate((db) => { db.systemChecks = db.systemChecks || {}; db.systemChecks[me()] = { ...report, at: new Date().toISOString() }; return db.systemChecks[me()]; });
    }
  };
})();
