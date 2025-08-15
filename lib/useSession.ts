// lib/useSession.ts
'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supa = supabaseBrowser();
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      const { data: sub } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      setLoading(false);
      return () => sub.subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []);

  return { loading, authed };
}