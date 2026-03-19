import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import styles from './QuickAnalysisCard.module.scss';

export interface QuickData {
  type: 'quick';
  ticker: string;
  price: number | null;
  changePercent: number | null;
  trend: string;
  rsiSignal: string;
  rsiValue: number | null;
  macdSignal: string;
  volumeSignal: string;
  support: number | null;
  resistance: number | null;
  overallSignal: string;
  score: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  pe: number | null;
  disclaimer: string;
}

interface QuickAnalysisCardProps {
  data: QuickData;
  onDeepAnalysis: () => void;
  loading?: boolean;
}

export function QuickAnalysisCard({ data, onDeepAnalysis, loading }: QuickAnalysisCardProps) {
  const isUp = data.score >= 60;
  const isDown = data.score <= 40;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className={`${styles.card} ${isUp ? styles.cardUp : isDown ? styles.cardDown : styles.cardNeutral}`}>
      <div className={styles.header}>
        <div className={styles.scoreBlock}>
          <span className={styles.scoreValue}>{data.score}</span>
          <div className={styles.signalRow}>
            <Icon className={styles.signalIcon} aria-hidden />
            <span className={styles.overallSignal}>{data.overallSignal}</span>
          </div>
          {data.price != null && (
            <p className={styles.priceLine}>
              {data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} جنيه
              {data.changePercent != null && (
                <span className={data.changePercent >= 0 ? styles.positive : styles.negative}>
                  {data.changePercent >= 0 ? '+' : ''}
                  {data.changePercent.toFixed(2)}%
                </span>
              )}
            </p>
          )}
        </div>
        <span className={styles.badge}>
          <Zap className={styles.badgeIcon} aria-hidden />
          تحليل سريع
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.cell}>
          <p className={styles.cellLabel}>RSI</p>
          <p className={styles.cellValue}>{data.rsiValue ?? '—'} · {data.rsiSignal}</p>
        </div>
        <div className={styles.cell}>
          <p className={styles.cellLabel}>MACD</p>
          <p className={styles.cellValue}>{data.macdSignal}</p>
        </div>
        <div className={styles.cell}>
          <p className={styles.cellLabel}>الحجم</p>
          <p className={styles.cellValue}>{data.volumeSignal}</p>
        </div>
        <div className={styles.cell}>
          <p className={styles.cellLabel}>الاتجاه</p>
          <p className={styles.cellValue}>{data.trend}</p>
        </div>
      </div>

      {(data.support != null || data.resistance != null) && (
        <div className={styles.levels}>
          <span className={styles.support}>دعم: {data.support ?? '—'}</span>
          <span className={styles.resistance}>مقاومة: {data.resistance ?? '—'}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onDeepAnalysis}
        disabled={loading}
        className={styles.cta}
      >
        {loading ? 'جاري التحليل العميق...' : '🔍 تحليل عميق بالذكاء الاصطناعي'}
      </button>

      <p className={styles.disclaimer}>{data.disclaimer}</p>
    </div>
  );
}
