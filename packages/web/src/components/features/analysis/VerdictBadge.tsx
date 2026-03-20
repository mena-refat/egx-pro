import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './AnalysisResult.module.scss';

export function VerdictBadge({ verdict }: { verdict: string }) {
  const v = verdict || '';
  const isBuy = v.includes('شراء');
  const isSell = v.includes('بيع');
  const cn = isBuy ? styles.verdictBuy : isSell ? styles.verdictSell : styles.verdictNeutral;
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  return (
    <span className={cn}>
      <Icon style={{ width: '1rem', height: '1rem' }} aria-hidden />
      {verdict}
    </span>
  );
}
