/* =========================================================
   Routing helpers. Pages are real HTML files; IDs travel in
   query strings (e.g. exam-details.html?id=exam_001).
   <body data-base="../"> tells us how deep the current page is.
   ========================================================= */
(function () {
  const base = () => (document.body && document.body.dataset.base) || '';
  HUK.url = (path) => base() + String(path || '').replace(/^\//, '');
  HUK.qs = (name) => new URLSearchParams(location.search).get(name);
  HUK.go = (path) => { location.href = HUK.url(path); };
  HUK.setQuery = (params) => {
    const u = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => (v === null || v === undefined || v === '' ? u.searchParams.delete(k) : u.searchParams.set(k, v)));
    history.replaceState(null, '', u);
  };
})();
