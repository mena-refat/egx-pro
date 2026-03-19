import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function PredictionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={52} className="w-full max-w-sm rounded-xl" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={140} className="w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
