/* =========================================================
   resultService: admin results explorer, publication, export
   Future endpoints:
     GET  /api/admin/results?examId=&status=&minScore=&maxScore=&incident=&from=&to=&q=
     GET  /api/admin/results/:id
     POST /api/admin/results/publish   { ids }
     POST /api/admin/results/:id/withhold
     GET  /api/admin/results/export?format=csv
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);

  function row(db, r) {
    const e = db.exams.find((x) => x.id === r.examId) || {};
    const s = db.users.find((x) => x.id === r.studentId) || {};
    return { ...r, examTitle: e.title, examCode: e.code, studentName: s.name, studentEmail: s.email, institution: s.institution, passingScore: (e.resultRules || {}).passingScore };
  }

  HUK.resultService = {
    /** GET /api/admin/results */
    list(f = {}) {
      if (live()) return A.get('/admin/results', { params: f });
      return M.respond((db) => db.results.map((r) => row(db, r))
        .filter((r) => !f.examId || r.examId === f.examId)
        .filter((r) => !f.status || r.status === f.status)
        .filter((r) => !f.incident || (f.incident === 'any' ? r.incidentLevel !== 'none' : r.incidentLevel === f.incident))
        .filter((r) => f.minScore == null || f.minScore === '' || r.percentage >= Number(f.minScore))
        .filter((r) => !f.from || r.submittedAt >= f.from)
        .filter((r) => !f.to || r.submittedAt <= f.to + 'T23:59:59')
        .filter((r) => !f.q || (r.studentName + ' ' + r.studentEmail).toLowerCase().includes(f.q.toLowerCase()))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), { list: true });
    },
    /** GET /api/admin/results/:id */
    get(id) {
      if (live()) return A.get('/admin/results/' + id);
      return M.respond((db) => {
        const r = db.results.find((x) => x.id === id);
        if (!r) throw err(404, 'NOT_FOUND', 'Result not found.');
        const out = row(db, r);
        const att = db.attempts.find((a) => a.id === r.attemptId) || {};
        out.attempt = { id: att.id, startedAt: att.startedAt, submittedAt: att.submittedAt, tabSwitches: att.tabSwitches || 0, autoSubmitted: !!att.autoSubmitted, ip: '103.48.' + (id.length * 7 % 200) + '.' + (id.length * 13 % 250), device: 'Chrome 132 on Windows 11' };
        out.incidents = db.incidents.filter((i) => i.studentId === r.studentId && i.examId === r.examId);
        const e = db.exams.find((x) => x.id === r.examId);
        out.cohort = db.results.filter((x) => x.examId === r.examId).map((x) => x.percentage);
        out.releasePolicy = e.resultRules.release;
        return out;
      });
    },
    /** POST /api/admin/results/publish */
    publish(ids) {
      if (live()) return A.post('/admin/results/publish', { ids });
      return M.mutate((db) => {
        ids.forEach((id) => {
          const r = db.results.find((x) => x.id === id);
          if (!r || r.published) return;
          const e = db.exams.find((x) => x.id === r.examId);
          r.published = true; r.publishedAt = new Date().toISOString(); r.status = r.percentage >= e.resultRules.passingScore ? 'pass' : 'fail';
          db.notifications.unshift({ id: M.id('ntf'), userId: r.studentId, type: 'result', title: 'Your ' + e.title + ' result is out', message: 'You scored ' + r.percentage + '%.', createdAt: new Date().toISOString(), read: false, actionLabel: 'View result', actionUrl: 'student/result-detail.html?id=' + r.id });
        });
        return { published: ids.length };
      });
    },
    /** POST /api/admin/results/:id/withhold */
    withhold(id, reason) {
      if (live()) return A.post('/admin/results/' + id + '/withhold', { reason });
      return M.mutate((db) => { const r = db.results.find((x) => x.id === id); r.published = false; r.publishedAt = null; r.status = 'under_review'; r.withheldReason = reason; return r; });
    },
    /** Export. Production: GET /api/admin/results/export (server-generated file). */
    exportCsv(rows, filename = 'huk-hire-results.csv') {
      const cols = ['studentName', 'studentEmail', 'examCode', 'examTitle', 'score', 'maxScore', 'percentage', 'status', 'incidentLevel', 'submittedAt'];
      const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      return Promise.resolve({ rows: rows.length });
    }
  };
})();
