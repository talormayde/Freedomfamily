// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const supa = supabaseBrowser();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has('code');

        // If this was a PKCE magic-link, exchange ?code for a session.
        if (hasCode) {
          try { await supa.auth.exchangeCodeForSession(window.location.href); } catch {}
        }

        // Poll briefly for a session (also covers implicit/hash flow).
        const start = Date.now();
        const wait = (ms:number) => new Promise(r=>setTimeout(r, ms));
        while (alive && Date.now() - start < 6000) {
          const { data: { session } } = await supa.auth.getSession();
          if (session) {
            window.location.replace('/living'); // Welcome Home
            return;
          }
          await wait(250);
        }
      } finally {
        // Fallback: even if we didn’t detect it yet, go to Living;
        // if a session exists, Living will show. If not, your soft gate there handles it.
        if (alive) window.location.replace('/living');
      }
    })();

    return () => { alive = false; };
  }, [supa]);

  return null; // no UI — this route just completes auth and redirects
}
