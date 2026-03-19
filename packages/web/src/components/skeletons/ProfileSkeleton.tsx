import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton height={80} width={80} className="rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton height={24} className="w-48 rounded-lg" />
          <Skeleton height={16} className="w-32 rounded-lg" />
        </div>
      </div>
      <Skeleton height={400} className="w-full rounded-xl" />
    </div>
  );
}
