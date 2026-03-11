import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { useDiscoverSearch } from '../hooks/useDiscoverSearch';
import { useDiscoverAutocomplete } from '../hooks/useDiscoverAutocomplete';
import { Input } from '../components/ui/Input';
import { DiscoverAutocompleteDropdown } from '../components/features/discover/DiscoverAutocompleteDropdown';
import { DiscoverResultsList } from '../components/features/discover/DiscoverResultsList';
import { DISCOVER } from '../lib/constants';

export default function DiscoverPage() {
  const { t, i18n } = useTranslation('common');
  const { query, setQuery, results, loading, updating, accessToken, handleFollow, handleUnfollow } =
    useDiscoverSearch();
  const {
    suggestions,
    loading: autocompleteLoading,
    open: showAutocompleteDropdown,
    setOpen: setAutocompleteOpen,
    highlightedIndex,
    inputRef,
    dropdownRef,
    handleSelect,
    handleKeyDown,
  } = useDiscoverAutocomplete(query, setQuery, accessToken);
  const isRtl = i18n.language.startsWith('ar');

  return (
    <div
      className="p-6 space-y-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <h1 className="text-xl font-bold">
        {t('social.discover', { defaultValue: 'Discover' })}
      </h1>

      <div className="relative">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= DISCOVER.minUsernameLength && (suggestions.length > 0 || autocompleteLoading))
              setAutocompleteOpen(true);
          }}
          placeholder={t('social.searchByUsername', { defaultValue: 'Search by username...' })}
          aria-label={t('social.searchByUsername', { defaultValue: 'Search by username' })}
          aria-autocomplete="list"
          aria-expanded={showAutocompleteDropdown}
          aria-controls="username-autocomplete-list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
          icon={<Search className="w-5 h-5" aria-hidden />}
          iconPosition={isRtl ? 'right' : 'left'}
          wrapperClassName="relative"
        />
        {showAutocompleteDropdown && (
          <DiscoverAutocompleteDropdown
            suggestions={suggestions}
            loading={autocompleteLoading}
            query={query}
            highlightedIndex={highlightedIndex}
            dropdownRef={dropdownRef}
            onSelect={handleSelect}
          />
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" aria-hidden />
        </div>
      )}

      {!loading && results.length > 0 && (
        <DiscoverResultsList
          results={results}
          updating={updating}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center text-[var(--text-secondary)] py-8">
          {t('social.noResults', { defaultValue: 'No users found.' })}
        </p>
      )}
    </div>
  );
}
