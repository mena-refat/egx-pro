import { useState, Fragment } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  AlertTriangle, Shield, Clock, Calendar, CalendarDays,
  TrendingUp, TrendingDown, Minus, BarChart2, Activity, Brain, Target,
} from 'lucide-react';
import type { AnalysisResult as AnalysisResultType } from '../../../types';
import { getSearchableTextFromAnalysis, getMatchedGlossaryCards } from '../../../lib/glossary';
import { LearnSection } from './LearnSection';
import { normalizeAnalysis } from './normalizeAnalysis';
import styles from './AnalysisResult.module.scss';

// ── Animation variants ───────────────────────────────────────────────────────
const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getVerdictInfo(verdict: string) {
  if (verdict.includes('شراء قوي')) return { Icon: TrendingUp, glowClass: styles.heroGlowBuy, badgeClass: styles.verdictBuy };
  if (verdict.includes('شراء'))     return { Icon: TrendingUp, glowClass: styles.heroGlowBuy, badgeClass: styles.verdictBuy };
  if (verdict.includes('بيع قوي'))  return { Icon: TrendingDown, glowClass: styles.heroGlowSell, badgeClass: styles.verdictSell };
  if (verdict.includes('بيع'))      return { Icon: TrendingDown, glowClass: styles.heroGlowSell, badgeClass: styles.verdictSell };
  return { Icon: Minus, glowClass: styles.heroGlowNeutral, badgeClass: styles.verdictNeutral };
}

function getOutlookClasses(outlook: string | undefined) {
  if (!outlook) return { dot: styles.dotDisabled, text: '' };
  if (['إيجابي', 'صاعد', 'شراء', 'ارتفاع'].some(w => outlook.includes(w)))
    return { dot: styles.dotPositive, text: styles.outlookPositive };
  if (['سلبي', 'هابط', 'بيع', 'انخفاض'].some(w => outlook.includes(w)))
    return { dot: styles.dotNegative, text: styles.outlookNegative };
  return { dot: styles.dotNeutral, text: styles.outlookNeutral };
}

function riskFill(severity: string): { width: string; color: string } {
  const s = severity.toLowerCase();
  if (s === 'عالي' || s === 'high')   return { width: '85%', color: 'var(--danger)' };
  if (s === 'متوسط' || s === 'medium') return { width: '50%', color: 'var(--warning)' };
  return { width: '25%', color: 'var(--success)' };
}

// ── ScoreArc ─────────────────────────────────────────────────────────────────
function ScoreArc({ score, size = 'lg' }: { score: number; size?: 'lg' | 'md' | 'sm' }) {
  const C = {
    lg: { vb: 100, r: 40, cx: 50, cy: 50, sw: 6, scoreY: 52, subY: 66, scoreFs: 22, subFs: 8 },
    md: { vb: 72,  r: 28, cx: 36, cy: 36, sw: 5, scoreY: 40, subY: 0,  scoreFs: 14, subFs: 0 },
    sm: { vb: 50,  r: 19, cx: 25, cy: 25, sw: 4, scoreY: 28, subY: 0,  scoreFs: 9,  subFs: 0 },
  }[size];
  const circ   = 2 * Math.PI * C.r;
  const arcLen = circ * 0.75;
  const s      = Math.min(100, Math.max(0, score));
  const color  = s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--danger)';
  const rot    = `rotate(135, ${C.cx}, ${C.cy})`;

  return (
    <svg width={C.vb} height={C.vb} viewBox={`0 0 ${C.vb} ${C.vb}`} aria-hidden>
      <circle
        cx={C.cx} cy={C.cy} r={C.r} fill="none"
        stroke="var(--border)" strokeWidth={C.sw}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round" transform={rot}
      />
      <motion.circle
        cx={C.cx} cy={C.cy} r={C.r} fill="none"
        stroke={color} strokeWidth={C.sw}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round" transform={rot}
        initial={{ strokeDashoffset: arcLen }}
        animate={{ strokeDashoffset: arcLen * (1 - s / 100) }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
      <text x={C.cx} y={C.scoreY} textAnchor="middle" fontSize={C.scoreFs}
        fontWeight={800} fill="var(--text-primary)">{s}</text>
      {C.subFs > 0 && (
        <text x={C.cx} y={C.subY} textAnchor="middle" fontSize={C.subFs}
          fill="var(--text-muted)">/100</text>
      )}
    </svg>
  );
}

// ── PriceTrack ────────────────────────────────────────────────────────────────
function PriceTrack({ current, stopLoss, targetBase, targetHigh }: {
  current: number; stopLoss: number; targetBase: number; targetHigh: number;
}) {
  const pts = [stopLoss, current, targetBase, targetHigh].filter(v => v > 0);
  if (pts.length < 2) return null;

  const minV  = Math.min(...pts) * 0.97;
  const maxV  = Math.max(...pts) * 1.03;
  const range = maxV - minV;
  const pct   = (v: number) => `${((v - minV) / range) * 100}%`;

  type M = { v: number; label: string; color: string; above: boolean };
  const markers: M[] = [
    ...(stopLoss > 0  ? [{ v: stopLoss,    label: 'وقف الخسارة', color: 'var(--danger)',       above: false }] : []),
    ...(current > 0   ? [{ v: current,     label: 'الحالي',      color: 'var(--text-primary)', above: true  }] : []),
    ...(targetBase > 0 ? [{ v: targetBase, label: 'الهدف',       color: 'var(--success)',      above: false }] : []),
    ...(targetHigh > 0 && targetHigh !== targetBase
      ? [{ v: targetHigh, label: 'الأقصى', color: 'var(--success)', above: true }] : []),
  ];

  const dangerW  = stopLoss > 0 && current > 0  ? ((current    - stopLoss) / range) * 100 : 0;
  const successW = current > 0  && targetBase > 0 ? ((targetBase - current)  / range) * 100 : 0;

  return (
    <div className={styles.priceTrack}>
      <div style={{ position: 'relative', height: '68px' }}>
        {/* Base track */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: '4px', background: 'var(--border)', borderRadius: '2px',
          transform: 'translateY(-50%)',
        }}>
          {dangerW > 0 && (
            <motion.div
              style={{
                position: 'absolute', left: pct(stopLoss), width: `${dangerW}%`,
                height: '100%', transformOrigin: 'left center',
                background: 'color-mix(in srgb, var(--danger) 45%, transparent)',
                borderRadius: '2px',
              }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.5 }}
            />
          )}
          {successW > 0 && (
            <motion.div
              style={{
                position: 'absolute', left: pct(current), width: `${successW}%`,
                height: '100%', transformOrigin: 'left center',
                background: 'color-mix(in srgb, var(--success) 45%, transparent)',
                borderRadius: '2px',
              }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.7 }}
            />
          )}
        </div>

        {/* Marker dots + labels */}
        {markers.map((m) => (
          <div key={m.label} style={{
            position: 'absolute', left: pct(m.v), top: 0, bottom: 0,
            transform: 'translateX(-50%)',
          }}>
            <motion.div
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '11px', height: '11px', borderRadius: '50%',
                background: m.color, border: '2.5px solid var(--bg-card)',
                boxShadow: `0 0 0 2px ${m.color}`, zIndex: 2,
              }}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, delay: 0.6 }}
            />
            <div style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              ...(m.above ? { bottom: 'calc(50% + 12px)' } : { top: 'calc(50% + 12px)' }),
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: m.color, fontFamily: 'ui-monospace,monospace' }}>{m.v.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OutlookTimeline ───────────────────────────────────────────────────────────
type OutlookData = AnalysisResultType['shortTerm'];

function OutlookTimeline({ shortTerm, mediumTerm, longTerm }: {
  shortTerm?: OutlookData; mediumTerm?: OutlookData; longTerm?: OutlookData;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const nodes = [
    { data: shortTerm,  Icon: Clock,        label: 'قصير المدى',  time: 'أيام–أسابيع' },
    { data: mediumTerm, Icon: Calendar,     label: 'متوسط المدى', time: 'أشهر'         },
    { data: longTerm,   Icon: CalendarDays, label: 'طويل المدى',  time: 'سنوات'        },
  ];

  const activeData = activeIdx !== null ? nodes[activeIdx]?.data : null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {nodes.map((node, i) => {
          const { dot, text } = getOutlookClasses(node.data?.outlook);
          const isActive = activeIdx === i;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div style={{
                  flex: 1, height: '2px', background: 'var(--border)',
                  marginTop: '15px', minWidth: '16px',
                }} />
              )}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', minWidth: '76px', maxWidth: '100px',
              }}>
                <button
                  className={`${styles.timelineDot} ${node.data ? dot : styles.dotDisabled}`}
                  onClick={() => node.data && setActiveIdx(isActive ? null : i)}
                  disabled={!node.data}
                  aria-expanded={isActive}
                  style={node.data ? { cursor: 'pointer' } : {}}
                >
                  <node.Icon size={14} />
                </button>
                <p className={styles.timelineNodeLabel}>{node.label}</p>
                <p className={styles.timelineNodeTime}>{node.time}</p>
                {node.data && (
                  <p className={`${styles.timelineNodeOutlook} ${text}`}>{node.data.outlook}</p>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeData && (
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', paddingTop: '0.875rem' }}
          >
            <div className={styles.timelineDetail}>
              {activeData.title && <p className={styles.timelineDetailTitle}>{activeData.title}</p>}
              {activeData.summary && <p className={styles.timelineDetailSummary}>{activeData.summary}</p>}
              {(activeData.reasons?.length ?? 0) > 0 && (
                <ul className={styles.timelineReasons}>
                  {activeData.reasons.map((r, i) => (
                    <li key={i} className={styles.timelineReason}>
                      <span className={styles.timelineReasonBullet}>›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeData.action && (
                <div className={styles.timelineActionBox}>
                  <p className={styles.timelineActionLabel}>التوصية</p>
                  <p className={styles.timelineActionText}>{activeData.action}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── AnalysisResult ────────────────────────────────────────────────────────────
export interface AnalysisResultProps {
  analysis: AnalysisResultType;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnalysisResult({ analysis: raw }: AnalysisResultProps) {
  const analysis  = normalizeAnalysis(raw);
  const verdict   = analysis.verdictBadge || analysis.verdict || 'انتظار';
  const confidence = analysis.confidenceScore ?? 50;
  const pt        = analysis.priceTarget;

  const { Icon: VerdictIcon, glowClass, badgeClass } = getVerdictInfo(verdict);

  const sentiment = typeof analysis.sentiment === 'object' && analysis.sentiment !== null
    ? analysis.sentiment as { overall: string; smartMoney?: string; news?: string; explain: string }
    : null;

  const proLabels: Record<string, string> = {
    wavePosition:           '🌊 موجة Elliott',
    fibonacciKey:           '📏 Fibonacci',
    volumeProfile:          '📦 ملف الحجم',
    stopLossMethod:         '🛡️ وقف الخسارة',
    fairValueMethod:        '💡 السعر المستهدف',
    sectorRelativeStrength: '🏭 قوة نسبية للقطاع',
  };

  const glossaryCards = getMatchedGlossaryCards(getSearchableTextFromAnalysis(analysis));

  return (
    <motion.div
      className={styles.wrap}
      variants={container}
      initial="hidden"
      animate="visible"
      role="article"
      aria-label="نتيجة التحليل"
    >
      {/* ── HERO ── */}
      <motion.div className={styles.heroCard} variants={item}>
        <div className={`${styles.heroGlow} ${glowClass}`} />
        <div className={styles.heroBody}>
          <div className={styles.heroGaugeWrap}>
            <ScoreArc score={confidence} size="lg" />
          </div>
          <div className={styles.heroContent}>
            <div className={styles.heroVerdictRow}>
              <span className={`${styles.heroVerdictBadge} ${badgeClass}`}>
                <VerdictIcon size={15} />
                {verdict}
              </span>
              {analysis.suitability && (
                <span className={styles.heroSuitability}>{analysis.suitability}</span>
              )}
            </div>
            {analysis.summary && <p className={styles.heroSummary}>{analysis.summary}</p>}
            {analysis.confidenceReason && (
              <p className={styles.heroConfidenceNote}>درجة الثقة: {analysis.confidenceReason}</p>
            )}
            {pt && (
              <div className={styles.heroStats}>
                {pt.current > 0 && (
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatLabel}>السعر الحالي</span>
                    <span className={styles.heroStatValue}>{pt.current.toFixed(2)}</span>
                  </div>
                )}
                {pt.current > 0 && pt.stopLoss > 0 && <div className={styles.heroStatDivider} />}
                {pt.stopLoss > 0 && (
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatLabel}>وقف الخسارة</span>
                    <span className={`${styles.heroStatValue} ${styles.heroStatValueStop}`}>{pt.stopLoss.toFixed(2)}</span>
                  </div>
                )}
                {pt.stopLoss > 0 && pt.targetBase > 0 && <div className={styles.heroStatDivider} />}
                {pt.targetBase > 0 && (
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatLabel}>الهدف</span>
                    <span className={`${styles.heroStatValue} ${styles.heroStatValueTarget}`}>{pt.targetBase.toFixed(2)}</span>
                  </div>
                )}
                {pt.targetHigh > 0 && pt.targetHigh !== pt.targetBase && (
                  <>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                      <span className={styles.heroStatLabel}>الأقصى</span>
                      <span className={`${styles.heroStatValue} ${styles.heroStatValueTarget}`}>{pt.targetHigh.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── PRICE TRACK ── */}
      {pt && pt.targetBase > 0 && (
        <motion.div className={styles.priceSection} variants={item}>
          <p className={styles.sectionTitle}>
            <Target size={12} />
            الأسعار المستهدفة
          </p>
          <PriceTrack
            current={pt.current || 0}
            stopLoss={pt.stopLoss || 0}
            targetBase={pt.targetBase || 0}
            targetHigh={pt.targetHigh || 0}
          />
          {(pt.potentialUpside || pt.potentialDownside) && (
            <div className={styles.priceUpsideRow}>
              {pt.potentialUpside && (
                <span className={styles.priceUpsideBadge} style={{
                  color: 'var(--success)',
                  borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--success) 8%, transparent)',
                }}>
                  ↑ صعود متوقع: {pt.potentialUpside}
                </span>
              )}
              {pt.potentialDownside && (
                <span className={styles.priceUpsideBadge} style={{
                  color: 'var(--danger)',
                  borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                }}>
                  ↓ هبوط محتمل: {pt.potentialDownside}
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── FUNDAMENTAL + TECHNICAL ── */}
      {(analysis.fundamental || analysis.technical) && (
        <motion.div
          className={styles.analysisGrid}
          variants={item}
          style={!(analysis.fundamental && analysis.technical) ? { gridTemplateColumns: '1fr' } : undefined}
        >
          {analysis.fundamental && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardTop}>
                <span className={styles.analysisCardTitle}>
                  <BarChart2 size={12} />
                  التحليل الأساسي
                </span>
                <ScoreArc score={analysis.fundamental.score} size="sm" />
              </div>
              {(analysis.fundamental.highlights?.length ?? 0) > 0 && (
                <div className={styles.highlightsList}>
                  {analysis.fundamental.highlights.map((h, i) => (
                    <p key={i} className={styles.highlightItem}>{h}</p>
                  ))}
                </div>
              )}
              {analysis.fundamental.keyRatios &&
                Object.keys(analysis.fundamental.keyRatios).length > 0 && (
                  <div className={styles.metricGrid}>
                    {Object.entries(analysis.fundamental.keyRatios)
                      .filter(([, v]) => v.value && v.value !== '' && v.value !== 'غير متاح')
                      .slice(0, 6)
                      .map(([key, val]) => (
                        <div key={key} className={styles.metricChip}>
                          <p className={styles.metricKey}>{key.toUpperCase()}</p>
                          <p className={styles.metricValue}>{val.value}</p>
                        </div>
                      ))}
                  </div>
                )}
            </div>
          )}
          {analysis.technical && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardTop}>
                <span className={styles.analysisCardTitle}>
                  <Activity size={12} />
                  التحليل الفني
                </span>
                <ScoreArc score={analysis.technical.score} size="sm" />
              </div>
              {(analysis.technical.highlights?.length ?? 0) > 0 && (
                <div className={styles.highlightsList}>
                  {analysis.technical.highlights.map((h, i) => (
                    <p key={i} className={styles.highlightItem}>{h}</p>
                  ))}
                </div>
              )}
              {(analysis.technical.support != null || analysis.technical.resistance != null) && (
                <div className={styles.srRow}>
                  {analysis.technical.support != null && (
                    <div className={styles.srChip} style={{
                      background: 'color-mix(in srgb, var(--success) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--success) 22%, transparent)',
                    }}>
                      <p className={styles.srLabel} style={{ color: 'var(--success)' }}>دعم</p>
                      <p className={styles.srValue} style={{ color: 'var(--success)' }}>{analysis.technical.support}</p>
                    </div>
                  )}
                  {analysis.technical.resistance != null && (
                    <div className={styles.srChip} style={{
                      background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--danger) 22%, transparent)',
                    }}>
                      <p className={styles.srLabel} style={{ color: 'var(--danger)' }}>مقاومة</p>
                      <p className={styles.srValue} style={{ color: 'var(--danger)' }}>{analysis.technical.resistance}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── OUTLOOK TIMELINE ── */}
      {(analysis.shortTerm || analysis.mediumTerm || analysis.longTerm) && (
        <motion.div className={styles.outlookSection} variants={item}>
          <p className={styles.sectionTitle}>
            <Clock size={12} />
            التوقعات الزمنية
          </p>
          <OutlookTimeline
            shortTerm={analysis.shortTerm}
            mediumTerm={analysis.mediumTerm}
            longTerm={analysis.longTerm}
          />
        </motion.div>
      )}

      {/* ── RISKS ── */}
      {(analysis.risks?.length ?? 0) > 0 && (
        <motion.div className={styles.risksCard} variants={item}>
          <p className={styles.sectionTitle}>
            <AlertTriangle size={12} />
            المخاطر
          </p>
          <div className={styles.riskList}>
            {analysis.risks!.map((r, i) => {
              const fill = riskFill(r.severity);
              return (
                <div key={i} className={styles.riskItem}>
                  <div className={styles.riskBar}>
                    <motion.div
                      className={styles.riskBarFill}
                      style={{ background: fill.color }}
                      initial={{ width: 0 }}
                      animate={{ width: fill.width }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 + i * 0.08 }}
                    />
                  </div>
                  <span className={`${styles.severityBadge} ${
                    r.severity === 'عالي' ? styles.severityHigh
                    : r.severity === 'متوسط' ? styles.severityMid
                    : styles.severityLow
                  }`}>{r.severity}</span>
                  <div className={styles.riskContent}>
                    <p className={styles.riskTitle}>{r.risk}</p>
                    {r.explain && <p className={styles.riskExplain}>{r.explain}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── SENTIMENT ── */}
      {sentiment && (
        <motion.div className={styles.sentimentCard} variants={item}>
          <p className={styles.sectionTitle}>
            <span style={{ fontSize: '0.85em' }}>📡</span>
            مزاج السوق
          </p>
          {sentiment.explain && <p className={styles.sentimentContent}>{sentiment.explain}</p>}
          {(sentiment.smartMoney || sentiment.news) && (
            <div className={styles.sentimentRow}>
              {sentiment.smartMoney && (
                <div className={styles.sentimentPill}>
                  <p className={styles.sentimentPillLabel}>السيولة الذكية</p>
                  <p className={styles.sentimentPillValue}>{sentiment.smartMoney}</p>
                </div>
              )}
              {sentiment.news && (
                <div className={styles.sentimentPill}>
                  <p className={styles.sentimentPillLabel}>الأخبار</p>
                  <p className={styles.sentimentPillValue}>{sentiment.news}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── PRO ANALYSIS ── */}
      {analysis.proAnalysis && Object.values(analysis.proAnalysis).some(Boolean) && (
        <motion.div className={styles.proBlock} variants={item}>
          <div className={styles.proBlockAccent} />
          <p className={styles.sectionTitle} style={{ marginBottom: '0.875rem' }}>
            <Brain size={12} />
            تحليل احترافي متقدم
          </p>
          <div className={styles.proGrid}>
            {Object.entries(analysis.proAnalysis).map(([key, val]) => {
              if (!val) return null;
              return (
                <div key={key} className={styles.proRow}>
                  <p className={styles.proLabel}>{proLabels[key] ?? key}</p>
                  <p className={styles.proValue}>{String(val)}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── LEARN ── */}
      {glossaryCards.length > 0 && <LearnSection cards={glossaryCards} />}

      {/* ── DISCLAIMER ── */}
      <motion.div className={styles.disclaimerCard} variants={item}>
        <Shield size={13} className={styles.disclaimerIcon} />
        <div>
          <p className={styles.disclaimerTitle}>إخلاء مسؤولية</p>
          <p className={styles.disclaimerText}>{analysis.disclaimer}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
