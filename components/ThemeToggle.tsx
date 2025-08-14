'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // initial: from localStorage or system
    const ls = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefers = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = ls ? ls === 'dark' : prefers;
    setDark(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {dark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}