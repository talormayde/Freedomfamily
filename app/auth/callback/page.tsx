// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const supa = supabaseBrowser();
  const [state, setState] = useState<'working'|'ok'|'home'>('working');
  const [msg, setMsg] = useState('Finishing sign-in…');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has('code');
        const hasHashTokens =
          window.location.hash.includes('access_token') ||
          window.location.hash.includes('refresh_token');

        // 1) PKCE only if a `code` is actually present
        if (hasCode) {
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            // If PKCE fails, fall back to session check below (don’t show scary error)
            console.warn('PKCE exchange error:', error.message);
          }
        }

        // 2) In implicit flow, the client auto-consumes the hash; give it a moment
        let tries = 0;
        while (tries < 12) { // ~6s total
          const { data: { session } } = await supa.auth.getSession();
          if (!mounted) return;
          if (session) {
            setState('ok');
            setMsg('You’re in!');
            return;
          }
          // If there are no tokens at all and no code, bounce home fast
          if (!hasCode && !hasHashTokens && tries === 0) {
            setState('home');
            return;
          }
          await new Promise(r => setTimeout(r, 500));
          tries++;
        }

        // Timed out without a session — send home
        setState('home');
      } catch (e: any) {
        console.warn('Auth callback error:', e?.message || e);
        setState('home');
      }
    })();

    return () => { mounted = false; };
  }, [supa]);

  if (state === 'home') {
    // Gentle “go back” UI (no error vibes)
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-6 text-center">
          <h1 className="text-2xl font-semibold">Sign-in</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Let’s try that again.</p>
          <div className="mt-4">
            <Link href="/" className="rounded-xl bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // working/ok
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-6 text-center">
        <h1 className="text-2xl font-semibold">Sign-in</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{msg}</p>
        {state === 'ok' && (
          <div className="mt-4">
            <Link href="/office" className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
              Go to the Office
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
