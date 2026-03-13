import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function DiscoverSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={48} className="w-full max-w-md rounded-xl" />
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} height={80} className="w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
