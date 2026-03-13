import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton that mirrors DashboardPage layout (hero, stats cards, chart, list). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton height={40} className="w-full rounded-xl" />
      <Skeleton height={112} className="w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={96} className="w-full rounded-xl" />
        ))}
      </div>
      <Skeleton height={256} className="w-full rounded-2xl" />
      <Skeleton height={192} className="w-full rounded-2xl" />
    </div>
  );
}
