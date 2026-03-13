import React from 'react';

export function AuthBranding() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <img src="/borsa-logo.svg" alt="" width={48} height={48} className="w-12 h-12 shrink-0 object-contain" aria-hidden loading="lazy" />
        <h1 className="text-4xl font-bold tracking-tight mb-0">Borsa</h1>
      </div>
      <p className="text-[var(--text-muted)]">Stock Market Intelligence</p>
    </div>
  );
}
