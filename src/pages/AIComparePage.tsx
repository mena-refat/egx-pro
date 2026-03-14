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
      const serverMessage = res?.data?.message;

      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else if (serverMessage) {
        setError(serverMessage);
      } else if (status === 401) {
        setError(t('ai.sessionExpired'));
      } else if (status === 429) {
        setError('خدمة التحليل مشغولة حالياً. حاول بعد دقيقة.');
      } else if (status === 502 || status === 504) {
        setError('التحليل أخد وقت طويل. حاول تاني.');
      } else if (status === 503) {
        setError(t('ai.serviceUnavailable'));
      } else if (axiosErr?.code === 'ECONNABORTED') {
        setError('التحليل أخد وقت طويل. حاول تاني — Claude بيبحث عن البيانات.');
      } else {
        setError('حدث خطأ. حاول تاني.');
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
              <h3 className={styles.cardTitle}>{result.ticker1?.name ?? ticker1.trim().toUpperCase()}</h3>
              {typeof result.ticker1?.score === 'number' && (
                <div className={styles.scoreBar} role="progressbar" aria-valuenow={result.ticker1.score} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.scoreFill} style={{ width: `${result.ticker1.score}%` }} />
                  <span className={styles.scoreLabel}>{result.ticker1.score}/100</span>
                </div>
              )}
              <p className={styles.verdict}>{result.ticker1?.verdict}</p>
              {result.ticker1?.fundamental && <p className={styles.fundamental}>{result.ticker1.fundamental}</p>}
              {result.ticker1?.technical && <p className={styles.technical}>{result.ticker1.technical}</p>}
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
              {result.ticker1?.risks?.length > 0 && (
                <ul className={styles.list} aria-label={t('ai.risks', { defaultValue: 'المخاطر' })}>
                  {result.ticker1.risks.map((r, i) => (
                    <li key={i} className={styles.risk}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{result.ticker2?.name ?? ticker2.trim().toUpperCase()}</h3>
              {typeof result.ticker2?.score === 'number' && (
                <div className={styles.scoreBar} role="progressbar" aria-valuenow={result.ticker2.score} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.scoreFill} style={{ width: `${result.ticker2.score}%` }} />
                  <span className={styles.scoreLabel}>{result.ticker2.score}/100</span>
                </div>
              )}
              <p className={styles.verdict}>{result.ticker2?.verdict}</p>
              {result.ticker2?.fundamental && <p className={styles.fundamental}>{result.ticker2.fundamental}</p>}
              {result.ticker2?.technical && <p className={styles.technical}>{result.ticker2.technical}</p>}
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
              {result.ticker2?.risks?.length > 0 && (
                <ul className={styles.list} aria-label={t('ai.risks', { defaultValue: 'المخاطر' })}>
                  {result.ticker2.risks.map((r, i) => (
                    <li key={i} className={styles.risk}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className={styles.winner}>
            {t('ai.winner')}: <strong>{result.winner}</strong>
          </p>
          <p className={styles.reason}>{result.reason}</p>
          {result.recommendation && (
            <div className={styles.recommendationBox} role="status">
              {result.recommendation}
            </div>
          )}
          {result.disclaimer && (
            <p className={styles.disclaimer}>{result.disclaimer}</p>
          )}
        </div>
      )}

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
