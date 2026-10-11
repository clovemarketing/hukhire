
/* HUK HIRE — Supabase staging client */
(function () {
  window.HUK = window.HUK || {};

  const SUPABASE_URL = 'https://onqegsumextwakkugofw.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_uDG3SA9k6emuWgKdW3mSQQ_RnMFHg60';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase library failed to load.');
    return;
  }

  window.HUK.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
})();
