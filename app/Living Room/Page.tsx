
'use client';
import Link from 'next/link';
import { Card, Page } from '@/components/ui';

export default function LivingRoomHome() {
  return (
    <Page>
      <h1>Living Room</h1>
      <div className="mt-4 grid gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Announcements</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Recognition, wins, and team updates.</p>
            </div>
            <Link href="#" className="btn bg-sky-600 text-white">Open</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between opacity-90">
            <div>
              <h3 className="text-lg font-semibold">Community Chat</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Hang out and help each other.</p>
            </div>
            <span className="btn bg-zinc-100 dark:bg-zinc-800">Soon</span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
