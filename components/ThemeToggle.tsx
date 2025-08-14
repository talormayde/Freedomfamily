'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // load initial
    const initial = window.matchMedia?.('(prefers-color-scheme: dark)').matches ||
      localStorage.getItem('ff-theme') === 'dark';
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('ff-theme', next ? 'dark' : 'light');
  };

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      title={dark ? 'Switch to light' : 'Switch to dark'}
    >
      {dark ? '🌙' : '☀️'}
    </button>
  );
}
