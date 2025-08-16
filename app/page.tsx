// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    const supa = supabaseBrowser();
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);

      const { data: sub } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      // cleanup
      return () => sub.subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []);

  async function sendKey(e: React.FormEvent) {
    e.preventDefault();
    const supa = supabaseBrowser();
    // Use current origin so previews & prod both work
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      alert(`Couldn’t send key: ${error.message}`);
    } else {
      alert('Key sent! Check your inbox.');
    }
  }
test
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
      {/* Glass door hero visible only when NOT authed */}
      {!authed && (
        <div
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mt-6 md:mt-10"
          style={{ background: 'linear-gradient(135deg, rgba(180,245,200,.55), rgba(180,220,255,.55))' }}
        >
          <div className="absolute inset-0 backdrop-blur-md pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/70 grid place-items-center shadow-sm mb-4">🔑</div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome to the House</h1>
              <p className="mt-3 text-zinc-700">
                This is a glass-house operation — you can glimpse the rooms behind the door,
                but you’ll need your key to step inside.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3">
                <li className="rounded-xl bg-white/70 px-3 py-2 text-sm">🏢 <b>Office</b>: CRM, calendar, KPIs</li>
                <li className="rounded-xl bg-white/70 px-3 py-2 text-sm">📚 <b>Library</b>: trainings & media</li>
                <li className="rounded-xl bg-white/70 px-3 py-2 text-sm">💬 <b>Living Room</b>: community</li>
                <li className="rounded-xl bg-white/70 px-3 py-2 text-sm">🧰 <b>Kitchen</b>: resources & tools</li>
              </ul>
            </div>

            {/* Key request card (brand language, no “magic link”) */}
            <div className="rounded-2xl bg-white/80 p-4 sm:p-6 shadow-xl relative z-10">
              <h2 className="font-semibold text-lg">I already have a key</h2>
              <p className="text-sm text-zinc-600">Enter your email and we’ll send your one-time key.</p>
              <form className="mt-3 space-y-3" onSubmit={sendKey}>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 text-white font-medium px-4 py-2 hover:bg-sky-700"
                  >
                    <span>🔑</span> <span>Send My Key</span>
                  </button>
                  <Link
                    href="/about-key"
                    className="inline-flex items-center justify-center rounded-xl bg-amber-500/90 text-white font-medium px-4 py-2 hover:bg-amber-600"
                  >
                    I Need a Key
                  </Link>
                </div>
                <p className="text-xs text-zinc-500">One-time key only. No passwords to remember.</p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rooms grid — always visible (“glass house” glimpse) */}
      <div className="grid md:grid-cols-2 gap-6 mt-8 relative z-10">
        <Link href="/office" className="block rounded-2xl bg-white/80 p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold text-lg">Office</div>
          <div className="text-sm text-zinc-600">CRM, Calendar, KPIs</div>
        </Link>
        <Link href="/library" className="block rounded-2xl bg-white/80 p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold text-lg">Library</div>
          <div className="text-sm text-zinc-600">Trainings & Media</div>
        </Link>
        <Link href="/living" className="block rounded-2xl bg-white/80 p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold text-lg">Living Room</div>
          <div className="text-sm text-zinc-600">Community</div>
        </Link>
        <Link href="/kitchen" className="block rounded-2xl bg-white/80 p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold text-lg">Kitchen</div>
          <div className="text-sm text-zinc-600">Resources & Tools</div>
        </Link>
      </div>
    </div>
  );
}
