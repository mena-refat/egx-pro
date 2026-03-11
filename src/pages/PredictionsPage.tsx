import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { usePredictionsStore } from '../store/usePredictionsStore';
import { usePredictionsApi } from '../hooks/usePredictionsApi';
import { useAuthStore } from '../store/authStore';
import { PredictionCard } from '../components/predictions/PredictionCard';
import { NewPredictionSheet } from '../components/predictions/NewPredictionSheet';
import { Button } from '../components/ui/Button';
import { PAGINATION } from '../lib/constants';

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
  const myPagination = usePredictionsStore((s) => s.myPagination);
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
        <>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'following', 'top'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFeedFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  feedFilter === f ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {t(`predictions.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </button>
            ))}
          </div>
          {feedLoading && feedPredictions.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
              ))}
            </div>
          ) : feedPredictions.length === 0 ? (
            <p className="text-[var(--text-muted)] py-8 text-center">{t('predictions.emptyFeed')}</p>
          ) : (
            <div className="space-y-4">
              {feedPredictions.map((p) => (
                <PredictionCard
                  key={p.id}
                  prediction={p}
                  showLikeButton
                  onLike={() => api.toggleLike(p.id, 'feed', p.likeCount, p.isLikedByMe)}
                  variant="feed"
                />
              ))}
              {feedPagination && feedPagination.page < feedPagination.totalPages && (
                <Button
                  variant="secondary"
                  onClick={() => fetchFeed((feedPagination?.page ?? 1) + 1)}
                  disabled={feedLoading}
                >
                  {t('predictions.loadMore')}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'my' && (
        <>
          {myStats && (
            <div className="flex gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <span className="text-sm">{(myStats.totalPoints ?? 0)} {t('predictions.pointsShort')}</span>
              <span className="text-sm">{(myStats.accuracyRate ?? 0).toFixed(0)}% {t('predictions.accuracy')}</span>
              <span className="text-sm">{myStats.correctPredictions ?? 0} / {myStats.totalPredictions ?? 0}</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {['ACTIVE', 'HIT', 'MISSED', 'EXPIRED'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMyStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  myStatusFilter === s ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)]'
                }`}
              >
                {s === 'HIT' ? t('predictions.hitBadge') : s === 'MISSED' ? t('predictions.missedBadge') : s === 'EXPIRED' ? t('predictions.expiredBadge') : t('predictions.statusActive')}
              </button>
            ))}
          </div>
          {myLoading && myPredictions.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
              ))}
            </div>
          ) : myPredictions.length === 0 ? (
            <p className="text-[var(--text-muted)] py-8 text-center">{t('predictions.emptyMy')}</p>
          ) : (
            <div className="space-y-4">
              {myPredictions.map((p) => (
                <PredictionCard key={p.id} prediction={p} variant="my" />
              ))}
            </div>
          )}
          <div className="fixed bottom-20 end-6 z-40 flex flex-col items-end gap-1">
            {!canCreate && (
              <span className="text-xs text-[var(--text-muted)]" title={dailyLimits?.resetsAt}>
                {t('predictions.limitReached')}
              </span>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={openNewPrediction}
              disabled={!canCreate}
              aria-label={t('predictions.newPrediction')}
              className="rounded-full w-14 h-14 shadow-lg"
            >
              +
            </Button>
          </div>
        </>
      )}

      {activeTab === 'leaderboard' && (
        <>
          {leaderboardLoading && leaderboard.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-[var(--text-muted)] py-8 text-center">—</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
                >
                  <span className="font-bold text-[var(--text-muted)] w-8">#{entry.position}</span>
                  <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-sm font-medium">
                    {(entry.user?.username ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium truncate flex-1">@{entry.user?.username ?? '—'}</span>
                  <span className="text-sm text-[var(--text-muted)]">{(entry.accuracyRate ?? 0).toFixed(0)}%</span>
                  <span className="text-sm font-medium">{entry.totalPoints} {t('predictions.pointsShort')}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === 'stock' && (
        <p className="text-[var(--text-muted)] py-8 text-center">
          {t('predictions.selectStock')} — قريباً
        </p>
      )}

      {isNewPredictionOpen && (
        <NewPredictionSheet onClose={() => usePredictionsStore.getState().closeNewPrediction()} />
      )}
    </div>
  );
}
