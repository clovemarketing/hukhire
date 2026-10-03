/* =========================================================
   Theme: "brand" (HUK HIRE standard) or "mono" (Black & White).
   Persists in localStorage now; also synced to /api/me/settings
   when signed in so the choice follows the user across devices.
   ========================================================= */
(function () {
  const KEY = HUK.config.STORAGE_KEYS.theme;
  const get = () => { try { return localStorage.getItem(KEY) || 'brand'; } catch (e) { return 'brand'; } };
  function apply(t) {
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(t === 'mono'));
      b.setAttribute('aria-label', t === 'mono' ? 'Switch to HUK HIRE colour theme' : 'Switch to black and white theme');
      b.dataset.tip = t === 'mono' ? 'Colour theme' : 'Black & white';
    });
    document.querySelectorAll('input[name="theme-choice"]').forEach((r) => { r.checked = r.value === t; });
  }
  function set(t, { sync = true } = {}) {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
    if (sync && HUK.auth && HUK.auth.user() && HUK.authService) HUK.authService.updateSettings({ theme: t }).catch(() => {});
  }
  HUK.theme = {
    get, set, apply,
    toggle: () => set(get() === 'mono' ? 'brand' : 'mono'),
    init() { apply(get()); },
    button: (cls = 'btn btn-ghost btn-icon') => '<button type="button" class="' + cls + '" data-theme-toggle aria-pressed="false">' + HUK.ui.icon('theme', 20) + '</button>'
  };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-theme-toggle]')) HUK.theme.toggle(); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(get()); });
})();
