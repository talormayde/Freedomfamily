'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function EmailKeyForm() {
  const supa = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  async function sendKey(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMsg('');
    try {
      const redirectTo =
        `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;

      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });

      if (error) throw error;
      setStatus('sent');
      setMsg('Your key is on the way. Check your inbox.');
    } catch (err: any) {
      setStatus('error');
      setMsg(err?.message || 'Something went wrong sending your key.');
    }
  }

  return (
    <form onSubmit={sendKey}
      className="rounded-3xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 ring-1 ring-black/5 dark:ring-white/10">
      <div className="text-xl font-semibold mb-2">I already have a key</div>

      <label className="block text-sm opacity-80 mb-1">Email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        placeholder="you@domain.com"
        className="w-full rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 mb-3"
      />

      <div className="flex gap-3">
        <button
          disabled={status==='sending' || !email}
          className="rounded-xl bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700 disabled:opacity-60">
          {status==='sending' ? 'Sending…' : 'Send My Key'}
        </button>

        <a
          href="/request-access"
          className="rounded-xl bg-amber-400 text-zinc-900 px-4 py-2 font-medium hover:bg-amber-500">
          I Need a Key
        </a>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${status==='error' ? 'text-red-600' : 'opacity-70'}`}>{msg}</p>
      )}
      {status==='sent' && (
        <p className="mt-1 text-xs opacity-60">
          Tip: search for “Freedom Family key” if you don’t see it right away.
        </p>
      )}
    </form>
  );
}
