import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare } from 'lucide-react';
import api, { ANALYSIS_TIMEOUT_MS } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TickerSuggestInput } from '../components/ui/TickerSuggestInput';
import { getStockInfo, searchStocks } from '../lib/egxStocks';
import { useProfileGuard } from '../hooks/useProfileGuard';
import { ProfileGuardModal } from '../components/ui/ProfileGuardModal';
import type { CompareResult } from '../types';
import { LearnSection } from '../components/features/analysis/LearnSection';
import { AnalysisLoadingState } from '../components/features/analysis/AnalysisLoadingState';
import { getSearchableTextFromCompare, getMatchedGlossaryCards } from '../lib/glossary';
import styles from './AIComparePage.module.scss';

export default function AIComparePage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [ticker1, setTicker1] = useState('');
  const [ticker2, setTicker2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { guardedAction, profileModalProps } = useProfileGuard();

  const resolveTicker = useCallback((raw: string): string | null => {
    const upper = raw.trim().toUpperCase();
    if (getStockInfo(upper)) return upper;
    const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
    const matches = searchStocks(raw.trim(), lang);
    return matches.length === 1 ? matches[0].ticker : null;
  }, [i18n.language]);

  const runCompare = useCallback(async () => {
    if (!ticker1.trim() || !ticker2.trim()) {
      setError(t('ai.enterTwoTickers'));
      return;
    }
    const t1 = resolveTicker(ticker1);
    const t2 = resolveTicker(ticker2);
    if (!t1 || !t2) {
      setError(t('ai.selectFromList'));
      return;
    }
    if (t1 === t2) {
      setError(t('ai.differentTickers'));
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post<{ data: { comparison: CompareResult } }>(
        '/analysis/compare',
        { ticker1: t1, ticker2: t2 },
        { timeout: ANALYSIS_TIMEOUT_MS }
      );
      const data = res.data?.data?.comparison ?? (res.data as { comparison?: CompareResult })?.comparison;
      if (data) setResult(data);
      else setError(t('common.error'));
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { status?: number; data?: { error?: string; message?: string } } };
      const res = axiosErr?.response;
      const code = res?.data?.error;
      const status = res?.status;

      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else if (code === 'SAME_STOCK_COMPARE') {
        setError(t('ai.differentTickers'));
      } else if (status === 401) {
        setError(t('ai.sessionExpired'));
      } else if (status === 429) {
        setError(t('error.server_busy'));
      } else if (status === 502 || status === 504) {
        setError(t('ai.analysisTimeout'));
      } else if (status === 503) {
        setError(t('ai.serviceUnavailable'));
      } else if (axiosErr?.code === 'ECONNABORTED') {
        setError(t('ai.analysisTimeout'));
      } else {
        const msg = (err as Error)?.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError(t('error.no_internet'));
        } else if (msg.includes('empty') || msg.includes('Empty')) {
          setError(t('error.analysis_empty'));
        } else {
          setError(t('error.unexpected'));
        }
        if (import.meta.env.DEV) console.error('Compare error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [ticker1, ticker2, t, resolveTicker]);

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.back}
        onClick={() => navigate('/ai')}
        aria-label={t('common.back')}
      >
        <ArrowLeft className={styles.backIcon} aria-hidden />
        {t('common.back')}
      </button>

      <header className={styles.header}>
        <GitCompare className={styles.headerIcon} aria-hidden />
        <h1 className={styles.title}>{t('ai.compareStocks')}</h1>
        <p className={styles.subtitle}>{t('ai.compareStocksDesc')}</p>
      </header>

      <div className={styles.form}>
        <TickerSuggestInput
          value={ticker1}
          onChange={setTicker1}
          placeholder={t('ai.ticker1Placeholder')}
          wrapperClassName={styles.input}
          dir="ltr"
          disabled={loading}
        />
        <TickerSuggestInput
          value={ticker2}
          onChange={setTicker2}
          placeholder={t('ai.ticker2Placeholder')}
          wrapperClassName={styles.input}
          dir="ltr"
          disabled={loading}
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => guardedAction(runCompare)}
          disabled={loading}
          className={styles.btn}
        >
          {t('ai.getComparison')}
        </Button>
      </div>

      <AnalysisLoadingState loading={loading} variant="compare" />

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && (() => {
        const s1 = result.stock1 ?? result.ticker1;
        const s2 = result.stock2 ?? result.ticker2;
        const fund = (f: CompareResult['stock1']['fundamental'] | string | undefined) =>
          typeof f === 'string' ? f : (f as { summary?: string })?.summary ?? '';
        const tech = (tc: CompareResult['stock1']['technical'] | string | undefined) =>
          typeof tc === 'string' ? tc : (tc as { summary?: string })?.summary ?? '';
        const getVerdict = (s: typeof s1) => (s?.verdictBadge ?? (s as { verdict?: string })?.verdict) ?? '';

        const score1 = s1?.score ?? 0;
        const score2 = s2?.score ?? 0;
        const winnerTicker = result.winner?.toUpperCase() ?? '';
        const t1Upper = ticker1.trim().toUpperCase();
        const t2Upper = ticker2.trim().toUpperCase();
        const is1Winner = winnerTicker.includes(t1Upper) || winnerTicker.includes(s1?.ticker ?? '');
        const is2Winner = winnerTicker.includes(t2Upper) || winnerTicker.includes(s2?.ticker ?? '');

        const scoreColor = (score: number) =>
          score >= 65 ? 'var(--success)' : score >= 45 ? 'var(--warning)' : 'var(--danger)';

        const verdictBadge = (v: string) => {
          const isBuy = v.includes('شراء');
          const isSell = v.includes('بيع');
          const cls = isBuy ? styles.verdictBuy : isSell ? styles.verdictSell : styles.verdictWait;
          return <span className={`${styles.verdictBadge} ${cls}`}>{v}</span>;
        };

        return (
        <section className={styles.result} aria-labelledby="compare-result-heading">
          <h2 id="compare-result-heading" className={styles.resultTitle}>
            {t('ai.compareReady', 'نتيجة المقارنة')}
          </h2>
          <p className={styles.summary}>{result.summary}</p>

          {result.recommendation && (
            <div className={styles.recommendationBox} role="status">
              <span className={styles.recommendationIcon}>💡</span>
              <span>{result.recommendation}</span>
            </div>
          )}

          <div className={styles.quickCompare}>
            <div className={styles.quickRow}>
              <span className={styles.quickLabel}>الإجمالي</span>
              <span className={styles.quickValue} style={{ color: scoreColor(score1) }}>{score1}/100</span>
              <span className={styles.quickVs}>vs</span>
              <span className={styles.quickValue} style={{ color: scoreColor(score2) }}>{score2}/100</span>
            </div>
            <div className={styles.quickRow}>
              <span className={styles.quickLabel}>الحكم</span>
              <span className={styles.quickValue}>{getVerdict(s1) || '—'}</span>
              <span className={styles.quickVs}>vs</span>
              <span className={styles.quickValue}>{getVerdict(s2) || '—'}</span>
            </div>
            {(s1?.priceTarget || s2?.priceTarget) && (
              <div className={styles.quickRow}>
                <span className={styles.quickLabel}>الهدف</span>
                <span className={styles.quickValue}>{(s1?.priceTarget as { target?: number })?.target ?? '—'}</span>
                <span className={styles.quickVs}>vs</span>
                <span className={styles.quickValue}>{(s2?.priceTarget as { target?: number })?.target ?? '—'}</span>
              </div>
            )}
          </div>

          <div className={styles.winnerBox}>
            <span className={styles.winnerIcon}>🏆</span>
            <div>
              <p className={styles.winnerText}>الأفضل: <strong>{result.winner}</strong></p>
              <p className={styles.winnerReason}>{result.winnerReason ?? result.reason ?? ''}</p>
            </div>
          </div>

          <div className={styles.cards}>
            {[
              { s: s1, label: s1?.name ?? t1Upper, isWinner: is1Winner },
              { s: s2, label: s2?.name ?? t2Upper, isWinner: is2Winner },
            ].map(({ s, label, isWinner }, idx) => (
              <div key={idx} className={`${styles.card} ${isWinner ? styles.cardWinner : ''}`}>
                {isWinner && <div className={styles.winnerBadge}>✨ الأفضل</div>}

                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{label}</h3>
                  {typeof s?.score === 'number' && (
                    <div className={styles.scoreCircle} style={{ borderColor: scoreColor(s.score) }}>
                      <span className={styles.scoreNum} style={{ color: scoreColor(s.score) }}>{s.score}</span>
                    </div>
                  )}
                </div>

                {getVerdict(s) && verdictBadge(getVerdict(s))}

                {fund(s?.fundamental) && (
                  <div className={styles.sectionBlock}>
                    <span className={styles.sectionIcon}>📊</span>
                    <p className={styles.sectionText}>{fund(s?.fundamental)}</p>
                  </div>
                )}
                {tech(s?.technical) && (
                  <div className={styles.sectionBlock}>
                    <span className={styles.sectionIcon}>📈</span>
                    <p className={styles.sectionText}>{tech(s?.technical)}</p>
                  </div>
                )}

                {s?.strengths?.length > 0 && (
                  <div className={styles.points}>
                    {s.strengths.map((str, i) => (
                      <div key={i} className={styles.pointGood}>
                        <span className={styles.pointIcon}>✅</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                )}

                {s?.weaknesses?.length > 0 && (
                  <div className={styles.points}>
                    {s.weaknesses.map((w, i) => (
                      <div key={i} className={styles.pointBad}>
                        <span className={styles.pointIcon}>❌</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {s?.risks?.length > 0 && (
                  <div className={styles.points}>
                    {s.risks.map((r, i) => (
                      <div key={i} className={styles.pointRisk}>
                        <span className={styles.pointIcon}>⚠️</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.disclaimer && (
            <p className={styles.disclaimer}>⚖️ {result.disclaimer}</p>
          )}

          {(() => {
            const searchable = getSearchableTextFromCompare(result);
            const glossaryCards = getMatchedGlossaryCards(searchable);
            return glossaryCards.length > 0 ? <LearnSection cards={glossaryCards} /> : null;
          })()}
        </section>
        );
      })() }

      <ProfileGuardModal {...profileModalProps} />

      {showLimitModal && (
        <div className={styles.overlay} onClick={() => setShowLimitModal(false)} role="dialog" aria-modal="true">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('plan.analysisLimitTitle')}</h3>
            <p className={styles.modalBody}>{t('plan.analysisLimitBody')}</p>
            <div className={styles.modalActions}>
              <Button variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-subscription'))}>
                {t('plan.subscribeNow')}
              </Button>
              <Button variant="secondary" onClick={() => setShowLimitModal(false)}>
                {t('plan.waitNextMonth')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
