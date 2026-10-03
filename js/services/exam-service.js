/* =========================================================
   examService: admin exam management + wizard drafts
   Future endpoints:
     GET|POST /api/admin/exams
     GET|PUT  /api/admin/exams/:id
     POST     /api/admin/exams/:id/publish | /duplicate | /archive
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);

  function totalMarks(db, e) { return (e.questionIds || []).reduce((t, id) => t + ((db.questions.find((q) => q.id === id) || {}).marks || 0), 0); }
  function enrich(db, e) {
    return {
      ...e,
      totalMarks: totalMarks(db, e),
      questionCount: (e.questionIds || []).length,
      proctors: (e.proctorIds || []).map((id) => db.users.find((u) => u.id === id)).filter(Boolean).map((u) => ({ id: u.id, name: u.name, availability: u.availability })),
      session: db.sessions.find((s) => s.examId === e.id && s.status === 'live') || null,
      attemptsSubmitted: db.attempts.filter((a) => a.examId === e.id && a.status === 'submitted').length,
      incidentCount: db.incidents.filter((i) => i.examId === e.id).length
    };
  }

  HUK.examService = {
    /** GET /api/admin/exams?status=&q= */
    list({ status, q } = {}) {
      if (live()) return A.get('/admin/exams', { params: { status, q } });
      return M.respond((db) => db.exams
        .filter((e) => !status || status === 'all' || e.status === status)
        .filter((e) => !q || (e.title + ' ' + e.code).toLowerCase().includes(q.toLowerCase()))
        .map((e) => enrich(db, e))
        .sort((a, b) => (b.startAt || '9').localeCompare(a.startAt || '9')), { list: true });
    },
    /** GET /api/admin/exams/:id */
    get(id) {
      if (live()) return A.get('/admin/exams/' + id);
      return M.respond((db) => {
        const e = db.exams.find((x) => x.id === id);
        if (!e) throw err(404, 'NOT_FOUND', 'This exam no longer exists or the link is incorrect.');
        const out = enrich(db, e);
        out.questions = e.questionIds.map((qid) => db.questions.find((q) => q.id === qid)).filter(Boolean);
        out.candidates = (e.candidateIds || []).map((sid) => db.users.find((u) => u.id === sid)).filter(Boolean);
        return out;
      });
    },
    /** POST /api/admin/exams (create draft) or PUT /api/admin/exams/:id (save draft) */
    saveDraft(data) {
      if (live()) return data.id ? A.put('/admin/exams/' + data.id, data) : A.post('/admin/exams', data);
      return M.mutate((db) => {
        let e = data.id && db.exams.find((x) => x.id === data.id);
        if (!e) { e = { id: M.id('exam'), status: 'draft', createdBy: HUK.auth.user().id, candidateCount: 0 }; db.exams.unshift(e); }
        Object.assign(e, data, { id: e.id, status: e.status === 'archived' ? 'draft' : e.status, updatedAt: new Date().toISOString() });
        e.candidateCount = Math.max(e.candidateCount || 0, (e.candidateIds || []).length);
        e.totalMarks = totalMarks(db, e);
        return enrich(db, e);
      });
    },
    /** POST /api/admin/exams/:id/publish */
    publish(id) {
      if (live()) return A.post('/admin/exams/' + id + '/publish');
      return M.mutate((db) => {
        const e = db.exams.find((x) => x.id === id);
        const problems = HUK.examService.validate(e);
        if (problems.length) throw err(422, 'INCOMPLETE', 'Fix these before publishing: ' + problems.join('; ') + '.');
        const now = Date.now();
        e.status = new Date(e.startAt).getTime() <= now && new Date(e.endAt).getTime() > now ? 'live' : 'scheduled';
        e.updatedAt = new Date().toISOString();
        if (!db.sessions.some((s) => s.examId === e.id) && e.proctoringMode === 'live' && e.proctorIds.length) {
          db.sessions.push({ id: M.id('sess'), examId: e.id, proctorId: e.proctorIds[0], status: 'scheduled', startedAt: e.startAt, endedAt: null, candidates: [], notes: '' });
        }
        db.activity.unshift({ id: M.id('act'), at: new Date().toISOString(), actor: HUK.auth.user().name, text: 'published ' + e.title, icon: 'send', tone: 'ok' });
        return enrich(db, e);
      });
    },
    /** Client-side pre-publish checks (the server re-validates). */
    validate(e) {
      const p = [];
      if (!e) return ['exam not found'];
      if (!e.title) p.push('add a title');
      if (!e.startAt || !e.endAt) p.push('set the exam window');
      else if (new Date(e.endAt) <= new Date(e.startAt)) p.push('end time must be after start time');
      if (!e.questionIds || !e.questionIds.length) p.push('add at least one question');
      if (!e.candidateIds || !e.candidateIds.length) p.push('assign candidates');
      if (e.proctoringMode === 'live' && (!e.proctorIds || !e.proctorIds.length)) p.push('assign a proctor for live proctoring');
      return p;
    },
    /** POST /api/admin/exams/:id/duplicate */
    duplicate(id) {
      if (live()) return A.post('/admin/exams/' + id + '/duplicate');
      return M.mutate((db) => {
        const src = db.exams.find((x) => x.id === id);
        const copy = JSON.parse(JSON.stringify(src));
        Object.assign(copy, { id: M.id('exam'), code: src.code + '-COPY', title: src.title + ' (copy)', status: 'draft', startAt: null, endAt: null, updatedAt: new Date().toISOString() });
        db.exams.unshift(copy);
        return enrich(db, copy);
      });
    },
    /** POST /api/admin/exams/:id/archive */
    archive(id) {
      if (live()) return A.post('/admin/exams/' + id + '/archive');
      return M.mutate((db) => { const e = db.exams.find((x) => x.id === id); e.status = 'archived'; return enrich(db, e); });
    },
    /** POST /api/admin/exams/:id/restore */
    restore(id) {
      if (live()) return A.post('/admin/exams/' + id + '/restore');
      return M.mutate((db) => { const e = db.exams.find((x) => x.id === id); e.status = 'draft'; return enrich(db, e); });
    },
    /** DELETE /api/admin/exams/:id (drafts only) */
    remove(id) {
      if (live()) return A.del('/admin/exams/' + id);
      return M.mutate((db) => { db.exams = db.exams.filter((x) => x.id !== id); return { ok: true }; });
    }
  };
})();
