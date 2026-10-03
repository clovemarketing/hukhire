/* =========================================================
   questionService: question bank, sections/categories, import
   Future endpoints:
     GET|POST /api/admin/questions, GET|PUT|DELETE /api/admin/questions/:id
     POST /api/admin/questions/import
     GET|POST /api/admin/sections, PUT|DELETE /api/admin/sections/:id
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);

  HUK.questionService = {
    TYPES: { single: 'Single choice', multi: 'Multiple choice', truefalse: 'True / False', short: 'Short answer', long: 'Long answer', numeric: 'Numeric', coding: 'Coding (placeholder)', upload: 'File upload (placeholder)' },

    /** GET /api/admin/questions?type=&difficulty=&sectionId=&q= */
    list(f = {}) {
      if (live()) return A.get('/admin/questions', { params: f });
      return M.respond((db) => db.questions
        .filter((q) => !f.type || q.type === f.type)
        .filter((q) => !f.difficulty || q.difficulty === f.difficulty)
        .filter((q) => !f.sectionId || q.sectionId === f.sectionId)
        .filter((q) => !f.tag || (q.tags || []).includes(f.tag))
        .filter((q) => !f.q || (q.prompt + ' ' + (q.tags || []).join(' ')).toLowerCase().includes(f.q.toLowerCase()))
        .map((q) => ({ ...q, section: db.sections.find((s) => s.id === q.sectionId) || null })), { list: true });
    },
    /** GET /api/admin/questions/:id */
    get(id) {
      if (live()) return A.get('/admin/questions/' + id);
      return M.respond((db) => { const q = db.questions.find((x) => x.id === id); if (!q) throw err(404, 'NOT_FOUND', 'Question not found.'); return q; });
    },
    /** POST /api/admin/questions or PUT /api/admin/questions/:id */
    save(data) {
      if (live()) return data.id ? A.put('/admin/questions/' + data.id, data) : A.post('/admin/questions', data);
      return M.mutate((db) => {
        let q = data.id && db.questions.find((x) => x.id === data.id);
        if (!q) { q = { id: M.id('q'), createdAt: new Date().toISOString(), usedIn: 0, status: 'active' }; db.questions.unshift(q); }
        Object.assign(q, data, { id: q.id, updatedAt: new Date().toISOString() });
        return q;
      });
    },
    /** DELETE /api/admin/questions/:id */
    remove(id) {
      if (live()) return A.del('/admin/questions/' + id);
      return M.mutate((db) => {
        const used = db.exams.filter((e) => e.questionIds.includes(id) && ['live', 'scheduled'].includes(e.status));
        if (used.length) throw err(409, 'IN_USE', 'This question is used in ' + used.map((e) => e.code).join(', ') + '. Remove it from those exams first.');
        db.questions = db.questions.filter((q) => q.id !== id);
        return { ok: true };
      });
    },
    /** POST /api/admin/questions/import (multipart CSV upload in production) */
    importRows(rows) {
      if (live()) return A.post('/admin/questions/import', { rows });
      return M.mutate((db) => {
        rows.forEach((r) => db.questions.unshift({ ...r, id: M.id('q'), status: 'active', usedIn: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
        return { imported: rows.length };
      });
    },
    /** GET /api/admin/sections */
    sections() {
      if (live()) return A.get('/admin/sections');
      return M.respond((db) => db.sections.map((s) => ({ ...s, questionCount: db.questions.filter((q) => q.sectionId === s.id).length })), { list: true });
    },
    /** POST|PUT /api/admin/sections */
    saveSection(data) {
      if (live()) return data.id ? A.put('/admin/sections/' + data.id, data) : A.post('/admin/sections', data);
      return M.mutate((db) => {
        let s = data.id && db.sections.find((x) => x.id === data.id);
        if (!s) { s = { id: M.id('sec') }; db.sections.push(s); }
        Object.assign(s, data, { id: s.id });
        return s;
      });
    },
    /** DELETE /api/admin/sections/:id */
    removeSection(id) {
      if (live()) return A.del('/admin/sections/' + id);
      return M.mutate((db) => {
        if (db.questions.some((q) => q.sectionId === id)) throw err(409, 'NOT_EMPTY', 'Move or delete the questions in this section first.');
        db.sections = db.sections.filter((s) => s.id !== id);
        return { ok: true };
      });
    }
  };
})();
