// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function AuthCallbackPage() {
  const supa = supabaseBrowser();
  const [ok, setOk] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string>('Finishing sign-in…');

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Supabase automatically reads ?code= from the URL in the browser client (detectSessionInUrl: true)
      // We just wait for the session to appear or time out gracefully.
      const { data: { session }, error } = await supa.auth.getSession();
      if (!mounted) return;
      if (error) { setOk(false); setMsg(error.message); return; }
      if (session) { setOk(true); setMsg('You’re in!'); return; }

      // Poll briefly (helps on slow networks)
      const t = Date.now();
      const poll = setInterval(async () => {
        const { data: { session: s } } = await supa.auth.getSession();
        if (s) { clearInterval(poll); setOk(true); setMsg('You’re in!'); }
        if (Date.now() - t > 6000) { clearInterval(poll); setOk(false); setMsg('Could not complete sign-in. Try the link again.'); }
      }, 500);
    })();
    return () => { mounted = false; };
  }, [supa]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-6 text-center">
        <h1 className="text-2xl font-semibold">Sign-in</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{msg}</p>

        {ok ? (
          <div className="mt-4 flex justify-center">
            <Link href="/office" className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
              Go to the Office
            </Link>
          </div>
        ) : ok === false ? (
          <div className="mt-4 flex justify-center">
            <Link href="/" className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2">
              Back to Home
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
