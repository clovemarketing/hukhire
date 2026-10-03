/* =========================================================
   authService: login, registration, OTP, password recovery
   Future endpoints: /auth/login, /auth/register/student,
   /auth/forgot-password, /auth/reset-password,
   /auth/verify-otp, /me
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const err = (status, code, message) => new HUK.ApiError(status, code, message);
  const publicUser = (u) => ({ id: u.id, role: u.role, name: u.name, email: u.email, status: u.status, title: u.title || u.program || '', avatarUrl: u.avatarUrl || null });

  HUK.authService = {
    /** POST /api/auth/login → { token, user } or { mfaRequired, challengeId } */
    login({ email, password }) {
      if (live()) return A.post('/auth/login', { email, password });
      return M.respond((db) => {
        const u = db.users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
        if (!u || password !== db.passwords.default) throw err(401, 'INVALID_CREDENTIALS', 'That email and password combination is not recognised. Check both and try again.');
        if (u.status === 'deactivated') throw err(403, 'ACCOUNT_DISABLED', 'This account has been deactivated. Contact your administrator to restore access.');
        if (u.role === 'admin') return { mfaRequired: true, challengeId: 'chl_' + u.id, maskedEmail: u.email.replace(/^(.).*(@.*)$/, '$1•••••$2') };
        return { token: 'mock.' + u.id + '.' + Date.now(), user: publicUser(u) };
      });
    },
    /** POST /api/auth/verify-otp */
    verifyOtp({ challengeId, code }) {
      if (live()) return A.post('/auth/verify-otp', { challengeId, code });
      return M.respond((db) => {
        if (code !== '123456') throw err(400, 'INVALID_OTP', 'That code is incorrect or has expired. Enter the 6-digit code from your email.');
        const uid = String(challengeId || '').replace(/^chl_/, '').replace(/^reg_/, '');
        const u = db.users.find((x) => x.id === uid);
        if (!u) throw err(400, 'CHALLENGE_EXPIRED', 'This verification request has expired. Sign in again to get a new code.');
        return { token: 'mock.' + u.id + '.' + Date.now(), user: publicUser(u) };
      });
    },
    /** POST /api/auth/resend-otp */
    resendOtp(challengeId) {
      if (live()) return A.post('/auth/resend-otp', { challengeId });
      return M.respond(() => ({ sent: true }));
    },
    /** POST /api/auth/register/student */
    registerStudent(data) {
      if (live()) return A.post('/auth/register/student', data);
      return M.mutate((db) => {
        if (db.users.some((x) => x.email.toLowerCase() === data.email.toLowerCase())) throw err(409, 'EMAIL_TAKEN', 'An account with this email already exists. Sign in or reset your password.');
        const u = { id: M.id('stu'), role: 'student', name: data.name, email: data.email, phone: data.phone, institution: data.institution, program: data.program || '', status: 'active', group: 'Self-registered', createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() };
        db.users.push(u);
        db.userSettings[u.id] = { theme: 'brand', notifications: { email: true, inApp: true, sms: false, reminders: true }, device: { preferredCamera: 'Default camera', autoSystemCheck: true } };
        return { challengeId: 'reg_' + u.id, maskedEmail: u.email };
      });
    },
    /** POST /api/auth/forgot-password: always succeeds to avoid account enumeration */
    forgotPassword(email) {
      if (live()) return A.post('/auth/forgot-password', { email });
      return M.respond(() => ({ sent: true }));
    },
    /** POST /api/auth/reset-password */
    resetPassword({ token, password }) {
      if (live()) return A.post('/auth/reset-password', { token, password });
      return M.respond(() => { if (!token) throw err(400, 'INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.'); return { reset: true }; });
    },
    /** GET /api/me */
    me() {
      if (live()) return A.get('/me');
      const s = HUK.auth.user();
      return M.respond((db) => { const u = db.users.find((x) => x.id === s.id); return { ...u }; });
    },
    /** PATCH /api/me */
    updateProfile(patch) {
      if (live()) return A.patch('/me', patch);
      const s = HUK.auth.user();
      return M.mutate((db) => { const u = db.users.find((x) => x.id === s.id); Object.assign(u, patch); return publicUser(u); });
    },
    /** POST /api/me/password */
    changePassword({ current, next }) {
      if (live()) return A.post('/me/password', { current, next });
      return M.respond((db) => { if (current !== db.passwords.default) throw err(400, 'WRONG_PASSWORD', 'Your current password is incorrect.'); return { changed: true }; });
    },
    /** GET /api/me/settings */
    getSettings() {
      if (live()) return A.get('/me/settings');
      const s = HUK.auth.user();
      return M.respond((db) => db.userSettings[s.id] || {});
    },
    /** PATCH /api/me/settings */
    updateSettings(patch) {
      if (live()) return A.patch('/me/settings', patch);
      const s = HUK.auth.user();
      return M.mutate((db) => { const cur = db.userSettings[s.id] || {}; db.userSettings[s.id] = { ...cur, ...patch }; return db.userSettings[s.id]; });
    },
    /** POST /api/auth/logout */
    logout() {
      if (live()) return A.post('/auth/logout');
      return Promise.resolve({ ok: true });
    }
  };
})();
