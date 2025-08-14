'use client';
import Link from 'next/link';
import { Card, Page } from '@/components/ui';

export default function LibraryHome() {
  return (
    <Page>
      <h1>Library</h1>
      <div className="mt-4 grid gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Training Videos</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Watch, rewatch, and track progress.</p>
            </div>
            <Link href="#" className="btn bg-sky-600 text-white">Open</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between opacity-90">
            <div>
              <h3 className="text-lg font-semibold">Playbooks</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Scripts, tools, and best practices.</p>
            </div>
            <span className="btn bg-zinc-100 dark:bg-zinc-800">Soon</span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
