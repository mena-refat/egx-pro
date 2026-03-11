import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { usePredictionsStore } from '../../store/usePredictionsStore';
import { usePredictionsApi } from '../../hooks/usePredictionsApi';
import { useAuthStore } from '../../store/authStore';
import { searchStocks, getStockName } from '../../lib/egxStocks';
import api from '../../lib/api';

const TIMEFRAMES = ['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'] as const;

export function NewPredictionSheet({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation('common');
  const step = usePredictionsStore((s) => s.newPredictionStep);
  const draft = usePredictionsStore((s) => s.newPredictionDraft);
  const { setNewPredictionStep, updateDraft } = usePredictionsStore();
  const { createPrediction, fetchMy, fetchLimits } = usePredictionsApi();
  const [stockSearch, setStockSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';
  const stockSuggestions = useMemo(
    () => searchStocks(stockSearch.trim(), lang).slice(0, 20),
    [stockSearch, lang]
  );

  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!showSuggestions) return;
    const handleWindowChange = () => {
      // لو حصل scroll أو resize نقفل الليست عشان متبقاش في مكان غلط
      setShowSuggestions(false);
    };
    window.addEventListener('scroll', handleWindowChange, true);
    window.addEventListener('resize', handleWindowChange);
    return () => {
      window.removeEventListener('scroll', handleWindowChange, true);
      window.removeEventListener('resize', handleWindowChange);
    };
  }, [showSuggestions]);

  useEffect(() => {
    if (!draft.ticker || !accessToken) { setCurrentPrice(null); return; }
    api.get<{ data?: { price?: number } }>(`/stocks/${draft.ticker}/price`)
      .then((r) => setCurrentPrice((r.data as { data?: { price?: number } })?.data?.price ?? null))
      .catch(() => setCurrentPrice(null));
  }, [draft.ticker, accessToken]);

  const price = currentPrice ?? draft.targetPrice ?? 0;
  const changePct = price > 0 && draft.targetPrice ? (((draft.targetPrice - price) / price) * 100).toFixed(1) : '0';
  const expiresAt = (() => {
    const d = new Date();
    if (draft.timeframe === 'MONTH') d.setMonth(d.getMonth() + 1);
    else if (draft.timeframe === 'THREE_MONTHS') d.setMonth(d.getMonth() + 3);
    else d.setDate(d.getDate() + 7);
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  })();

  const handleSubmit = async () => {
    if (!draft.ticker || draft.direction == null || draft.targetPrice == null || draft.timeframe == null || !agreeTerms) return;
    setError(null);
    setSubmitting(true);
    try {
      await createPrediction({
        ticker: draft.ticker,
        direction: draft.direction,
        targetPrice: draft.targetPrice,
        timeframe: draft.timeframe,
        reason: draft.reason?.trim() || null,
        isPublic: draft.isPublic !== false,
      });
      onClose();
      fetchMy(1);
      fetchLimits();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل النشر');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('predictions.newPrediction')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)]" aria-label={t('common.close')}>×</button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step1Title')}</p>
                <div className="relative">
                  <input
                    type="text"
                    ref={inputRef}
                    value={stockSearch}
                    onFocus={() => {
                      setShowSuggestions(true);
                      updateDropdownPosition();
                    }}
                    onChange={(e) => {
                      setStockSearch(e.target.value);
                      setShowSuggestions(true);
                      updateDropdownPosition();
                    }}
                    placeholder={t('predictions.searchStock')}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  />
                </div>
                {draft.ticker && <p className="text-sm text-[var(--brand)]">✓ {draft.ticker} {draft.stockName}</p>}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <button type="button" onClick={() => setNewPredictionStep(1)} className="text-sm text-[var(--brand)]">← {t('common.back')}</button>
                <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step2Title')}</p>
                {draft.ticker && <p className="font-medium">{draft.ticker} — {t('predictions.currentPrice')}: {price.toFixed(2)} ج.م</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateDraft({ direction: 'UP' })}
                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${draft.direction === 'UP' ? 'border-green-500 bg-green-500/10' : 'border-[var(--border)]'}`}
                  >
                    <TrendingUp className="w-6 h-6 text-green-500" /> {t('predictions.directionUp')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft({ direction: 'DOWN' })}
                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${draft.direction === 'DOWN' ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)]'}`}
                  >
                    <TrendingDown className="w-6 h-6 text-red-500" /> {t('predictions.directionDown')}
                  </button>
                </div>
                {draft.direction && (
                  <>
                    <label className="block text-sm">{t('predictions.targetPrice')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draft.targetPrice ?? ''}
                      onChange={(e) => updateDraft({ targetPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)]">{t('predictions.expectedChange')}: {draft.targetPrice && price ? (Number(changePct) >= 0 ? '+' : '') + changePct + '%' : '—'}</p>
                    <div className="flex gap-2">
                      {TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => updateDraft({ timeframe: tf })}
                          className={`px-3 py-1.5 rounded-lg text-sm ${draft.timeframe === tf ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)]'}`}
                        >
                          {t(
                            tf === 'WEEK'
                              ? 'predictions.timeframeWeek'
                              : tf === 'MONTH'
                                ? 'predictions.timeframeMonth'
                                : tf === 'THREE_MONTHS'
                                  ? 'predictions.timeframeThreeMonths'
                                  : tf === 'SIX_MONTHS'
                                    ? 'predictions.timeframeSixMonths'
                                    : tf === 'NINE_MONTHS'
                                      ? 'predictions.timeframeNineMonths'
                                      : 'predictions.timeframeYear'
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs">{t('predictions.endsOn')}: {expiresAt}</p>
                    <Button onClick={() => setNewPredictionStep(3)}>{t('predictions.next')}</Button>
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <button type="button" onClick={() => setNewPredictionStep(2)} className="text-sm text-[var(--brand)]">← {t('common.back')}</button>
                <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step3Title')}</p>
                <textarea
                  value={draft.reason ?? ''}
                  onChange={(e) => updateDraft({ reason: e.target.value.slice(0, 500) })}
                  placeholder={t('predictions.explainReason')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
                {(() => {
                  const text = draft.reason ?? '';
                  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
                  const hasMin = words >= 10;
                  return (
                    <>
                      <p className={`text-xs font-medium ${hasMin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t('predictions.reasonMinWordsLabel', { count: words, required: 10 })}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {t('predictions.reasonHint')}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{text.length}/500</p>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={draft.isPublic !== false} onChange={(e) => updateDraft({ isPublic: e.target.checked })} />
                        <span className="text-sm">{t('predictions.publishPublic')}</span>
                      </label>
                      <span title={!hasMin ? t('predictions.reasonTooltip') : undefined}>
                        <Button onClick={() => setNewPredictionStep(4)} disabled={!hasMin}>
                          {t('predictions.next')}
                        </Button>
                      </span>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <button type="button" onClick={() => setNewPredictionStep(3)} className="text-sm text-[var(--brand)]">← {t('common.back')}</button>
                <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step4Title')}</p>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-sm">
                  <p>
                    {draft.ticker} · {draft.direction === 'UP' ? t('predictions.directionUp') : t('predictions.directionDown')}
                    {' '}→ {draft.targetPrice} ج.م ·{' '}
                    {t(
                      draft.timeframe === 'WEEK'
                        ? 'predictions.timeframeWeek'
                        : draft.timeframe === 'MONTH'
                          ? 'predictions.timeframeMonth'
                          : draft.timeframe === 'THREE_MONTHS'
                            ? 'predictions.timeframeThreeMonths'
                            : draft.timeframe === 'SIX_MONTHS'
                              ? 'predictions.timeframeSixMonths'
                              : draft.timeframe === 'NINE_MONTHS'
                                ? 'predictions.timeframeNineMonths'
                                : 'predictions.timeframeYear'
                    )}
                  </p>
                </div>
                {draft.reason && (
                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
                    “{draft.reason}”
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">{t('predictions.termsWarning')}</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <span className="text-sm">{t('predictions.agreeTerms')}</span>
                </label>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Button onClick={handleSubmit} disabled={!agreeTerms || submitting} loading={submitting}>{t('predictions.publishButton')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Floating stock suggestions overlay (outside scroll flow) */}
        <AnimatePresence>
          {showSuggestions && dropdownRect && stockSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed z-[9999] max-h-64 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl text-right"
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
            >
              {stockSuggestions.map((eg) => (
                <button
                  key={eg.ticker}
                  type="button"
                  onClick={() => {
                    updateDraft({ ticker: eg.ticker, stockName: getStockName(eg.ticker, lang) });
                    setNewPredictionStep(2);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] last:border-0 rounded-none hover:bg-[var(--bg-card-hover)]"
                >
                  <div className="flex flex-col items-end flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">{getStockName(eg.ticker, lang)}</span>
                    <span className="text-xs text-[var(--text-muted)]">{eg.ticker}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
