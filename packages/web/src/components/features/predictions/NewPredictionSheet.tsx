import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Zap, HelpCircle, Lock, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/Button';
import { usePredictionsStore, type MoveTier } from '../../../store/usePredictionsStore';
import { usePredictionsApi } from '../../../hooks/usePredictionsApi';
import { useAuthStore } from '../../../store/authStore';
import { searchStocks, getStockName } from '../../../lib/egxStocks';
import api from '../../../lib/api';
import {
  formatRange,
  calcPoints,
  EXACT_BANDS,
  calcExactMaxPoints,
} from '../../../lib/scoringConstants';
import { ScoringInfoCard } from './ScoringInfoCard';

const TIMEFRAMES = ['WEEK', 'MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'NINE_MONTHS', 'YEAR'] as const;

interface TierDef {
  key: MoveTier;
  labelKey: string;
  basePoints: number;
  color: string;
  bg: string;
  border: string;
}

const TIERS: TierDef[] = [
  { key: 'LIGHT',   labelKey: 'predictions.tierLight',   basePoints: 25,  color: 'text-sky-400',   bg: 'bg-sky-500/10',   border: 'border-sky-500/40' },
  { key: 'MEDIUM',  labelKey: 'predictions.tierMedium',  basePoints: 55,  color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/40' },
  { key: 'STRONG',  labelKey: 'predictions.tierStrong',  basePoints: 100, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40' },
  { key: 'EXTREME', labelKey: 'predictions.tierExtreme', basePoints: 160, color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/40' },
];

function calcExpiresAt(timeframe: string): string {
  const d = new Date();
  if (timeframe === 'WEEK')              d.setDate(d.getDate() + 7);
  else if (timeframe === 'MONTH')        d.setMonth(d.getMonth() + 1);
  else if (timeframe === 'THREE_MONTHS') d.setMonth(d.getMonth() + 3);
  else if (timeframe === 'SIX_MONTHS')   d.setMonth(d.getMonth() + 6);
  else if (timeframe === 'NINE_MONTHS')  d.setMonth(d.getMonth() + 9);
  else if (timeframe === 'YEAR')         d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function NewPredictionSheet({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const step = usePredictionsStore((s) => s.newPredictionStep);
  const draft = usePredictionsStore((s) => s.newPredictionDraft);
  const { setNewPredictionStep, updateDraft } = usePredictionsStore();
  const { createPrediction, fetchMy, fetchFeed, fetchLimits } = usePredictionsApi();
  const [stockSearch, setStockSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringInfoOpen, setScoringInfoOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';
  const stockSuggestions = useMemo(
    () => searchStocks(stockSearch.trim(), lang).slice(0, 20),
    [stockSearch, lang]
  );

  const isPaid = user?.plan === 'pro' || user?.plan === 'yearly' || user?.plan === 'ultra' || user?.plan === 'ultra_yearly';
  const currentMode = draft.mode ?? 'TIER';

  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!showSuggestions) return;
    const handleWindowChange = () => setShowSuggestions(false);
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
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Stock price fetch failed:', err);
        setCurrentPrice(null);
      });
  }, [draft.ticker, accessToken]);

  const selectedTier = TIERS.find((t) => t.key === draft.moveTier) ?? null;
  const currentTf = (draft.timeframe ?? 'WEEK') as import('../../../lib/scoringConstants').PredictionTime;
  const pointPotential = selectedTier ? calcPoints(selectedTier.key, currentTf) : null;

  // EXACT mode computed values
  const exactTargetPrice = draft.targetPrice ?? null;
  const exactExpiresAt = draft.expiresAt ?? null;
  const exactDerivedDirection =
    exactTargetPrice != null && currentPrice != null && exactTargetPrice !== currentPrice
      ? exactTargetPrice > currentPrice ? 'UP' : 'DOWN'
      : null;
  const exactMaxPoints = exactExpiresAt ? calcExactMaxPoints(new Date(exactExpiresAt)) : null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const twoYearsOut = new Date();
  twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

  const canAdvanceStep2 =
    currentMode === 'TIER'
      ? draft.direction != null && draft.moveTier != null
      : isPaid && exactTargetPrice != null && exactTargetPrice > 0 && exactDerivedDirection != null && exactExpiresAt != null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (currentMode === 'TIER') {
        if (!draft.ticker || draft.direction == null || draft.moveTier == null || draft.timeframe == null) return;
        await createPrediction({
          ticker: draft.ticker,
          mode: 'TIER',
          direction: draft.direction,
          moveTier: draft.moveTier,
          timeframe: draft.timeframe,
          reason: draft.reason?.trim() || null,
          isPublic: draft.isPublic !== false,
        });
      } else {
        if (!draft.ticker || exactTargetPrice == null || !exactExpiresAt) return;
        await createPrediction({
          ticker: draft.ticker,
          mode: 'EXACT',
          targetPrice: exactTargetPrice,
          expiresAt: exactExpiresAt,
          reason: draft.reason?.trim() || null,
          isPublic: draft.isPublic !== false,
        });
      }
      onClose();
      fetchMy(1, 'ACTIVE');
      fetchFeed(1);
      fetchLimits();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('common.error'));
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
                <label htmlFor="new-prediction-stock-search" className="sr-only">{t('predictions.searchStock')}</label>
                <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step1Title')}</p>
                <div className="relative">
                  <input
                    id="new-prediction-stock-search"
                    type="text"
                    ref={inputRef}
                    value={stockSearch}
                    aria-required="true"
                    onFocus={() => { setShowSuggestions(true); updateDropdownPosition(); }}
                    onChange={(e) => { setStockSearch(e.target.value); setShowSuggestions(true); updateDropdownPosition(); }}
                    placeholder={t('predictions.searchStock')}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  />
                </div>
                {draft.ticker && <p className="text-sm text-[var(--brand)]">✓ {draft.ticker} {draft.stockName}</p>}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <button type="button" onClick={() => setNewPredictionStep(1)} className="text-sm text-[var(--brand)]">← {t('common.back')}</button>

                {draft.ticker && currentPrice != null && (
                  <p className="font-medium text-sm">{draft.ticker} - {t('predictions.currentPrice')}: <span className="text-[var(--text-primary)] font-semibold">{currentPrice.toFixed(2)} {t('common.egp')}</span></p>
                )}

                {/* Mode toggle */}
                <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => updateDraft({ mode: 'TIER' })}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${currentMode === 'TIER' ? 'bg-[var(--brand)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                  >
                    {t('predictions.modeTabTier')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft({ mode: 'EXACT' })}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${currentMode === 'EXACT' ? 'bg-[var(--brand)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    {t('predictions.modeTabExact')}
                    {!isPaid && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${currentMode === 'EXACT' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'}`}>PRO</span>
                    )}
                  </button>
                </div>

                {/* ── TIER mode ── */}
                {currentMode === 'TIER' && (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">{t('predictions.step2Title')}</p>
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
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-[var(--text-secondary)]">{t('predictions.selectTier')}</p>
                            <button
                              type="button"
                              onClick={() => setScoringInfoOpen(true)}
                              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              {t('predictions.scoringInfoTitle')}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {TIERS.map((tier) => {
                              const isSelected = draft.moveTier === tier.key;
                              const dynRange = formatRange(tier.key, currentTf);
                              const dynPts = calcPoints(tier.key, currentTf);
                              return (
                                <button
                                  key={tier.key}
                                  type="button"
                                  onClick={() => updateDraft({ moveTier: tier.key })}
                                  className={`p-3 rounded-xl border-2 text-start transition-all ${isSelected ? `${tier.bg} ${tier.border}` : 'border-[var(--border)] bg-transparent hover:border-[var(--border-subtle)]'}`}
                                >
                                  <p className={`text-sm font-semibold ${isSelected ? tier.color : 'text-[var(--text-primary)]'}`}>
                                    {t(tier.labelKey)}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)]">{dynRange}</p>
                                  <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${isSelected ? tier.color : 'text-[var(--text-muted)]'}`}>
                                    <Zap className="w-3 h-3" />{dynPts} {t('predictions.pts')}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                          {selectedTier && (
                            <p className="text-xs text-[var(--text-muted)] mt-2">{t('predictions.tierHint')}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('predictions.timeframeLabel')}</p>
                          <div className="flex flex-wrap gap-2">
                            {TIMEFRAMES.map((tf) => (
                              <button
                                key={tf}
                                type="button"
                                onClick={() => updateDraft({ timeframe: tf })}
                                className={`px-3 py-1.5 rounded-lg text-sm ${draft.timeframe === tf ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)]'}`}
                              >
                                {t(
                                  tf === 'WEEK' ? 'predictions.timeframeWeek'
                                  : tf === 'MONTH' ? 'predictions.timeframeMonth'
                                  : tf === 'THREE_MONTHS' ? 'predictions.timeframeThreeMonths'
                                  : tf === 'SIX_MONTHS' ? 'predictions.timeframeSixMonths'
                                  : tf === 'NINE_MONTHS' ? 'predictions.timeframeNineMonths'
                                  : 'predictions.timeframeYear'
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{t('predictions.endsOn')}: {calcExpiresAt(draft.timeframe ?? 'WEEK')}</p>
                        </div>

                        {pointPotential != null && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-sm text-[var(--text-secondary)]">
                              {t('predictions.pointPotential')}: <span className="font-semibold text-amber-400">{pointPotential} {t('predictions.pts')}</span>
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── EXACT mode - upgrade gate ── */}
                {currentMode === 'EXACT' && !isPaid && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="font-semibold text-[var(--text-primary)]">{t('predictions.exactUpgradeTitle')}</p>
                    <p className="text-sm text-[var(--text-secondary)] max-w-xs">{t('predictions.exactUpgradeDesc')}</p>
                    <Button variant="secondary" onClick={() => { onClose(); navigate('/settings/subscription'); }}>{t('predictions.upgradeNow')}</Button>
                  </div>
                )}

                {/* ── EXACT mode - form ── */}
                {currentMode === 'EXACT' && isPaid && (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">{t('predictions.exactModeDesc')}</p>

                    {/* Target price */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        {t('predictions.exactTargetPrice')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={draft.targetPrice ?? ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateDraft({ targetPrice: isNaN(v) ? undefined : v });
                        }}
                        placeholder={currentPrice != null ? `${t('predictions.currentPrice')}: ${currentPrice.toFixed(2)}` : '0.00'}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                      {exactDerivedDirection && (
                        <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${exactDerivedDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                          {exactDerivedDirection === 'UP'
                            ? <><TrendingUp className="w-4 h-4" />{t('predictions.exactDerivedUp')}</>
                            : <><TrendingDown className="w-4 h-4" />{t('predictions.exactDerivedDown')}</>
                          }
                        </div>
                      )}
                      {exactTargetPrice != null && currentPrice != null && exactTargetPrice === currentPrice && (
                        <p className="mt-1 text-xs text-red-400">{t('predictions.exactPriceSameAsCurrent')}</p>
                      )}
                    </div>

                    {/* Expiry date */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        {t('predictions.exactExpiryDate')}
                      </label>
                      <input
                        type="date"
                        min={toDateInputValue(tomorrow)}
                        max={toDateInputValue(twoYearsOut)}
                        value={draft.expiresAt ? draft.expiresAt.split('T')[0] : ''}
                        onChange={(e) =>
                          updateDraft({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">{t('predictions.exactDateRange')}</p>
                    </div>

                    {/* Tolerance bands preview */}
                    {exactExpiresAt && exactMaxPoints != null && (
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('predictions.exactToleranceBands')}</p>
                        <div className="space-y-1.5">
                          {EXACT_BANDS.map((band) => {
                            const pts = Math.round(band.basePoints * (exactMaxPoints / 500));
                            return (
                              <div key={band.tolerance} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)]">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold ${band.color}`}>
                                    {lang === 'ar' ? band.labelAr : band.labelEn}
                                  </span>
                                  <span className="text-xs text-[var(--text-muted)]">±{band.tolerance}%</span>
                                </div>
                                <span className={`text-xs font-medium flex items-center gap-0.5 ${band.color}`}>
                                  <Zap className="w-3 h-3" />{pts} {t('predictions.pts')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {t('predictions.exactMaxPoints')}: <span className="font-semibold text-emerald-400">{exactMaxPoints} {t('predictions.pts')}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={() => setNewPredictionStep(3)} disabled={!canAdvanceStep2}>
                  {t('predictions.next')}
                </Button>
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
                      <p className="text-[10px] text-[var(--text-muted)]">{t('predictions.reasonHint')}</p>
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
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-sm space-y-1.5">
                  {currentMode === 'TIER' ? (
                    <>
                      <p>
                        <span className="font-semibold">{draft.ticker}</span>
                        {' · '}
                        {draft.direction === 'UP' ? t('predictions.directionUp') : t('predictions.directionDown')}
                        {' · '}
                        {selectedTier ? (
                          <span className={selectedTier.color}>{t(selectedTier.labelKey)} ({formatRange(selectedTier.key, currentTf)})</span>
                        ) : '-'}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        {t(
                          draft.timeframe === 'WEEK' ? 'predictions.timeframeWeek'
                          : draft.timeframe === 'MONTH' ? 'predictions.timeframeMonth'
                          : draft.timeframe === 'THREE_MONTHS' ? 'predictions.timeframeThreeMonths'
                          : draft.timeframe === 'SIX_MONTHS' ? 'predictions.timeframeSixMonths'
                          : draft.timeframe === 'NINE_MONTHS' ? 'predictions.timeframeNineMonths'
                          : 'predictions.timeframeYear'
                        )}
                        {' · '}
                        {t('predictions.endsOn')}: {calcExpiresAt(draft.timeframe ?? 'WEEK')}
                      </p>
                      {pointPotential != null && (
                        <p className="text-amber-400 font-medium flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {t('predictions.pointPotential')}: {pointPotential} {t('predictions.pts')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="flex items-center gap-1.5 flex-wrap">
                        <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold">{draft.ticker}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">{t('predictions.modeTabExact')}</span>
                      </p>
                      <p>
                        {t('predictions.exactTargetPrice')}: <span className="font-semibold text-[var(--text-primary)]">{exactTargetPrice?.toFixed(2)} {t('common.egp')}</span>
                        {exactDerivedDirection && (
                          <span className={`ms-2 font-medium ${exactDerivedDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                            {exactDerivedDirection === 'UP' ? '↑ ' : '↓ '}
                            {exactDerivedDirection === 'UP' ? t('predictions.directionUp') : t('predictions.directionDown')}
                          </span>
                        )}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        {t('predictions.exactExpiryDate')}: {exactExpiresAt ? new Date(exactExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                      </p>
                      {exactMaxPoints != null && (
                        <p className="text-emerald-400 font-medium flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {t('predictions.exactMaxPoints')}: {exactMaxPoints} {t('predictions.pts')}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {draft.reason && (
                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
                    "{draft.reason}"
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">{t('predictions.termsWarning')}</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <span className="text-sm">{t('predictions.agreeTerms')}</span>
                </label>
                {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">{error}</p>}
                <Button onClick={handleSubmit} disabled={!agreeTerms || submitting} loading={submitting}>{t('predictions.publishButton')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scoring info overlay */}
        <AnimatePresence>
          {scoringInfoOpen && <ScoringInfoCard onClose={() => setScoringInfoOpen(false)} />}
        </AnimatePresence>

        {/* Floating stock suggestions overlay */}
        <AnimatePresence>
          {showSuggestions && dropdownRect && stockSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed z-[9999] max-h-64 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl text-right"
              style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
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
