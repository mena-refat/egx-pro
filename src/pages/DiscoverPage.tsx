import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, User as UserIcon, Users, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { TIMEOUTS } from '../lib/constants';

type SearchResult = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  myFollowStatus: 'none' | 'pending' | 'following';
};

export default function DiscoverPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSearch = useCallback(
    async (q: string) => {
      if (!accessToken || !q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/social/search?q=${encodeURIComponent(q.trim())}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data?.data)) setResults(data.data);
        else setResults([]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSearch(query), TIMEOUTS.debounce);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSearch]);

  const handleFollow = async (username: string) => {
    if (!accessToken) return;
    setUpdating(username);
    try {
      const res = await fetch(`/api/social/follow/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const status = body?.data?.status;
        setResults((prev) =>
          prev.map((u) =>
            u.username === username
              ? { ...u, myFollowStatus: status === 'ACCEPTED' ? 'following' : 'pending' }
              : u
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  const handleUnfollow = async (username: string) => {
    if (!accessToken) return;
    setUpdating(username);
    try {
      await fetch(`/api/social/unfollow/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResults((prev) =>
        prev.map((u) => (u.username === username ? { ...u, myFollowStatus: 'none' as const } : u))
      );
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <h1 className="text-xl font-bold">
        {t('social.discover', { defaultValue: 'Discover' })}
      </h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('social.searchByUsername', { defaultValue: 'Search by username...' })}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          aria-label={t('social.searchByUsername', { defaultValue: 'Search by username' })}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <button
                type="button"
                onClick={() => u.username && navigate(`/profile/${u.username}`)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">@{u.username ?? u.id}</p>
                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {u.followersCount} {t('social.followers', { defaultValue: 'Followers' })}
                  </p>
                </div>
              </button>
              {u.myFollowStatus === 'none' && (
                <button
                  type="button"
                  disabled={!!updating}
                  onClick={() => u.username && handleFollow(u.username)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] text-sm font-medium disabled:opacity-60"
                >
                  {updating === u.username ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('social.follow', { defaultValue: 'Follow' })
                  )}
                </button>
              )}
              {u.myFollowStatus === 'pending' && (
                <span className="shrink-0 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
                  {t('social.pending', { defaultValue: 'Pending' })}
                </span>
              )}
              {u.myFollowStatus === 'following' && (
                <button
                  type="button"
                  disabled={!!updating}
                  onClick={() => u.username && handleUnfollow(u.username)}
                  className="shrink-0 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] disabled:opacity-60"
                >
                  {updating === u.username ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('social.unfollow', { defaultValue: 'Unfollow' })
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center text-[var(--text-secondary)] py-8">
          {t('social.noResults', { defaultValue: 'No users found.' })}
        </p>
      )}
    </div>
  );
}
