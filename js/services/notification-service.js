/* =========================================================
   notificationService: the persistent inbox (spec §13)
   Model: id, type, title, message, createdAt, read,
          actionLabel, actionUrl
   ========================================================= */
(function () {
  const M = HUK.mockApi, A = HUK.apiClient, live = () => !HUK.config.USE_MOCK;
  const me = () => (HUK.auth.user() || {}).id;
  const mine = (db) => db.notifications.filter((n) => n.userId === me()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  HUK.notificationService = {
    /** GET /api/notifications */
    list() { return live() ? A.get('/notifications') : M.respond(mine, { list: true }); },
    /** GET /api/notifications/unread-count (synchronous peek for the badge in mock mode) */
    unreadCount() {
      if (live()) return A.get('/notifications/unread-count').then((r) => r.count);
      try { return Promise.resolve(mine(M.peek()).filter((n) => !n.read).length); } catch (e) { return Promise.resolve(0); }
    },
    /** PATCH /api/notifications/:id */
    markRead(id, read = true) {
      if (live()) return A.patch('/notifications/' + id, { read });
      return M.mutate((db) => { const n = db.notifications.find((x) => x.id === id); if (n) n.read = read; return n; });
    },
    /** POST /api/notifications/read-all */
    markAllRead() {
      if (live()) return A.post('/notifications/read-all');
      return M.mutate((db) => { mine(db).forEach((n) => { db.notifications.find((x) => x.id === n.id).read = true; }); return { ok: true }; });
    },
    /** DELETE /api/notifications/:id */
    remove(id) {
      if (live()) return A.del('/notifications/' + id);
      return M.mutate((db) => { db.notifications = db.notifications.filter((x) => x.id !== id); return { ok: true }; });
    }
  };
})();
