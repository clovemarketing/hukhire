/* =========================================================
   Client session. Real auth happens server-side; this only
   stores the token + public user returned by /auth/login and
   guards pages by role. Replace storage with httpOnly cookies
   if the backend prefers.
   ========================================================= */
(function () {
  const KEY = HUK.config.STORAGE_KEYS.session;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  HUK.auth = {
    session: read,
    user: () => (read() || {}).user || null,
    start({ token, user }, remember = true) {
      const s = JSON.stringify({ token, user, startedAt: Date.now() });
      try { (remember ? localStorage : sessionStorage).setItem(KEY, s); } catch (e) {}
    },
    updateUser(patch) { const s = read(); if (!s) return; s.user = { ...s.user, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} },
    clear() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {} },
    async logout() { try { await HUK.authService.logout(); } catch (e) {} HUK.auth.clear(); HUK.go('login.html?signedout=1'); },
    expire() { HUK.auth.clear(); HUK.go('session-expired.html'); },
    homeFor: (role) => ({ admin: 'admin/dashboard.html', proctor: 'proctor/dashboard.html', student: 'student/dashboard.html' }[role] || 'login.html'),
    ROLE_LABEL: { admin: 'Admin', proctor: 'Online proctor', student: 'Student' }
  };
})();
