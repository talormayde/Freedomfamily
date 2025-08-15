// app/living/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LivingRoomPage() {
  const supa = supabaseBrowser();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      setLoadingAuth(false);
      return () => subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []); // eslint-disable-line

  if (loadingAuth) {
    return <div className="p-6 text-zinc-500">Loading…</div>;
  }

  // Soft gate for non-members
  if (!authed) {
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

  // Authenticated Living Room
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto w-full">
      <h1 className="text-3xl font-semibold tracking-tight mt-6">Living Room</h1>

      <div className="mt-4 grid gap-4">
        {/* Announcements */}
        <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Announcements</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Recognition, wins, and team updates.
              </p>
            </div>
            <Link
              href="#"
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              Open
            </Link>
          </div>
        </div>

        {/* Community Chat (placeholder) */}
        <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 opacity-90">
            <div>
              <h3 className="text-lg font-semibold">Community Chat</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Hang out and help each other.
              </p>
            </div>
            <span className="inline-flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm">
              Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
