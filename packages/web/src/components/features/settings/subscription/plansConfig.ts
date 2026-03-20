import { PLAN_PRICES } from '../../../../lib/constants';
import { PlanConfig, PaidPlanId } from './types';

export function getPlansConfig(): PlanConfig[] {
  return [
    {
      id: 'free',
      nameKey: 'billing.planFreeName',
      features: [
        { key: 'freeNoWatchlist' },
        { key: 'freePortfolio' },
        { key: 'freeGoals' },
        { key: 'freeAi' },
        { key: 'shariaMode' },
        { key: 'delayed10' },
      ],
    },
    {
      id: 'pro',
      nameKey: 'billing.planPro',
      badgeKey: 'mostUsed',
      savingsNoteKey: 'equivalentPro',
      highlighted: true,
      features: [
        { key: 'proWatchlist' },
        { key: 'proPortfolio' },
        { key: 'proGoals' },
        { key: 'proAi' },
        { key: 'realtimePrices' },
        { key: 'priceAlerts' },
        { key: 'shariaMode' },
      ],
    },
    {
      id: 'ultra',
      nameKey: 'billing.planUltra',
      badgeKey: 'forProfessionals',
      savingsNoteKey: 'equivalentUltra',
      features: [
        { key: 'ultraWatchlist' },
        { key: 'ultraPortfolio' },
        { key: 'ultraGoals' },
        { key: 'ultraAi' },
        { key: 'realtimePrices' },
        { key: 'priceAlerts' },
        { key: 'shariaMode' },
        { key: 'prioritySupport' },
        { key: 'earlyAccess' },
      ],
    },
  ];
}

export function getPaidPlanId(tier: 'pro' | 'ultra', period: 'monthly' | 'yearly'): PaidPlanId {
  return period === 'yearly' ? `${tier}_yearly` : `${tier}_monthly`;
}

export function getBasePriceForPlan(planId: PaidPlanId): number {
  switch (planId) {
    case 'pro_monthly':  return PLAN_PRICES.pro;
    case 'pro_yearly':   return PLAN_PRICES.yearly;
    case 'ultra_monthly': return PLAN_PRICES.ultra;
    case 'ultra_yearly': return PLAN_PRICES.ultra_yearly;
    default:             return PLAN_PRICES.pro;
  }
}

export function monthlyEquivalent(yearlyPrice: number): number {
  return Math.round((yearlyPrice / 12) * 100) / 100;
}
