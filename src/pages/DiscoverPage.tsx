import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Users,
  UserPlus,
  UserCheck,
  Trophy,
  TrendingUp,
  Bell,
} from 'lucide-react';

function DiscoverSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Leaderboard skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-[var(--bg-card-hover)] rounded-full" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
            <div className="w-6 h-6 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
            <div className="w-9 h-9 rounded-full bg-[var(--bg-card-hover)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-[var(--bg-card-hover)] rounded-full" />
              <div className="h-2.5 w-32 bg-[var(--bg-card-hover)] rounded-full" />
            </div>
          </div>
        ))}
      </div>
      {/* Feed skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-40 bg-[var(--bg-card-hover)] rounded-full" />
        {[1,2,3].map(i => (
          <div key={i} className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-[var(--bg-card-hover)] rounded-full" />
              <div className="h-5 w-14 bg-[var(--bg-card-hover)] rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-[var(--bg-card-hover)] rounded-full" />
              <div className="h-3 w-20 bg-[var(--bg-card-hover)] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useAuthStore } from '../store/authStore';
import { useDiscoverSearch } from '../hooks/useDiscoverSearch';
import { useDiscoverAutocomplete } from '../hooks/useDiscoverAutocomplete';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { DiscoverAutocompleteDropdown } from '../components/features/discover/DiscoverAutocompleteDropdown';
import { DiscoverResultsList } from '../components/features/discover/DiscoverResultsList';
import EmptyState from '../components/shared/EmptyState';
import { DISCOVER } from '../lib/constants';
import api from '../lib/api';
import styles from './DiscoverPage.module.scss';

type Tab = 'discover' | 'followers' | 'following' | 'requests';

interface FollowUser {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface PendingRequest {
  followerId: string;
  follower: FollowUser;
  createdAt: string;
}

interface LeaderboardEntry {
  username: string;
  avatarUrl?: string | null;
  rank: string;
  accuracyRate: number;
  totalPredictions: number;
  hitCount?: number;
}

interface FeedPrediction {
  id: string;
  ticker: string;
  direction: 'UP' | 'DOWN';
  targetPrice: number;
  reason?: string;
  user?: { username: string; avatarUrl?: string | null };
  createdAt: string;
}

export default function DiscoverPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isRtl = i18n.language.startsWith('ar');
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const [activeTab, setActiveTab] = useState<Tab>('discover');

  // Search
  const {
    query,
    setQuery,
    results,
    loading: searchLoading,
    updating,
    handleFollow,
    handleUnfollow,
  } = useDiscoverSearch();
  const {
    suggestions,
    loading: autoLoading,
    open: showDrop,
    setOpen: setDropOpen,
    highlightedIndex,
    inputRef,
    dropdownRef,
    handleSelect,
    handleKeyDown,
  } = useDiscoverAutocomplete(query, setQuery, accessToken);

  // Followers/Following
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  // Discover feed
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communityFeed, setCommunityFeed] = useState<FeedPrediction[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);

  // Load followers/following on tab switch
  const loadList = useCallback(
    async (tab: Tab, signal?: AbortSignal) => {
      if (!accessToken) return;
      setListLoading(true);
      try {
        if (tab === 'followers') {
          const res = await api.get('/social/followers', { signal });
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { followers?: FollowUser[] })?.followers ?? [];
          setFollowers(list);
          setFollowersCount(list.length);
        } else if (tab === 'following') {
          const res = await api.get('/social/following', { signal });
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { following?: FollowUser[] })?.following ?? [];
          setFollowing(list);
          setFollowingCount(list.length);
        } else if (tab === 'requests') {
          const res = await api.get('/social/requests', { signal });
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { requests?: PendingRequest[] })?.requests ?? [];
          setRequests(list);
          setRequestsCount(list.length);
        }
      } catch {
        // ignore — cancelled or network error, just show empty state
      } finally {
        if (!signal?.aborted && mountedRef.current) setListLoading(false);
      }
    },
    [accessToken]
  );

  // Load discover content
  useEffect(() => {
    if (!accessToken) {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setDiscoverLoading(false);
      });
      return;
    }
    const controller = new AbortController();

    void (async () => {
      if (!mountedRef.current) return;
      setDiscoverLoading(true);
      setDiscoverLoaded(false);
      // timeout 8s — never hang forever
      const timeoutId = setTimeout(() => { if (!controller.signal.aborted) setDiscoverLoading(false); }, 8000);
      try {
        const [lb, feed, fwrs, fwng, reqs] = await Promise.allSettled([
          api.get('/predictions/leaderboard?period=month&limit=5', {
            signal: controller.signal,
          }),
          api.get('/predictions/feed?filter=all&limit=5', {
            signal: controller.signal,
          }),
          api.get('/social/followers', { signal: controller.signal }),
          api.get('/social/following', { signal: controller.signal }),
          api.get('/social/requests', { signal: controller.signal }),
        ]);

        if (!mountedRef.current) return;

        if (lb.status === 'fulfilled') {
          const d = lb.value.data?.data ?? lb.value.data;
          setLeaderboard(
            Array.isArray(d) ? d : (d as { items?: LeaderboardEntry[] })?.items ?? []
          );
        }
        if (feed.status === 'fulfilled') {
          const d = feed.value.data?.data ?? feed.value.data;
          const items =
            (d as { items?: FeedPrediction[] })?.items ??
            (Array.isArray(d) ? d : []);
          setCommunityFeed(items);
        }
        if (fwrs.status === 'fulfilled') {
          const d = fwrs.value.data?.data ?? fwrs.value.data;
          const list = Array.isArray(d)
            ? d
            : (d as { followers?: FollowUser[] })?.followers ?? [];
          setFollowersCount(list.length);
        }
        if (fwng.status === 'fulfilled') {
          const d = fwng.value.data?.data ?? fwng.value.data;
          const list = Array.isArray(d)
            ? d
            : (d as { following?: FollowUser[] })?.following ?? [];
          setFollowingCount(list.length);
        }
        if (reqs.status === 'fulfilled') {
          const d = reqs.value.data?.data ?? reqs.value.data;
          const list = Array.isArray(d)
            ? d
            : (d as { requests?: PendingRequest[] })?.requests ?? [];
          setRequestsCount(list.length);
        }
      } catch (err) {
        if ((err as { code?: string }).code === 'ERR_CANCELED') return;
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) {
          setDiscoverLoading(false);
          setDiscoverLoaded(true);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'discover') return;
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadList(activeTab, controller.signal);
    });
    return () => controller.abort();
  }, [activeTab, loadList]);

  const handleAcceptRequest = async (followerId: string) => {
    try {
      await api.post(`/social/requests/${followerId}/accept`);
      setRequests((prev) => prev.filter((r) => r.followerId !== followerId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
      setFollowersCount((prev) => prev + 1);
    } catch {
      /* ignore */
    }
  };

  const handleDeclineRequest = async (followerId: string) => {
    try {
      await api.post(`/social/requests/${followerId}/decline`);
      setRequests((prev) => prev.filter((r) => r.followerId !== followerId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    {
      id: 'discover',
      label: t('social.discoverPage.tabDiscover'),
      icon: Search,
    },
    {
      id: 'followers',
      label: t('social.discoverPage.tabFollowers'),
      icon: Users,
      count: followersCount,
    },
    {
      id: 'following',
      label: t('social.discoverPage.tabFollowing'),
      icon: UserCheck,
      count: followingCount,
    },
    ...(requestsCount > 0
      ? [
          {
            id: 'requests' as Tab,
            label: t('social.discoverPage.tabRequests'),
            icon: Bell,
            count: requestsCount,
          },
        ]
      : []),
  ];

  const isSearchActive = query.trim().length >= 2;

  return (
    <div className={styles.page} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ══ Header ══ */}
      <h1 className={styles.title}>{t('social.discoverPage.title')}</h1>
      <p className={styles.subtitle}>{t('social.discoverPage.subtitle')}</p>

      {/* ══ Search ══ */}
      <div className={styles.searchWrap}>
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (
              query.trim().length >= DISCOVER.minUsernameLength &&
              (suggestions.length > 0 || autoLoading)
            )
              setDropOpen(true);
          }}
          placeholder={t('social.discoverPage.searchPlaceholder')}
          aria-label={t('social.discoverPage.searchAria')}
          icon={
            autoLoading || searchLoading ? (
              <Loader2 className={styles.spinner} aria-hidden />
            ) : (
              <Search style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden />
            )
          }
          iconPosition={isRtl ? 'right' : 'left'}
          wrapperClassName={styles.inputWrapper}
        />
        {showDrop && (
          <DiscoverAutocompleteDropdown
            suggestions={suggestions}
            loading={autoLoading}
            query={query}
            highlightedIndex={highlightedIndex}
            dropdownRef={dropdownRef}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* ══ Search Results (overlay) ══ */}
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
          {/* ══ Tabs ══ */}
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className={styles.tabIcon} aria-hidden />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span className={styles.tabBadge}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ══ Tab: Discover ══ */}
          {activeTab === 'discover' && (
            <div className={styles.discoverContent}>
              {discoverLoading ? (
                <DiscoverSkeleton />
              ) : discoverLoaded ? (
                <>
                  {/* Leaderboard */}
                  {leaderboard.length > 0 && (
                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}>
                        <Trophy className={styles.sectionIcon} aria-hidden />
                        {t('social.discoverPage.leaderboardTitle')}
                      </h2>
                      <div className={styles.leaderboard}>
                        {leaderboard.map((user, i) => (
                          <button
                            key={user.username}
                            type="button"
                            className={styles.leaderRow}
                            onClick={() => navigate(`/profile/${user.username}`)}
                          >
                            <span
                              className={`${styles.leaderRank} ${i < 3 ? styles[`rank${i + 1}` as keyof typeof styles] : ''}`}
                            >
                              {i + 1}
                            </span>
                            <div className={styles.leaderAvatar}>
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className={styles.avatarImg}
                                  loading="lazy"
                                />
                              ) : (
                                <Users
                                  style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)' }}
                                  aria-hidden
                                />
                              )}
                            </div>
                            <div className={styles.leaderInfo}>
                              <span className={styles.leaderName}>
                                @{user.username}
                              </span>
                              <span className={styles.leaderStats}>
                                {user.accuracyRate}% {t('discover.accuracy')} · {user.totalPredictions} {t('discover.predictions')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Community Feed */}
                  {communityFeed.length > 0 && (
                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}>
                        <TrendingUp className={styles.sectionIcon} aria-hidden />
                        {t('social.discoverPage.communityFeedTitle')}
                      </h2>
                      <div className={styles.feedList}>
                        {communityFeed.map((p) => (
                          <div key={p.id} className={styles.feedItem}>
                            <div className={styles.feedHeader}>
                              <button
                                type="button"
                                onClick={() =>
                                  p.user?.username &&
                                  navigate(`/profile/${p.user.username}`)
                                }
                                className={styles.feedUser}
                              >
                                @{p.user?.username ?? '—'}
                              </button>
                              <span
                                className={`${styles.feedDirection} ${p.direction === 'UP' ? styles.feedUp : styles.feedDown}`}
                              >
                                {p.direction === 'UP'
                                  ? t('social.discoverPage.feedDirectionUp')
                                  : t('social.discoverPage.feedDirectionDown')}
                              </span>
                            </div>
                            <div className={styles.feedBody}>
                              <span className={styles.feedTicker}>{p.ticker}</span>
                              <span className={styles.feedTarget}>
                                {t('social.discoverPage.feedTarget', {
                                  price: p.targetPrice,
                                })}
                              </span>
                            </div>
                            {p.reason && (
                              <p className={styles.feedReason}>{p.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Empty state if nothing */}
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
              ) : null}
            </div>
          )}

          {/* ══ Tab: Followers ══ */}
          {activeTab === 'followers' && (
            <div className={styles.listContent}>
              {listLoading ? (
                <div className={styles.loader}>
                  <Loader2 className={styles.spinnerLarge} aria-hidden />
                </div>
              ) : followers.length > 0 ? (
                <ul className={styles.userList}>
                  {followers.map((u) => (
                    <li key={u.id} className={styles.userItem}>
                      <button
                        type="button"
                        onClick={() =>
                          u.username && navigate(`/profile/${u.username}`)
                        }
                        className={styles.userButton}
                      >
                        <div className={styles.userAvatar}>
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt=""
                              width={40}
                              height={40}
                              className={styles.avatarImg}
                              loading="lazy"
                            />
                          ) : (
                            <Users
                              style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                color: 'var(--text-muted)',
                              }}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div>
                          <p className={styles.userName}>
                            {u.fullName ?? `@${u.username}`}
                          </p>
                          {u.fullName && u.username && (
                            <p className={styles.userHandle}>@{u.username}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
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

          {/* ══ Tab: Following ══ */}
          {activeTab === 'following' && (
            <div className={styles.listContent}>
              {listLoading ? (
                <div className={styles.loader}>
                  <Loader2 className={styles.spinnerLarge} aria-hidden />
                </div>
              ) : following.length > 0 ? (
                <ul className={styles.userList}>
                  {following.map((u) => (
                    <li key={u.id} className={styles.userItem}>
                      <button
                        type="button"
                        onClick={() =>
                          u.username && navigate(`/profile/${u.username}`)
                        }
                        className={styles.userButton}
                      >
                        <div className={styles.userAvatar}>
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt=""
                              width={40}
                              height={40}
                              className={styles.avatarImg}
                              loading="lazy"
                            />
                          ) : (
                            <Users
                              style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                color: 'var(--text-muted)',
                              }}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div>
                          <p className={styles.userName}>
                            {u.fullName ?? `@${u.username}`}
                          </p>
                          {u.fullName && u.username && (
                            <p className={styles.userHandle}>@{u.username}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
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

          {/* ══ Tab: Requests ══ */}
          {activeTab === 'requests' && (
            <div className={styles.listContent}>
              {listLoading ? (
                <div className={styles.loader}>
                  <Loader2 className={styles.spinnerLarge} aria-hidden />
                </div>
              ) : requests.length > 0 ? (
                <ul className={styles.userList}>
                  {requests.map((r) => (
                    <li key={r.followerId} className={styles.userItem}>
                      <div className={styles.requestRow}>
                        <button
                          type="button"
                          onClick={() =>
                            r.follower.username &&
                            navigate(`/profile/${r.follower.username}`)
                          }
                          className={styles.userButton}
                        >
                          <div className={styles.userAvatar}>
                            {r.follower.avatarUrl ? (
                              <img
                                src={r.follower.avatarUrl}
                                alt=""
                                width={40}
                                height={40}
                                className={styles.avatarImg}
                                loading="lazy"
                              />
                            ) : (
                              <Users
                                style={{
                                  width: '1.25rem',
                                  height: '1.25rem',
                                  color: 'var(--text-muted)',
                                }}
                                aria-hidden
                              />
                            )}
                          </div>
                          <p className={styles.userName}>
                            {r.follower.fullName ?? `@${r.follower.username}`}
                          </p>
                        </button>
                        <div className={styles.requestActions}>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleAcceptRequest(r.followerId)}
                          >
                            {t('social.discoverPage.accept')}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeclineRequest(r.followerId)}
                          >
                            {t('social.discoverPage.decline')}
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
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
