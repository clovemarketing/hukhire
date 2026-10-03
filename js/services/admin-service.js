/* =========================================================
   adminService: dashboard, users (students, proctors, admins),
   roles/permissions, incidents, analytics, system settings
   Future endpoints:
     GET  /api/admin/dashboard
     GET|POST /api/admin/students, GET|PUT /api/admin/students/:id
     POST /api/admin/students/import, POST /api/admin/students/:id/assign
     GET|POST /api/admin/proctors, GET|PUT /api/admin/proctors/:id
     GET  /api/admin/admins, POST /api/admin/admins/invite
     GET|PUT /api/admin/roles
     GET  /api/admin/incidents
     GET  /api/admin/analytics?range=
     GET|PUT /api/admin/settings
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);
  const now = () => Date.now();

  function studentStats(db, sid) {
    const res = db.results.filter((r) => r.studentId === sid && r.published);
    return { attempts: db.attempts.filter((a) => a.studentId === sid).length, avg: res.length ? Math.round(res.reduce((t, r) => t + r.percentage, 0) / res.length) : null, incidents: db.incidents.filter((i) => i.studentId === sid).length, assigned: db.exams.filter((e) => (e.candidateIds || []).includes(sid)).length };
  }
  function proctorStats(db, pid) {
    const sess = db.sessions.filter((s) => s.proctorId === pid);
    return { live: sess.filter((s) => s.status === 'live').length, scheduled: sess.filter((s) => s.status === 'scheduled').length, completed: sess.filter((s) => s.status === 'completed').length };
  }

  HUK.adminService = {
    /** GET /api/admin/dashboard */
    dashboard() {
      if (live()) return A.get('/admin/dashboard');
      return M.respond((db) => {
        const students = db.users.filter((u) => u.role === 'student');
        const proctors = db.users.filter((u) => u.role === 'proctor');
        const sub = db.attempts.filter((a) => a.status === 'submitted').length;
        const assignedCount = db.exams.filter((e) => e.status === 'completed').reduce((t, e) => t + e.candidateIds.length, 0);
        return {
          kpis: {
            students: students.filter((s) => s.status === 'active').length,
            activeExams: db.exams.filter((e) => ['scheduled', 'live'].includes(e.status)).length,
            liveExams: db.exams.filter((e) => e.status === 'live').length,
            proctorsOnline: proctors.filter((p) => p.availability === 'online').length,
            proctorsTotal: proctors.filter((p) => p.status === 'active').length,
            pendingReviews: db.results.filter((r) => !r.published).length + db.incidents.filter((i) => ['open', 'reviewing', 'escalated'].includes(i.status)).length,
            completionRate: assignedCount ? Math.round((sub / assignedCount) * 100) : 0
          },
          live: db.sessions.filter((s) => s.status === 'live').map((s) => {
            const e = db.exams.find((x) => x.id === s.examId);
            const p = db.users.find((u) => u.id === s.proctorId);
            return { sessionId: s.id, examId: e.id, code: e.code, title: e.title, proctor: p.name, endAt: e.endAt, candidateCount: e.candidateCount, inSession: s.candidates.length, active: s.candidates.filter((c) => c.status === 'active').length, submitted: s.candidates.filter((c) => c.status === 'submitted').length, alerts: s.candidates.filter((c) => c.risk === 'high').length };
          }),
          upcoming: db.exams.filter((e) => e.status === 'scheduled' && +new Date(e.startAt) > now()).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 5),
          activity: db.activity.slice(0, 7),
          trend: { months: db.analytics.months, attempts: db.analytics.attempts, passRate: db.analytics.passRate }
        };
      });
    },

    /* ---------- Students ---------- */
    /** GET /api/admin/students */
    students(f = {}) {
      if (live()) return A.get('/admin/students', { params: f });
      return M.respond((db) => db.users.filter((u) => u.role === 'student')
        .filter((u) => !f.status || u.status === f.status)
        .filter((u) => !f.group || u.group === f.group)
        .filter((u) => !f.q || (u.name + ' ' + u.email + ' ' + (u.institution || '')).toLowerCase().includes(f.q.toLowerCase()))
        .map((u) => ({ ...u, stats: studentStats(db, u.id) })), { list: true });
    },
    /** GET /api/admin/students/:id */
    student(id) {
      if (live()) return A.get('/admin/students/' + id);
      return M.respond((db) => {
        const u = db.users.find((x) => x.id === id && x.role === 'student');
        if (!u) throw err(404, 'NOT_FOUND', 'Student not found.');
        return {
          ...u, stats: studentStats(db, id),
          exams: db.exams.filter((e) => (e.candidateIds || []).includes(id)).map((e) => ({ id: e.id, code: e.code, title: e.title, status: e.status, startAt: e.startAt, studentStatus: HUK.studentService.statusFor(db, e, id) })),
          results: db.results.filter((r) => r.studentId === id).map((r) => ({ ...r, examTitle: db.exams.find((e) => e.id === r.examId).title })),
          incidents: db.incidents.filter((i) => i.studentId === id)
        };
      });
    },
    /** POST /api/admin/students or PUT /api/admin/students/:id */
    saveStudent(data) {
      if (live()) return data.id ? A.put('/admin/students/' + data.id, data) : A.post('/admin/students', data);
      return M.mutate((db) => {
        if (!data.id && db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) throw err(409, 'EMAIL_TAKEN', 'A user with this email already exists.');
        let u = data.id && db.users.find((x) => x.id === data.id);
        if (!u) { u = { id: M.id('stu'), role: 'student', status: 'active', createdAt: new Date().toISOString(), lastActiveAt: null }; db.users.push(u); db.userSettings[u.id] = { theme: 'brand', notifications: { email: true, inApp: true, sms: false, reminders: true } }; }
        Object.assign(u, data, { id: u.id, role: 'student' });
        return u;
      });
    },
    /** POST /api/admin/students/import */
    importStudents(rows) {
      if (live()) return A.post('/admin/students/import', { rows });
      return M.mutate((db) => {
        let added = 0, skipped = 0;
        rows.forEach((r) => {
          if (db.users.some((u) => u.email.toLowerCase() === r.email.toLowerCase())) { skipped++; return; }
          const id = M.id('stu');
          db.users.push({ id, role: 'student', status: 'active', createdAt: new Date().toISOString(), lastActiveAt: null, group: r.group || 'Imported', ...r });
          db.userSettings[id] = { theme: 'brand', notifications: { email: true, inApp: true, sms: false, reminders: true } };
          added++;
        });
        return { added, skipped };
      });
    },
    /** POST /api/admin/students/:id/assign */
    assignExam(studentIds, examId) {
      if (live()) return A.post('/admin/exams/' + examId + '/candidates', { studentIds });
      return M.mutate((db) => { const e = db.exams.find((x) => x.id === examId); studentIds.forEach((id) => { if (!e.candidateIds.includes(id)) { e.candidateIds.push(id); e.candidateCount++; } }); return { assigned: studentIds.length }; });
    },
    /** PATCH /api/admin/users/:id/status (students, proctors, admins) */
    setUserStatus(id, status) {
      if (live()) return A.patch('/admin/users/' + id + '/status', { status });
      return M.mutate((db) => { const u = db.users.find((x) => x.id === id); u.status = status; if (status === 'deactivated' && u.role === 'proctor') u.availability = 'offline'; return u; });
    },
    /** POST /api/admin/users/:id/reset-password */
    sendPasswordReset(id) {
      if (live()) return A.post('/admin/users/' + id + '/reset-password');
      return M.respond(() => ({ sent: true }));
    },
    groups() {
      if (live()) return A.get('/admin/groups');
      return M.respond((db) => [...new Set(db.users.filter((u) => u.role === 'student').map((u) => u.group))].filter(Boolean));
    },

    /* ---------- Proctors ---------- */
    /** GET /api/admin/proctors */
    proctors(f = {}) {
      if (live()) return A.get('/admin/proctors', { params: f });
      return M.respond((db) => db.users.filter((u) => u.role === 'proctor')
        .filter((u) => !f.availability || u.availability === f.availability)
        .filter((u) => !f.q || (u.name + ' ' + u.email).toLowerCase().includes(f.q.toLowerCase()))
        .map((u) => ({ ...u, stats: proctorStats(db, u.id) })), { list: true });
    },
    /** GET /api/admin/proctors/:id */
    proctor(id) {
      if (live()) return A.get('/admin/proctors/' + id);
      return M.respond((db) => {
        const u = db.users.find((x) => x.id === id && x.role === 'proctor');
        if (!u) throw err(404, 'NOT_FOUND', 'Proctor not found.');
        return { ...u, stats: proctorStats(db, id), sessions: db.sessions.filter((s) => s.proctorId === id).map((s) => ({ ...s, exam: db.exams.find((e) => e.id === s.examId) })), incidents: db.incidents.filter((i) => i.reportedBy === id).length };
      });
    },
    /** POST|PUT /api/admin/proctors */
    saveProctor(data) {
      if (live()) return data.id ? A.put('/admin/proctors/' + data.id, data) : A.post('/admin/proctors', data);
      return M.mutate((db) => {
        if (!data.id && db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) throw err(409, 'EMAIL_TAKEN', 'A user with this email already exists.');
        let u = data.id && db.users.find((x) => x.id === data.id);
        if (!u) { u = { id: M.id('prc'), role: 'proctor', status: 'active', availability: 'offline', device: { camera: 'check', mic: 'check', bandwidth: '—' }, sessionsCompleted: 0, rating: null, createdAt: new Date().toISOString() }; db.users.push(u); db.userSettings[u.id] = { theme: 'brand', notifications: { email: true, inApp: true, sms: false, reminders: true } }; }
        Object.assign(u, data, { id: u.id, role: 'proctor' });
        return u;
      });
    },

    /* ---------- Admins & roles ---------- */
    /** GET /api/admin/admins */
    admins() {
      if (live()) return A.get('/admin/admins');
      return M.respond((db) => ({ admins: db.users.filter((u) => u.role === 'admin'), roles: db.roles, permissions: db.permissions }));
    },
    /** POST /api/admin/admins/invite */
    inviteAdmin({ name, email, roleId }) {
      if (live()) return A.post('/admin/admins/invite', { name, email, roleId });
      return M.mutate((db) => {
        if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw err(409, 'EMAIL_TAKEN', 'This person already has an account.');
        const u = { id: M.id('adm'), role: 'admin', roleId, name, email, title: '', status: 'invited', createdAt: new Date().toISOString(), lastActiveAt: null };
        db.users.push(u); db.userSettings[u.id] = { theme: 'brand', notifications: { email: true, inApp: true } };
        return u;
      });
    },
    /** PATCH /api/admin/admins/:id */
    updateAdmin(id, patch) {
      if (live()) return A.patch('/admin/admins/' + id, patch);
      return M.mutate((db) => {
        const u = db.users.find((x) => x.id === id);
        if (id === HUK.auth.user().id && patch.status === 'revoked') throw err(400, 'SELF_REVOKE', 'You cannot revoke your own access.');
        Object.assign(u, patch); return u;
      });
    },
    /** PUT /api/admin/roles/:id */
    updateRole(id, permissions) {
      if (live()) return A.put('/admin/roles/' + id, { permissions });
      return M.mutate((db) => { const r = db.roles.find((x) => x.id === id); r.permissions = permissions; return r; });
    },

    /* ---------- Incidents, analytics, settings ---------- */
    /** GET /api/admin/incidents */
    incidents(f = {}) { return HUK.proctorService.incidents({ ...f, all: true }); },
    /** GET /api/admin/activity */
    activity() { return live() ? A.get('/admin/activity') : M.respond((db) => db.activity, { list: true }); },
    /** GET /api/admin/analytics */
    analytics() {
      if (live()) return A.get('/admin/analytics');
      return M.respond((db) => {
        const pub = db.results.filter((r) => r.published);
        const byExam = db.exams.filter((e) => pub.some((r) => r.examId === e.id)).map((e) => {
          const rs = pub.filter((r) => r.examId === e.id);
          return { id: e.id, code: e.code, title: e.title, n: rs.length, avg: Math.round(rs.reduce((t, r) => t + r.percentage, 0) / rs.length), pass: Math.round((rs.filter((r) => r.status === 'pass').length / rs.length) * 100) };
        });
        const dist = [0, 0, 0, 0, 0]; pub.forEach((r) => { dist[Math.min(4, Math.floor(r.percentage / 20))]++; });
        return {
          kpis: {
            totalStudents: db.users.filter((u) => u.role === 'student').length,
            activeExams: db.exams.filter((e) => ['live', 'scheduled'].includes(e.status)).length,
            completedExams: db.exams.filter((e) => e.status === 'completed').length,
            incidents: db.incidents.length,
            passPct: pub.length ? Math.round((pub.filter((r) => r.status === 'pass').length / pub.length) * 100) : 0,
            avgScore: pub.length ? Math.round(pub.reduce((t, r) => t + r.percentage, 0) / pub.length) : 0,
            activeProctors: db.users.filter((u) => u.role === 'proctor' && u.status === 'active').length
          },
          trend: db.analytics, byExam, distribution: dist, incidentsByType: db.analytics.incidentsByType
        };
      });
    },
    /** GET /api/admin/settings */
    settings() { return live() ? A.get('/admin/settings') : M.respond((db) => db.settings); },
    /** PUT /api/admin/settings/:section */
    saveSettings(section, values) {
      if (live()) return A.put('/admin/settings/' + section, values);
      return M.mutate((db) => { db.settings[section] = { ...db.settings[section], ...values }; return db.settings; });
    }
  };
})();
