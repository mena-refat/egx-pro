import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function AIPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton height={40} className="w-full max-w-2xl rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={160} className="w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
