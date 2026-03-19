import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function StocksSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={48} className="w-full max-w-md rounded-xl" />
      <Skeleton height={40} className="w-full rounded-xl" />
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} height={72} className="w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
