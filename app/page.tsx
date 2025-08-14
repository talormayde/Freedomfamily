'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import EmailKeyForm from '@/components/EmailKeyForm';

export default function HomePage() {
  const supa = supabaseBrowser();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      supa.auth.onAuthStateChange((_e, sess) => mounted && setAuthed(!!sess));
    })();
    return () => { mounted = false; };
  }, []);

  if (authed === null) {
    return <div className="h-[60vh] grid place-items-center opacity-60 text-sm">Loading…</div>;
  }

  if (authed) {
    return (
      <div className="w-full">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Tile href="/office" title="Office" subtitle="CRM, Calendar, KPIs" />
          <Tile href="/calendar" title="Calendar" subtitle="Daily • Weekly • Monthly" />
          <Tile href="/library" title="Library" subtitle="Trainings & media" />
          <Tile href="/living" title="Living Room" subtitle="Community" />
        </div>
      </div>
    );
  }

  // Logged out → “glass door” with key request
  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-zinc-900/60 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-10 left-6 h-40 w-72 rounded-3xl bg-sky-200/40 blur-2xl" />
          <div className="absolute top-10 right-10 h-40 w-80 rounded-3xl bg-teal-200/40 blur-2xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 text-xl">🔑</div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome to the House</h1>
            <p className="mt-3 max-w-[52ch] text-zinc-600 dark:text-zinc-300">
              A member hub for the Freedom Family. It’s a glass-house—you can glimpse the rooms,
              but you’ll need your key to step inside.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">🏢 <b>Office:</b> CRM, calendar, KPIs</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">📚 <b>Library:</b> trainings & media</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">💬 <b>Living Room:</b> community</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">🧰 <b>Kitchen:</b> resources & tools</li>
            </ul>
          </div>
          <EmailKeyForm />
        </div>
      </section>
    </div>
  );
}

function Tile({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 hover:bg-white">
      <div className="text-xl font-semibold">{title}</div>
      <div className="mt-1 text-sm opacity-80">{subtitle}</div>
    </Link>
  );
}
