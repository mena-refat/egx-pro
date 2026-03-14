import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain } from 'lucide-react';
import api, { ANALYSIS_TIMEOUT_MS } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TickerSuggestInput } from '../components/ui/TickerSuggestInput';
import { AnalysisResult } from '../components/analysis/AnalysisResult';
import { AnalysisLoadingState } from '../components/analysis/AnalysisLoadingState';
import { QuickAnalysisCard } from '../components/analysis/QuickAnalysisCard';
import { getStockInfo, searchStocks } from '../lib/egxStocks';
import { useProfileGuard } from '../hooks/useProfileGuard';
import { ProfileGuardModal } from '../components/ui/ProfileGuardModal';
import type { AnalysisResult as AnalysisResultType } from '../types';
import styles from './AIAnalyzePage.module.scss';

export default function AIAnalyzePage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResultType | null>(null);
  const [quickData, setQuickData] = useState<Record<string, unknown> | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { guardedAction, profileModalProps } = useProfileGuard();

  const fetchQuick = useCallback(async (resolvedTicker: string) => {
    setQuickLoading(true);
    try {
      const res = await api.get<{ data?: { analysis?: Record<string, unknown> }; analysis?: Record<string, unknown> }>(
        `/analysis/quick/${resolvedTicker}`
      );
      const data = (res.data as { data?: { analysis?: Record<string, unknown> } })?.data?.analysis ?? (res.data as { analysis?: Record<string, unknown> })?.analysis;
      if (data) setQuickData(data);
    } catch {
      // non-critical — just don't show quick
    } finally {
      setQuickLoading(false);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    const raw = ticker.trim();
    if (!raw) {
      setError(t('ai.enterTicker'));
      return;
    }
    // Try exact ticker match first, then fall back to name search
    let resolvedTicker = raw.toUpperCase();
    if (!getStockInfo(resolvedTicker)) {
      const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
      const matches = searchStocks(raw, lang);
      if (matches.length === 1) {
        resolvedTicker = matches[0].ticker;
      } else {
        setError(t('ai.selectFromList'));
        return;
      }
    }
    setError(null);
    setAnalysis(null);
    setQuickData(null);
    setLoading(true);
    fetchQuick(resolvedTicker);
    try {
      const res = await api.post<{ data: { analysis: AnalysisResultType } }>(`/analysis/${resolvedTicker}`, undefined, { timeout: ANALYSIS_TIMEOUT_MS });
      const data = res.data?.data?.analysis ?? (res.data as { analysis?: AnalysisResultType })?.analysis;
      if (data) setAnalysis(data);
      else setError(t('common.error'));
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { status?: number; data?: { error?: string; message?: string } } };
      const res = axiosErr?.response;
      const code = res?.data?.error;
      const status = res?.status;

      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else if (status === 401) {
        setError(t('ai.sessionExpired'));
      } else if (status === 429) {
        setError('خدمة التحليل مشغولة حالياً. حاول بعد دقيقة.');
      } else if (status === 502 || status === 504) {
        setError('التحليل أخد وقت طويل. حاول تاني.');
      } else if (status === 503) {
        setError(t('ai.serviceUnavailable'));
      } else if (axiosErr?.code === 'ECONNABORTED') {
        setError('التحليل أخد وقت طويل. حاول تاني.');
      } else {
        const msg = (err as Error)?.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError('مفيش اتصال بالإنترنت. تأكد من الاتصال وحاول تاني.');
        } else if (msg.includes('empty') || msg.includes('Empty')) {
          setError('التحليل رجع فاضي — حاول تاني أو جرب سهم تاني.');
        } else {
          setError('حدث خطأ غير متوقع. حاول تاني بعد شوية.');
        }
        if (import.meta.env.DEV) console.error('Analysis error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [ticker, t, i18n.language, fetchQuick]);

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
        <Brain className={styles.headerIcon} aria-hidden />
        <h1 className={styles.title}>{t('ai.analyzeStock')}</h1>
        <p className={styles.subtitle}>{t('ai.analyzeStockDesc')}</p>
      </header>

      <div className={styles.form}>
        <TickerSuggestInput
          value={ticker}
          onChange={setTicker}
          placeholder={t('ai.tickerPlaceholder')}
          wrapperClassName={styles.input}
          dir="ltr"
          disabled={loading}
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => guardedAction(runAnalysis)}
          disabled={loading}
          className={styles.btn}
        >
          {t('ai.getAnalysis')}
        </Button>
      </div>

      <AnalysisLoadingState loading={loading} variant="analyze" />

      {error && <p className={styles.error} role="alert">{error}</p>}

      {quickData && !analysis && (
        <QuickAnalysisCard
          data={quickData as Parameters<typeof QuickAnalysisCard>[0]['data']}
          onDeepAnalysis={() => guardedAction(runAnalysis)}
          loading={loading}
        />
      )}

      {analysis && (
        <div className={styles.result}>
          <AnalysisResult analysis={analysis} t={t} />
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
