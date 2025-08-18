// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const supa = supabaseBrowser();
  const [status, setStatus] = useState<'working'|'ok'|'error'>('working');
  const [msg, setMsg] = useState<string>('Signing you in…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Supabase v2: exchange the code (present on the URL) for a session
        const { data, error } = await supa.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;

        if (error) {
          setStatus('error');
          setMsg(error.message || 'Unable to complete sign-in.');
          return;
        }

        // We’re signed in in this browser context now.
        // Because Safari and the PWA share storage on the SAME ORIGIN,
        // switching back to the Home-Screen app will show you as signed in.
        setStatus('ok');
        setMsg('Signed in! You can return to the app.');
        // Clean the URL so sensitive params aren’t kept in history:
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setMsg(e?.message || 'Unexpected error.');
      }
    })();
    return () => { cancelled = true; };
  }, [supa]);

  const Hint = () => (
    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
      If you installed <strong>Freefam</strong> on your Home Screen, switch back to it now.
      Your session is saved. If you’re staying in Safari, you can also continue below.
    </p>
  );

  return (
    <div className="max-w-lg mx-auto p-6 mt-10 rounded-2xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-zinc-950/70">
      <h1 className="text-2xl font-semibold">Authentication</h1>
      <div className="mt-2">
        {status === 'working' && <div className="text-zinc-600 dark:text-zinc-400">Signing you in…</div>}
        {status === 'ok' && <div className="text-green-700 dark:text-green-400">{msg}</div>}
        {status === 'error' && <div className="text-red-700 dark:text-red-400">{msg}</div>}
      </div>

      <Hint />

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
        >
          Open Freefam
        </Link>
        <Link
          href="/office"
          className="inline-flex rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2"
        >
          Go to Office
        </Link>
      </div>
    </div>
  );
}
