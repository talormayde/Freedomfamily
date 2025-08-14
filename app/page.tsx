import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Freedom Family — Home',
};

export default async function HomePage() {
  const supa = supabaseServer();
  const { data: { session } } = await supa.auth.getSession();
  const authed = !!session;

  if (authed) {
    // Show the rooms right away (no login panel)
    return (
      <div className="w-full">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/office" className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 hover:bg-white">
            <div className="text-xl font-semibold">Office</div>
            <div className="mt-1 text-sm opacity-80">CRM, Calendar, KPIs</div>
          </Link>
          <Link href="/calendar" className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 hover:bg-white">
            <div className="text-xl font-semibold">Calendar</div>
            <div className="mt-1 text-sm opacity-80">Daily • Weekly • Monthly</div>
          </Link>
          <Link href="/library" className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 hover:bg-white">
            <div className="text-xl font-semibold">Library</div>
            <div className="mt-1 text-sm opacity-80">Trainings & media</div>
          </Link>
          <Link href="/living" className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 hover:bg-white">
            <div className="text-xl font-semibold">Living Room</div>
            <div className="mt-1 text-sm opacity-80">Community</div>
          </Link>
        </div>
      </div>
    );
  }

  // Not authed → “glass door” hero + key request
  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-zinc-900/60 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-10">
        {/* subtle blurred house shapes */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-10 left-6 h-40 w-72 rounded-3xl bg-sky-200/40 blur-2xl" />
          <div className="absolute top-10 right-10 h-40 w-80 rounded-3xl bg-teal-200/40 blur-2xl" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 text-xl">🔑</div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome to the House</h1>
            <p className="mt-3 max-w-[52ch] text-zinc-600 dark:text-zinc-300">
              A member hub for the Freedom Family. This is a glass-house operation—peek through the door,
              but you’ll need your key to step inside.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">🏢 <b>Office:</b> CRM, calendar, KPIs</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">📚 <b>Library:</b> trainings & media</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">💬 <b>Living Room:</b> community</li>
              <li className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow px-3 py-2">🧰 <b>Kitchen:</b> resources & tools</li>
            </ul>
          </div>

          <KeyPanel />
        </div>
      </section>
    </div>
  );
}

function KeyPanel() {
  return (
    <form
      action="/api/auth/send-key"
      method="post"
      className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 ring-1 ring-black/5 dark:ring-white/10"
    >
      <div className="text-xl font-semibold mb-2">I already have a key</div>
      <label className="block text-sm opacity-80 mb-1">Email</label>
      <input
        name="email"
        type="email"
        required
        placeholder="you@domain.com"
        className="w-full rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 mb-3"
      />
      <div className="flex gap-3">
        <button className="rounded-xl bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">Send My Key</button>
        <Link href="/request-access" className="rounded-xl bg-amber-400 text-zinc-900 px-4 py-2 font-medium hover:bg-amber-500">
          I Need a Key
        </Link>
      </div>
      <p className="mt-3 text-xs opacity-70">
        We’ll email you a one-time sign-in key. No passwords.
      </p>
    </form>
  );
}