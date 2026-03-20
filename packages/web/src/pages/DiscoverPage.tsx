import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Users, UserPlus, UserCheck, Bell } from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { useDiscoverSearch } from '../hooks/useDiscoverSearch';
import { useDiscoverAutocomplete } from '../hooks/useDiscoverAutocomplete';
import { DiscoverSearchBar } from '../components/features/discover/DiscoverSearchBar';
import { DiscoverResultsList } from '../components/features/discover/DiscoverResultsList';
import { DiscoverSkeleton } from '../components/features/discover/DiscoverSkeleton';
import { UserListSkeleton } from '../components/features/discover/UserListSkeleton';
import { LeaderboardSection } from '../components/features/discover/LeaderboardSection';
import { CommunityFeedSection } from '../components/features/discover/CommunityFeedSection';
import { UserList } from '../components/features/discover/UserList';
import { FollowRequestsList } from '../components/features/discover/FollowRequestsList';
import { DiscoverTabs } from '../components/features/discover/DiscoverTabs';
import EmptyState from '../components/shared/EmptyState';
import { DISCOVER } from '../lib/constants';
import api from '../lib/api';
import { Tab, FollowUser, PendingRequest, LeaderboardEntry, FeedPrediction } from '../components/features/discover/types';
import styles from './DiscoverPage.module.scss';

export default function DiscoverPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isRtl = i18n.language.startsWith('ar');
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const [activeTab, setActiveTab] = useState<Tab>('discover');

  const {
    query, setQuery, results, loading: searchLoading, updating,
    handleFollow, handleUnfollow,
  } = useDiscoverSearch();

  const {
    suggestions, loading: autoLoading, open: showDrop, setOpen: setDropOpen,
    highlightedIndex, inputRef, dropdownRef, handleSelect, handleKeyDown,
  } = useDiscoverAutocomplete(query, setQuery, accessToken);

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communityFeed, setCommunityFeed] = useState<FeedPrediction[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  const loadList = useCallback(async (tab: Tab, signal?: AbortSignal) => {
    if (!accessToken) return;
    setListLoading(true);
    try {
      if (tab === 'followers') {
        const res = await api.get('/social/followers', { signal });
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data) ? data : (data as { followers?: FollowUser[] })?.followers ?? [];
        setFollowers(list);
        setFollowersCount(list.length);
      } else if (tab === 'following') {
        const res = await api.get('/social/following', { signal });
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data) ? data : (data as { following?: FollowUser[] })?.following ?? [];
        setFollowing(list);
        setFollowingCount(list.length);
      } else if (tab === 'requests') {
        const res = await api.get('/social/requests', { signal });
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data) ? data : (data as { requests?: PendingRequest[] })?.requests ?? [];
        setRequests(list);
        setRequestsCount(list.length);
      }
    } catch {
      // ignore — cancelled or network error
    } finally {
      setListLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      queueMicrotask(() => { if (!mountedRef.current) return; setDiscoverLoading(false); });
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setDiscoverLoading(true);
      const timeoutId = setTimeout(() => setDiscoverLoading(false), 8000);
      try {
        const [lb, feed, fwrs, fwng, reqs] = await Promise.allSettled([
          api.get('/predictions/leaderboard?period=month&limit=5', { signal: controller.signal }),
          api.get('/predictions/feed?filter=all&limit=5', { signal: controller.signal }),
          api.get('/social/followers', { signal: controller.signal }),
          api.get('/social/following', { signal: controller.signal }),
          api.get('/social/requests', { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        if (lb.status === 'fulfilled') {
          const d = lb.value.data?.data ?? lb.value.data;
          setLeaderboard(Array.isArray(d) ? d : (d as { items?: LeaderboardEntry[] })?.items ?? []);
        }
        if (feed.status === 'fulfilled') {
          const d = feed.value.data?.data ?? feed.value.data;
          setCommunityFeed((d as { items?: FeedPrediction[] })?.items ?? (Array.isArray(d) ? d : []));
        }
        if (fwrs.status === 'fulfilled') {
          const d = fwrs.value.data?.data ?? fwrs.value.data;
          setFollowersCount((Array.isArray(d) ? d : (d as { followers?: FollowUser[] })?.followers ?? []).length);
        }
        if (fwng.status === 'fulfilled') {
          const d = fwng.value.data?.data ?? fwng.value.data;
          setFollowingCount((Array.isArray(d) ? d : (d as { following?: FollowUser[] })?.following ?? []).length);
        }
        if (reqs.status === 'fulfilled') {
          const d = reqs.value.data?.data ?? reqs.value.data;
          setRequestsCount((Array.isArray(d) ? d : (d as { requests?: PendingRequest[] })?.requests ?? []).length);
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(timeoutId);
        setDiscoverLoading(false);
      }
    })();
    return () => { controller.abort(); };
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'discover') return;
    const controller = new AbortController();
    void loadList(activeTab, controller.signal);
    return () => controller.abort();
  }, [activeTab, loadList]);

  const handleAcceptRequest = async (followerId: string) => {
    try {
      await api.post(`/social/requests/${followerId}/accept`);
      setRequests((prev) => prev.filter((r) => r.followerId !== followerId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
      setFollowersCount((prev) => prev + 1);
    } catch { /* ignore */ }
  };

  const handleDeclineRequest = async (followerId: string) => {
    try {
      await api.post(`/social/requests/${followerId}/decline`);
      setRequests((prev) => prev.filter((r) => r.followerId !== followerId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: 'discover' as Tab, label: t('social.discoverPage.tabDiscover'), icon: Search },
    { id: 'followers' as Tab, label: t('social.discoverPage.tabFollowers'), icon: Users, count: followersCount },
    { id: 'following' as Tab, label: t('social.discoverPage.tabFollowing'), icon: UserCheck, count: followingCount },
    ...(requestsCount > 0 ? [{ id: 'requests' as Tab, label: t('social.discoverPage.tabRequests'), icon: Bell, count: requestsCount }] : []),
  ];

  const isSearchActive = query.trim().length >= 2;

  return (
    <div className={styles.page} dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className={styles.title}>{t('social.discoverPage.title')}</h1>
      <p className={styles.subtitle}>{t('social.discoverPage.subtitle')}</p>

      <DiscoverSearchBar
        query={query}
        setQuery={setQuery}
        searchLoading={searchLoading}
        autoLoading={autoLoading}
        suggestions={suggestions}
        showDrop={showDrop}
        setDropOpen={setDropOpen}
        highlightedIndex={highlightedIndex}
        inputRef={inputRef}
        dropdownRef={dropdownRef}
        handleSelect={handleSelect}
        handleKeyDown={handleKeyDown}
        minUsernameLength={DISCOVER.minUsernameLength}
        t={t}
      />

      {isSearchActive ? (
        <div className={styles.searchResults}>
          {searchLoading ? (
            <div className={styles.loader}>
              <Loader2 className={styles.spinnerLarge} aria-hidden />
            </div>
          ) : results.length > 0 ? (
            <DiscoverResultsList
              results={results}
              updating={updating}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t('social.discoverPage.noSearchResultsTitle')}
              description={t('social.discoverPage.noSearchResultsDescription')}
            />
          )}
        </div>
      ) : (
        <>
          <DiscoverTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'discover' && (
            <div className={styles.discoverContent}>
              {discoverLoading ? (
                <DiscoverSkeleton />
              ) : (
                <>
                  <LeaderboardSection entries={leaderboard} t={t} />
                  <CommunityFeedSection predictions={communityFeed} t={t} />
                  {leaderboard.length === 0 && communityFeed.length === 0 && (
                    <EmptyState
                      icon={Users}
                      title={t('social.discoverPage.communityGrowingTitle')}
                      description={t('social.discoverPage.communityGrowingDescription')}
                      actionLabel={t('social.discoverPage.communityGrowingAction')}
                      onAction={() => navigate('/predictions')}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className={styles.listContent}>
              {listLoading ? <UserListSkeleton /> : followers.length > 0 ? (
                <UserList users={followers} />
              ) : (
                <EmptyState
                  icon={Users}
                  title={t('social.discoverPage.followersEmptyTitle')}
                  description={t('social.discoverPage.followersEmptyDescription')}
                  actionLabel={t('social.discoverPage.followersEmptyAction')}
                  onAction={() => navigate('/profile')}
                />
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className={styles.listContent}>
              {listLoading ? <UserListSkeleton /> : following.length > 0 ? (
                <UserList users={following} />
              ) : (
                <EmptyState
                  icon={UserPlus}
                  title={t('social.discoverPage.followingEmptyTitle')}
                  description={t('social.discoverPage.followingEmptyDescription')}
                  actionLabel={t('social.discoverPage.followingEmptyAction')}
                  onAction={() => { setActiveTab('discover'); setTimeout(() => inputRef.current?.focus(), 100); }}
                />
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className={styles.listContent}>
              {listLoading ? <UserListSkeleton /> : requests.length > 0 ? (
                <FollowRequestsList
                  requests={requests}
                  t={t}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              ) : (
                <EmptyState
                  icon={Bell}
                  title={t('social.discoverPage.requestsEmptyTitle')}
                  description={t('social.discoverPage.requestsEmptyDescription')}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
