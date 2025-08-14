'use client';
import { useEffect, useState } from 'react';
import { BigPill, Card, Page } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { KeyRound, LogIn, Sparkles, Calendar } from 'lucide-react';

export default function HomePage() {
  const [view, setView] = useState<'welcome' | 'login' | 'mudroom'>('welcome');
  const [email, setEmail] = useState('');
  const supa = supabaseBrowser();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (session) setView('mudroom');
    };
    run();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, session) => {
      if (session) setView('mudroom');
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async () => {
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined }
    });
    if (error) alert(error.message);
    else alert('Magic link sent. Check your email.');
  };

  return (
    <div>
      {view === 'welcome' && (
        <Page>
          <div className="mt-10 md:mt-14 grid gap-4 md:gap-6">
            <BigPill onClick={() => setView('login')} className="bg-sky-200 hover:bg-sky-300 text-sky-900 shadow-sky-200/80 flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5" />I Already Have A Key
            </BigPill>
            <BigPill onClick={() => setView('login')} className="bg-amber-200 hover:bg-amber-300 text-amber-900 shadow-amber-200/80 rotate-[-2deg]">
              I Need A Key
            </BigPill>
          </div>
        </Page>
      )}

      {view === 'login' && (
        <Page>
          <button onClick={() => setView('welcome')} className="text-sky-700">← Back</button>
          <h1 className="mt-2">Welcome</h1>
          <p className="mt-1 text-zinc-600">Enter your email to receive a magic-link.</p>
          <div className="mt-6 grid gap-3">
            <input
              className="w-full rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button onClick={signIn} className="btn bg-sky-600 text-white">
              <LogIn className="w-4 h-4" /> Send Link
            </button>
          </div>
          <div className="mt-10 grid place-items-center">
            <div className="rounded-2xl bg-sky-100 px-4 py-3 text-sky-900 shadow">
              After you click the magic link in your email, you’ll land back here and enter automatically.
            </div>
          </div>
        </Page>
      )}

      {view === 'mudroom' && (
        <Page>
          <h1>Make Yourself At Home</h1>
          <Card className="mt-4">
            <h3 className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" /> Recognition
            </h3>
            <div className="mt-4 grid gap-4">
              {[
                'Talor & Vivian Just Qualified Ruby!',
                'Paul & Liz Started Platinum Qualification!',
                'Sterling & Brooke Are Expecting!'
              ].map((a, i) => (
                <div key={i} className="border-t first:border-t-0 border-dashed border-sky-300/70 pt-4 first:pt-0">
                  {a}
                </div>
              ))}
            </div>
          </Card>

          {/* Tiles — 2 cols on mobile / 4 on desktop */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">

						<a href="/study/list-builder" className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-lime-200 to-lime-300 text-zinc-800 font-semibold grid place-items-center">Study</a>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-amber-200 to-amber-300 text-zinc-800 font-semibold">Library</button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-rose-200 to-rose-300 text-zinc-800 font-semibold">Living</button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-fuchsia-200 to-fuchsia-300 text-zinc-800 font-semibold">Kitchen</button>
            <button className="col-span-2 lg:col-span-4 h-28 rounded-[28px] grid place-items-center bg-sky-100 text-sky-800 font-semibold">
              <Calendar className="w-5 h-5" /> Calendar
            </button>
          </div>
        </Page>
      )}
    </div>
  );
}