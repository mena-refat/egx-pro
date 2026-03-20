import styles from './AnalysisResult.module.scss';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md';
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  if (!score || score <= 0) return null;
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  const r = size === 'sm' ? 24 : 36;
  const stroke = size === 'sm' ? 4 : 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const dim = (r + stroke) * 2;
  return (
    <div className={styles.gaugeWrap} style={{ width: dim, height: dim }} aria-hidden>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={r + stroke} cy={r + stroke} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={r + stroke} cy={r + stroke} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <span style={{ position: 'absolute', fontWeight: 700, fontSize: size === 'sm' ? '0.75rem' : '1.125rem', color }}>
        {score}
      </span>
    </div>
  );
}
