import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import api, { ANALYSIS_TIMEOUT_MS } from '../lib/api';
import { Button } from '../components/ui/Button';
import { useProfileGuard } from '../hooks/useProfileGuard';
import { ProfileGuardModal } from '../components/ui/ProfileGuardModal';
import type { RecommendationsResult } from '../types';
import styles from './AIRecommendationsPage.module.scss';

export default function AIRecommendationsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { guardedAction, profileModalProps } = useProfileGuard();

  const runRecommendations = useCallback(async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post<{ data: { recommendations: RecommendationsResult } }>('/analysis/recommendations', {}, { timeout: ANALYSIS_TIMEOUT_MS });
      const data = res.data?.data?.recommendations ?? (res.data as { recommendations?: RecommendationsResult })?.recommendations;
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
          onClick={() => guardedAction(runRecommendations)}
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
          {result.portfolioHealth && (
            <div className={styles.portfolioHealth}>
              <div className={styles.healthRow}>
                <span className={styles.healthLabel}>{t('ai.portfolioScore', { defaultValue: 'صحة المحفظة' })}</span>
                <div className={styles.healthScoreBar} role="progressbar" aria-valuenow={result.portfolioHealth.score} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.healthScoreFill} style={{ width: `${result.portfolioHealth.score}%` }} />
                  <span className={styles.healthScoreLabel}>{result.portfolioHealth.score}/100</span>
                </div>
              </div>
              <p className={styles.healthMeta}>
                {t('ai.diversification', { defaultValue: 'التنويع' })}: {result.portfolioHealth.diversification} · {t('ai.riskLevel', { defaultValue: 'مستوى المخاطر' })}: {result.portfolioHealth.riskLevel}
              </p>
              {result.portfolioHealth.issues?.length > 0 && (
                <ul className={styles.healthIssues}>
                  {result.portfolioHealth.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {result.marketOutlook && <p className={styles.marketOutlook}>{result.marketOutlook}</p>}
          {result.portfolioAdvice && (
            <p className={styles.advice}>{result.portfolioAdvice}</p>
          )}
          {result.sectorsToWatch?.length > 0 && (
            <div className={styles.sectorsWrap}>
              {result.sectorsToWatch.map((s, i) => (
                <span key={i} className={styles.sectorTag}>{s}</span>
              ))}
            </div>
          )}
          {result.recommendations?.length > 0 && (
            <ul className={styles.list}>
              {result.recommendations.map((r, i) => (
                <li key={i} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.ticker}>{r.ticker}</span>
                    {r.name && <span className={styles.name}>{r.name}</span>}
                    <span className={styles.action}>{r.action}</span>
                    {r.urgency && (
                      <span className={styles.urgency} data-urgency={r.urgency === 'فوري' ? 'high' : r.urgency === 'خلال أسبوع' ? 'medium' : 'low'}>
                        {r.urgency}
                      </span>
                    )}
                  </div>
                  <span className={styles.reason}>{r.reason}</span>
                  {(r.targetPrice != null || r.stopLoss != null) && (
                    <span className={styles.targets}>
                      {r.targetPrice != null && <span>{t('ai.targetPrice', { defaultValue: 'السعر المستهدف' })}: {r.targetPrice}</span>}
                      {r.stopLoss != null && <span>{t('ai.stopLoss', { defaultValue: 'وقف الخسارة' })}: {r.stopLoss}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
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
