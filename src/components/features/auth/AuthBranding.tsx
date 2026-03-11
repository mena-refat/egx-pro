import React from 'react';
import { TrendingUp } from 'lucide-react';

export function AuthBranding() {
  return (
    <div className="text-center mb-8">
      <TrendingUp className="w-12 h-12 text-[var(--brand)] mx-auto mb-4" />
      <h1 className="text-4xl font-bold tracking-tight mb-2">EGX Pro</h1>
      <p className="text-[var(--text-muted)]">Egyptian Stock Market Intelligence</p>
    </div>
  );
}
