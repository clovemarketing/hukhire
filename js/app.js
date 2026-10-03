/* =========================================================
   App bootstrap
   Every HTML page is a thin shell:
     <body data-page="student-dashboard" data-role="student"
           data-layout="app|auth|focus|public" data-base="../">
   app.js applies the theme, guards the route by role, renders
   the AppShell (for layout=app) and calls the page renderer
   registered with HUK.page(id, { title, crumbs, render }).
   ========================================================= */
(function () {

  /* Network banner for offline / unstable states (spec §20) */
  HUK.network = {
    init() {
      const show = () => {
        if (document.getElementById('net-banner')) return;
        const b = document.createElement('div');
        b.id = 'net-banner'; b.className = 'banner'; b.dataset.tone = 'warn'; b.setAttribute('role', 'status');
        b.innerHTML = HUK.ui.icon('wifiOff', 18) + '<span>You’re offline. Changes are kept on this device and will sync when you reconnect.</span>';
        document.body.prepend(b);
      };
      const hide = () => { const b = document.getElementById('net-banner'); if (b) { b.remove(); HUK.ui.toast('Back online. Your changes are syncing.', { tone: 'ok' }); } };
      window.addEventListener('offline', show);
      window.addEventListener('online', hide);
      if (!navigator.onLine) show();
    }
  };

  async function boot() {
    const body = document.body;
    const id = body.dataset.page, layout = body.dataset.layout || 'app', role = body.dataset.role || 'any';
    HUK.theme.init();
    const def = HUK.pages[id];
    if (!def) { document.getElementById('app').innerHTML = '<div class="status-page"><div class="card status-card"><h1>Page not registered</h1><p class="muted mt-1">No renderer for “' + HUK.ui.esc(id) + '”.</p></div></div>'; return; }

    const user = HUK.auth.user();
    if (layout === 'app' || layout === 'focus') {
      if (!user) { location.replace(HUK.url('login.html?next=' + encodeURIComponent(location.pathname.split('/').slice(-2).join('/') + location.search))); return; }
      if (role !== 'any' && role !== user.role) { location.replace(HUK.url('unauthorized.html?need=' + role)); return; }
    }
    body.dataset.userRole = user ? user.role : '';
    if (role === 'any' && user) body.dataset.role = user.role;

    const title = typeof def.title === 'function' ? def.title() : def.title;
    document.title = (title ? title + ' | ' : '') + 'HUK HIRE';
    const main = layout === 'app' ? HUK.shell.render({ user, pageId: id, def }) : document.getElementById('app');
    try {
      await def.render(main, { user, q: HUK.qs });
    } catch (e) {
      console.error(e);
      main.innerHTML = HUK.ui.errorState(e.message);
    }
    HUK.network.init();
    if (HUK.mockApi.simulate) HUK.ui.toast('Simulating “' + HUK.mockApi.simulate + '” API responses on this page.', { tone: 'info', timeout: 6000 });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
