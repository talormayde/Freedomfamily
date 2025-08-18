// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const supa = supabaseBrowser();
  const [status, setStatus] = useState<'working'|'ok'|'fail'>('working');
  const [detail, setDetail] = useState<string>('Finishing sign-in…');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) Try to exchange ?code= for a session explicitly
        const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          // Common errors are: "Invalid or expired code", or URL not allowed
          setStatus('fail');
          setDetail(error.message);
          return;
        }

        // 2) Confirm we have a session
        const { data: { session } } = await supa.auth.getSession();
        if (!mounted) return;

        if (session) {
          setStatus('ok');
          setDetail('You’re in!');
        } else {
          setStatus('fail');
          setDetail('Could not complete sign-in (no session). Try the link again.');
        }
      } catch (e: any) {
        setStatus('fail');
        setDetail(e?.message || 'Unexpected error.');
      }
    })();
    return () => { mounted = false; };
  }, [supa]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-4 bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.15),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)]">
      <div className="max-w-md w-full rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-6 text-center">
        <h1 className="text-2xl font-semibold">Sign-in</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{detail}</p>

        {status === 'ok' && (
          <div className="mt-4 flex justify-center">
            <Link href="/office" className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
              Go to the Office
            </Link>
          </div>
        )}
        {status === 'fail' && (
          <div className="mt-4 grid gap-2">
            <Link href="/" className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2">
              Back to Home
            </Link>
            <button
              onClick={() => location.reload()}
              className="rounded-xl bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
