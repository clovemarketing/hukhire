/* =========================================================
   mockApi: an in-browser stand-in for the backend.
   - Seeds a database from HUK.fixtures into localStorage so
     data created on one page (e.g. a new exam) shows on others.
   - Simulates latency and, for demos, failure/empty states:
       ?simulate=error   → every request rejects
       ?simulate=empty   → list requests return []
       ?simulate=slow    → 3s latency (shows skeletons)
   Delete this file when HUK.config.USE_MOCK is false.
   ========================================================= */
(function () {
  const cfg = HUK.config;
  const KEY = cfg.STORAGE_KEYS.db;
  const simulate = new URLSearchParams(location.search).get('simulate');

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked → fall through to memory */ }
    const seeded = clone(HUK.fixtures);
    persist(seeded);
    return seeded;
  }
  let memory = null;
  function persist(db) {
    memory = db;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* keep in memory */ }
  }
  const STALE_MS = 12 * 60 * 60 * 1000; // reseed so "live" exams stay live in demos
  function db() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.meta && Date.now() - d.meta.seededAt < STALE_MS) return d;
        localStorage.removeItem(KEY);
        return load();
      }
    } catch (e) {}
    return memory || load();
  }

  function wait() {
    const [a, b] = cfg.MOCK_LATENCY_MS;
    const ms = simulate === 'slow' ? 3000 : a + Math.random() * (b - a);
    return new Promise((r) => setTimeout(r, ms));
  }

  let seq = Date.now() % 100000;
  HUK.mockApi = {
    /** Read-only request. fn(db) returns the payload. */
    async respond(fn, { list = false } = {}) {
      await wait();
      if (simulate === 'error') throw new HUK.ApiError(503, 'MOCK_ERROR', 'The service is temporarily unavailable (simulated). Try again in a moment.');
      const out = fn(db());
      if (list && simulate === 'empty') return Array.isArray(out) ? [] : out;
      return clone(out);
    },
    /** Write request. fn(db) mutates and returns the payload; db is persisted. */
    async mutate(fn) {
      await wait();
      if (simulate === 'error') throw new HUK.ApiError(503, 'MOCK_ERROR', 'The change could not be saved (simulated). Try again.');
      const d = db();
      const out = fn(d);
      persist(d);
      return clone(out);
    },
    /** Synchronous peek, used by live mock streams only. */
    peek: () => db(),
    write(fn) { const d = db(); const out = fn(d); persist(d); return out; },
    id: (prefix) => prefix + '_' + (++seq).toString(36),
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} memory = null; return load(); },
    simulate
  };
})();
