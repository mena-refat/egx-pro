import React, { useState, useEffect, useCallback } from 'react';
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
  const { i18n } = useTranslation('common');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isRtl = i18n.language.startsWith('ar');

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
  const [discoverLoading, setDiscoverLoading] = useState(true);

  // Load followers/following on tab switch
  const loadList = useCallback(
    async (tab: Tab) => {
      if (!accessToken) return;
      setListLoading(true);
      try {
        if (tab === 'followers') {
          const res = await api.get('/social/followers');
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { followers?: FollowUser[] })?.followers ?? [];
          setFollowers(list);
          setFollowersCount(list.length);
        } else if (tab === 'following') {
          const res = await api.get('/social/following');
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { following?: FollowUser[] })?.following ?? [];
          setFollowing(list);
          setFollowingCount(list.length);
        } else if (tab === 'requests') {
          const res = await api.get('/social/requests');
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : (data as { requests?: PendingRequest[] })?.requests ?? [];
          setRequests(list);
          setRequestsCount(list.length);
        }
      } catch {
        /* ignore */
      }
      setListLoading(false);
    },
    [accessToken]
  );

  // Load discover content
  useEffect(() => {
    if (!accessToken) {
      queueMicrotask(() => setDiscoverLoading(false));
      return;
    }
    void (async () => {
      setDiscoverLoading(true);
      const [lb, feed, fwrs, fwng, reqs] = await Promise.allSettled([
        api.get('/predictions/leaderboard?period=month&limit=5'),
        api.get('/predictions/feed?filter=all&limit=5'),
        api.get('/social/followers'),
        api.get('/social/following'),
        api.get('/social/requests'),
      ]);
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
      setDiscoverLoading(false);
    })();
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'discover') return;
    queueMicrotask(() => {
      void loadList(activeTab);
    });
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
    { id: 'discover', label: 'اكتشف', icon: Search },
    { id: 'followers', label: 'متابعيني', icon: Users, count: followersCount },
    { id: 'following', label: 'بتابعهم', icon: UserCheck, count: followingCount },
    ...(requestsCount > 0
      ? [{ id: 'requests' as Tab, label: 'طلبات', icon: Bell, count: requestsCount }]
      : []),
  ];

  const isSearchActive = query.trim().length >= 2;

  return (
    <div className={styles.page} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ══ Header ══ */}
      <h1 className={styles.title}>اكتشف</h1>
      <p className={styles.subtitle}>تابع مستثمرين وشوف توقعاتهم</p>

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
          placeholder="ابحث عن مستثمرين..."
          aria-label="بحث عن مستثمرين"
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
              title="مفيش نتائج"
              description="جرّب اسم مستخدم تاني"
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
                <div className={styles.loader}>
                  <Loader2 className={styles.spinnerLarge} aria-hidden />
                </div>
              ) : (
                <>
                  {/* Leaderboard */}
                  {leaderboard.length > 0 && (
                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}>
                        <Trophy className={styles.sectionIcon} aria-hidden />
                        أدق المتوقعين هذا الشهر
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
                                {user.accuracyRate}% دقة · {user.totalPredictions} توقع
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
                        آخر توقعات المجتمع
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
                                {p.direction === 'UP' ? '↑ صعود' : '↓ هبوط'}
                              </span>
                            </div>
                            <div className={styles.feedBody}>
                              <span className={styles.feedTicker}>{p.ticker}</span>
                              <span className={styles.feedTarget}>
                                هدف: {p.targetPrice}
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
                      title="المجتمع لسه بيكبر"
                      description="كن أول من يضيف توقع ويظهر في الليدربورد!"
                      actionLabel="أضف توقع"
                      onAction={() => navigate('/predictions')}
                    />
                  )}
                </>
              )}
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
                  title="مفيش متابعين لسه"
                  description="شارك بروفايلك عشان الناس تتابعك"
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
                  title="مش بتتابع حد لسه"
                  description="ابحث عن مستثمرين وتابعهم"
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
                            قبول
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeclineRequest(r.followerId)}
                          >
                            رفض
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="مفيش طلبات"
                  description="لما حد يطلب يتابعك هتلاقيه هنا"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
