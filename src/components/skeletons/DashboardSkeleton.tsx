import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton height={48} className="w-full max-w-md rounded-xl" />
      <Skeleton height={120} className="w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton height={200} className="w-full rounded-xl" />
        <Skeleton height={200} className="w-full rounded-xl" />
      </div>
      <Skeleton height={180} className="w-full rounded-xl" />
      <Skeleton height={140} className="w-full rounded-xl" />
    </div>
  );
}
