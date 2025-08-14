'use client';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function AppChrome({ children }: { children: ReactNode }) {
  const supa = supabaseBrowser();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      setHasSession(!!session);
      const { data: { subscription } } = supa.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
      return () => subscription.unsubscribe();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hasSession === null) return <div className="min-h-screen" />;

  const hideChrome = pathname === '/' && !hasSession;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {!hideChrome && (
        <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-zinc-900/60 border-b border-zinc-200/60 dark:border-zinc-800/70">
          <div className="ff-wrap h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex size-7 rounded-xl bg-sky-500/10 ring-1 ring-sky-200/70 items-center justify-center">🏠</span>
              <span>Freedom Family</span>
            </a>
            <div className="flex items-center gap-3">
              <nav className="hidden md:flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <a href="/office" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Office</a>
                <a href="/library" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Library</a>
                <a href="/living-room" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Living</a>
                <a href="/kitchen" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Kitchen</a>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className={`ff-wrap flex-1 ${!hideChrome ? 'py-6 md:py-10' : ''}`}>
        <div className={!hideChrome ? 'grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-6 md:gap-8' : ''}>
          {!hideChrome && (
            <aside className="hidden md:block">
              <div className="sticky top-20 space-y-3">
                <a className="block rounded-2xl px-4 py-3 card" href="/office">💼 Office</a>
                <a className="block rounded-2xl px-4 py-3 card" href="/library">📚 Library</a>
                <a className="block rounded-2xl px-4 py-3 card" href="/living-room">💬 Living Room</a>
                <a className="block rounded-2xl px-4 py-3 card" href="/kitchen">🍳 Kitchen</a>
              </div>
            </aside>
          )}
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {/* Footer (keep even on home) */}
      <Footer />

      {/* Bottom nav (mobile only, hide on home when signed-out) */}
      {!hideChrome && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-900/80 backdrop-blur">
          <div className="ff-wrap grid grid-cols-5 p-2 gap-2 text-xs">
            <a className="grid place-items-center rounded-xl py-2 bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" href="/">Home</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="/office">Office</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="/library">Library</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="/living-room">Living</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="/kitchen">Kitchen</a>
          </div>
        </nav>
      )}
    </div>
  );
}