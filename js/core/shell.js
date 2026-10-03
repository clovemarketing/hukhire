/* =========================================================
   AppShell: sidebar + topbar + breadcrumbs + mobile drawer
   + student bottom nav. Navigation is defined once per role.
   ========================================================= */
(function () {
  const { icon, esc, avatar } = HUK.ui;

  const NAV = {
    admin: [
      { group: null, items: [{ label: 'Dashboard', icon: 'dashboard', href: 'admin/dashboard.html', match: ['admin-dashboard'] }] },
      { group: 'Assessments', items: [
        { label: 'Exams', icon: 'exam', href: 'admin/exams.html', match: ['admin-exams', 'admin-exam-wizard', 'admin-exam-detail', 'admin-schedule'] },
        { label: 'Question bank', icon: 'book', href: 'admin/question-bank.html', match: ['admin-question-bank', 'admin-question-editor', 'admin-question-import', 'admin-sections'] }
      ] },
      { group: 'People', items: [
        { label: 'Students', icon: 'users', href: 'admin/students.html', match: ['admin-students', 'admin-student-profile'] },
        { label: 'Proctors', icon: 'eye', href: 'admin/proctors.html', match: ['admin-proctors', 'admin-proctor-profile'] },
        { label: 'Admins & roles', icon: 'key', href: 'admin/admins.html', match: ['admin-admins'] }
      ] },
      { group: 'Insights', items: [
        { label: 'Results', icon: 'trophy', href: 'admin/results.html', match: ['admin-results', 'admin-result-detail'] },
        { label: 'Reports', icon: 'chart', href: 'admin/reports.html', match: ['admin-reports'] },
        { label: 'Incidents', icon: 'flag', href: 'admin/incidents.html', match: ['admin-incidents'] }
      ] },
      { group: 'Account', items: [
        { label: 'Notifications', icon: 'bell', href: 'shared/notifications.html', match: ['notifications'], badge: true },
        { label: 'System settings', icon: 'settings', href: 'admin/settings.html', match: ['admin-settings'] }
      ] }
    ],
    proctor: [
      { group: null, items: [
        { label: 'Live queue', icon: 'dashboard', href: 'proctor/dashboard.html', match: ['proctor-dashboard'] },
        { label: 'Assigned exams', icon: 'calendar', href: 'proctor/assigned-exams.html', match: ['proctor-assigned'] },
        { label: 'Live sessions', icon: 'video', href: 'proctor/live-sessions.html', match: ['proctor-live', 'proctor-console', 'proctor-candidate'] },
        { label: 'Incidents', icon: 'flag', href: 'proctor/incidents.html', match: ['proctor-incidents'] },
        { label: 'Session history', icon: 'clock', href: 'proctor/session-history.html', match: ['proctor-history', 'proctor-session-summary'] },
        { label: 'Reports', icon: 'chart', href: 'proctor/reports.html', match: ['proctor-reports'] }
      ] },
      { group: 'Account', items: [
        { label: 'Notifications', icon: 'bell', href: 'shared/notifications.html', match: ['notifications'], badge: true },
        { label: 'Profile', icon: 'user', href: 'shared/profile.html', match: ['profile'] },
        { label: 'Settings', icon: 'settings', href: 'shared/settings.html', match: ['settings'] },
        { label: 'Help', icon: 'help', href: 'shared/help.html', match: ['help'] }
      ] }
    ],
    student: [
      { group: null, items: [
        { label: 'Dashboard', icon: 'home', href: 'student/dashboard.html', match: ['student-dashboard'] },
        { label: 'Available exams', icon: 'exam', href: 'student/exams.html', match: ['student-exams', 'student-exam-detail', 'student-system-check', 'student-instructions', 'student-submitted'] },
        { label: 'My attempts', icon: 'clock', href: 'student/attempts.html', match: ['student-attempts'] },
        { label: 'Results', icon: 'trophy', href: 'student/results.html', match: ['student-results', 'student-result-detail'] }
      ] },
      { group: 'Account', items: [
        { label: 'Notifications', icon: 'bell', href: 'shared/notifications.html', match: ['notifications'], badge: true },
        { label: 'Profile', icon: 'user', href: 'shared/profile.html', match: ['profile'] },
        { label: 'Settings', icon: 'settings', href: 'shared/settings.html', match: ['settings'] },
        { label: 'Help & system check', icon: 'help', href: 'shared/help.html', match: ['help'] }
      ] }
    ]
  };
  const BOTTOM = [
    { label: 'Home', icon: 'home', href: 'student/dashboard.html', match: ['student-dashboard'] },
    { label: 'Exams', icon: 'exam', href: 'student/exams.html', match: ['student-exams', 'student-exam-detail', 'student-system-check', 'student-instructions', 'student-submitted', 'student-attempts'] },
    { label: 'Results', icon: 'trophy', href: 'student/results.html', match: ['student-results', 'student-result-detail'] },
    { label: 'Profile', icon: 'user', href: 'shared/profile.html', match: ['profile', 'settings', 'notifications', 'help'] }
  ];
  const FOOT = {
    student: '<div class="sidebar-card"><strong>Exam day checklist</strong><p class="subtle mt-1">Charge your laptop, close other apps and run the system check 15 minutes before you start.</p><a class="mt-1" style="display:inline-block" href="{base}student/system-check.html">Run system check</a></div>',
    proctor: '<div class="sidebar-card"><strong>Escalation desk</strong><p class="subtle mt-1">For identity disputes call the exam desk on +91 891 000 4400.</p></div>',
    admin: '<div class="sidebar-card"><strong>Demo environment</strong><p class="subtle mt-1">All data is mocked in your browser. Reset it any time from Settings.</p></div>'
  };

  function crumbsHtml(items) {
    if (!items || !items.length) return '';
    return '<ol>' + items.map((c, i) => { const [label, href] = Array.isArray(c) ? c : [c]; const last = i === items.length - 1; return '<li>' + (last || !href ? '<span' + (last ? ' aria-current="page"' : '') + '>' + esc(label) + '</span>' : '<a href="' + HUK.url(href) + '">' + esc(label) + '</a>') + '</li>'; }).join('') + '</ol>';
  }

  HUK.shell = {
    NAV,
    render({ user, pageId, def }) {
      const role = user.role;
      const app = document.getElementById('app');
      const nav = NAV[role].map((g) => (g.group ? '<div class="nav-group-label">' + esc(g.group) + '</div>' : '') + g.items.map((it) =>
        '<a href="' + HUK.url(it.href) + '"' + (it.match.includes(pageId) ? ' aria-current="page"' : '') + '>' + icon(it.icon, 20) + '<span class="nav-label-text">' + esc(it.label) + '</span>' + (it.badge ? '<span class="nav-count" data-unread hidden></span>' : '') + '</a>').join('')).join('');
      const crumbs = typeof def.crumbs === 'function' ? def.crumbs() : def.crumbs;
      app.innerHTML =
        '<a class="skip-link" href="#main">Skip to main content</a>' +
        '<div class="shell" id="shell">' +
          '<aside class="sidebar" id="sidebar" aria-label="Main navigation">' +
            '<a class="brand" href="' + HUK.url(HUK.auth.homeFor(role)) + '" aria-label="HUK HIRE home"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><span class="brand-name">HUK HIRE</span><span class="brand-role">' + esc(HUK.auth.ROLE_LABEL[role]) + ' portal</span></span></a>' +
            '<nav class="nav" aria-label="' + esc(HUK.auth.ROLE_LABEL[role]) + '">' + nav + '</nav>' +
            '<div class="sidebar-foot">' + FOOT[role].replace('{base}', HUK.url('')) + '</div>' +
          '</aside>' +
          '<div class="scrim" data-close-nav></div>' +
          '<div class="main-col">' +
            '<header class="topbar">' +
              '<button type="button" class="btn btn-ghost btn-icon menu-btn" data-open-nav aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation">' + icon('menu', 22) + '</button>' +
              '<a class="topbar-mobile-brand" href="' + HUK.url(HUK.auth.homeFor(role)) + '" style="color:var(--text);text-decoration:none"><span class="brand-mark" aria-hidden="true"></span>HUK HIRE</a>' +
              '<nav class="crumbs" aria-label="Breadcrumb" id="crumbs">' + crumbsHtml(crumbs) + '</nav>' +
              '<div class="topbar-actions">' +
                HUK.theme.button() +
                '<a class="btn btn-ghost btn-icon icon-btn-badge" href="' + HUK.url('shared/notifications.html') + '" aria-label="Notifications" data-tip="Notifications">' + icon('bell', 20) + '<span class="dot" data-unread hidden></span></a>' +
                '<div class="menu-wrap"><button type="button" class="btn btn-ghost" style="padding:0 6px 0 4px;gap:10px" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Account menu for ' + esc(user.name) + '">' + avatar(user.name, 'avatar-sm') + '<span class="hide-mobile" style="font-weight:600">' + esc(user.name.split(' ')[0]) + '</span>' + icon('chevronDown', 16, 'hide-mobile') + '</button>' +
                  '<div class="menu" hidden role="menu"><div class="menu-head"><strong>' + esc(user.name) + '</strong><div class="subtle">' + esc(user.email) + '</div></div><hr>' +
                  '<a role="menuitem" href="' + HUK.url('shared/profile.html') + '">' + icon('user', 16) + 'Profile</a>' +
                  '<a role="menuitem" href="' + HUK.url('shared/settings.html') + '">' + icon('settings', 16) + 'Personal settings</a>' +
                  '<a role="menuitem" href="' + HUK.url('shared/help.html') + '">' + icon('help', 16) + 'Help</a><hr>' +
                  '<button type="button" role="menuitem" data-logout>' + icon('logout', 16) + 'Sign out</button></div></div>' +
              '</div>' +
            '</header>' +
            '<main id="main" class="page" tabindex="-1"></main>' +
          '</div>' +
        '</div>' +
        (role === 'student' ? '<nav class="bottom-nav" aria-label="Quick navigation">' + BOTTOM.map((b) => '<a href="' + HUK.url(b.href) + '"' + (b.match.includes(pageId) ? ' aria-current="page"' : '') + '>' + icon(b.icon, 22) + '<span>' + b.label + '</span></a>').join('') + '</nav>' : '');

      const shell = document.getElementById('shell');
      const openBtn = app.querySelector('[data-open-nav]');
      const setNav = (open) => {
        shell.classList.toggle('nav-open', open);
        openBtn.setAttribute('aria-expanded', String(open));
        if (open) { const a = shell.querySelector('.sidebar a'); if (a) a.focus(); } else openBtn.focus();
      };
      openBtn.addEventListener('click', () => setNav(true));
      app.querySelector('[data-close-nav]').addEventListener('click', () => setNav(false));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shell.classList.contains('nav-open')) setNav(false); });
      app.querySelector('[data-logout]').addEventListener('click', () => HUK.auth.logout());
      HUK.theme.apply(HUK.theme.get());
      HUK.shell.refreshBadge();
      return document.getElementById('main');
    },
    setCrumbs(items) { const c = document.getElementById('crumbs'); if (c) c.innerHTML = crumbsHtml(items); },
    async refreshBadge() {
      try {
        const n = await HUK.notificationService.unreadCount();
        document.querySelectorAll('[data-unread]').forEach((el) => { el.hidden = !n; el.textContent = n > 9 ? '9+' : n; });
        const bell = document.querySelector('.icon-btn-badge');
        if (bell) bell.setAttribute('aria-label', n ? 'Notifications, ' + n + ' unread' : 'Notifications');
      } catch (e) { /* badge is non-critical */ }
    }
  };
})();
