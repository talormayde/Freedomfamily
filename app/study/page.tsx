'use client';
import Link from 'next/link';
import { Card, Page } from '@/components/ui';

export default function OfficeHome() {
  return (
    <Page>
      <h1>Office</h1>
      <div className="mt-4 grid gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">List Builder</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Prospects, pipeline, and follow-ups.</p>
            </div>
            <Link href="/office/list-builder" className="btn bg-sky-600 text-white">Open</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between opacity-70">
            <div>
              <h3 className="text-lg font-semibold">KPI Tracker</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Daily QIs, STPs, Guests, PV — coming soon.</p>
            </div>
            <span className="btn bg-zinc-100 dark:bg-zinc-800">Soon</span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
