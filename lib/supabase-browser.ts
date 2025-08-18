// lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser-side Supabase client:
 * - persists session in localStorage
 * - auto-refreshes access token
 * - handles magic-link URL (?code=...)
 */
export function supabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    // Hard fail early so we see it during dev/build
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  }

  _client = createBrowserClient(url, anon, {
    cookies: {
      // Not used in the browser — required by type
      get: () => '',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return _client;
}
