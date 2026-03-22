import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, HelpCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { usePredictionsStore } from '../store/usePredictionsStore';
import { usePredictionsApi } from '../hooks/usePredictionsApi';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';
import { ScoringInfoCard } from '../components/features/predictions/ScoringInfoCard';
const NewPredictionSheet = lazy(() => import('../components/features/predictions/NewPredictionSheet').then((m) => ({ default: m.NewPredictionSheet })));
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
  const removePrediction = usePredictionsStore((s) => s.removePrediction);
  const api = usePredictionsApi();
  const { fetchFeed, fetchMy, fetchLeaderboard, fetchLimits, fetchMyStats } = api;

  const handleDelete = async (id: string) => {
    await api.deletePrediction(id);
    removePrediction(id);
  };

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

  const canCreate = dailyLimits
    ? dailyLimits.used < dailyLimits.limit && dailyLimits.activeUsed < dailyLimits.activeLimit
    : true;
  const [scoringInfoOpen, setScoringInfoOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-8 h-8 text-[var(--brand)]" aria-hidden />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('predictions.title')}</h1>
        </div>
        <button
          type="button"
          onClick={() => setScoringInfoOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-amber-400 transition-colors text-sm"
          title={t('predictions.scoringInfoTitle')}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">{t('predictions.scoringInfoTitle')}</span>
        </button>
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
          onNewPrediction={openNewPrediction}
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
          limits={dailyLimits ?? undefined}
          onNewPrediction={openNewPrediction}
          onDelete={handleDelete}
        />
      )}

      {activeTab === 'leaderboard' && (
        <PredictionsLeaderboardTab entries={leaderboard} loading={leaderboardLoading} />
      )}

      {activeTab === 'stock' && <PredictionsStockTab />}

      {isNewPredictionOpen && (
        <Suspense fallback={<Skeleton height={400} className="w-full rounded-xl" />}>
          <NewPredictionSheet onClose={() => usePredictionsStore.getState().closeNewPrediction()} />
        </Suspense>
      )}

      <AnimatePresence>
        {scoringInfoOpen && <ScoringInfoCard onClose={() => setScoringInfoOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
