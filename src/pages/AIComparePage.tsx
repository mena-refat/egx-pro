import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare } from 'lucide-react';
import api, { ANALYSIS_TIMEOUT_MS } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TickerSuggestInput } from '../components/ui/TickerSuggestInput';
import { getStockInfo } from '../lib/egxStocks';
import type { CompareResult } from '../types';
import styles from './AIComparePage.module.scss';

export default function AIComparePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [ticker1, setTicker1] = useState('');
  const [ticker2, setTicker2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const runCompare = useCallback(async () => {
    const t1 = ticker1.trim().toUpperCase();
    const t2 = ticker2.trim().toUpperCase();
    if (!t1 || !t2) {
      setError(t('ai.enterTwoTickers'));
      return;
    }
    if (t1 === t2) {
      setError(t('ai.differentTickers'));
      return;
    }
    if (!getStockInfo(t1) || !getStockInfo(t2)) {
      setError(t('ai.selectFromList'));
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
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number; data?: { error?: string } } }).response
        : undefined;
      const code = res?.data?.error;
      const status = res?.status;
      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else if (status === 404) {
        setError(code === 'NOT_FOUND' ? t('ai.error404Stock') : t('ai.error404Route'));
      } else {
        setError((err as Error)?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [ticker1, ticker2, t]);

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
          onClick={runCompare}
          loading={loading}
          disabled={loading}
          className={styles.btn}
        >
          {t('ai.getComparison')}
        </Button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && (
        <div className={styles.result}>
          <p className={styles.summary}>{result.summary}</p>
          <div className={styles.cards}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{ticker1.trim().toUpperCase()}</h3>
              <p className={styles.verdict}>{result.ticker1?.verdict}</p>
              {result.ticker1?.strengths?.length > 0 && (
                <ul className={styles.list}>
                  {result.ticker1.strengths.map((s, i) => (
                    <li key={i} className={styles.strength}>{s}</li>
                  ))}
                </ul>
              )}
              {result.ticker1?.weaknesses?.length > 0 && (
                <ul className={styles.list}>
                  {result.ticker1.weaknesses.map((w, i) => (
                    <li key={i} className={styles.weakness}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{ticker2.trim().toUpperCase()}</h3>
              <p className={styles.verdict}>{result.ticker2?.verdict}</p>
              {result.ticker2?.strengths?.length > 0 && (
                <ul className={styles.list}>
                  {result.ticker2.strengths.map((s, i) => (
                    <li key={i} className={styles.strength}>{s}</li>
                  ))}
                </ul>
              )}
              {result.ticker2?.weaknesses?.length > 0 && (
                <ul className={styles.list}>
                  {result.ticker2.weaknesses.map((w, i) => (
                    <li key={i} className={styles.weakness}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className={styles.winner}>
            {t('ai.winner')}: <strong>{result.winner}</strong>
          </p>
          <p className={styles.reason}>{result.reason}</p>
          {result.disclaimer && (
            <p className={styles.disclaimer}>{result.disclaimer}</p>
          )}
        </div>
      )}

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
