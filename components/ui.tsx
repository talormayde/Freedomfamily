import React from 'react';

export const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">{children}</div>
);

export const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-xl px-4 pb-28 md:pb-10 pt-6">{children}</div>
);

export const BigPill = ({ children, className = '', onClick }: any) => (
  <button
    onClick={onClick}
    className={`btn w-full rounded-[28px] px-6 py-5 text-lg ${className}`}
  >
    {children}
  </button>
);

export const Card = ({ children, className = '' }: any) => (
  <div className={`card ${className}`}>{children}</div>
);