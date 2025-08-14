'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Glass-door landing:
 * - Subtle “house” background composition behind a frosted glass door
 * - “I have a key” (email OTP) and “I need a key” (link to /living-room)
 * - Copy avoids “magic link” phrasing
 * - Mobile-friendly, accessible, keyboard-friendly
 */
export default function Home() {
  const supa = supabaseBrowser();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Freedom Family Hub';
    inputRef.current?.focus();
  }, []);

  async function getKey() {
    const email = inputRef.current?.value.trim() || '';
    if (!email) {
      alert('Enter your email to get your key.');
      inputRef.current?.focus();
      return;
    }
    try {
      setLoading(true);
      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setSentTo(email);
    } catch (e: any) {
      alert(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] grid place-items-center overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-50 bg-gradient-to-b from-sky-50 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-black" />

      {/* Faint “house” composition (rooms) behind the glass */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-40 opacity-70">
        <div className="mx-auto max-w-[1400px] h-full px-6 hidden md:grid grid-cols-[260px_minmax(0,1fr)] gap-8">
          {/* Sidebar blocks */}
          <div className="space-y-3 pt-24">
            <div className="h-20 rounded-2xl bg-zinc-200/40 dark:bg-zinc-800/40" />
            <div className="h-20 rounded-2xl bg-zinc-200/40 dark:bg-zinc-800/40" />
            <div className="h-20 rounded-2xl bg-zinc-200/40 dark:bg-zinc-800/40" />
            <div className="h-20 rounded-2xl bg-zinc-200/40 dark:bg-zinc-800/40" />
          </div>
          {/* Main grid blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-24">
            <div className="h-40 rounded-3xl bg-sky-200/40 dark:bg-sky-900/30" />
            <div className="h-40 rounded-3xl bg-emerald-200/40 dark:bg-emerald-900/30" />
            <div className="h-40 rounded-3xl bg-amber-200/40 dark:bg-amber-900/30" />
            <div className="h-40 rounded-3xl bg-fuchsia-200/40 dark:bg-fuchsia-900/30" />
            <div className="h-40 rounded-3xl bg-lime-200/40 dark:bg-lime-900/30" />
            <div className="h-40 rounded-3xl bg-indigo-200/40 dark:bg-indigo-900/30" />
          </div>
        </div>
      </div>

      {/* Glass door */}
      <section
        aria-label="Entrance"
        className="relative w-[92%] max-w-[980px] md:h-[560px] rounded-[32px] overflow-hidden"
      >
        {/* Door panel (frosted glass) */}
        <div className="absolute inset-0 backdrop-blur-xl bg-white/28 dark:bg-white/10 ring-1 ring-white/40 dark:ring-white/10 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.35)]" />

        {/* Door frame shadow accents */}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-black/5 dark:ring-white/5 rounded-[32px]" />
        <div className="absolute -inset-24 -z-10 bg-[radial-gradient(40%_60%_at_20%_20%,rgba(14,165,233,.20),transparent),radial-gradient(40%_60%_at_80%_80%,rgba(16,185,129,.20),transparent)]" />

        {/* Content split: left = welcome, right = controls */}
        <div className="relative grid md:grid-cols-2 h-full">
          {/* Left: brand + copy, sits “behind” the glass */}
          <div className="hidden md:flex flex-col justify-center gap-4 px-10">
            <div className="inline-flex size-16 rounded-2xl bg-white/60 dark:bg-white/10 ring-1 ring-white/60 items-center justify-center text-3xl">
              🔑
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome to the House
            </h1>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              A member hub for the Freedom Family. This is a glass-house operation — you can
              glimpse the rooms behind the door, but you’ll need your key to step inside.
            </p>
          </div>

          {/* Right: door controls */}
          <div className="relative flex items-center">
            {/* Handle (visual flourish only) */}
            <div
              aria-hidden
              className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block"
            >
              <div className="h-24 w-2 rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400 dark:from-zinc-600 dark:to-zinc-500" />
              <div className="mt-2 size-4 rounded-full bg-zinc-500/60" />
            </div>

            <div className="w-full px-6 py-10 md:px-10 lg:px-14 lg:py-16">
              {!sentTo ? (
                <div className="max-w-md">
                  <h2 className="text-2xl font-semibold">I already have a key</h2>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    Enter your email to receive your one-time key.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <label className="form-field">
                      <span className="form-label">Email</span>
                      <input
                        ref={inputRef}
                        type="email"
                        inputMode="email"
                        placeholder="you@domain.com"
                        className="form-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') getKey();
                        }}
                      />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <button
                        onClick={getKey}
                        disabled={loading}
                        className="rounded-2xl py-3 font-semibold bg-sky-600 text-white disabled:opacity-50"
                        aria-label="Send key to email"
                      >
                        {loading ? 'Sending…' : 'Send My Key'}
                      </button>

                      <a
                        href="/living-room"
                        className="rounded-2xl py-3 font-semibold grid place-items-center bg-amber-500/90 hover:bg-amber-500 text-white"
                        aria-label="I need a key"
                      >
                        I Need a Key
                      </a>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                      By continuing, you agree to receive a one-time sign-in key at the email
                      above.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-md">
                  <h2 className="text-2xl font-semibold">Check your inbox</h2>
                  <p className="mt-2">
                    We sent a one-time key to <b>{sentTo}</b>. Use it to unlock the door.
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                    Didn’t see it? Check spam, or try again with a different email.
                  </p>
                  <button
                    onClick={() => {
                      setSentTo(null);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="mt-4 rounded-xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    Use a different email
                  </button>
                </div>
              )}

              {/* Secondary section: “what’s inside” */}
              <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl px-4 py-3 bg-white/50 dark:bg-white/5 ring-1 ring-white/50">
                  💼 Office: CRM, calendar, KPIs
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white/50 dark:bg.white/5 ring-1 ring-white/50 dark:ring-white/10">
                  📚 Library: trainings & media
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white/50 dark:bg-white/5 ring-1 ring-white/50 dark:ring-white/10">
                  💬 Living Room: community
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white/50 dark:bg-white/5 ring-1 ring-white/50 dark:ring-white/10">
                  🍳 Kitchen: resources & tools
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle corner glows */}
      <div aria-hidden className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-900/30" />
      <div aria-hidden className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-900/30" />
    </div>
  );
}