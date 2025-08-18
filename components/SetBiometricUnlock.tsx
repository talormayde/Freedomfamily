// components/SetBiometricUnlock.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  isBiometricAvailable,
  hasVault,
  setupBiometricVault,
  clearBiometricVault,
  unlockBiometricVault,
} from '@/lib/biometric-vault';

export default function SetBiometricUnlock() {
  const supa = supabaseBrowser();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAvailable(isBiometricAvailable());
    setEnabled(hasVault());
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const { data: { session } } = await supa.auth.getSession();
      if (!session?.refresh_token) {
        alert('Sign in first, then enable.');
        return;
      }
      const ok = await setupBiometricVault(session.refresh_token);
      setEnabled(!!ok); // ok is true from the lib
    } catch (e: any) {
      alert(e?.message || 'Failed to enable Quick Unlock.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      clearBiometricVault();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  async function testUnlock() {
    try {
      await unlockBiometricVault();
      alert('Quick Unlock works on this device ✅');
    } catch (e: any) {
      alert(e?.message || 'Unlock failed.');
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Quick Unlock (Face/Touch ID)</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {available
              ? 'Use your device biometrics to unlock without re-requesting a key.'
              : 'Biometrics not available on this device/browser.'}
          </div>
        </div>

        {enabled ? (
          <button
            onClick={disable}
            disabled={busy}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Disable
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={!available || busy}
            className="rounded-xl bg-sky-600 text-white px-3 py-2 text-sm hover:bg-sky-700 disabled:opacity-50"
          >
            Enable
          </button>
        )}
      </div>

      {enabled && (
        <div className="mt-3">
          <button onClick={testUnlock} className="text-xs underline text-zinc-600 dark:text-zinc-400">
            Test unlock on this device
          </button>
        </div>
      )}
    </div>
  );
}
