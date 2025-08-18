// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function HomePage() {
  const supa = supabaseBrowser();
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Check auth once on mount and on auth state changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (!mounted) return;
      setAuthed(!!session);
    })();

    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supa]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-sky-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="px-4 md:px-6 lg:px-8 max-w-[1100px] mx-auto w-full py-10">
        {/* Hero */}
        <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10 p-6 sm:p-8 shadow-sm">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome to the House</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                This is a glass-house operation — you can glimpse the rooms behind
                the door, but you’ll need your key to step inside.
              </p>

              {/* Small inline “room” pills (always visible as descriptions) */}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1">
                  <span className="font-medium">Office:</span> CRM, calendar, KPIs
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1">
                  <span className="font-medium">Library:</span> trainings &amp; media
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1">
                  <span className="font-medium">Living Room:</span> community
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1">
                  <span className="font-medium">Kitchen:</span> resources &amp; tools
                </span>
              </div>
            </div>

            {/* Magic-link box */}
            <LoginCard />
          </div>
        </div>

        {/* Big room cards — ONLY when authenticated */}
        {authed ? (
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <RoomCard title="Office" desc="CRM, Calendar, KPIs" href="/office" />
            <RoomCard title="Library" desc="Trainings & Media" href="/library" />
            <RoomCard title="Living Room" desc="Community" href="/living-room" />
            <RoomCard title="Kitchen" desc="Resources & Tools" href="/kitchen" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- tiny pieces ---------- */

function LoginCard() {
  const supa = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : `${window.location.origin}/auth/callback`;

    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10 p-4 sm:p-5 shadow-sm">
      <h3 className="font-semibold">I already have a key</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email and we’ll send your one-time key.
      </p>

      {sent ? (
        <div className="mt-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
          ✅ Check your inbox for the magic link.
        </div>
      ) : (
        <form onSubmit={sendLink} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            required
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Send My Key'}
          </button>
        </form>
      )}

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      <div className="mt-3">
        <Link
          href="/request-access"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-3 py-2 hover:bg-amber-600 text-sm"
        >
          I Need a Key
        </Link>
      </div>
    </div>
  );
}

function RoomCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm hover:shadow-md border border-black/5 dark:border-white/10"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</div>
    </Link>
  );
}
