// app/office/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function OfficePage() {
  const supa = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    // 1) get current session once
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) {
        setAuthed(!!session);
        setLoading(false);
      }
    })();

    // 2) subscribe to changes
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
      if (mounted) setAuthed(!!sess);
    });

    // 3) cleanup properly (this is what was missing)
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supa]);

  if (loading) {
    return <div className="p-6 text-zinc-500">Loading…</div>;
  }

  if (!authed) {
    // Soft gate: friendly message with a link back home to get a key
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10">
        <h1 className="text-2xl font-semibold">You’ll need your key</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          This room is for members. Head back to the door and request your key.
        </p>
        <Link
          href="/"
          className="inline-flex mt-4 rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
        >
          Go to the door
        </Link>
      </div>
    );
  }

  // Authenticated content
  return (
    <div className="w-full">
      <h1 className="text-3xl font-semibold tracking-tight mb-4">Office</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/office/list-builder"
          className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm hover:shadow-md"
        >
          <div className="font-medium">List Builder</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Prospects CRM</div>
        </Link>

        <Link
          href="/calendar"
          className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm hover:shadow-md"
        >
          <div className="font-medium">Calendar</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Day / Week / Month</div>
        </Link>

        <Link
          href="/office/kpis"
          className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm hover:shadow-md"
        >
          <div className="font-medium">KPIs</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Track what matters</div>
        </Link>
      </div>
    </div>
  );
}
