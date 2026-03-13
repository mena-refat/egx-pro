import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AnalysisResult } from '../components/analysis/AnalysisResult';
import type { AnalysisResult as AnalysisResultType } from '../types';
import styles from './AIAnalyzePage.module.scss';

export default function AIAnalyzePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResultType | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const runAnalysis = useCallback(async () => {
    const tkr = ticker.trim().toUpperCase();
    if (!tkr) {
      setError(t('ai.enterTicker'));
      return;
    }
    setError(null);
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await api.post<{ data: { analysis: AnalysisResultType } }>(`/analysis/${tkr}`);
      const data = res.data?.data?.analysis ?? (res.data as { analysis?: AnalysisResultType })?.analysis;
      if (data) setAnalysis(data);
      else setError(t('common.error'));
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      if (code === 'ANALYSIS_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else {
        setError((err as Error)?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [ticker, t]);

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
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder={t('ai.tickerPlaceholder')}
          wrapperClassName={styles.input}
          dir="ltr"
          disabled={loading}
        />
        <Button
          type="button"
          variant="primary"
          onClick={runAnalysis}
          loading={loading}
          disabled={loading}
          className={styles.btn}
        >
          {t('ai.getAnalysis')}
        </Button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {analysis && (
        <div className={styles.result}>
          <AnalysisResult analysis={analysis} t={t} />
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
