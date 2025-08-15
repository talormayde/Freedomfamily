'use client';
import Link from 'next/link';
import { Card, Page } from '@/components/ui';
import SoftGuardBanner from '@/components/SoftGuardBanner';

export default function KitchenPage() {
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto w-full">
      <SoftGuardBanner />
 

export default function KitchenHome() {
  return (
    <Page>
      <h1>Kitchen</h1>
      <div className="mt-4 grid gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Meeting Recipes</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Event templates, run-of-show, checklists.</p>
            </div>
            <Link href="#" className="btn bg-sky-600 text-white">Open</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between opacity-90">
            <div>
              <h3 className="text-lg font-semibold">Assets & Flyers</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Shareables and downloadables.</p>
            </div>
            <span className="btn bg-zinc-100 dark:bg-zinc-800">Soon</span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
