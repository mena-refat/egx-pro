import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './Input';
import { searchStocks, getStockName } from '../../lib/egxStocks';
import styles from './TickerSuggestInput.module.scss';

const SUGGESTIONS_MAX = 15;

export interface TickerSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  wrapperClassName?: string;
  id?: string;
}

export function TickerSuggestInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  dir = 'ltr',
  wrapperClassName,
  id,
}: TickerSuggestInputProps) {
  const { t, i18n } = useTranslation('common');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const suggestions = searchStocks(value.trim(), lang).slice(0, SUGGESTIONS_MAX);

  const handleSelect = useCallback(
    (ticker: string) => {
      onChange(ticker);
      setShowSuggestions(false);
    },
    [onChange]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`${styles.container} ${wrapperClassName ?? ''}`.trim()}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            handleSelect(suggestions[0].ticker);
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        wrapperClassName={styles.inputWrap}
        aria-autocomplete="list"
        aria-expanded={showSuggestions && suggestions.length > 0}
      />
      {showSuggestions && (
        <div className={styles.dropdown} role="listbox" id={id ? `${id}-listbox` : undefined}>
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s.ticker}
                type="button"
                role="option"
                className={styles.option}
                onClick={() => handleSelect(s.ticker)}
              >
                <span className={styles.optionName}>{getStockName(s.ticker, lang)}</span>
                <span className={styles.optionTicker}>{s.ticker}</span>
              </button>
            ))
          ) : (
            <div className={styles.empty}>
              {value.trim() ? t('ai.noStockMatch') : t('ai.typeToSearchStock')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
