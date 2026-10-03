/* =========================================================
   HUK HIRE: runtime configuration
   Switch USE_MOCK to false once the backend is live; every
   service then routes through apiClient instead of mockApi.
   ========================================================= */
window.HUK = window.HUK || {};

HUK.config = {
  APP_NAME: 'HUK HIRE',
  USE_MOCK: true,              // false → real HTTP via apiClient
  API_BASE: '/api',            // e.g. https://api.hukhire.com/api
  REQUEST_TIMEOUT_MS: 15000,
  MOCK_LATENCY_MS: [220, 620], // simulated network latency range
  STORAGE_KEYS: {
    session: 'huk_session',
    theme: 'huk_theme',
    db: 'huk_mock_db_v1'
  }
};

/* Page registry: page modules call HUK.page(id, { title, crumbs, render }).
   Defined here (first script) so modules can register before app.js boots. */
HUK.pages = {};
HUK.page = (id, def) => { HUK.pages[id] = def; };
