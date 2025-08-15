// components/AppChrome.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const supa = supabaseBrowser();
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      // subscribe + cleanup (Supabase v2 shape)
      const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      return () => subscription.unsubscribe();
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* New stacking context so z-index is deterministic across the app */}
      <div className="min-h-screen isolate relative bg-gradient-to-b from-sky-50 to-teal-50 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
        {/* Decorative background — MUST NOT steal clicks */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        />

        {/* Top bar (hidden until authed) */}
        {authed && (
          <header className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-zinc-900/60 border-b border-black/5 dark:border-white/10">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1700px] h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold">Freedom Family</Link>
              <nav className="hidden sm:flex items-center gap-6 text-sm relative z-10">
                <Link href="/office" className="hover:opacity-70">Office</Link>
                <Link href="/library" className="hover:opacity-70">Library</Link>
                <Link href="/living" className="hover:opacity-70">Living</Link>
                <Link href="/kitchen" className="hover:opacity-70">Kitchen</Link>
                <Link href="/calendar" className="hover:opacity-70">Calendar</Link>
                <ThemeToggle />
              </nav>
            </div>
          </header>
        )}

        {/* Body grid */}
        <div className="mx-auto max-w-[1700px] relative z-10">
          <div className={`grid ${authed ? 'md:grid-cols-[220px_1fr]' : 'grid-cols-1'} gap-0`}>
            {/* Sidebar (hidden until authed) */}
            {authed && (
              <aside className="hidden md:block p-6 pr-4">
                <div className="space-y-3">
                  <Link href="/office" className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow-sm px-4 py-3 hover:bg-white">
                    <span className="inline-flex items-center gap-2">
                      <span>🏢</span> <span>Office</span>
                    </span>
                  </Link>
                  <Link href="/library" className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow-sm px-4 py-3 hover:bg-white">
                    <span className="inline-flex items-center gap-2">
                      <span>📚</span> <span>Library</span>
                    </span>
                  </Link>
                  <Link href="/living" className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow-sm px-4 py-3 hover:bg-white">
                    <span className="inline-flex items-center gap-2">
                      <span>💬</span> <span>Living Room</span>
                    </span>
                  </Link>
                  <Link href="/kitchen" className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow-sm px-4 py-3 hover:bg-white">
                    <span className="inline-flex items-center gap-2">
                      <span>🧰</span> <span>Kitchen</span>
                    </span>
                  </Link>
                  <Link href="/calendar" className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow-sm px-4 py-3 hover:bg-white">
                    <span className="inline-flex items-center gap-2">
                      <span>📅</span> <span>Calendar</span>
                    </span>
                  </Link>
                </div>
              </aside>
            )}

            {/* Content */}
            <main className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="min-h-[70vh]">{children}</div>
            </main>
          </div>
        </div>

        {/* Footer on every page after auth */}
        {authed && (
          <footer className="mt-10 border-t border-black/5 dark:border-white/10 py-6 text-xs text-center opacity-70 relative z-10">
            Freedom Family — glass-house hub
          </footer>
        )}
      </div>
    </>
  );
}