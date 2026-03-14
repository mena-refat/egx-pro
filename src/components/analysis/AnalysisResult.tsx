import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Target,
  Clock,
  Calendar,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AnalysisResult as AnalysisResultType } from '../../types';
import { LearnSection } from './LearnSection';
import styles from './AnalysisResult.module.scss';

function ScoreGauge({
  score,
  size = 'md',
}: {
  score: number;
  size?: 'sm' | 'md';
}) {
  const color =
    score >= 70
      ? 'var(--success)'
      : score >= 40
        ? 'var(--warning)'
        : 'var(--danger)';
  const r = size === 'sm' ? 24 : 36;
  const stroke = size === 'sm' ? 4 : 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const dim = (r + stroke) * 2;
  return (
    <div
      className={styles.gaugeWrap}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <span
        className={size === 'sm' ? '' : ''}
        style={{
          position: 'absolute',
          fontWeight: 700,
          fontSize: size === 'sm' ? '0.75rem' : '1.125rem',
          color,
        }}
      >
        {score}
      </span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const v = verdict || '';
  const isBuy = v.includes('شراء');
  const isSell = v.includes('بيع');
  const cn =
    isBuy ? styles.verdictBuy
    : isSell ? styles.verdictSell
    : styles.verdictNeutral;
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  return (
    <span className={cn}>
      <Icon style={{ width: '1rem', height: '1rem' }} aria-hidden />
      {verdict}
    </span>
  );
}

function PriceBar({
  current,
  low,
  base,
  high,
  stopLoss,
}: {
  current: number;
  low: number;
  base: number;
  high: number;
  stopLoss: number;
}) {
  const min = Math.min(stopLoss || low, current) * 0.95;
  const max = high * 1.05;
  const range = max - min || 1;
  const pos = (v: number) =>
    `${Math.max(0, Math.min(100, ((v - min) / range) * 100))}%`;
  return (
    <div className={styles.priceBar}>
      {stopLoss > 0 && (
        <div
          className={styles.priceMarker}
          style={{ left: pos(stopLoss), background: 'var(--danger)' }}
        >
          <span
            className={styles.priceLabel}
            style={{ top: '-1.25rem', left: '50%', color: 'var(--danger)' }}
          >
            وقف {stopLoss}
          </span>
        </div>
      )}
      <div
        className={styles.priceMarker}
        style={{
          left: pos(current),
          background: 'var(--text-primary)',
        }}
      >
        <span
          className={styles.priceLabel}
          style={{
            bottom: '-1.25rem',
            left: '50%',
            color: 'var(--text-primary)',
          }}
        >
          الحالي {current}
        </span>
      </div>
      <div
        className={styles.priceMarker}
        style={{ left: pos(base), background: 'var(--success)' }}
      >
        <span
          className={styles.priceLabel}
          style={{ top: '-1.25rem', left: '50%', color: 'var(--success)' }}
        >
          هدف {base}
        </span>
      </div>
      <div
        className={styles.priceMarker}
        style={{
          left: pos(high),
          background: 'var(--success)',
          opacity: 0.5,
        }}
      >
        <span
          className={styles.priceLabel}
          style={{
            bottom: '-1.25rem',
            left: '50%',
            color: 'var(--success)',
          }}
        >
          أقصى {high}
        </span>
      </div>
    </div>
  );
}

function OutlookCard({
  data,
  icon: Icon,
  label,
  iconClass,
}: {
  data: {
    outlook: string;
    title: string;
    summary: string;
    reasons: string[];
    action: string;
  };
  icon: React.ElementType;
  label: string;
  iconClass: string;
}) {
  const [open, setOpen] = useState(false);
  const outlookClass =
    data.outlook === 'إيجابي'
      ? styles.outlookPositive
      : data.outlook === 'سلبي'
        ? styles.outlookNegative
        : styles.outlookNeutral;
  return (
    <div className={styles.outlookCard}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={styles.outlookToggle}
      >
        <div className={styles.outlookLeft}>
          <div className={`${styles.outlookIconWrap} ${iconClass}`}>
            <Icon style={{ width: '1rem', height: '1rem' }} aria-hidden />
          </div>
          <div>
            <p className={styles.outlookLabel}>{label}</p>
            <p className={styles.outlookTitle}>
              {data.title || data.summary?.slice(0, 50)}
            </p>
          </div>
        </div>
        <div className={styles.outlookRight}>
          <span className={`${styles.outlookBadge} ${outlookClass}`}>
            {data.outlook}
          </span>
          {open ? (
            <ChevronUp style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }} aria-hidden />
          ) : (
            <ChevronDown style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }} aria-hidden />
          )}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={styles.outlookBody}
        >
          <p className={styles.outlookSummary}>{data.summary}</p>
          {data.reasons?.length > 0 && (
            <ul className={styles.outlookReasons}>
              {data.reasons.map((r, i) => (
                <li key={i}>
                  <span className={styles.outlookBullet}>•</span> {r}
                </li>
              ))}
            </ul>
          )}
          {data.action && (
            <div className={styles.actionBox}>
              <p className={styles.actionLabel}>النصيحة</p>
              <p className={styles.actionText}>{data.action}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export interface AnalysisResultProps {
  analysis: AnalysisResultType;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnalysisResult({ analysis: raw, t }: AnalysisResultProps) {
  const analysis: AnalysisResultType = {
    ...raw,
    verdictBadge: raw.verdictBadge || raw.verdict || '',
    confidenceScore: raw.confidenceScore ?? 50,
    shortTerm:
      raw.shortTerm ||
      (raw.shortTermOutlook
        ? {
            outlook: 'محايد',
            title: '',
            summary: raw.shortTermOutlook,
            reasons: [],
            action: '',
          }
        : undefined),
    mediumTerm:
      raw.mediumTerm ||
      (raw.mediumTermOutlook
        ? {
            outlook: 'محايد',
            title: '',
            summary: raw.mediumTermOutlook,
            reasons: [],
            action: '',
          }
        : undefined),
    longTerm:
      raw.longTerm ||
      (raw.longTermOutlook
        ? {
            outlook: 'محايد',
            title: '',
            summary: raw.longTermOutlook,
            reasons: [],
            action: '',
          }
        : undefined),
    sentiment:
      typeof raw.sentiment === 'string'
        ? { overall: 'محايد', explain: raw.sentiment }
        : raw.sentiment ?? undefined,
  };

  const verdict = analysis.verdictBadge || analysis.verdict || '';
  const confidence = analysis.confidenceScore ?? 50;
  const pt = analysis.priceTarget;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.wrap}
    >
      <div className={styles.summaryCard}>
        <ScoreGauge score={confidence} />
        <div className={styles.summaryText}>
          <p>{analysis.summary}</p>
          {analysis.confidenceReason && (
            <p className={styles.confidenceNote}>
              درجة الثقة: {analysis.confidenceReason}
            </p>
          )}
        </div>
        <VerdictBadge verdict={verdict} />
      </div>

      {pt && (pt.targetBase > 0 || pt.targetHigh > 0) && (
        <div className={styles.priceSection}>
          <h4 className={styles.sectionTitle}>
            <Target style={{ width: '1rem', height: '1rem', color: 'var(--brand)' }} aria-hidden />
            الأسعار المستهدفة
          </h4>
          <PriceBar
            current={pt.current || 0}
            low={pt.targetLow || 0}
            base={pt.targetBase || 0}
            high={pt.targetHigh || 0}
            stopLoss={pt.stopLoss || 0}
          />
          {(pt.potentialUpside || pt.potentialDownside) && (
            <div className={styles.upsideDown}>
              {pt.potentialUpside && (
                <span style={{ color: 'var(--success)' }}>
                  صعود متوقع: {pt.potentialUpside}
                </span>
              )}
              {pt.potentialDownside && (
                <span style={{ color: 'var(--danger)' }}>
                  هبوط محتمل: {pt.potentialDownside}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.gridHalf}>
        {analysis.fundamental && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>التحليل الأساسي</h4>
              <ScoreGauge score={analysis.fundamental.score} size="sm" />
            </div>
            <div className={styles.highlights}>
              {analysis.fundamental.highlights?.map((h, i) => (
                <p key={i} className={styles.highlightItem}>
                  • {h}
                </p>
              ))}
            </div>
            {analysis.fundamental.keyRatios && (
              <div className={styles.ratios}>
                {Object.entries(analysis.fundamental.keyRatios).map(
                  ([key, val]: [string, { value: string; explain: string }]) => (
                    <div key={key} className={styles.ratioRow}>
                      <span className={styles.ratioKey}>{key}</span>
                      <span className={styles.ratioVal}>{val.value}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
        {analysis.technical && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>التحليل الفني</h4>
              <ScoreGauge score={analysis.technical.score} size="sm" />
            </div>
            <div className={styles.highlights}>
              {analysis.technical.highlights?.map((h, i) => (
                <p key={i} className={styles.highlightItem}>
                  • {h}
                </p>
              ))}
            </div>
            {analysis.technical.support != null &&
              analysis.technical.resistance != null && (
                <div className={styles.supportResistance}>
                  <span style={{ color: 'var(--danger)' }}>
                    دعم: {analysis.technical.support}
                  </span>
                  <span style={{ color: 'var(--success)' }}>
                    مقاومة: {analysis.technical.resistance}
                  </span>
                </div>
              )}
          </div>
        )}
      </div>

      <div className={styles.outlookSection}>
        <h4 className={styles.outlookSectionTitle}>التوقعات</h4>
        {analysis.shortTerm && (
          <OutlookCard
            data={analysis.shortTerm}
            icon={Clock}
            label="قصير المدى (أيام–أسابيع)"
            iconClass={styles.iconShort}
          />
        )}
        {analysis.mediumTerm && (
          <OutlookCard
            data={analysis.mediumTerm}
            icon={Calendar}
            label="متوسط المدى (أشهر)"
            iconClass={styles.iconMedium}
          />
        )}
        {analysis.longTerm && (
          <OutlookCard
            data={analysis.longTerm}
            icon={CalendarDays}
            label="طويل المدى (سنين)"
            iconClass={styles.iconLong}
          />
        )}
      </div>

      {analysis.risks && analysis.risks.length > 0 && (
        <div className={styles.risksCard}>
          <h4 className={styles.risksTitle}>
            <AlertTriangle style={{ width: '1rem', height: '1rem', color: 'var(--warning)' }} aria-hidden />
            المخاطر
          </h4>
          <div className={styles.riskList}>
            {analysis.risks.map((r, i) => (
              <div key={i} className={styles.riskItem}>
                <span
                  className={`${styles.severityBadge} ${
                    r.severity === 'عالي'
                      ? styles.severityHigh
                      : r.severity === 'متوسط'
                        ? styles.severityMid
                        : styles.severityLow
                  }`}
                >
                  {r.severity}
                </span>
                <span className={styles.riskText}>
                  {r.risk}
                  {r.explain ? ` — ${r.explain}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.sentiment &&
        typeof analysis.sentiment === 'object' &&
        analysis.sentiment !== null && (
          <div className={styles.sentimentBox}>
            <span className={styles.sentimentBold}>مزاج السوق:</span>{' '}
            {analysis.sentiment.explain}
          </div>
        )}

      {analysis.suitability && (
        <p className={styles.suitability}> {analysis.suitability}</p>
      )}

      {analysis.learnCards && analysis.learnCards.length > 0 && (
        <LearnSection cards={analysis.learnCards} />
      )}

      <div className={styles.disclaimerCard}>
        <div className={styles.disclaimerTitle}>
          <Shield style={{ width: '0.75rem', height: '0.75rem' }} aria-hidden />
          إخلاء مسؤولية
        </div>
        <p className={styles.disclaimerText}>{analysis.disclaimer}</p>
      </div>
    </motion.div>
  );
}
