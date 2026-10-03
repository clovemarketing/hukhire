/* =========================================================
   proctorService: proctor dashboard, live console, incidents
   Future endpoints:
     GET   /api/proctor/dashboard
     PATCH /api/proctor/me/availability
     GET   /api/proctor/assignments
     GET   /api/proctor/sessions?status=live|completed
     GET   /api/proctor/sessions/:id
     GET   /api/proctor/sessions/:id/events
     WS    /ws/proctor/sessions/:id          (live event stream)
     POST  /api/proctor/sessions/:id/candidates/:cid/warnings
     POST  /api/proctor/sessions/:id/candidates/:cid/messages
     POST  /api/proctor/sessions/:id/incidents
     POST  /api/proctor/sessions/:id/candidates/:cid/notes
     POST  /api/proctor/sessions/:id/end
     GET|PATCH /api/proctor/incidents(/:id)
   Correct answers are never part of any proctor payload.
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (s, c, m) => new HUK.ApiError(s, c, m);
  const me = () => HUK.auth.user().id;
  const nowIso = () => new Date().toISOString();

  function sessionView(db, s) {
    const e = db.exams.find((x) => x.id === s.examId);
    const c = s.candidates;
    return {
      ...s,
      exam: { id: e.id, code: e.code, title: e.title, durationMinutes: e.durationMinutes, startAt: e.startAt, endAt: e.endAt, candidateCount: e.candidateCount, proctoringMode: e.proctoringMode },
      stats: {
        total: c.length,
        active: c.filter((x) => x.status === 'active').length,
        idle: c.filter((x) => x.status === 'idle').length,
        disconnected: c.filter((x) => x.status === 'disconnected').length,
        submitted: c.filter((x) => x.status === 'submitted').length,
        highRisk: c.filter((x) => x.risk === 'high').length,
        flagged: c.filter((x) => x.flagged).length,
        warnings: c.reduce((t, x) => t + x.warnings, 0),
        openIncidents: db.incidents.filter((i) => i.sessionId === s.id && ['open', 'reviewing'].includes(i.status)).length
      }
    };
  }
  function findCand(db, sessionId, candId) {
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) throw err(404, 'NOT_FOUND', 'Session not found.');
    const c = s.candidates.find((x) => x.id === candId);
    if (!c) throw err(404, 'NOT_FOUND', 'Candidate not found in this session.');
    return { s, c };
  }
  function addEvent(db, s, c, type, severity, message) {
    const ev = { id: M.id('ev'), sessionId: s.id, candidateId: c ? c.id : null, type, severity, message, at: nowIso(), by: me() };
    db.events.push(ev);
    if (c) c.lastEventAt = ev.at;
    return ev;
  }

  HUK.proctorService = {
    EVENT_META: {
      joined: ['check', 'Joined'], submitted: ['check', 'Submitted'], tab_switch: ['monitor', 'Tab switch'], face_missing: ['userX', 'Face not detected'],
      multiple_faces: ['users', 'Multiple faces'], noise: ['mic', 'Background noise'], disconnect: ['wifiOff', 'Disconnected'], reconnect: ['wifi', 'Reconnected'],
      warning: ['alert', 'Warning sent'], message: ['message', 'Message sent'], flag: ['flag', 'Incident flagged'], note: ['edit', 'Note added'],
      identity: ['idCard', 'Identity check'], escalate: ['shield', 'Escalated'], phone_detected: ['alert', 'Phone detected'], identity_mismatch: ['idCard', 'Identity mismatch']
    },
    INCIDENT_TYPES: { tab_switch: 'Tab switching', face_missing: 'Face not visible', multiple_faces: 'Multiple people', noise: 'Voices or noise', disconnect: 'Repeated disconnects', identity_mismatch: 'Identity mismatch', phone_detected: 'Phone or device', other: 'Other' },

    /** GET /api/proctor/dashboard */
    dashboard() {
      if (live()) return A.get('/proctor/dashboard');
      return M.respond((db) => {
        const u = db.users.find((x) => x.id === me());
        const mine = db.sessions.filter((s) => s.proctorId === me());
        const today = new Date().toDateString();
        return {
          availability: u.availability,
          live: mine.filter((s) => s.status === 'live').map((s) => sessionView(db, s)),
          upcoming: mine.filter((s) => s.status === 'scheduled').map((s) => sessionView(db, s)).sort((a, b) => a.exam.startAt.localeCompare(b.exam.startAt)),
          completedToday: mine.filter((s) => s.status === 'completed' && new Date(s.endedAt).toDateString() === today).length,
          incidents: db.incidents.filter((i) => mine.some((s) => s.id === i.sessionId)),
          recentEvents: db.events.filter((ev) => mine.some((s) => s.id === ev.sessionId && s.status === 'live') && ev.severity !== 'low').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
            .map((ev) => { const s = mine.find((x) => x.id === ev.sessionId); const c = s.candidates.find((x) => x.id === ev.candidateId); return { ...ev, candidateName: c ? c.name : '', examCode: db.exams.find((e) => e.id === s.examId).code }; })
        };
      });
    },
    /** PATCH /api/proctor/me/availability */
    setAvailability(availability) {
      if (live()) return A.patch('/proctor/me/availability', { availability });
      return M.mutate((db) => { db.users.find((x) => x.id === me()).availability = availability; return { availability }; });
    },
    /** GET /api/proctor/assignments */
    assignments() {
      if (live()) return A.get('/proctor/assignments');
      return M.respond((db) => db.sessions.filter((s) => s.proctorId === me()).map((s) => sessionView(db, s)), { list: true });
    },
    /** GET /api/proctor/sessions?status= */
    sessions(status) {
      if (live()) return A.get('/proctor/sessions', { params: { status } });
      return M.respond((db) => db.sessions.filter((s) => s.proctorId === me() && (!status || s.status === status)).map((s) => sessionView(db, s)).sort((a, b) => (b.endedAt || b.startedAt).localeCompare(a.endedAt || a.startedAt)), { list: true });
    },
    /** GET /api/proctor/sessions/:id */
    session(id) {
      if (live()) return A.get('/proctor/sessions/' + id);
      return M.respond((db) => {
        const s = db.sessions.find((x) => x.id === id);
        if (!s) throw err(404, 'NOT_FOUND', 'This session does not exist or is no longer assigned to you.');
        const v = sessionView(db, s);
        v.incidents = db.incidents.filter((i) => i.sessionId === id);
        return v;
      });
    },
    /** GET /api/proctor/sessions/:id/candidates/:cid */
    candidate(sessionId, candId) {
      if (live()) return A.get('/proctor/sessions/' + sessionId + '/candidates/' + candId);
      return M.respond((db) => {
        const { s, c } = findCand(db, sessionId, candId);
        const st = db.users.find((u) => u.id === c.studentId) || {};
        return { session: sessionView(db, s), candidate: { ...c, institution: st.institution, program: st.program, phone: st.phone }, incidents: db.incidents.filter((i) => i.candidateId === c.id && i.sessionId === s.id) };
      });
    },
    /** GET /api/proctor/sessions/:id/events?candidateId= */
    events(sessionId, { candidateId } = {}) {
      if (live()) return A.get('/proctor/sessions/' + sessionId + '/events', { params: { candidateId } });
      return M.respond((db) => db.events.filter((e) => e.sessionId === sessionId && (!candidateId || e.candidateId === candidateId)).sort((a, b) => b.at.localeCompare(a.at)), { list: true });
    },
    /**
     * Live event stream. Production: a WebSocket to /ws/proctor/sessions/:id.
     * Mock: emits a realistic event every few seconds and also relays
     * events written by a student's real exam tab (same browser).
     * Returns an unsubscribe function.
     */
    subscribe(sessionId, onEvent) {
      if (live()) {
        const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/ws/proctor/sessions/' + sessionId);
        ws.onmessage = (m) => onEvent(JSON.parse(m.data));
        return () => ws.close();
      }
      const seen = new Set(M.peek().events.map((e) => e.id));
      const kinds = [['tab_switch', 'medium', 'Switched away from the exam tab'], ['face_missing', 'medium', 'Face not detected for 6s'], ['noise', 'low', 'Background voices detected'], ['multiple_faces', 'high', 'More than one face detected'], ['disconnect', 'medium', 'Connection lost'], ['reconnect', 'low', 'Reconnected']];
      let tick = 0;
      const timer = setInterval(() => {
        tick++;
        const created = M.write((db) => {
          const s = db.sessions.find((x) => x.id === sessionId);
          if (!s || s.status !== 'live') return null;
          if (tick % 2 !== 0) return null; // generate roughly every 7s
          const pool = s.candidates.filter((c) => ['active', 'idle', 'disconnected'].includes(c.status) && c.studentId !== 'stu_001');
          if (!pool.length) return null;
          const c = pool[Math.floor(Math.random() * pool.length)];
          let k = kinds[Math.floor(Math.random() * kinds.length)];
          if (c.status === 'disconnected') k = kinds[5];
          if (k[0] === 'reconnect' && c.status !== 'disconnected') k = kinds[2];
          if (k[0] === 'tab_switch') { c.tabSwitches++; c.risk = c.tabSwitches > 2 ? 'high' : c.risk === 'low' ? 'medium' : c.risk; k = [k[0], c.tabSwitches > 2 ? 'high' : 'medium', 'Switched tabs (' + c.tabSwitches + ' total)']; }
          if (k[0] === 'face_missing') { c.faceStatus = 'missing'; if (c.risk === 'low') c.risk = 'medium'; }
          if (k[0] === 'multiple_faces') { c.faceStatus = 'multiple'; c.risk = 'high'; }
          if (k[0] === 'disconnect') { c.status = 'disconnected'; c.network = 0; if (c.risk === 'low') c.risk = 'medium'; }
          if (k[0] === 'reconnect') { c.status = 'active'; c.network = 2; }
          if (c.status === 'active' && c.answered < c.total && Math.random() > 0.5) c.answered++;
          return addEvent(db, s, c, k[0], k[1], k[2]);
        });
        const fresh = M.peek().events.filter((e) => e.sessionId === sessionId && !seen.has(e.id));
        fresh.forEach((e) => { seen.add(e.id); onEvent(e); });
        if (created) seen.add(created.id);
      }, 3500);
      return () => clearInterval(timer);
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/warnings */
    warn(sessionId, candId, message) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/warnings', { message });
      return M.mutate((db) => { const { s, c } = findCand(db, sessionId, candId); c.warnings++; return addEvent(db, s, c, 'warning', 'medium', 'Warning ' + c.warnings + ': ' + message); });
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/messages */
    message(sessionId, candId, message) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/messages', { message });
      return M.mutate((db) => { const { s, c } = findCand(db, sessionId, candId); return addEvent(db, s, c, 'message', 'low', 'Message: ' + message); });
    },
    /** POST /api/proctor/sessions/:id/incidents */
    flag(sessionId, candId, { type, severity, description }) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/incidents', { candidateId: candId, type, severity, description });
      return M.mutate((db) => {
        const { s, c } = findCand(db, sessionId, candId);
        c.flagged = true; if (severity === 'high') c.risk = 'high';
        const inc = { id: M.id('inc'), sessionId, examId: s.examId, candidateId: c.id, studentId: c.studentId, studentName: c.name, type, severity, status: 'open', timestamp: nowIso(), description, reportedBy: me(), evidence: [{ id: 'evd_a', label: 'Auto snapshot' }, { id: 'evd_b', label: 'Event log' }], resolution: '' };
        db.incidents.unshift(inc);
        addEvent(db, s, c, 'flag', severity, 'Incident flagged: ' + HUK.proctorService.INCIDENT_TYPES[type]);
        return inc;
      });
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/identity */
    verifyIdentity(sessionId, candId, result) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/identity', { result });
      return M.mutate((db) => { const { s, c } = findCand(db, sessionId, candId); c.identity = result; addEvent(db, s, c, 'identity', result === 'verified' ? 'low' : 'high', result === 'verified' ? 'Identity verified by proctor' : 'Identity does not match ID photo'); return c; });
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/notes */
    addNote(sessionId, candId, text) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/notes', { text });
      return M.mutate((db) => { const { s, c } = findCand(db, sessionId, candId); const note = { id: M.id('note'), text, at: nowIso(), by: HUK.auth.user().name }; c.notes = c.notes || []; c.notes.unshift(note); addEvent(db, s, c, 'note', 'low', 'Note: ' + text); return note; });
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/escalate */
    escalate(sessionId, candId, reason) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/escalate', { reason });
      return M.mutate((db) => {
        const { s, c } = findCand(db, sessionId, candId);
        c.flagged = true; c.risk = 'high';
        db.incidents.filter((i) => i.candidateId === c.id && i.sessionId === s.id && i.status !== 'resolved').forEach((i) => { i.status = 'escalated'; });
        db.notifications.unshift({ id: M.id('ntf'), userId: 'adm_001', type: 'incident', title: 'Escalation: ' + c.name, message: reason, createdAt: nowIso(), read: false, actionLabel: 'Review incidents', actionUrl: 'admin/incidents.html' });
        return addEvent(db, s, c, 'escalate', 'high', 'Escalated to admin: ' + reason);
      });
    },
    /** POST /api/proctor/sessions/:id/candidates/:cid/terminate */
    terminate(sessionId, candId, reason) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/candidates/' + candId + '/terminate', { reason });
      return M.mutate((db) => { const { s, c } = findCand(db, sessionId, candId); c.status = 'submitted'; c.terminated = true; return addEvent(db, s, c, 'escalate', 'high', 'Attempt ended by proctor: ' + reason); });
    },
    /** POST /api/proctor/sessions/:id/end */
    endSession(sessionId, notes) {
      if (live()) return A.post('/proctor/sessions/' + sessionId + '/end', { notes });
      return M.mutate((db) => {
        const s = db.sessions.find((x) => x.id === sessionId);
        s.status = 'completed'; s.endedAt = nowIso(); s.notes = notes || s.notes;
        s.summary = { submitted: s.candidates.filter((c) => c.status === 'submitted').length, flagged: s.candidates.filter((c) => c.flagged).length, warnings: s.candidates.reduce((t, c) => t + c.warnings, 0) };
        return sessionView(db, s);
      });
    },
    /** PATCH /api/proctor/sessions/:id: save session notes */
    saveSessionNotes(sessionId, notes) {
      if (live()) return A.patch('/proctor/sessions/' + sessionId, { notes });
      return M.mutate((db) => { db.sessions.find((x) => x.id === sessionId).notes = notes; return { ok: true }; });
    },
    /** GET /api/proctor/incidents */
    incidents(f = {}) {
      if (live()) return A.get('/proctor/incidents', { params: f });
      return M.respond((db) => db.incidents
        .filter((i) => f.all || db.sessions.some((s) => s.id === i.sessionId && s.proctorId === me()))
        .filter((i) => !f.severity || i.severity === f.severity)
        .filter((i) => !f.status || i.status === f.status)
        .map((i) => ({ ...i, exam: (({ id, code, title }) => ({ id, code, title }))(db.exams.find((e) => e.id === i.examId)) }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)), { list: true });
    },
    /** PATCH /api/incidents/:id */
    updateIncident(id, patch) {
      if (live()) return A.patch('/incidents/' + id, patch);
      return M.mutate((db) => { const i = db.incidents.find((x) => x.id === id); Object.assign(i, patch, { updatedAt: nowIso() }); return i; });
    },
    /** GET /api/proctor/reports */
    reports() {
      if (live()) return A.get('/proctor/reports');
      return M.respond((db) => {
        const mine = db.sessions.filter((s) => s.proctorId === me());
        const inc = db.incidents.filter((i) => mine.some((s) => s.id === i.sessionId));
        const byType = {}; inc.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + 1; });
        return {
          totals: { sessions: mine.length, completed: mine.filter((s) => s.status === 'completed').length, candidates: mine.reduce((t, s) => t + s.candidates.length, 0), incidents: inc.length, resolved: inc.filter((i) => i.status === 'resolved').length },
          byType, weekly: db.analytics.weeklySessions,
          sessions: mine.filter((s) => s.status === 'completed').map((s) => sessionView(db, s))
        };
      });
    }
  };
})();
