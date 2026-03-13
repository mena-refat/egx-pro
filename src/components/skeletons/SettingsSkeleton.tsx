import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={48} className="w-full rounded-xl" />
      <Skeleton height={320} className="w-full rounded-xl" />
    </div>
  );
}
