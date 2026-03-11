import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, User as UserIcon, Users, Loader2, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { TIMEOUTS } from '../lib/constants';

const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 5;
const AUTOCOMPLETE_LIMIT = 5;

type SearchResult = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  myFollowStatus: 'none' | 'pending' | 'following';
};

type AutocompleteSuggestion = {
  username: string;
  avatarUrl: string | null;
  rank: string;
  accuracyRate: number;
  totalPredictions: number;
  isPrivate: boolean;
  followStatus: 'NONE' | 'FOLLOWING' | 'PENDING';
};

const RANK_KEYS: Record<string, string> = {
  BEGINNER: 'rankBeginner',
  ANALYST: 'rankAnalyst',
  SENIOR: 'rankSenior',
  EXPERT: 'rankExpert',
  LEGEND: 'rankLegend',
};

export default function DiscoverPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchAutocomplete = useCallback(
    async (q: string) => {
      if (!accessToken || q.trim().length < MIN_QUERY_LENGTH) {
        setAutocompleteSuggestions([]);
        setDropdownOpen(false);
        return;
      }
      setAutocompleteLoading(true);
      setDropdownOpen(true);
      setHighlightedIndex(-1);
      try {
        const res = await fetch(
          `/api/social/username-search?q=${encodeURIComponent(q.trim())}&limit=${AUTOCOMPLETE_LIMIT}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setAutocompleteSuggestions(list);
      } catch {
        setAutocompleteSuggestions([]);
      } finally {
        setAutocompleteLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => fetchSearch(query), TIMEOUTS.debounce);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query, fetchSearch]);

  useEffect(() => {
    if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setAutocompleteSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    autocompleteDebounceRef.current = setTimeout(() => fetchAutocomplete(query), AUTOCOMPLETE_DEBOUNCE_MS);
    return () => {
      if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    };
  }, [query, fetchAutocomplete]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownOpen &&
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen && autocompleteSuggestions.length > 0) {
      setHighlightedIndex((i) => (i >= autocompleteSuggestions.length ? autocompleteSuggestions.length - 1 : i));
    }
  }, [dropdownOpen, autocompleteSuggestions.length]);

  const handleSelectSuggestion = useCallback(
    (username: string) => {
      setDropdownOpen(false);
      setAutocompleteSuggestions([]);
      setQuery('');
      navigate(`/profile/${username}`);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen) return;
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        inputRef.current?.blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) =>
          i < autocompleteSuggestions.length - 1 ? i + 1 : i
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
        return;
      }
      if (e.key === 'Enter' && highlightedIndex >= 0 && autocompleteSuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(autocompleteSuggestions[highlightedIndex].username);
      }
    },
    [dropdownOpen, highlightedIndex, autocompleteSuggestions, handleSelectSuggestion]
  );

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

  const isRtl = i18n.language.startsWith('ar');
  const showAutocompleteDropdown = dropdownOpen && query.trim().length >= MIN_QUERY_LENGTH;

  const getRankLabel = (rank: string) => t(RANK_KEYS[rank] ?? RANK_KEYS.BEGINNER);

  const renderUsernameWithBoldPrefix = (username: string, prefix: string) => {
    if (!prefix || !username.toLowerCase().startsWith(prefix.toLowerCase())) {
      return <>@{username}</>;
    }
    const matchLen = prefix.length;
    const bold = username.slice(0, matchLen);
    const rest = username.slice(matchLen);
    return (
      <>
        @<strong>{bold}</strong>{rest}
      </>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-xl font-bold">
        {t('social.discover', { defaultValue: 'Discover' })}
      </h1>
      <div className="relative">
        <Search className={`absolute w-5 h-5 text-[var(--text-muted)] top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH && (autocompleteSuggestions.length > 0 || autocompleteLoading))
              setDropdownOpen(true);
          }}
          placeholder={t('social.searchByUsername', { defaultValue: 'Search by username...' })}
          className={`w-full py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
          aria-label={t('social.searchByUsername', { defaultValue: 'Search by username' })}
          aria-autocomplete="list"
          aria-expanded={showAutocompleteDropdown}
          aria-controls="username-autocomplete-list"
          aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
        />

        {showAutocompleteDropdown && (
          <div
            ref={dropdownRef}
            id="username-autocomplete-list"
            role="listbox"
            className="absolute z-50 w-full mt-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden"
            style={{ top: '100%' }}
          >
            {autocompleteLoading && (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-3 animate-pulse"
                    style={{ height: 56 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded" />
                      <div className="h-3 w-24 bg-[var(--bg-secondary)] rounded" />
                    </div>
                  </div>
                ))}
              </>
            )}
            {!autocompleteLoading && autocompleteSuggestions.length === 0 && (
              <div className="px-4 py-4 text-center text-[var(--text-secondary)] text-sm">
                {t('social.noUsernameAutocomplete', { defaultValue: 'لا يوجد مستخدم بهذا الاسم' })}
              </div>
            )}
            {!autocompleteLoading &&
              autocompleteSuggestions.map((s, index) => (
                <button
                  key={s.username}
                  id={`suggestion-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.username)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-start transition-colors ${
                    index === highlightedIndex ? 'bg-[var(--bg-card-hover)]' : 'hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {renderUsernameWithBoldPrefix(s.username, query.trim())}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        🔵 {getRankLabel(s.rank)}
                      </span>
                    </div>
                    {s.isPrivate ? (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Lock className="w-3.5 h-3.5" aria-hidden />
                        {t('social.private', { defaultValue: 'Private account' })}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {t('predictions.accuracy', { defaultValue: 'دقة' })} {s.accuracyRate}% · {s.totalPredictions} {t('predictions.predictionsCount', { defaultValue: 'توقعات' })}
                      </p>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
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
