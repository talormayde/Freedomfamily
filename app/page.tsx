'use client';
import { useState } from 'react';
import { BigPill, Card, Page } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { KeyRound, LogIn, Sparkles, Calendar } from 'lucide-react';

export default function HomePage() {
  const [view, setView] = useState<'welcome' | 'login' | 'mudroom'>('welcome');
  const [email, setEmail] = useState('');

  const signIn = async () => {
    const supa = supabaseBrowser();
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
          <div className="mt-14 grid gap-6">
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
          <h1 className="mt-2 text-2xl font-semibold">Welcome</h1>
          <p className="mt-1 text-zinc-600">Enter your email to receive a magic-link.</p>
          <div className="mt-6 grid gap-3">
            <input
              className="w-full rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button
              onClick={signIn}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold bg-sky-600 text-white"
            >
              <LogIn className="w-4 h-4" />Send Link
            </button>
          </div>
          <div className="mt-10 grid place-items-center">
            <div className="rounded-2xl bg-sky-100 px-4 py-3 text-sky-900 shadow">
              Demo mode: we’ll wire protected pages next.
            </div>
          </div>
        </Page>
      )}
      {view === 'mudroom' && (
        <Page>
          <h1 className="text-3xl font-semibold text-sky-800">Make Yourself At Home</h1>
          <Card className="mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />Recognition
            </h3>
            <div className="mt-4 grid gap-4">
              {['Talor & Vivian Just Qualified Ruby!', 'Paul & Liz Started Platinum Qualification!', 'Sterling & Brooke Are Expecting!'].map((a, i) => (
                <div key={i} className="border-t first:border-t-0 border-dashed border-sky-300/70 pt-4 first:pt-0">
                  {a}
                </div>
              ))}
            </div>
          </Card>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-lime-200 to-lime-300 text-zinc-800 font-semibold">Study</button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-amber-200 to-amber-300 text-zinc-800 font-semibold">Library</button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-rose-200 to-rose-300 text-zinc-800 font-semibold">Living</button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-fuchsia-200 to-fuchsia-300 text-zinc-800 font-semibold">Kitchen</button>
            <button className="col-span-2 h-28 rounded-[28px] grid place-items-center bg-sky-100 text-sky-800 font-semibold">
              <Calendar className="w-5 h-5" /> Calendar
            </button>
          </div>
        </Page>
      )}
    </div>
  );
}
