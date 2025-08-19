// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function HomePage() {
  const supa = supabaseBrowser();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (alive && session) window.location.replace('/living');
    })();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, s) => {
      if (s) window.location.replace('/living');
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [supa]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const redirect = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + '/auth/callback';
    const { error } = await supa.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip
      bg-[radial-gradient(60rem_40rem_at_-20%_-10%,rgba(59,130,246,0.18),transparent_50%),radial-gradient(70rem_50rem_at_110%_0%,rgba(14,165,233,0.16),transparent_55%),linear-gradient(to_bottom,rgba(240,249,255,1),rgba(224,242,254,0.9))]
      dark:bg-[radial-gradient(60rem_40rem_at_-20%_-10%,rgba(59,130,246,0.10),transparent_50%),radial-gradient(70rem_50rem_at_110%_0%,rgba(14,165,233,0.10),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,1),rgba(9,9,11,1))]">
      <div className="pointer-events-none absolute -top-40 -left-28 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-sky-300/40 to-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-gradient-to-tr from-cyan-300/35 to-blue-400/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(85%_70%_at_50%_35%,black,transparent)] bg-[conic-gradient(from_210deg_at_70%_12%,rgba(255,255,255,0.28),rgba(255,255,255,0)_32%)]" />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="group relative grid gap-10 rounded-[28px] border border-white/50 dark:border-white/10 bg-white/35 dark:bg-white/10 backdrop-blur-2xl shadow-[0_10px_50px_rgba(2,132,199,0.18)] ring-1 ring-black/5 p-6 sm:p-10">
          <span className="pointer-events-none absolute -top-1 left-6 h-[3px] w-40 rounded-full bg-white/60 blur-[1.5px]" />
          <span className="pointer-events-none absolute -top-1 right-6 h-[3px] w-24 rounded-full bg-white/60 blur-[1.5px]" />
          <span className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]" />
          <span className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden">
            <span className="block h-full w-[180%] -translate-x-[60%] opacity-0 group-hover:opacity-100 animate-[sheen_2.4s_ease-in-out_infinite] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.25)_12%,rgba(255,255,255,0.4)_20%,rgba(255,255,255,0.0)_32%)]" />
          </span>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200/70 text-amber-800 shadow-[0_4px_16px_rgba(251,191,36,0.45)] ring-1 ring-black/5">
                🔑
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Welcome to The House
              </h1>
              <p className="mt-2 text-lg text-zinc-700/90 dark:text-zinc-300/90 italic">
                “Where you can belong before you behave.”
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-2xl bg-white/70 dark:bg-white/10 px-3 py-1.5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"><span className="font-semibold">Office</span>: CRM, calendar, KPIs</span>
                <span className="rounded-2xl bg-white/70 dark:bg-white/10 px-3 py-1.5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"><span className="font-semibold">Library</span>: trainings &amp; media</span>
                <span className="rounded-2xl bg-white/70 dark:bg-white/10 px-3 py-1.5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"><span className="font-semibold">Living Room</span>: community</span>
                <span className="rounded-2xl bg-white/70 dark:bg-white/10 px-3 py-1.5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"><span className="font-semibold">Kitchen</span>: resources &amp; tools</span>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/60 dark:border-white/10 bg-white/65 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                I already have a key
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Enter your email and we’ll send a one-time link.
              </p>
              {sent ? (
                <div className="mt-4 rounded-xl border border-white/70 dark:border-white/10 bg-white/70 dark:bg-white/10 p-3 text-sm text-zinc-700 dark:text-zinc-300 shadow-inner">
                  ✅ Link sent. Check your inbox.
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@domain.com" className="h-11 rounded-xl border border-white/60 dark:border-white/10 bg-white/85 dark:bg-white/10 px-3 text-zinc-900 dark:text-white placeholder-zinc-400 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-400/60" />
                  <button type="submit" disabled={busy} className="h-11 rounded-xl bg-sky-600 text-white px-4 shadow-[0_6px_20px_rgba(2,132,199,0.40)] hover:bg-sky-700 disabled:opacity-60">
                    {busy ? 'Sending…' : 'Send My Key'}
                  </button>
                </form>
              )}
              {err && <div className="mt-2 text-sm text-red-600 bg-white/70 dark:bg-white/10 rounded-xl p-2 border border-red-300/50 dark:border-red-400/20">{err}</div>}
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">One-time key only. No passwords to remember.</p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes sheen {
            0% { transform: translateX(-60%); opacity: 0; }
            12% { opacity: .55; }
            50% { transform: translateX(10%); opacity: .35; }
            100% { transform: translateX(60%); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
