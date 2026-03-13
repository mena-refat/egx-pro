import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton for UsernameSetupPage. */
export function UsernameSetupSkeleton() {
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Skeleton height={48} className="w-full rounded-xl" />
      <Skeleton height={56} className="w-full rounded-xl" />
      <Skeleton height={48} className="w-32 rounded-xl" />
    </div>
  );
}
