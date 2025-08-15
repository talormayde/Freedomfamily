// app/office/outreach/sequence/page.tsx
import { Suspense } from 'react';
import SequenceClient from './SequenceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500">Loading…</div>}>
      <SequenceClient />
    </Suspense>
  );
}
