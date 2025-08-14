'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card } from '@/components/ui';

export default function Home() {
  const supa = supabaseBrowser();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Freedom Family Hub';
  }, []);

  async function requestKey(identity: string) {
    setLoading(true);
    setSentTo(null);
    try {
      const trimmed = identity.trim();
      if (!trimmed) throw new Error('Enter email or phone');
      if (trimmed.includes('@')) {
        const { error } = await supa.auth.signInWithOtp({ email: trimmed, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
      } else {
        // treat as phone (E.164 recommended, e.g., +12125551234)
        const { error } = await supa.auth.signInWithOtp({ phone: trimmed });
        if (error) throw error;
      }
      setSentTo(trimmed);
    } catch (e: any) {
      alert(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] grid place-items-center overflow-hidden">
      {/* Housey background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 to-white dark:from-zinc-900 dark:to-zinc-950" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/30" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/30" />

      {/* Glass door */}
      <div className="w-[90%] max-w-xl rounded-[28px] bg-white/30 dark:bg-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-white/40 dark:ring-white/10 p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 size-14 rounded-2xl bg-white/50 dark:bg-white/10 ring-1 ring-white/60 grid place-items-center">🚪</div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome to the House</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Members only. Grab your key and come on in.</p>
        </div>

        <div className="mt-6 grid gap-3">
          {!sentTo ? (
            <>
              <input
                placeholder="Email or phone (e.g. you@site.com or +12125551234)"
                className="form-input"
                inputMode="email"
                onKeyDown={(e) => { if (e.key === 'Enter') requestKey((e.target as HTMLInputElement).value); }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('input[placeholder^="Email or phone"]');
                    if (el) requestKey(el.value);
                  }}
                  disabled={loading}
                  className="rounded-2xl py-3 font-semibold bg-sky-600 text-white disabled:opacity-50"
                >
                  I Have a Key
                </button>
                <a href="/living-room" className="rounded-2xl py-3 font-semibold bg-amber-500/90 text-white grid place-items-center">
                  I Need a Key
                </a>
              </div>
            </>
          ) : (
            <Card className="text-center">
              <div className="text-2xl">🔑</div>
              <p className="mt-2">We sent a one-time key to <b>{sentTo}</b>.</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Use the link or code to enter. Didn’t get it? Check spam or try again.</p>
              <button onClick={() => setSentTo(null)} className="mt-3 rounded-xl px-4 py-2 bg-zinc-100 dark:bg-zinc-800">Use a different address</button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}