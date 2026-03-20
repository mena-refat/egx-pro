import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { TFunction } from 'i18next';
import { Input } from '../../ui/Input';
import { DiscoverAutocompleteDropdown } from './DiscoverAutocompleteDropdown';
import { AutocompleteSuggestion } from './types';
import styles from '../../../pages/DiscoverPage.module.scss';

interface DiscoverSearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  searchLoading: boolean;
  autoLoading: boolean;
  suggestions: AutocompleteSuggestion[];
  showDrop: boolean;
  setDropOpen: (open: boolean) => void;
  highlightedIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  handleSelect: (s: AutocompleteSuggestion) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  minUsernameLength: number;
  t: TFunction;
}

export function DiscoverSearchBar({
  query,
  setQuery,
  searchLoading,
  autoLoading,
  suggestions,
  showDrop,
  setDropOpen,
  highlightedIndex,
  inputRef,
  dropdownRef,
  handleSelect,
  handleKeyDown,
  minUsernameLength,
  t,
}: DiscoverSearchBarProps) {
  return (
    <div className={styles.searchWrap}>
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (
            query.trim().length >= minUsernameLength &&
            (suggestions.length > 0 || autoLoading)
          )
            setDropOpen(true);
        }}
        placeholder={t('social.discoverPage.searchPlaceholder')}
        aria-label={t('social.discoverPage.searchAria')}
        dir="rtl"
        icon={
          autoLoading || searchLoading ? (
            <Loader2 className={styles.spinner} aria-hidden />
          ) : (
            <Search style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden />
          )
        }
        iconPosition="left"
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
  );
}
