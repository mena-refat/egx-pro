import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Brain, GitCompare, Sparkles, Award, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAIPlan } from '../hooks/useAIPlan';
import { useAIAccuracy } from '../hooks/useAIAccuracy';
import { useProfileGuard } from '../hooks/useProfileGuard';
import { ProfileGuardModal } from '../components/ui/ProfileGuardModal';
import styles from './AIPage.module.scss';

export default function AIPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const { used, quota, loading } = useAIPlan(isAuthenticated);
  const { stats: accuracy, loading: accLoading } = useAIAccuracy();
  const { guardedAction, profileModalProps } = useProfileGuard();

  // ترتيب العرض: في العربي (RTL) اليمين = توصيات، الوسط = مقارنة، اليسار = تحليل سهم
  const cards = [
    {
      id: 'recommendations',
      titleKey: 'ai.personalRecommendations',
      descKey: 'ai.personalRecommendationsDesc',
      icon: Sparkles,
      path: '/ai/recommendations',
      points: 1,
      color: '#f59e0b',
    },
    {
      id: 'compare',
      titleKey: 'ai.compareStocks',
      descKey: 'ai.compareStocksDesc',
      icon: GitCompare,
      path: '/ai/compare',
      points: 2,
      color: '#3b82f6',
    },
    {
      id: 'analyze',
      titleKey: 'ai.analyzeStock',
      descKey: 'ai.analyzeStockDesc',
      icon: Brain,
      path: '/ai/analyze',
      points: 1,
      color: '#7c3aed',
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('ai.title')}</h1>
        <p className={styles.subtitle}>{t('ai.subtitle')}</p>
        {isAuthenticated && !loading && (
          <div className={styles.quota}>
            <span className={styles.quotaLabel}>{t('ai.quotaThisMonth')}</span>
            <span className={styles.quotaValue}>
              {used} / {quota}
            </span>
          </div>
        )}
      </header>

      {!accLoading && accuracy && accuracy.checked > 0 && (
        <div className={styles.trackRecord}>
          <h3 className={styles.trackRecordTitle}>
            <Award className={styles.trackRecordTitleIcon} aria-hidden />
            سجل أداء التحليلات
          </h3>
          <div className={styles.trackRecordGrid}>
            <div className={styles.trackRecordStat}>
              <p className={`${styles.trackRecordValue} ${styles.trackRecordValueBrand}`}>{accuracy.avgAccuracy}%</p>
              <p className={styles.trackRecordLabel}>متوسط الدقة</p>
            </div>
            <div className={styles.trackRecordStat}>
              <p className={`${styles.trackRecordValue} ${styles.trackRecordValueSuccess}`}>{accuracy.hitRate}%</p>
              <p className={styles.trackRecordLabel}>نسبة التوقعات الصحيحة</p>
            </div>
            <div className={styles.trackRecordStat}>
              <p className={styles.trackRecordValue}>{accuracy.checked}</p>
              <p className={styles.trackRecordLabel}>تحليل تم التحقق منه</p>
            </div>
          </div>
          <p className={styles.trackRecordNote}>
            يتم التحقق من التوقعات تلقائياً بعد 7 و 30 يوم من التحليل
          </p>
        </div>
      )}

      <div className={styles.grid}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={styles.card}
            onClick={() => guardedAction(() => navigate(card.path))}
            aria-label={t(card.titleKey)}
            style={{
              '--card-color': card.color,
              borderColor: `${card.color}30`,
              background: `linear-gradient(135deg, ${card.color}08 0%, var(--bg-card) 60%)`,
            } as React.CSSProperties}
          >
            <div
              className={styles.cardIcon}
              style={{ background: `${card.color}18`, color: card.color }}
            >
              <card.icon className={styles.icon} aria-hidden style={{ color: card.color }} />
            </div>
            <h2 className={styles.cardTitle}>{t(card.titleKey)}</h2>
            <p className={styles.cardDesc}>{t(card.descKey)}</p>
            <div className={styles.points}>
              <Zap className={styles.pointsIcon} aria-hidden style={{ color: card.color }} />
              <span style={{ color: card.color }}>{t('ai.pointsCost', { count: card.points })}</span>
            </div>
          </button>
        ))}
      </div>

      <ProfileGuardModal {...profileModalProps} />
    </div>
  );
}
