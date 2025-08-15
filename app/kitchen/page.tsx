// app/kitchen/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Page } from '@/components/ui';

export default function KitchenHome() {
  const supa = supabaseBrowser();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) {
        setAuthed(!!session);
        setLoadingAuth(false);
      }
    })();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
      if (mounted) setAuthed(!!sess);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supa]);

  if (loadingAuth) {
    return <div className="p-6 text-zinc-500">Loading…</div>;
  }

  if (!authed) {
    // Soft gate (same tone as Office/Calendar)
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
    <Page>
      <h1 className="text-3xl font-semibold tracking-tight">Kitchen</h1>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Meeting Recipes</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Event templates, run-of-show, checklists.
              </p>
            </div>
            <Link
              href="/kitchen/recipes"
              className="btn bg-sky-600 text-white hover:bg-sky-700"
            >
              Open
            </Link>
          </div>
        </Card>

        <Card className="relative z-10">
          <div className="flex items-center justify-between opacity-90">
            <div>
              <h3 className="text-lg font-semibold">Assets & Flyers</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Shareables and downloadables.
              </p>
            </div>
            <span className="btn bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed select-none">
              Soon
            </span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
