import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Brain, GitCompare, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAIPlan } from '../hooks/useAIPlan';
import styles from './AIPage.module.scss';

export default function AIPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const { used, quota, loading } = useAIPlan(isAuthenticated);

  const cards = [
    {
      id: 'analyze',
      titleKey: 'ai.analyzeStock',
      descKey: 'ai.analyzeStockDesc',
      icon: Brain,
      path: '/ai/analyze',
      points: 1,
    },
    {
      id: 'compare',
      titleKey: 'ai.compareStocks',
      descKey: 'ai.compareStocksDesc',
      icon: GitCompare,
      path: '/ai/compare',
      points: 2,
    },
    {
      id: 'recommendations',
      titleKey: 'ai.personalRecommendations',
      descKey: 'ai.personalRecommendationsDesc',
      icon: Sparkles,
      path: '/ai/recommendations',
      points: 1,
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

      <div className={styles.grid}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={styles.card}
            onClick={() => navigate(card.path)}
            aria-label={t(card.titleKey)}
          >
            <div className={styles.cardIcon}>
              <card.icon className={styles.icon} aria-hidden />
            </div>
            <h2 className={styles.cardTitle}>{t(card.titleKey)}</h2>
            <p className={styles.cardDesc}>{t(card.descKey)}</p>
            <span className={styles.points}>{t('ai.pointsCost', { count: card.points })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
