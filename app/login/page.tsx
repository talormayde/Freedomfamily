// app/login/page.tsx
import Link from 'next/link';
import QuickUnlock from '@/components/QuickUnlock';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Server wrapper; UI is static here so we can keep it SSR-friendly.
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[900px] mx-auto w-full">
      <div className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50 p-6">
        <h1 className="text-2xl font-semibold">Welcome to Freedom Family</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sign in with your magic link, or quickly unlock if you’ve enabled Face ID / Touch ID.
        </p>

        <div className="mt-4 grid gap-3 sm:flex sm:items-center">
          {/* Your existing “Get a key” link/button */}
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900"
          >
            Get a key
          </Link>

          {/* New: Face ID / Touch ID quick unlock */}
          <QuickUnlock />
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Having trouble?{' '}
          <a href="mailto:support@freefam.casa" className="underline">Contact support</a>.
        </div>
      </div>
    </div>
  );
}
