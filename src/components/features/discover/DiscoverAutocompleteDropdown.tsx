import React from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Lock } from 'lucide-react';
import { RANK_KEYS } from './types';
import type { AutocompleteSuggestion } from './types';

function usernameWithBoldPrefix(username: string, prefix: string) {
  if (!prefix || !username.toLowerCase().startsWith(prefix.toLowerCase())) {
    return <>@{username}</>;
  }
  const bold = username.slice(0, prefix.length);
  const rest = username.slice(prefix.length);
  return <>@<strong>{bold}</strong>{rest}</>;
}

type Props = {
  suggestions: AutocompleteSuggestion[];
  loading: boolean;
  query: string;
  highlightedIndex: number;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (username: string) => void;
};

export function DiscoverAutocompleteDropdown({
  suggestions,
  loading,
  query,
  highlightedIndex,
  dropdownRef,
  onSelect,
}: Props) {
  const { t } = useTranslation('common');
  const getRankLabel = (rank: string) => t(RANK_KEYS[rank] ?? RANK_KEYS.BEGINNER);
  const prefix = query.trim();

  return (
    <div
      ref={dropdownRef}
      id="username-autocomplete-list"
      role="listbox"
      className="absolute z-50 w-full mt-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden"
      style={{ top: '100%' }}
    >
      {loading &&
        [0, 1, 2].map((i) => (
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
      {!loading && suggestions.length === 0 && (
        <div className="px-4 py-4 text-center text-[var(--text-secondary)] text-sm">
          {t('social.noUsernameAutocomplete', { defaultValue: 'لا يوجد مستخدم بهذا الاسم' })}
        </div>
      )}
      {!loading &&
        suggestions.map((s, index) => (
          <button
            key={s.username}
            id={`suggestion-${index}`}
            role="option"
            aria-selected={index === highlightedIndex}
            type="button"
            onClick={() => onSelect(s.username)}
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
                  {usernameWithBoldPrefix(s.username, prefix)}
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--brand-subtle)] text-[var(--brand-text)]">
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
                  {t('predictions.accuracy', { defaultValue: 'دقة' })} {s.accuracyRate}% · {s.totalPredictions}{' '}
                  {t('predictions.predictionsCount', { defaultValue: 'توقعات' })}
                </p>
              )}
            </div>
          </button>
        ))}
    </div>
  );
}
