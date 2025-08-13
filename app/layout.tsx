import './globals.css';
import { ReactNode } from 'react';

export const metadata = { title: 'Freedom Family Hub', description: 'Member hub' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
