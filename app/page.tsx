// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function HomePage() {
  const supa = supabaseBrowser();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
    })();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
    });
    return () => subscription.unsubscribe();
  }, [supa]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const redirect =
      (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + '/auth/callback';
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect }, // plain https URL; no custom scheme => no “open in app” prompt
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.15),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.15),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.10),transparent_40%)]">
      <div className="px-4 md:px-6 lg:px-8 max-w-[1100px] mx-auto w-full py-10">
        {/* Glass hero */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-6 sm:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">🔑</div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome to the House</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                A glass-house operation — you can glimpse the rooms behind the door,
                but you’ll need your key to step inside.
              </p>

              {/* Always-visible “room” chips (just descriptors) */}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 px-3 py-1">
                  <span className="font-medium">Office:</span> CRM, calendar, KPIs
                </span>
                <span className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 px-3 py-1">
                  <span className="font-medium">Library:</span> trainings &amp; media
                </span>
                <span className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 px-3 py-1">
                  <span className="font-medium">Living Room:</span> community
                </span>
                <span className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 px-3 py-1">
                  <span className="font-medium">Kitchen:</span> resources &amp; tools
                </span>
              </div>
            </div>

            {/* Magic-link card */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur p-4 sm:p-5 shadow-sm">
              <h3 className="font-semibold">I already have a key</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Enter your email and we’ll send a one-time link.
              </p>

              {sent ? (
                <div className="mt-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  ✅ Link sent. Check your inbox on this device and tap it to finish signing in.
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
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

              {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

              <div className="mt-3">
                <Link
                  href="/request-access"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-3 py-2 hover:bg-amber-600 text-sm"
                >
                  I Need a Key
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Big room cards — visible only when authenticated */}
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

function RoomCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm hover:shadow-md border border-black/5 dark:border-white/10 backdrop-blur"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</div>
    </Link>
  );
}
