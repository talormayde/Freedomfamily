// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import AppChrome from '@/components/AppChrome';

export const metadata: Metadata = {
  title: 'Freedom Family Hub',
  description: 'Member hub for the Freedom Family',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#0ea5e9',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/icons/icon-192.png',
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-screen text-zinc-900 dark:text-zinc-100 antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}