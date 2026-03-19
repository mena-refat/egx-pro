import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={48} className="w-48 rounded-lg" />
      <Skeleton height={256} className="w-full rounded-xl" />
      <Skeleton height={128} className="w-full rounded-xl" />
    </div>
  );
}
