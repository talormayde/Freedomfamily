// components/SoftGuardBanner.tsx
'use client';

import Link from 'next/link';
import { useSession } from '@/lib/useSession';

export default function SoftGuardBanner() {
  const { loading, authed } = useSession();
  if (loading || authed) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Locked room</div>
          <div className="text-sm">Use your one-time key to enter. No passwords.</div>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-amber-600 text-white px-3 py-2 hover:bg-amber-700"
        >
          Get My Key
        </Link>
      </div>
    </div>
  );
}