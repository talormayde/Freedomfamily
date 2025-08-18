// lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'; // modern helper

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  _client = createBrowserClient(url, anon, {
    cookies: {
      // Not used on the client, but required by the type
      get: (key: string) => (typeof document === 'undefined' ? '' : ''),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles magic-link callback ?code=...
      flowType: 'pkce',         // best UX for email links
    },
  });

  return _client;
}
