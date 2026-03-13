import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import type { RecommendationsResult } from '../types';
import styles from './AIRecommendationsPage.module.scss';

export default function AIRecommendationsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const runRecommendations = useCallback(async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post<{ data: { recommendations: RecommendationsResult } }>('/analysis/recommendations');
      const data = res.data?.data?.recommendations ?? (res.data as { recommendations?: RecommendationsResult })?.recommendations;
      if (data) setResult(data);
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
  }, [t]);

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
        <Sparkles className={styles.headerIcon} aria-hidden />
        <h1 className={styles.title}>{t('ai.personalRecommendations')}</h1>
        <p className={styles.subtitle}>{t('ai.personalRecommendationsDesc')}</p>
      </header>

      <div className={styles.form}>
        <Button
          type="button"
          variant="primary"
          onClick={runRecommendations}
          loading={loading}
          disabled={loading}
          className={styles.btn}
        >
          {t('ai.getRecommendations')}
        </Button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && (
        <div className={styles.result}>
          <p className={styles.summary}>{result.summary}</p>
          {result.portfolioAdvice && (
            <p className={styles.advice}>{result.portfolioAdvice}</p>
          )}
          {result.recommendations?.length > 0 && (
            <ul className={styles.list}>
              {result.recommendations.map((r, i) => (
                <li key={i} className={styles.item}>
                  <span className={styles.ticker}>{r.ticker}</span>
                  <span className={styles.action}>{r.action}</span>
                  <span className={styles.reason}>{r.reason}</span>
                </li>
              ))}
            </ul>
          )}
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
