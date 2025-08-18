'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { unlockBiometricVault, isBiometricAvailable, hasVault } from '@/lib/biometric-vault';

export default function QuickUnlock() {
  const supa = supabaseBrowser();
  const [canUse, setCanUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setCanUse(isBiometricAvailable() && hasVault());
  }, []);

  async function doUnlock() {
    setBusy(true);
    try {
      const secret = await unlockBiometricVault();
      // If you later store a refresh_token, you could call supa.auth.setSession({ ... })
      // For now, this serves as a “fast unlock” check & future hook.
      console.log('Unlocked secret (preview):', secret.slice(0, 8) + '…');
      setOk(true);
    } catch (e: any) {
      alert(e?.message || 'Unlock failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!canUse) return null;

  return (
    <button
      onClick={doUnlock}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white px-3 py-2 text-sm dark:bg-white dark:text-zinc-900"
      title="Unlock with biometrics"
    >
      {ok ? 'Unlocked ✓' : busy ? 'Unlocking…' : 'Quick Unlock'}
    </button>
  );
}
