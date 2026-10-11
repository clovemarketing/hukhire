/* =========================================================
   HUK HIRE — Authentication Service

   Login: Supabase Auth
   Registration, OTP, recovery, profile and settings:
   existing mock/custom API behavior retained.

   IMPORTANT:
   Configure real MFA separately before production use.
   ========================================================= */
(function () {
  const M = HUK.mockApi;
  const A = HUK.apiClient;
  const live = () => !HUK.config.USE_MOCK;

  const err = (status, code, message) =>
    new HUK.ApiError(status, code, message);

  const publicUser = (u) => ({
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    status: u.status,
    title: u.title || u.program || '',
    avatarUrl: u.avatarUrl || null
  });

  HUK.authService = {
    /**
     * Sign in with Supabase Auth and load the user's profile.
     */
    async login({ email, password }) {
      const supabase = HUK.supabase;

      if (!supabase) {
        throw new Error(
          'Supabase is not initialized. Refresh the page and try again.'
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password
      });

      if (error) {
        throw new Error(
          'Sign-in failed. Check your email and password, then try again.'
        );
      }

      const authUser = data.user;

      if (!authUser || !data.session) {
        await supabase.auth.signOut();
        throw new Error('Sign-in failed. Please try again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, name, email, status, title, program')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error(
          'Your account profile could not be found. Contact your administrator.'
        );
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error(
          'Your account is not active. Contact your administrator.'
        );
      }

      if (!['admin', 'proctor', 'student'].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error('Your account has an invalid role.');
      }

      return {
        token: data.session.access_token,
        user: {
          id: profile.id,
          role: profile.role,
          name: profile.name,
          email: profile.email,
          status: profile.status,
          title: profile.title || profile.program || '',
          avatarUrl: null
        }
      };
    },

    /**
     * Verify OTP.
     * Existing mock/custom API behavior retained.
     */
    verifyOtp({ challengeId, code }) {
      if (live()) {
        return A.post('/auth/verify-otp', { challengeId, code });
      }

      return M.respond((db) => {
        if (code !== '123456') {
          throw err(
            400,
            'INVALID_OTP',
            'That code is incorrect or has expired. Enter the 6-digit code from your email.'
          );
        }

        const uid = String(challengeId || '')
          .replace(/^chl_/, '')
          .replace(/^reg_/, '');

        const u = db.users.find((x) => x.id === uid);

        if (!u) {
          throw err(
            400,
            'CHALLENGE_EXPIRED',
            'This verification request has expired. Sign in again to get a new code.'
          );
        }

        return {
          token: 'mock.' + u.id + '.' + Date.now(),
          user: publicUser(u)
        };
      });
    },

    /**
     * Resend OTP.
     */
    resendOtp(challengeId) {
      if (live()) {
        return A.post('/auth/resend-otp', { challengeId });
      }

      return M.respond(() => ({ sent: true }));
    },

    /**
     * Register a student.
     */
    registerStudent(data) {
      if (live()) {
        return A.post('/auth/register/student', data);
      }

      return M.mutate((db) => {
        if (
          db.users.some(
            (x) =>
              x.email.toLowerCase() ===
              String(data.email).toLowerCase()
          )
        ) {
          throw err(
            409,
            'EMAIL_TAKEN',
            'An account with this email already exists. Sign in or reset your password.'
          );
        }

        const u = {
          id: M.id('stu'),
          role: 'student',
          name: data.name,
          email: data.email,
          phone: data.phone,
          institution: data.institution,
          program: data.program || '',
          status: 'active',
          group: 'Self-registered',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };

        db.users.push(u);

        db.userSettings[u.id] = {
          theme: 'brand',
          notifications: {
            email: true,
            inApp: true,
            sms: false,
            reminders: true
          },
          device: {
            preferredCamera: 'Default camera',
            autoSystemCheck: true
          }
        };

        return {
          challengeId: 'reg_' + u.id,
          maskedEmail: u.email
        };
      });
    },

    /**
     * Request password recovery.
     */
    forgotPassword(email) {
      if (live()) {
        return A.post('/auth/forgot-password', { email });
      }

      return M.respond(() => ({ sent: true }));
    },

    /**
     * Reset password.
     */
    resetPassword({ token, password }) {
      if (live()) {
        return A.post('/auth/reset-password', { token, password });
      }

      return M.respond(() => {
        if (!token) {
          throw err(
            400,
            'INVALID_TOKEN',
            'This reset link is invalid or has expired. Request a new one.'
          );
        }

        return { reset: true };
      });
    },

    /**
     * Get current user's profile.
     */
    me() {
      if (live()) {
        return A.get('/me');
      }

      const s = HUK.auth.user();

      return M.respond((db) => {
        const u = db.users.find((x) => x.id === s.id);
        return { ...u };
      });
    },

    /**
     * Update current user's profile.
     */
    updateProfile(patch) {
      if (live()) {
        return A.patch('/me', patch);
      }

      const s = HUK.auth.user();

      return M.mutate((db) => {
        const u = db.users.find((x) => x.id === s.id);
        Object.assign(u, patch);
        return publicUser(u);
      });
    },

    /**
     * Change password.
     */
    changePassword({ current, next }) {
      if (live()) {
        return A.post('/me/password', { current, next });
      }

      return M.respond((db) => {
        if (current !== db.passwords.default) {
          throw err(
            400,
            'WRONG_PASSWORD',
            'Your current password is incorrect.'
          );
        }

        return { changed: true };
      });
    },

    /**
     * Get user settings.
     */
    getSettings() {
      if (live()) {
        return A.get('/me/settings');
      }

      const s = HUK.auth.user();

      return M.respond((db) => db.userSettings[s.id] || {});
    },

    /**
     * Update user settings.
     */
    updateSettings(patch) {
      if (live()) {
        return A.patch('/me/settings', patch);
      }

      const s = HUK.auth.user();

      return M.mutate((db) => {
        const cur = db.userSettings[s.id] || {};

        db.userSettings[s.id] = {
          ...cur,
          ...patch
        };

        return db.userSettings[s.id];
      });
    },

    /**
     * Log out.
     */
    async logout() {
      if (HUK.supabase) {
        const { error } = await HUK.supabase.auth.signOut();

        if (error) {
          throw error;
        }

        return { ok: true };
      }

      if (live()) {
        return A.post('/auth/logout');
      }

      return Promise.resolve({ ok: true });
    }
  };
})();
