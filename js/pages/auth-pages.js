/* =========================================================
   Public & authentication pages
   landing · login · register · forgot · reset · OTP ·
   session expired · unauthorized · not found
   ========================================================= */
(function () {
  const { icon, esc, field, validate, formData, setLoading, toast, announce } = HUK.ui;
  const PENDING = 'huk_pending_otp';

  const brandLink = () => '<a class="brand" href="' + HUK.url('index.html') + '" aria-label="HUK HIRE home"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><span class="brand-name">HUK HIRE</span><span class="brand-role">Assess. Verify. Hire.</span></span></a>';
  function authLayout(content, quote = 'Fair, verified assessments for every candidate.') {
    return '<a class="skip-link" href="#main">Skip to main content</a><div class="auth">' +
      '<aside class="auth-visual" aria-hidden="true">' + brandLink() + '<p class="auth-quote">' + esc(quote) + '</p><img class="art" src="' + HUK.url('assets/images/hero-talent-scout.webp') + '" alt=""></aside>' +
      '<div class="auth-panel"><div class="auth-panel-top">' + HUK.theme.button() + '</div><main id="main" class="auth-form-wrap" tabindex="-1">' + content + '</main><p class="auth-foot">© 2026 HUK HIRE. <a href="' + HUK.url('shared/help.html') + '">Help</a></p></div></div>';
  }
  function alertBox(el, message, tone = 'bad') {
    el.innerHTML = message ? '<div class="alert" data-tone="' + tone + '" role="alert">' + icon(tone === 'bad' ? 'alert' : 'info', 18) + '<div>' + message + '</div></div>' : '';
  }
  const goHome = (user, next) => { location.href = next ? HUK.url(next) : HUK.url(HUK.auth.homeFor(user.role)); };
  const pwToggle = (id) => '<span class="input-addon"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-toggle-pw="' + id + '" aria-label="Show password" aria-pressed="false">' + icon('eye', 18) + '</button></span>';
  function bindPwToggles(root) {
    root.querySelectorAll('[data-toggle-pw]').forEach((b) => b.addEventListener('click', () => {
      const inp = root.querySelector('#' + b.dataset.togglePw); const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.innerHTML = icon(show ? 'eyeOff' : 'eye', 18);
    }));
  }
  const pwField = (name, label, attrs = '', hint = '') => '<div class="field"><label for="f-' + name + '">' + label + '<span class="req" aria-hidden="true">*</span></label><div class="input-group"><input class="input" id="f-' + name + '" name="' + name + '" type="password" required ' + attrs + ' aria-describedby="f-' + name + '-err' + (hint ? ' f-' + name + '-hint' : '') + '"><span>' + pwToggle('f-' + name) + '</span></div>' + (hint ? '<span class="field-hint" id="f-' + name + '-hint">' + hint + '</span>' : '') + '<span class="field-error" id="f-' + name + '-err" role="alert"></span></div>';

  /* ---------------- Landing ---------------- */
  HUK.page('landing', {
    title: 'Assess. Verify. Hire.',
    render(root) {
      const user = HUK.auth.user();
      const roles = [
        ['student', 'user', 'I’m a candidate', 'Check your device, take your assessment and see your results when they’re published.', 'Candidate sign in'],
        ['proctor', 'eye', 'I’m a proctor', 'Monitor live sessions, act on alerts and file incident reports from one console.', 'Proctor sign in'],
        ['admin', 'shieldCheck', 'I run assessments', 'Build exams, schedule cohorts, assign proctors and publish results.', 'Admin sign in']
      ];
      root.innerHTML = '<a class="skip-link" href="#main">Skip to main content</a>' +
        '<header class="landing-nav">' + brandLink() + '<div class="row">' + HUK.theme.button() + (user ? '<a class="btn btn-primary" href="' + HUK.url(HUK.auth.homeFor(user.role)) + '">Open my dashboard</a>' : '<a class="btn hide-sm" href="' + HUK.url('register.html') + '">Create candidate account</a><a class="btn btn-primary" href="' + HUK.url('login.html') + '">Sign in</a>') + '</div></header>' +
        '<main id="main" tabindex="-1">' +
          '<section class="hero" aria-labelledby="hero-title">' +
            '<div><h1 class="hero-title" id="hero-title"><span>Assess</span><span>Verify</span><span>Hire</span></h1>' +
            '<p class="hero-lede">HUK HIRE runs proctored skills assessments end to end, from the exam builder and live monitoring console to published, defensible results.</p>' +
            '<div class="hero-cta"><a class="btn btn-primary btn-lg" href="' + HUK.url('login.html') + '">Sign in</a><a class="btn btn-lg" href="' + HUK.url('student/system-check.html') + '">Check my device</a></div></div>' +
            '<div class="hero-art"><img src="' + HUK.url('assets/images/hero-talent-scout.webp') + '" alt="Illustration of a recruiter looking through a telescope at verified candidate cards"></div>' +
          '</section>' +
          '<section class="role-strip" aria-labelledby="roles-title"><h2 id="roles-title" class="mb-2">Choose how you use HUK HIRE</h2><div class="grid g-3">' +
            roles.map(([r, ic, t, d, cta]) => '<a class="card role-card" href="' + HUK.url('login.html?role=' + r) + '"><span class="role-icon">' + icon(ic, 24) + '</span><h3>' + t + '</h3><p class="muted">' + d + '</p><span class="role-go">' + cta + icon('arrowRight', 16) + '</span></a>').join('') +
          '</div></section>' +
          '<section class="flow-strip" aria-labelledby="flow-title"><h2 id="flow-title" class="sr-only">How an assessment runs</h2><ol class="flow">' +
            '<li><span class="flow-n">Step 1</span><h3>Assess</h3><p class="muted">Admins assemble exams from a tagged question bank with sections, marks and negative marking.</p></li>' +
            '<li><span class="flow-n">Step 2</span><h3>Verify</h3><p class="muted">Candidates pass a device check and ID capture; proctors watch live and log every incident.</p></li>' +
            '<li><span class="flow-n">Step 3</span><h3>Hire</h3><p class="muted">Scores, section breakdowns and incident levels roll up into results you can publish and export.</p></li>' +
          '</ol></section>' +
        '</main><footer class="landing-foot">© 2026 HUK HIRE Technologies. Frontend prototype running on mock data.</footer>';
    }
  });

  /* ---------------- Login ---------------- */
  const DEMO = { student: 'student@hukhire.com', proctor: 'proctor@hukhire.com', admin: 'admin@hukhire.com' };
  HUK.page('login', {
    title: 'Sign in',
    render(root) {
      const role = HUK.qs('role') in DEMO ? HUK.qs('role') : 'student';
      const next = HUK.qs('next');
      const current = HUK.auth.user();
      root.innerHTML = authLayout(
        '<h1>Sign in to HUK HIRE</h1><p>Use the account your organisation or recruiter set up for you.</p>' +
        (current ? '<div class="alert mb-2" role="status">' + icon('info', 18) + '<div>You’re signed in as <strong style="display:inline">' + esc(current.name) + '</strong>. <a href="' + HUK.url(HUK.auth.homeFor(current.role)) + '">Continue to your dashboard</a></div></div>' : '') +
        '<div id="login-alert" class="mb-2"></div>' +
        '<div class="field mb-2"><span class="field-label" id="role-lbl">I’m signing in as</span><div class="segmented" role="group" aria-labelledby="role-lbl" style="width:100%">' +
          ['student', 'proctor', 'admin'].map((r) => '<button type="button" style="flex:1" data-role="' + r + '" aria-pressed="' + (r === role) + '">' + { student: 'Candidate', proctor: 'Proctor', admin: 'Admin' }[r] + '</button>').join('') + '</div></div>' +
        '<form id="login-form" class="stack" novalidate>' +
          field({ name: 'email', label: 'Email', type: 'email', required: true, value: DEMO[role], attrs: 'autocomplete="username"' }) +
          pwField('password', 'Password', 'autocomplete="current-password" value="demo1234"') +
          '<div class="between"><label class="check" style="padding:0"><input type="checkbox" name="remember" checked> <span>Keep me signed in</span></label><a href="' + HUK.url('forgot-password.html') + '">Forgot password?</a></div>' +
          '<button class="btn btn-primary btn-lg btn-block" type="submit" data-loading-text="Signing in…">Sign in</button>' +
        '</form>' +
        '<p class="center mt-3 muted">New candidate? <a href="' + HUK.url('register.html') + '">Create an account</a></p>' +
        '<div class="card card-flat card-tight mt-3" style="font-size:var(--fs-sm)"><strong>Demo access</strong><p class="muted mt-1">Pick a role above. Every demo account uses the password <code>demo1234</code>. Admins confirm sign-in with the code <code>123456</code>.</p></div>');
      const form = root.querySelector('#login-form');
      bindPwToggles(root);
      root.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
        root.querySelectorAll('[data-role]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        form.email.value = DEMO[b.dataset.role]; form.password.value = 'demo1234';
      }));
      if (HUK.qs('signedout')) toast('You’ve been signed out.', { tone: 'info' });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox(root.querySelector('#login-alert'), '');
        if (!validate(form)) return;
        const btn = form.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
          const { email, password, remember } = formData(form);
          const res = await HUK.authService.login({ email, password });
          if (res.mfaRequired) {
            sessionStorage.setItem(PENDING, JSON.stringify({ challengeId: res.challengeId, maskedEmail: res.maskedEmail, next, remember, flow: 'login' }));
            HUK.go('verify-otp.html');
            return;
          }
          HUK.auth.start(res, remember);
          goHome(res.user, next);
        } catch (err) {
          setLoading(btn, false);
          alertBox(root.querySelector('#login-alert'), esc(err.message));
          announce(err.message);
        }
      });
    }
  });

  /* ---------------- Register (student) ---------------- */
  HUK.page('register', {
    title: 'Create candidate account',
    render(root) {
      root.innerHTML = authLayout(
        '<h1>Create your candidate account</h1><p>You’ll use this account to take assessments and see your results.</p><div id="reg-alert" class="mb-2"></div>' +
        '<form id="reg-form" class="form-grid" novalidate>' +
          field({ name: 'name', label: 'Full name', required: true, full: true, attrs: 'autocomplete="name"' }) +
          field({ name: 'email', label: 'Email', type: 'email', required: true, full: true, attrs: 'autocomplete="email"', hint: 'Use the email your recruiter has on file.' }) +
          field({ name: 'phone', label: 'Mobile number', type: 'tel', attrs: 'autocomplete="tel"' }) +
          field({ name: 'institution', label: 'College or company', required: true }) +
          '<div class="full">' + pwField('password', 'Password', 'data-min-length="8" autocomplete="new-password"', 'At least 8 characters.') + '</div>' +
          '<div class="full">' + pwField('confirm', 'Confirm password', 'data-match="password" autocomplete="new-password"') + '</div>' +
          '<div class="full"><label class="check"><input type="checkbox" id="f-terms" name="terms" required aria-describedby="f-terms-err"><span>I agree to the <a href="' + HUK.url('shared/help.html#privacy') + '">assessment terms and privacy notice</a>, including camera and microphone recording during proctored exams.</span></label><span class="field-error" id="f-terms-err" role="alert"></span></div>' +
          '<div class="full"><button class="btn btn-primary btn-lg btn-block" type="submit" data-loading-text="Creating account…">Create account</button></div>' +
        '</form><p class="center mt-3 muted">Already registered? <a href="' + HUK.url('login.html') + '">Sign in</a></p>', 'One account for every assessment you take.');
      bindPwToggles(root);
      const form = root.querySelector('#reg-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate(form)) return;
        const btn = form.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
          const res = await HUK.authService.registerStudent(formData(form));
          sessionStorage.setItem(PENDING, JSON.stringify({ challengeId: res.challengeId, maskedEmail: res.maskedEmail, remember: true, flow: 'register' }));
          HUK.go('verify-otp.html');
        } catch (err) { setLoading(btn, false); alertBox(root.querySelector('#reg-alert'), esc(err.message)); announce(err.message); }
      });
    }
  });

  /* ---------------- OTP / MFA ---------------- */
  HUK.page('verify-otp', {
    title: 'Verify your sign-in',
    render(root) {
      let pending = null; try { pending = JSON.parse(sessionStorage.getItem(PENDING)); } catch (e) {}
      if (!pending) {
        root.innerHTML = authLayout('<div class="empty"><span class="empty-icon">' + icon('clock', 26) + '</span><h1 style="font-size:var(--fs-xl)">This verification step has expired</h1><p>Sign in again and we’ll send a fresh code.</p><a class="btn btn-primary mt-1" href="' + HUK.url('login.html') + '">Back to sign in</a></div>');
        return;
      }
      root.innerHTML = authLayout(
        '<h1>' + (pending.flow === 'register' ? 'Confirm your email' : 'Enter your verification code') + '</h1><p>We sent a 6-digit code to <strong>' + esc(pending.maskedEmail) + '</strong>. It expires in 10 minutes.</p><div id="otp-alert" class="mb-2"></div>' +
        '<form id="otp-form" novalidate><fieldset><legend class="sr-only">6-digit code</legend><div class="otp">' + Array.from({ length: 6 }, (_, i) => '<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="' + (i ? 'off' : 'one-time-code') + '" aria-label="Digit ' + (i + 1) + ' of 6">').join('') + '</div></fieldset>' +
        '<button class="btn btn-primary btn-lg btn-block mt-3" type="submit" data-loading-text="Verifying…">Verify and continue</button></form>' +
        '<p class="center mt-3 muted">Didn’t get it? <button type="button" class="link-btn" id="resend" disabled>Resend code in <span id="cd">30</span>s</button></p>' +
        '<p class="center subtle mt-1">Demo code: <code>123456</code></p><p class="center mt-2"><a href="' + HUK.url('login.html') + '">Use a different account</a></p>');
      const inputs = [...root.querySelectorAll('.otp input')];
      inputs.forEach((inp, i) => {
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); if (inputs.every((x) => x.value)) root.querySelector('#otp-form').requestSubmit(); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); });
        inp.addEventListener('paste', (e) => { const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!d) return; e.preventDefault(); d.split('').forEach((c, k) => { if (inputs[k]) inputs[k].value = c; }); (inputs[d.length] || inputs[5]).focus(); if (d.length === 6) root.querySelector('#otp-form').requestSubmit(); });
      });
      inputs[0].focus();
      let left = 30; const resend = root.querySelector('#resend');
      const timer = setInterval(() => { left--; const cd = root.querySelector('#cd'); if (cd) cd.textContent = left; if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = 'Resend code'; } }, 1000);
      resend.addEventListener('click', async () => { await HUK.authService.resendOtp(pending.challengeId); toast('A new code is on its way.', { tone: 'info' }); resend.disabled = true; });
      root.querySelector('#otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = inputs.map((x) => x.value).join('');
        if (code.length < 6) { alertBox(root.querySelector('#otp-alert'), 'Enter all 6 digits.'); inputs.find((x) => !x.value).focus(); return; }
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
          const res = await HUK.authService.verifyOtp({ challengeId: pending.challengeId, code });
          sessionStorage.removeItem(PENDING);
          HUK.auth.start(res, pending.remember !== false);
          goHome(res.user, pending.next);
        } catch (err) { setLoading(btn, false); alertBox(root.querySelector('#otp-alert'), esc(err.message)); inputs.forEach((x) => { x.value = ''; x.setAttribute('aria-invalid', 'true'); }); inputs[0].focus(); }
      });
    }
  });

  /* ---------------- Forgot password ---------------- */
  HUK.page('forgot-password', {
    title: 'Reset your password',
    render(root) {
      root.innerHTML = authLayout('<div id="fp"><h1>Reset your password</h1><p>Enter your account email and we’ll send you a reset link.</p><form id="fp-form" class="stack" novalidate>' + field({ name: 'email', label: 'Email', type: 'email', required: true, attrs: 'autocomplete="email"' }) + '<button class="btn btn-primary btn-lg btn-block" type="submit" data-loading-text="Sending…">Send reset link</button></form><p class="center mt-3"><a href="' + HUK.url('login.html') + '">Back to sign in</a></p></div>');
      const form = root.querySelector('#fp-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!validate(form)) return;
        const btn = form.querySelector('[type=submit]'); setLoading(btn, true);
        try {
          await HUK.authService.forgotPassword(form.email.value);
          root.querySelector('#fp').innerHTML = '<div class="empty"><span class="empty-icon">' + icon('mail', 26) + '</span><h1 style="font-size:var(--fs-xl)">Check your inbox</h1><p>If an account exists for <strong>' + esc(form.email.value) + '</strong>, a reset link is on its way. The link works for 30 minutes.</p><a class="btn btn-primary mt-1" href="' + HUK.url('reset-password.html?token=demo-reset-token') + '">Open the reset link (demo)</a><a class="mt-2" href="' + HUK.url('login.html') + '">Back to sign in</a></div>';
          announce('Reset link sent.');
        } catch (err) { setLoading(btn, false); toast(err.message, { tone: 'bad' }); }
      });
    }
  });

  /* ---------------- Reset password ---------------- */
  HUK.page('reset-password', {
    title: 'Choose a new password',
    render(root) {
      const token = HUK.qs('token');
      if (!token) { root.innerHTML = authLayout('<div class="empty"><span class="empty-icon">' + icon('alert', 26) + '</span><h1 style="font-size:var(--fs-xl)">This reset link isn’t valid</h1><p>It may have expired or been used already. Request a new link to continue.</p><a class="btn btn-primary mt-1" href="' + HUK.url('forgot-password.html') + '">Request a new link</a></div>'); return; }
      root.innerHTML = authLayout('<div id="rp"><h1>Choose a new password</h1><p>Use at least 8 characters. Mixing letters, numbers and symbols makes it stronger.</p><form id="rp-form" class="stack" novalidate>' +
        pwField('password', 'New password', 'data-min-length="8" autocomplete="new-password"') +
        '<div><div class="progress" aria-hidden="true"><span id="pw-meter" style="width:0"></span></div><p class="subtle mt-1" id="pw-strength" aria-live="polite">Strength: not set</p></div>' +
        pwField('confirm', 'Confirm new password', 'data-match="password" autocomplete="new-password"') +
        '<button class="btn btn-primary btn-lg btn-block" type="submit" data-loading-text="Saving…">Save new password</button></form></div>');
      bindPwToggles(root);
      const form = root.querySelector('#rp-form');
      form.password.addEventListener('input', () => {
        const v = form.password.value; let s = 0;
        if (v.length >= 8) s++; if (v.length >= 12) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
        root.querySelector('#pw-meter').style.width = (s * 20) + '%';
        root.querySelector('#pw-strength').textContent = 'Strength: ' + ['too short', 'weak', 'fair', 'good', 'strong', 'excellent'][s];
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!validate(form)) return;
        const btn = form.querySelector('[type=submit]'); setLoading(btn, true);
        try {
          await HUK.authService.resetPassword({ token, password: form.password.value });
          root.querySelector('#rp').innerHTML = '<div class="empty"><span class="empty-icon">' + icon('checkCircle', 26) + '</span><h1 style="font-size:var(--fs-xl)">Password updated</h1><p>Sign in with your new password. (In this demo the password stays <code>demo1234</code>.)</p><a class="btn btn-primary mt-1" href="' + HUK.url('login.html') + '">Sign in</a></div>';
        } catch (err) { setLoading(btn, false); toast(err.message, { tone: 'bad' }); }
      });
    }
  });

  /* ---------------- Status pages ---------------- */
  function statusPage(root, { iconName, title, text, actions }) {
    root.innerHTML = '<div class="status-page"><main id="main" class="card status-card"><div class="status-icon">' + icon(iconName, 28) + '</div><h1 style="font-size:var(--fs-xl)">' + title + '</h1><p class="muted mt-1">' + text + '</p><div class="row-wrap mt-3" style="justify-content:center">' + actions + '</div></main></div>';
  }
  HUK.page('session-expired', {
    title: 'Session expired',
    render(root) { statusPage(root, { iconName: 'clock', title: 'Your session has expired', text: 'For your security we sign you out after a period of inactivity. Sign in again to pick up where you left off; saved exam answers are kept.', actions: '<a class="btn btn-primary" href="' + HUK.url('login.html') + '">Sign in again</a><a class="btn" href="' + HUK.url('index.html') + '">Go to home page</a>' }); }
  });
  HUK.page('unauthorized', {
    title: 'No access',
    render(root) {
      const u = HUK.auth.user();
      statusPage(root, { iconName: 'lock', title: 'You don’t have access to this page', text: u ? 'You’re signed in as ' + esc(HUK.auth.ROLE_LABEL[u.role].toLowerCase()) + ' <strong>' + esc(u.name) + '</strong>. This page belongs to a different role. Ask an administrator if you need access.' : 'Sign in with an account that has access to this page.', actions: (u ? '<a class="btn btn-primary" href="' + HUK.url(HUK.auth.homeFor(u.role)) + '">Go to my dashboard</a><button type="button" class="btn" id="switch">Sign in as someone else</button>' : '<a class="btn btn-primary" href="' + HUK.url('login.html') + '">Sign in</a>') });
      const s = root.querySelector('#switch'); if (s) s.addEventListener('click', () => { HUK.auth.clear(); HUK.go('login.html'); });
    }
  });
  HUK.page('not-found', {
    title: 'Page not found',
    render(root) { const u = HUK.auth.user(); statusPage(root, { iconName: 'search', title: 'We couldn’t find that page', text: 'The link may be out of date. Use your dashboard to find what you need.', actions: '<a class="btn btn-primary" href="' + HUK.url(u ? HUK.auth.homeFor(u.role) : 'index.html') + '">' + (u ? 'Go to my dashboard' : 'Go to home page') + '</a>' }); }
  });
})();
