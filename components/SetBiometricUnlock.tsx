// components/SetBiometricUnlock.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { isBiometricAvailable, setupBiometricVault, clearBiometricVault, unlockBiometricVault } from '@/lib/biometric-vault';

export default function SetBiometricUnlock() {
  const supa = supabaseBrowser();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setAvailable(await isBiometricAvailable());
      const probe = await unlockBiometricVault();
      setEnabled(probe !== null);
    })();
  }, []);

  if (!available) return null;

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50 p-4">
      <div className="font-medium">Quick Unlock</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
        Use Face ID / Touch ID to sign back in without email.
      </div>

      <div className="mt-3 flex gap-2">
        {enabled ? (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await clearBiometricVault();
              setEnabled(false);
              setBusy(false);
            }}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Disable
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { data: { session } } = await supa.auth.getSession();
              if (!session?.refresh_token) { alert('Sign in first, then enable.'); setBusy(false); return; }
              const ok = await setupBiometricVault(session.refresh_token);
              setEnabled(ok);
              setBusy(false);
            }}
            className="rounded-xl bg-sky-600 text-white px-3 py-2 hover:bg-sky-700"
          >
            Enable Face ID
          </button>
        )}
      </div>
    </div>
  );
}
