// lib/supabase-browser.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Browser-side Supabase client:
 * - persists session in localStorage
 * - auto-refreshes access token
 * - handles magic-link URL (?code=...) with implicit
 */
export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
    // Ensure fetch is available in all runtimes
    global: { fetch: (...args) => fetch(...args) },
  });

  return _client;
}
