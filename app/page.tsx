'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { House, BookOpen, MessageSquare, Utensils, KeyRound } from 'lucide-react';

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    const supa = supabaseBrowser();

    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
    })();

    // ✅ Return void from the callback and clean up the subscription
    const { data: { subscription } } = supa.auth.onAuthStateChange((_evt, sess) => {
      if (mounted) setAuthed(!!sess);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sendKey() {
    const supa = supabaseBrowser();
    await supa.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`
      }
    });
    alert('Key sent. Check your email.');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 py-8">
      {/* Rooms rail (always visible) */}
      <aside className="hidden md:block fixed left-4 top-20 space-y-4 w-56">
        <NavTile href="/office" icon={<House className="h-5 w-5" />} label="Office" />
        <NavTile href="/library" icon={<BookOpen className="h-5 w-5" />} label="Library" />
        <NavTile href="/living" icon={<MessageSquare className="h-5 w-5" />} label="Living Room" />
        <NavTile href="/kitchen" icon={<Utensils className="h-5 w-5" />} label="Kitchen" />
      </aside>

      <main className="md:ml-64">
        {/* Glass landing shows only when NOT authed */}
        {!authed && (
          <section className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl ring-1 ring-black/5 shadow-lg p-6 md:p-10">
            <div className="absolute -z-10 inset-0 opacity-60">
              <div className="h-full w-full bg-gradient-to-br from-sky-200 via-emerald-200 to-amber-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5 mb-4">
                  <KeyRound className="h-6 w-6 text-sky-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Welcome to the House
                </h1>
                <p className="mt-3 text-zinc-700 dark:text-zinc-300 max-w-prose">
                  A glass-house operation for the Freedom Family. You can glimpse the rooms behind the
                  door, but you’ll need your key to step inside.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Badge icon={<House className="h-4 w-4" />} text="Office: CRM, calendar, KPIs" />
                  <Badge icon={<BookOpen className="h-4 w-4" />} text="Library: trainings & media" />
                  <Badge icon={<MessageSquare className="h-4 w-4" />} text="Living Room: community" />
                  <Badge icon={<Utensils className="h-4 w-4" />} text="Kitchen: resources & tools" />
                </div>
              </div>

              <div className="w-full">
                <h2 className="text-xl font-semibold mb-3">I already have a key</h2>
                <div className="flex gap-3">
                  <input
                    type="email"
                    inputMode="email"
                    className="flex-1 rounded-xl border border-zinc-300 bg-white/80 px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    onClick={sendKey}
                    className="rounded-xl bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700"
                  >
                    Send My Key
                  </button>
                </div>

                <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  By continuing, you’ll receive a one-time sign-in key at the email above.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* When authed, show quick room cards instead of the landing */}
        {authed && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <RoomCard href="/office" title="Office" subtitle="CRM, Calendar, KPIs" />
            <RoomCard href="/library" title="Library" subtitle="Trainings & Media" />
            <RoomCard href="/living" title="Living Room" subtitle="Community" />
            <RoomCard href="/kitchen" title="Kitchen" subtitle="Resources & Tools" />
          </section>
        )}
      </main>
    </div>
  );
}

function NavTile({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-black/5 px-4 py-3 hover:bg-white"
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-black/5">
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  );
}

function RoomCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-white/70 backdrop-blur ring-1 ring-black/5 p-6 hover:bg-white transition"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-zinc-600 mt-1">{subtitle}</p>
    </Link>
  );
}
