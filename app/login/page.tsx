// app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const supa = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : `${window.location.origin}/auth/callback`;

    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100 dark:from-zinc-900 dark:to-zinc-950 px-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-black/5 dark:border-white/10 shadow-lg">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-center">
          Enter your email and we’ll send you a magic link.
        </p>

        {sent ? (
          <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-sm text-center">
            ✅ Check your inbox for the key.
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                placeholder="you@example.com"
              />
            </label>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700 disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Email me a link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
