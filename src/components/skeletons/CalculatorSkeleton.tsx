import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton for InvestmentCalculator page. */
export function CalculatorSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Skeleton height={40} className="w-full rounded-xl" />
      <Skeleton height={120} className="w-full rounded-2xl" />
      <Skeleton height={80} className="w-full rounded-xl" />
      <Skeleton height={200} className="w-full rounded-2xl" />
    </div>
  );
}
