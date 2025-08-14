import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Freedom Family Hub',
  description: 'Member hub for the Freedom Family',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#0ea5e9',
  // Using a static manifest in /public
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/icons/icon-192.png',
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen text-zinc-900 dark:text-zinc-100 antialiased">
        {/* App frame */}
        <div className="mx-auto max-w-6xl px-4">
          {/* Top header */}
          <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-zinc-900/60 border-b border-zinc-200/60 dark:border-zinc-800/70">
            <div className="mx-auto max-w-6xl px-2 sm:px-4 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2 font-semibold">
                <span className="inline-flex size-7 rounded-xl bg-sky-500/10 ring-1 ring-sky-200/70 items-center justify-center">
                  🏠
                </span>
                <span>Freedom Family</span>
              </a>

              <div className="flex items-center gap-3">
                <nav className="hidden md:flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <a href="/" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Home</a>
                  <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Office</a>
                  <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Library</a>
                  <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Living</a>
                  <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">Kitchen</a>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Content grid: sidebar on desktop, single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6 md:gap-8 py-6 md:py-10">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:block">
              <div className="sticky top-16 space-y-3">
                <a className="block rounded-2xl px-4 py-3 card" href="#">💼 Office</a>
                <a className="block rounded-2xl px-4 py-3 card" href="#">📚 Library</a>
                <a className="block rounded-2xl px-4 py-3 card" href="#">💬 Living Room</a>
                <a className="block rounded-2xl px-4 py-3 card" href="#">🍳 Kitchen</a>
              </div>
            </aside>

            {/* Main content */}
            <main className="min-w-0">{children}</main>
          </div>
        </div>

        {/* Bottom nav (mobile only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-900/80 backdrop-blur">
          <div className="mx-auto max-w-xl grid grid-cols-5 p-2 gap-2 text-xs">
            <a className="grid place-items-center rounded-xl py-2 bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" href="/">Home</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="#">Office</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="#">Library</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="#">Living</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600 dark:text-zinc-300" href="#">Kitchen</a>
          </div>
        </nav>
      </body>
    </html>
  );
}