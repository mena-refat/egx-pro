import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function GoalsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={56} className="w-full rounded-xl" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} height={112} className="w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
