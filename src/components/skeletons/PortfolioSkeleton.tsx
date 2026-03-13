import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={80} className="w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton height={32} className="w-full rounded-xl" />
          <Skeleton height={32} className="w-full rounded-xl" />
          <Skeleton height={32} className="w-full rounded-xl" />
        </div>
        <Skeleton height={320} className="w-full rounded-xl" />
      </div>
      <Skeleton height={400} className="w-full rounded-xl" />
    </div>
  );
}
