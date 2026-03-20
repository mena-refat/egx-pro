import { motion } from 'framer-motion';
import { Target, AlertTriangle, Shield, Clock, Calendar, CalendarDays } from 'lucide-react';
import type { AnalysisResult as AnalysisResultType } from '../../../types';
import { getSearchableTextFromAnalysis, getMatchedGlossaryCards } from '../../../lib/glossary';
import { LearnSection } from './LearnSection';
import { ScoreGauge } from './ScoreGauge';
import { VerdictBadge } from './VerdictBadge';
import { PriceBar } from './PriceBar';
import { OutlookCard } from './OutlookCard';
import { normalizeAnalysis } from './normalizeAnalysis';
import styles from './AnalysisResult.module.scss';

export interface AnalysisResultProps {
  analysis: AnalysisResultType;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnalysisResult({ analysis: raw }: AnalysisResultProps) {
  const analysis = normalizeAnalysis(raw);
  const verdict = analysis.verdictBadge || analysis.verdict || '';
  const confidence = analysis.confidenceScore ?? 50;
  const pt = analysis.priceTarget;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={styles.wrap}
      role="article"
      aria-label="نتيجة التحليل"
    >
      <div className={styles.summaryCard}>
        <ScoreGauge score={confidence} />
        <div className={styles.summaryText}>
          <p>{analysis.summary}</p>
          {analysis.confidenceReason && (
            <p className={styles.confidenceNote}>درجة الثقة: {analysis.confidenceReason}</p>
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
              {pt.potentialUpside && <span style={{ color: 'var(--success)' }}>صعود متوقع: {pt.potentialUpside}</span>}
              {pt.potentialDownside && <span style={{ color: 'var(--danger)' }}>هبوط محتمل: {pt.potentialDownside}</span>}
            </div>
          )}
        </div>
      )}

      <div className={styles.gridHalf}>
        {analysis.fundamental && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>📊 التحليل الأساسي</h4>
              {analysis.fundamental.score > 0 && <ScoreGauge score={analysis.fundamental.score} size="sm" />}
            </div>
            {analysis.fundamental.highlights?.length ? (
              <div className={styles.highlights}>
                {analysis.fundamental.highlights.map((h, i) => <p key={i} className={styles.highlightItem}>• {h}</p>)}
              </div>
            ) : null}
            {analysis.fundamental.keyRatios && Object.keys(analysis.fundamental.keyRatios).length > 0 && (
              <div className={styles.ratios}>
                {Object.entries(analysis.fundamental.keyRatios)
                  .filter(([, val]) => val.value && val.value !== '' && val.value !== 'غير متاح')
                  .map(([key, val]: [string, { value: string; explain: string }]) => (
                    <div key={key} className={styles.ratioRow}>
                      <span className={styles.ratioKey}>{key.toUpperCase()}</span>
                      <span className={styles.ratioVal}>{val.value}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        {analysis.technical && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>📈 التحليل الفني</h4>
              {analysis.technical.score > 0 && <ScoreGauge score={analysis.technical.score} size="sm" />}
            </div>
            {analysis.technical.highlights?.length ? (
              <div className={styles.highlights}>
                {analysis.technical.highlights.map((h, i) => <p key={i} className={styles.highlightItem}>• {h}</p>)}
              </div>
            ) : null}
            {analysis.technical.support != null && analysis.technical.resistance != null && (
              <div className={styles.supportResistance}>
                <span className={styles.supportLabel}>دعم: {analysis.technical.support}</span>
                <span className={styles.resistLabel}>مقاومة: {analysis.technical.resistance}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.outlookSection}>
        <h4 className={styles.outlookSectionTitle}>التوقعات</h4>
        {analysis.shortTerm && <OutlookCard data={analysis.shortTerm} icon={Clock} label="قصير المدى (أيام–أسابيع)" iconClass={styles.iconShort} />}
        {analysis.mediumTerm && <OutlookCard data={analysis.mediumTerm} icon={Calendar} label="متوسط المدى (أشهر)" iconClass={styles.iconMedium} />}
        {analysis.longTerm && <OutlookCard data={analysis.longTerm} icon={CalendarDays} label="طويل المدى (سنين)" iconClass={styles.iconLong} />}
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
                <span className={`${styles.severityBadge} ${r.severity === 'عالي' ? styles.severityHigh : r.severity === 'متوسط' ? styles.severityMid : styles.severityLow}`}>
                  {r.severity}
                </span>
                <span className={styles.riskText}>{r.risk}{r.explain ? ` — ${r.explain}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.sentiment && typeof analysis.sentiment === 'object' && analysis.sentiment !== null && (
        <div className={styles.sentimentBox}>
          <span className={styles.sentimentBold}>مزاج السوق:</span>{' '}
          {analysis.sentiment.explain}
        </div>
      )}

      {analysis.suitability && <p className={styles.suitability}>{analysis.suitability}</p>}

      {(() => {
        const glossaryCards = getMatchedGlossaryCards(getSearchableTextFromAnalysis(analysis));
        return glossaryCards.length > 0 ? <LearnSection cards={glossaryCards} /> : null;
      })()}

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
