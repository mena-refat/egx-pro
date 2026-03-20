import styles from './AnalysisResult.module.scss';

interface PriceBarProps {
  current: number;
  low: number;
  base: number;
  high: number;
  stopLoss: number;
}

export function PriceBar({ current, low, base, high, stopLoss }: PriceBarProps) {
  const min = Math.min(stopLoss || low, current) * 0.95;
  const max = high * 1.05;
  const range = max - min || 1;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / range) * 100))}%`;

  return (
    <div className={styles.priceBar}>
      {stopLoss > 0 && (
        <div className={styles.priceMarker} style={{ left: pos(stopLoss), background: 'var(--danger)' }}>
          <span className={styles.priceLabel} style={{ top: '-1.25rem', left: '50%', color: 'var(--danger)' }}>
            وقف {stopLoss}
          </span>
        </div>
      )}
      <div className={styles.priceMarker} style={{ left: pos(current), background: 'var(--text-primary)' }}>
        <span className={styles.priceLabel} style={{ bottom: '-1.25rem', left: '50%', color: 'var(--text-primary)' }}>
          الحالي {current}
        </span>
      </div>
      <div className={styles.priceMarker} style={{ left: pos(base), background: 'var(--success)' }}>
        <span className={styles.priceLabel} style={{ top: '-1.25rem', left: '50%', color: 'var(--success)' }}>
          هدف {base}
        </span>
      </div>
      <div className={styles.priceMarker} style={{ left: pos(high), background: 'var(--success)', opacity: 0.5 }}>
        <span className={styles.priceLabel} style={{ bottom: '-1.25rem', left: '50%', color: 'var(--success)' }}>
          أقصى {high}
        </span>
      </div>
    </div>
  );
}
