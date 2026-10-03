/* =========================================================
   apiClient: the single place that talks HTTP.
   Centralises auth-token injection, JSON handling, timeouts
   and error normalisation (spec §17). Not used while
   HUK.config.USE_MOCK is true.
   ========================================================= */
(function () {
  const cfg = HUK.config;

  /** Normalised error shape used everywhere in the UI. */
  class ApiError extends Error {
    constructor(status, code, message, details) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }

  function buildUrl(path, params) {
    const url = new URL(cfg.API_BASE + path, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url.toString();
  }

  async function request(method, path, { params, body, headers } = {}) {
    const session = HUK.auth ? HUK.auth.session() : null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(buildUrl(path, params), {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(session && session.token ? { Authorization: 'Bearer ' + session.token } : {}),
          ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      const data = res.status === 204 ? null : await res.json().catch(() => null);
      if (res.status === 401) { HUK.auth.expire(); throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired.'); }
      if (res.status === 403) { window.location.href = HUK.url('unauthorized.html'); throw new ApiError(403, 'FORBIDDEN', 'You do not have access.'); }
      if (!res.ok) throw new ApiError(res.status, (data && data.code) || 'HTTP_ERROR', (data && data.message) || 'The request failed (' + res.status + ').', data);
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err.name === 'AbortError') throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Check your connection and try again.');
      throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
    }
  }

  HUK.ApiError = ApiError;
  HUK.apiClient = {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
    del: (path, opts) => request('DELETE', path, opts)
  };
})();
