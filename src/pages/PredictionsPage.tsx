import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { usePredictionsStore } from '../store/usePredictionsStore';
import { usePredictionsApi } from '../hooks/usePredictionsApi';
import { useAuthStore } from '../store/authStore';
import { NewPredictionSheet } from '../components/predictions/NewPredictionSheet';
import {
  PredictionsFeedTab,
  PredictionsMyTab,
  PredictionsLeaderboardTab,
  PredictionsStockTab,
} from '../components/features/predictions';

type TabId = 'feed' | 'my' | 'leaderboard' | 'stock';

export default function PredictionsPage() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [myStatusFilter, setMyStatusFilter] = useState<string>('ACTIVE');

  const feedPredictions = usePredictionsStore((s) => s.feedPredictions);
  const feedPagination = usePredictionsStore((s) => s.feedPagination);
  const feedLoading = usePredictionsStore((s) => s.feedLoading);
  const feedFilter = usePredictionsStore((s) => s.feedFilter);
  const setFeedFilter = usePredictionsStore((s) => s.setFeedFilter);
  const myPredictions = usePredictionsStore((s) => s.myPredictions);
  const myLoading = usePredictionsStore((s) => s.myLoading);
  const myStats = usePredictionsStore((s) => s.myStats);
  const leaderboard = usePredictionsStore((s) => s.leaderboard);
  const leaderboardLoading = usePredictionsStore((s) => s.leaderboardLoading);
  const dailyLimits = usePredictionsStore((s) => s.dailyLimits);
  const openNewPrediction = usePredictionsStore((s) => s.openNewPrediction);
  const isNewPredictionOpen = usePredictionsStore((s) => s.isNewPredictionOpen);

  const username = useAuthStore((s) => s.user?.username);
  const setMyStats = usePredictionsStore((s) => s.setMyStats);
  const api = usePredictionsApi();
  const { fetchFeed, fetchMy, fetchLeaderboard, fetchLimits, fetchMyStats } = api;

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  useEffect(() => {
    if (activeTab === 'feed') fetchFeed(1);
  }, [activeTab, feedFilter, fetchFeed]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMy(1, myStatusFilter);
      if (username) fetchMyStats(username).then((s) => s && setMyStats(s));
    }
  }, [activeTab, myStatusFilter, fetchMy, username, fetchMyStats, setMyStats]);

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard('alltime');
  }, [activeTab, fetchLeaderboard]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'feed', label: t('predictions.tabAll') },
    { id: 'my', label: t('predictions.tabMy') },
    { id: 'leaderboard', label: t('predictions.tabLeaderboard') },
    { id: 'stock', label: t('predictions.tabPerStock') },
  ];

  const canCreate = dailyLimits ? dailyLimits.used < dailyLimits.limit : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="w-8 h-8 text-[var(--brand)]" aria-hidden />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('predictions.title')}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--brand)] text-[var(--text-inverse)]'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'feed' && (
        <PredictionsFeedTab
          predictions={feedPredictions}
          pagination={feedPagination}
          loading={feedLoading}
          filter={feedFilter}
          onFilter={setFeedFilter}
          onLoadMore={() => fetchFeed((feedPagination?.page ?? 1) + 1)}
          onLike={(id, source, likeCount, isLiked) => api.toggleLike(id, source, likeCount, isLiked)}
        />
      )}

      {activeTab === 'my' && (
        <PredictionsMyTab
          predictions={myPredictions}
          loading={myLoading}
          stats={myStats}
          statusFilter={myStatusFilter}
          onStatusFilter={setMyStatusFilter}
          canCreate={canCreate}
          limitReachedLabel={dailyLimits?.resetsAt}
          onNewPrediction={openNewPrediction}
        />
      )}

      {activeTab === 'leaderboard' && (
        <PredictionsLeaderboardTab entries={leaderboard} loading={leaderboardLoading} />
      )}

      {activeTab === 'stock' && <PredictionsStockTab />}

      {isNewPredictionOpen && (
        <NewPredictionSheet onClose={() => usePredictionsStore.getState().closeNewPrediction()} />
      )}
    </div>
  );
}
