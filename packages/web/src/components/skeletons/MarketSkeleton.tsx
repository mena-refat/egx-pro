import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function MarketSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton height={56} className="w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height={96} className="w-full rounded-xl" />
        ))}
      </div>
      <Skeleton height={120} className="w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton height={320} className="w-full rounded-xl" />
        <Skeleton height={320} className="w-full rounded-xl" />
      </div>
      <Skeleton height={280} className="w-full rounded-xl" />
    </div>
  );
}
