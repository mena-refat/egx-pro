import { type ComponentType } from 'react';
import { Check, X, BarChart3, Brain, Bell, TrendingUp, Shield, Sparkles, Zap, Target, Headphones } from 'lucide-react';

const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  freeNoWatchlist: BarChart3,
  freePortfolio: BarChart3,
  freeGoals: BarChart3,
  proWatchlist: BarChart3,
  proPortfolio: BarChart3,
  proGoals: BarChart3,
  ultraWatchlist: BarChart3,
  ultraPortfolio: BarChart3,
  ultraGoals: BarChart3,
  freeAi: Brain,
  proAi: Brain,
  ultraAi: Brain,
  priceAlerts: Bell,
  realtimePrices: TrendingUp,
  delayed10: TrendingUp,
  shariaMode: Shield,
  prioritySupport: Sparkles,
  earlyAccess: Zap,
  freePredictions: Zap,
  proPredictions: Zap,
  ultraPredictions: Zap,
  exactModePredictions: Target,
  proSupport: Headphones,
};

interface FeatureItemProps {
  featureKey: string;
  unavailable?: boolean;
  t: (k: string) => string;
}

export function FeatureItem({ featureKey, unavailable, t }: FeatureItemProps) {
  const text = t(`billing.features.${featureKey}`);
  const Icon = FEATURE_ICONS[featureKey];
  return (
    <div className="flex items-center gap-3 text-sm leading-[1.6]">
      {unavailable ? (
        <X className="w-[18px] h-[18px] shrink-0 text-[var(--danger)]" aria-hidden />
      ) : Icon ? (
        <Icon className="w-[18px] h-[18px] shrink-0 text-[var(--brand)] opacity-90" aria-hidden />
      ) : (
        <span className="flex shrink-0 w-[18px] h-[18px] rounded-full bg-[var(--success-bg)] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-[var(--success)]" strokeWidth={3} aria-hidden />
        </span>
      )}
      <span className={unavailable ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}>
        {text}
      </span>
    </div>
  );
}
