import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Freedom Family Hub',
  description: 'Member hub',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-zinc-900 antialiased">
        {/* App frame */}
        <div className="mx-auto max-w-6xl px-4">
          {/* Top header (always visible) */}
          <header className="sticky top-0 z-40 backdrop-blur bg-white/50 border-b border-zinc-200/60">
            <div className="mx-auto max-w-6xl px-2 sm:px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <span className="inline-flex size-7 rounded-xl bg-sky-500/10 ring-1 ring-sky-200/70 items-center justify-center">🏠</span>
                <span>Freedom Family</span>
              </div>
              <nav className="hidden md:flex items-center gap-3 text-sm text-zinc-600">
                <a href="/" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100">Home</a>
                <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100">Study</a>
                <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100">Library</a>
                <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100">Living</a>
                <a href="#" className="px-3 py-1.5 rounded-xl hover:bg-zinc-100">Kitchen</a>
              </nav>
            </div>
          </header>

          {/* Content grid: sidebar on desktop, single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6 md:gap-8 py-6 md:py-10">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:block">
              <div className="sticky top-16 space-y-3">
                <a className="block rounded-2xl px-4 py-3 bg-white/80 border border-zinc-200 shadow-sm hover:shadow transition"
                   href="#">🧠 Study</a>
                <a className="block rounded-2xl px-4 py-3 bg-white/80 border border-zinc-200 shadow-sm hover:shadow transition"
                   href="#">📚 Library</a>
                <a className="block rounded-2xl px-4 py-3 bg-white/80 border border-zinc-200 shadow-sm hover:shadow transition"
                   href="#">💬 Living Room</a>
                <a className="block rounded-2xl px-4 py-3 bg-white/80 border border-zinc-200 shadow-sm hover:shadow transition"
                   href="#">🍳 Kitchen</a>
              </div>
            </aside>

            {/* Main */}
            <main className="min-w-0">
              {children}
            </main>
          </div>
        </div>

        {/* Bottom nav (mobile only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/70 bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-xl grid grid-cols-5 p-2 gap-2 text-xs">
            <a className="grid place-items-center rounded-xl py-2 bg-sky-100 text-sky-800" href="/">Home</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600" href="#">Study</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600" href="#">Library</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600" href="#">Living</a>
            <a className="grid place-items-center rounded-xl py-2 text-zinc-600" href="#">Kitchen</a>
          </div>
        </nav>
      </body>
    </html>
  );
}