import React from 'react';

export const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">{children}</div>
);

export const BigPill = ({ children, className = '', onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full rounded-[28px] px-6 py-5 text-lg font-semibold shadow-sm hover:shadow-md active:translate-y-[1px] transition-all ${className}`}
  >
    {children}
  </button>
);

export const Card = ({ children, className = '' }: any) => (
  <div
    className={`rounded-3xl border border-zinc-100/60 bg-white/80 backdrop-blur p-6 shadow-sm ${className}`}
  >
    {children}
  </div>
);
