'use client';
import { useEffect, useState } from 'react';
import { BigPill, Card, Page } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { KeyRound, Sparkles, Calendar } from 'lucide-react';

export default function HomePage() {
  const [view, setView] = useState<'welcome' | 'login' | 'mudroom'>('welcome');
  const [email, setEmail] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [sending, setSending] = useState(false);
  const supa = supabaseBrowser();

  // Detect existing session & react to auth changes
  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (session) setView('mudroom');
    };
    run();

    const { data: { subscription } } = supa.auth.onAuthStateChange((_event, session) => {
      if (session) setView('mudroom');
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendKey = async () => {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: {
        // after tapping the email key, bring them back to the site
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      },
    });
    setSending(false);
    if (error) {
      // brand-aligned error toast
      setShowKeyModal(true);
    } else {
      // show our custom "key" popup instead of a generic alert
      setShowKeyModal(true);
    }
  };

  return (
    <div>
      {view === 'welcome' && (
        <Page>
          <div className="mt-10 md:mt-14 grid gap-4 md:gap-6">
            <BigPill
              onClick={() => setView('login')}
              className="bg-sky-200 hover:bg-sky-300 text-sky-900 shadow-sky-200/80 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-5 h-5" />
              I Already Have A Key
            </BigPill>
            <BigPill
              onClick={() => setView('login')}
              className="bg-amber-200 hover:bg-amber-300 text-amber-900 shadow-amber-200/80 rotate-[-2deg]"
            >
              I Need A Key
            </BigPill>
          </div>
        </Page>
      )}

      {view === 'login' && (
        <Page>
          <button onClick={() => setView('welcome')} className="text-sky-700">
            ← Back
          </button>
          <h1 className="mt-2">Welcome</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Drop your email and we’ll send you a <span className="font-semibold">one‑time key</span> to the house.
          </p>

          <div className="mt-6 grid gap-3">
            <input
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              inputMode="email"
            />
            <button
              onClick={sendKey}
              disabled={sending}
              className="btn bg-sky-600 text-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" /> {sending ? 'Sending…' : 'Send Key'}
            </button>
          </div>

          <div className="mt-10 grid place-items-center">
            <div className="rounded-2xl bg-sky-100 dark:bg-zinc-800 px-4 py-3 text-sky-900 dark:text-zinc-100 shadow">
              Watch your inbox for the key. Tap it to step inside.
            </div>
          </div>

          {/* Key-shaped popup */}
          {showKeyModal && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowKeyModal(false)}>
              <div className="w-full max-w-sm rounded-[28px] border border-sky-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-sky-200 via-sky-300 to-sky-200 dark:from-sky-900/40 dark:via-sky-800/50 dark:to-sky-900/40 px-6 py-6">
                  <div className="mx-auto grid place-items-center size-16 rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow">
                    <KeyRound className="w-8 h-8 text-sky-600" />
                  </div>
                </div>
                <div className="px-6 py-5">
                  <h3 className="text-lg font-semibold">Your key is on the way</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    We just sent a one‑time key to <span className="font-medium">{email || 'your email'}</span>. Open it on this device to unlock the house.
                  </p>
                  <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Didn’t see it? Check spam or try again.
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setShowKeyModal(false)} className="btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Got it</button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                <div
                  key={i}
                  className="border-t first:border-t-0 border-dashed border-sky-300/70 dark:border-zinc-800/70 pt-4 first:pt-0"
                >
                  {a}
                </div>
              ))}
            </div>
          </Card>

          {/* Tiles — Office now links to /office (index) */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/office"
              className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-lime-200 to-lime-300 text-zinc-800 font-semibold grid place-items-center"
            >
              Office
            </a>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-amber-200 to-amber-300 text-zinc-800 font-semibold">
              Library
            </button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-rose-200 to-rose-300 text-zinc-800 font-semibold">
              Living
            </button>
            <button className="aspect-square w-full rounded-[28px] bg-gradient-to-b from-fuchsia-200 to-fuchsia-300 text-zinc-800 font-semibold">
              Kitchen
            </button>
            <button className="col-span-2 lg:col-span-4 h-28 rounded-[28px] grid place-items-center bg-sky-100 dark:bg-zinc-900 text-sky-800 dark:text-sky-200 font-semibold">
              <Calendar className="w-5 h-5" /> Calendar
            </button>
          </div>
        </Page>
      )}
    </div>
  );
}
