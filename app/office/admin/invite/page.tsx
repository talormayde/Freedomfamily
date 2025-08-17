// app/office/admin/invite/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function InvitePage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const me = session?.user?.id ?? null;
      setUid(me);
      setSponsor(me || '');
    })();
  }, [supa]);

  if (!uid) return <div className="p-6">Please sign in.</div>;

  return (
    <div className="max-w-lg mx-auto p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50">
      <h1 className="text-2xl font-semibold">Invite New IBO</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This sends a secure invite email. The new IBO will complete onboarding; their sponsor will be set and lineage computed automatically.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="someone@email.com"
            type="email"
          />
        </label>

        <label className="text-sm">
          Sponsor (defaults to you)
          <input
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            value={sponsor}
            onChange={e=>setSponsor(e.target.value)}
            placeholder="sponsor user_id (UUID)"
          />
        </label>

        <button
          disabled={!email || !sponsor || busy}
          onClick={async ()=>{
            setBusy(true); setMsg(null);
            try {
              const res = await fetch('/api/invite', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, sponsor_id: sponsor })
              });
              const j = await res.json();
              if (!res.ok) throw new Error(j.error || 'Failed');
              setMsg('Invite sent!');
            } catch (e:any) {
              setMsg(e.message || 'Failed');
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send Invite'}
        </button>

        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
