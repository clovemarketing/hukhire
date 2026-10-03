/* =========================================================
   Shared (all roles): notifications, profile, settings, help
   ========================================================= */
(function () {
  const { icon, esc, fmt, chip, avatar, pageHeader, field, switchRow, validate, formData, withLoading, toast, load, empty, tabsHtml, bindTabs, onAction } = HUK.ui;
  const home = () => { const u = HUK.auth.user(); return [HUK.auth.ROLE_LABEL[u.role], HUK.auth.homeFor(u.role)]; };
  const N_ICON = { exam: 'exam', result: 'trophy', reminder: 'clock', system: 'info', alert: 'alert', assignment: 'calendar', session: 'video', incident: 'flag', user: 'user' };

  /* ---------------- Notifications ---------------- */
  HUK.page('notifications', {
    title: 'Notifications',
    crumbs: () => [home(), 'Notifications'],
    render(main) {
      let filter = 'all', items = [];
      main.innerHTML = pageHeader({ title: 'Notifications', subtitle: 'Exam updates, results and alerts for your account.', actions: '<button type="button" class="btn" data-action="readAll">' + icon('check', 18) + '<span>Mark all as read</span></button>' }) +
        tabsHtml([['all', 'All'], ['unread', 'Unread']], 'all', 'Filter notifications') + '<div class="card card-pad-0" id="list"></div>';
      const list = main.querySelector('#list');
      const draw = () => {
        const rows = items.filter((n) => filter === 'all' || !n.read);
        list.innerHTML = rows.length ? rows.map((n) => '<article class="notif' + (n.read ? '' : ' unread') + '" aria-label="' + esc(n.title) + (n.read ? '' : ', unread') + '"><span class="n-icon">' + icon(N_ICON[n.type] || 'bell', 20) + '</span><div class="grow"><div class="between" style="align-items:flex-start"><h3 style="font-size:var(--fs-base)">' + esc(n.title) + '</h3><span class="subtle nowrap">' + fmt.rel(n.createdAt) + '</span></div><p class="muted" style="font-size:var(--fs-sm);margin-top:2px">' + esc(n.message) + '</p><div class="row-wrap mt-1">' + (n.actionUrl ? '<a class="btn btn-sm" href="' + HUK.url(n.actionUrl) + '" data-open="' + n.id + '">' + esc(n.actionLabel) + '</a>' : '') + '<button type="button" class="btn btn-ghost btn-sm" data-action="toggle" data-id="' + n.id + '">' + (n.read ? 'Mark as unread' : 'Mark as read') + '</button><button type="button" class="btn btn-ghost btn-sm" data-action="remove" data-id="' + n.id + '" aria-label="Delete notification: ' + esc(n.title) + '">' + icon('trash', 16) + '</button></div></div>' + (n.read ? '' : '<span class="n-dot" aria-hidden="true"></span>') + '</article>').join('')
          : empty({ title: filter === 'unread' ? 'You’re all caught up' : 'No notifications yet', text: filter === 'unread' ? 'New exam updates and alerts will appear here.' : 'We’ll let you know when something needs your attention.', iconName: 'bell' });
      };
      const reload = () => load(list, () => HUK.notificationService.list(), (d) => { items = d; return ''; }, { after: draw });
      bindTabs(main, (t) => { filter = t; draw(); });
      list.addEventListener('click', (e) => { const a = e.target.closest('[data-open]'); if (a) HUK.notificationService.markRead(a.dataset.open); });
      onAction(main, {
        readAll: (b) => withLoading(b, async () => { await HUK.notificationService.markAllRead(); items.forEach((n) => { n.read = true; }); draw(); HUK.shell.refreshBadge(); toast('All notifications marked as read.'); }),
        toggle: async (b) => { const n = items.find((x) => x.id === b.dataset.id); await HUK.notificationService.markRead(n.id, !n.read); n.read = !n.read; draw(); HUK.shell.refreshBadge(); },
        remove: async (b) => { await HUK.notificationService.remove(b.dataset.id); items = items.filter((x) => x.id !== b.dataset.id); draw(); HUK.shell.refreshBadge(); toast('Notification deleted.'); }
      });
      reload();
    }
  });

  /* ---------------- Profile ---------------- */
  HUK.page('profile', {
    title: 'Profile',
    crumbs: () => [home(), 'Profile'],
    render(main) {
      main.innerHTML = pageHeader({ title: 'Profile', subtitle: 'Your personal details and sign-in security.' }) + '<div id="body"></div>';
      load(main.querySelector('#body'), () => HUK.authService.me(), (u) => {
        const roleFields = u.role === 'student'
          ? field({ name: 'institution', label: 'College or company', value: u.institution }) + field({ name: 'program', label: 'Programme', value: u.program })
          : u.role === 'proctor' ? field({ name: 'timezone', label: 'Time zone', value: u.timezone || 'Asia/Kolkata', options: [['Asia/Kolkata', 'India (IST)'], ['Asia/Dubai', 'Gulf (GST)'], ['Europe/London', 'UK (GMT/BST)']] })
          : field({ name: 'title', label: 'Job title', value: u.title });
        return '<div class="grid g-main-side">' +
          '<div class="stack-lg">' +
            '<section class="card" aria-labelledby="pd"><div class="profile-head mb-2">' + avatar(u.name, 'avatar-xl') + '<div class="grow"><h2 id="pd">' + esc(u.name) + '</h2><p class="muted">' + esc(u.email) + '</p><div class="row-wrap mt-1">' + chip(u.status) + '<span class="tag">' + esc(HUK.auth.ROLE_LABEL[u.role]) + '</span></div></div></div>' +
              '<form id="pf" class="form-grid" novalidate>' + field({ name: 'name', label: 'Full name', value: u.name, required: true }) + field({ name: 'phone', label: 'Mobile number', type: 'tel', value: u.phone }) + field({ name: 'email', label: 'Email', type: 'email', value: u.email, attrs: 'readonly', hint: 'Contact an administrator to change your sign-in email.' }) + roleFields +
              '<div class="full form-actions"><button class="btn btn-primary" type="submit" data-loading-text="Saving…">Save profile</button></div></form></section>' +
            '<section class="card" aria-labelledby="pw"><div class="card-head"><div><h2 id="pw">Password</h2><p class="subtle">Change the password you use to sign in.</p></div></div><form id="pwf" class="form-grid" novalidate>' +
              field({ name: 'current', label: 'Current password', type: 'password', required: true, full: true, attrs: 'autocomplete="current-password"' }) + field({ name: 'next', label: 'New password', type: 'password', required: true, attrs: 'data-min-length="8" autocomplete="new-password"' }) + field({ name: 'confirm', label: 'Confirm new password', type: 'password', required: true, attrs: 'data-match="next" autocomplete="new-password"' }) +
              '<div class="full form-actions"><button class="btn" type="submit" data-loading-text="Updating…">Update password</button></div></form></section>' +
          '</div>' +
          '<aside class="stack-lg"><section class="card"><h2 style="font-size:var(--fs-md)">Account</h2><dl class="kv mt-2"><dt>Member since</dt><dd>' + fmt.date(u.createdAt) + '</dd><dt>Last active</dt><dd>' + fmt.rel(u.lastActiveAt) + '</dd>' + (u.group ? '<dt>Cohort</dt><dd>' + esc(u.group) + '</dd>' : '') + (u.role === 'proctor' ? '<dt>Sessions run</dt><dd>' + u.sessionsCompleted + '</dd>' : '') + '</dl></section>' +
            '<section class="card"><h2 style="font-size:var(--fs-md)">Sign-in security</h2><p class="subtle mt-1">' + (u.role === 'admin' ? 'Two-step verification is required for admin accounts.' : 'Two-step verification adds a code from your email at sign-in.') + '</p><div class="mt-2">' + chip(u.role === 'admin' ? 'active' : 'pending', u.role === 'admin' ? 'Two-step on' : 'Two-step off') + '</div><a class="btn btn-sm mt-2" href="' + HUK.url('shared/settings.html') + '">Open settings</a></section></aside></div>';
      }, { skeleton: 'page', after: () => {
        const pf = main.querySelector('#pf');
        pf.addEventListener('submit', (e) => { e.preventDefault(); if (!validate(pf)) return; withLoading(pf.querySelector('[type=submit]'), async () => { const d = formData(pf); delete d.email; const u = await HUK.authService.updateProfile(d); HUK.auth.updateUser({ name: u.name }); toast('Profile saved.'); }).catch((err) => toast(err.message, { tone: 'bad' })); });
        const pw = main.querySelector('#pwf');
        pw.addEventListener('submit', (e) => { e.preventDefault(); if (!validate(pw)) return; withLoading(pw.querySelector('[type=submit]'), async () => { await HUK.authService.changePassword({ current: pw.current.value, next: pw.next.value }); pw.reset(); toast('Password updated.'); }).catch((err) => { HUK.ui.setFieldError(pw.current, err.message); pw.current.focus(); }); });
      } });
    }
  });

  /* ---------------- Settings ---------------- */
  HUK.page('settings', {
    title: 'Settings',
    crumbs: () => [home(), 'Settings'],
    render(main) {
      const role = HUK.auth.user().role;
      main.innerHTML = pageHeader({ title: 'Settings', subtitle: 'Appearance, notifications and ' + (role === 'student' ? 'exam device preferences.' : role === 'proctor' ? 'your monitoring equipment.' : 'your personal preferences.') }) + '<div id="body"></div>';
      load(main.querySelector('#body'), () => HUK.authService.getSettings(), (s) => {
        const n = s.notifications || {};
        const themeCard = (v, title, desc) => '<label class="choice"><input type="radio" name="theme-choice" value="' + v + '"' + (HUK.theme.get() === v ? ' checked' : '') + '><span class="choice-body"><span style="width:56px;height:40px;border-radius:10px;flex:none;border:1px solid var(--border);background:' + (v === 'brand' ? 'linear-gradient(135deg,#0B1F33 0 50%,#FF7A1A 50% 62%,#F8FAFC 62%)' : 'linear-gradient(135deg,#111 0 50%,#777 50% 62%,#fff 62%)') + '"></span><span><strong>' + title + '</strong><span class="subtle" style="display:block">' + desc + '</span></span></span></label>';
        let roleCard = '';
        if (role === 'student') roleCard = '<section class="card"><h2 style="font-size:var(--fs-md)">Exam device</h2><p class="subtle mt-1">Used to pre-select devices in the system check.</p><form id="dev" class="stack mt-2">' + field({ name: 'preferredCamera', label: 'Preferred camera', value: (s.device || {}).preferredCamera, options: ['Default camera', 'Built-in FaceTime HD', 'External USB webcam'] }) + switchRow({ name: 'autoSystemCheck', label: 'Run the system check before every exam', hint: 'Recommended. Takes about 30 seconds.', checked: (s.device || {}).autoSystemCheck !== false }) + '<div class="form-actions"><a class="btn" href="' + HUK.url('student/system-check.html') + '">Run system check now</a><button class="btn btn-primary" type="submit">Save device preferences</button></div></form></section>';
        if (role === 'proctor') roleCard = '<section class="card"><h2 style="font-size:var(--fs-md)">Camera and microphone test</h2><p class="subtle mt-1">Check your equipment before a session starts. Nothing is recorded.</p><div class="grid g-2 mt-2"><div class="cam-preview" id="cam">' + icon('video', 32) + '</div><div class="stack"><div><span class="field-label">Microphone level</span><div class="mic-meter mt-1" id="meter" aria-hidden="true">' + '<i></i>'.repeat(16) + '</div><p class="subtle mt-1" id="mic-status" aria-live="polite">Not tested yet.</p></div><button type="button" class="btn btn-primary" data-action="testDevices">' + icon('play', 18) + '<span>Test camera and mic</span></button><button type="button" class="btn" data-action="stopDevices">Stop test</button></div></div></section>';
        if (role === 'admin') roleCard = '<section class="card"><h2 style="font-size:var(--fs-md)">Organisation settings</h2><p class="subtle mt-1">Exam defaults, security policies and organisation details live in system settings.</p><a class="btn mt-2" href="' + HUK.url('admin/settings.html') + '">Open system settings</a></section>';
        return '<div class="grid g-2" style="align-items:start"><div class="stack-lg">' +
          '<section class="card" aria-labelledby="ap"><h2 id="ap" style="font-size:var(--fs-md)">Appearance</h2><p class="subtle mt-1">Applies instantly on this device and syncs to your account.</p><fieldset class="stack-sm mt-2"><legend class="sr-only">Theme</legend>' + themeCard('brand', 'HUK HIRE', 'Ink, white and orange accents.') + themeCard('mono', 'Black & white', 'Monochrome, high-contrast interface.') + '</fieldset></section>' +
          '<section class="card" aria-labelledby="nt"><h2 id="nt" style="font-size:var(--fs-md)">Notifications</h2><form id="nf" class="stack-sm mt-2">' + switchRow({ name: 'email', label: 'Email', hint: 'Exam schedules, results and account changes.', checked: n.email }) + switchRow({ name: 'inApp', label: 'In-app', hint: 'The bell in the top bar.', checked: n.inApp }) + switchRow({ name: 'sms', label: 'SMS', hint: 'Exam-day reminders only.', checked: n.sms }) + switchRow({ name: 'reminders', label: 'Reminders 24 hours before', checked: n.reminders }) + '<div class="form-actions"><button class="btn btn-primary" type="submit">Save notification settings</button></div></form></section>' +
          '</div><div class="stack-lg">' + roleCard +
          '<section class="card"><h2 style="font-size:var(--fs-md)">Demo data</h2><p class="subtle mt-1">This prototype stores mock data in your browser. Resetting restores the original exams, users and results.</p><div class="row-wrap mt-2"><button type="button" class="btn btn-danger" data-action="resetDemo">' + icon('refresh', 18) + '<span>Reset demo data</span></button></div><p class="subtle mt-2">Preview API states on any page by adding <code>?simulate=error</code>, <code>?simulate=empty</code> or <code>?simulate=slow</code> to the address.</p></section>' +
          '</div></div>';
      }, { skeleton: 'page', after: () => {
        main.querySelectorAll('input[name="theme-choice"]').forEach((r) => r.addEventListener('change', () => { HUK.theme.set(r.value); toast(r.value === 'mono' ? 'Black & white theme on.' : 'HUK HIRE theme on.'); }));
        const nf = main.querySelector('#nf');
        nf.addEventListener('submit', (e) => { e.preventDefault(); withLoading(nf.querySelector('[type=submit]'), async () => { await HUK.authService.updateSettings({ notifications: formData(nf) }); toast('Notification settings saved.'); }); });
        const dev = main.querySelector('#dev');
        if (dev) dev.addEventListener('submit', (e) => { e.preventDefault(); withLoading(dev.querySelector('[type=submit]'), async () => { await HUK.authService.updateSettings({ device: formData(dev) }); toast('Device preferences saved.'); }); });
      } });
      let stream = null, raf = null;
      const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; cancelAnimationFrame(raf); };
      onAction(main, {
        resetDemo: async () => { if (await HUK.ui.confirm({ title: 'Reset demo data?', message: 'All changes you’ve made in this prototype will be lost and the original mock data restored. You’ll stay signed in.', confirmLabel: 'Reset data', danger: true })) { HUK.mockApi.reset(); toast('Demo data restored.'); setTimeout(() => location.reload(), 600); } },
        testDevices: async () => {
          const status = main.querySelector('#mic-status');
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            main.querySelector('#cam').innerHTML = '<video autoplay muted playsinline aria-label="Your camera preview"></video>';
            main.querySelector('#cam video').srcObject = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.frequencyBinCount);
            const bars = [...main.querySelectorAll('#meter i')];
            const tick = () => { an.getByteFrequencyData(buf); const lvl = buf.reduce((t, v) => t + v, 0) / buf.length / 128; bars.forEach((b, i) => { b.style.height = (20 + Math.min(80, lvl * 100 * (1 - Math.abs(i - 8) / 10))) + '%'; b.style.background = i / 16 < lvl ? 'var(--text)' : ''; }); raf = requestAnimationFrame(tick); };
            tick(); status.textContent = 'Camera and microphone are working.';
          } catch (e) { status.textContent = 'Couldn’t access your camera or microphone. Allow access in your browser’s site settings and try again.'; }
        },
        stopDevices: () => { stop(); main.querySelector('#cam').innerHTML = icon('video', 32); main.querySelector('#mic-status').textContent = 'Test stopped.'; }
      });
      window.addEventListener('pagehide', stop);
    }
  });

  /* ---------------- Help ---------------- */
  HUK.page('help', {
    title: 'Help',
    crumbs: () => [home(), 'Help'],
    render(main) {
      const role = HUK.auth.user().role;
      const faqs = {
        student: [['What happens if my internet drops during an exam?', 'Your answers are saved as you go. Reconnect and open the exam again from your dashboard; the timer keeps running while you’re away, so reconnect quickly.'], ['Can I change an answer after moving on?', 'Yes. Use the question palette or Previous button to go back at any time until you submit.'], ['When will I see my result?', 'Some exams publish results immediately; others are released after review. You’ll get a notification either way.'], ['Why was a tab switch recorded?', 'Leaving the exam tab is logged and shared with your proctor. Stay on the exam page until you submit.']],
        proctor: [['How do I escalate a candidate?', 'Open the candidate, choose Escalate and describe the issue. Admins are notified immediately and any open incidents move to Escalated.'], ['Do I see candidate answers?', 'No. You see progress only, never answers or correct options.'], ['What counts as a high-severity incident?', 'Multiple people in frame, identity mismatch, or a phone or second device in use.']],
        admin: [['How do I schedule a retake?', 'Duplicate the exam, adjust the window in the Schedule step and assign only the candidates who need it.'], ['Who can publish results?', 'Super admins and results reviewers. Change this in Admins & roles.'], ['Can I export results?', 'Yes. Filter the results explorer and choose Export CSV.']]
      }[role];
      main.innerHTML = pageHeader({ title: 'Help', subtitle: 'Answers to common questions and how to reach support.' }) +
        '<div class="grid g-main-side"><section class="card" aria-labelledby="faq"><h2 id="faq" style="font-size:var(--fs-md)" class="mb-2">Frequently asked</h2>' + faqs.map(([q, a]) => '<details class="list-item" style="display:block"><summary style="cursor:pointer;font-weight:650;min-height:32px">' + esc(q) + '</summary><p class="muted mt-1">' + esc(a) + '</p></details>').join('') + '</section>' +
        '<aside class="stack-lg">' + (role === 'student' ? '<section class="card"><h2 style="font-size:var(--fs-md)">System check</h2><p class="subtle mt-1">Test your camera, microphone, connection and browser.</p><a class="btn btn-primary mt-2" href="' + HUK.url('student/system-check.html') + '">Run system check</a></section>' : '') +
        '<section class="card"><h2 style="font-size:var(--fs-md)">Contact support</h2><dl class="kv mt-2"><dt>Email</dt><dd><a href="mailto:support@hukhire.com">support@hukhire.com</a></dd><dt>Exam desk</dt><dd>+91 891 000 4400</dd><dt>Hours</dt><dd>Mon–Sat, 8:00–20:00 IST</dd></dl></section>' +
        '<section class="card" id="privacy"><h2 style="font-size:var(--fs-md)">Privacy</h2><p class="subtle mt-1">Proctored exams record camera, microphone and screen activity for the duration of the exam only. Recordings are retained for 180 days and then deleted.</p></section></aside></div>';
    }
  });
})();
