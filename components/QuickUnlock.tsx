// components/QuickUnlock.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { unlockBiometricVault, isBiometricAvailable } from '@/lib/biometric-vault';

export default function QuickUnlock() {
  const supa = supabaseBrowser();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only render if Face ID / Touch ID is supported and we have a vault
    (async () => {
      if (!(await isBiometricAvailable())) return;
      const rt = await unlockBiometricVault(); // probe
      setVisible(!!rt);
    })();
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={async () => {
        setBusy(true);
        const rt = await unlockBiometricVault();
        if (!rt) { setBusy(false); alert('Biometric unlock is not set up yet.'); return; }
        const { data, error } = await supa.auth.refreshSession({ refresh_token: rt });
        setBusy(false);
        if (error || !data.session) { alert(error?.message || 'Could not restore session'); return; }
        window.location.href = '/office';
      }}
      className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      {busy ? 'Unlocking…' : 'Unlock with Face ID'}
    </button>
  );
}
