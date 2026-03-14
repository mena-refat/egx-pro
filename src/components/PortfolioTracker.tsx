import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown, Briefcase, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../lib/api';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { getStockName, getStockInfo, searchStocks } from '../lib/egxStocks';
import { GICS_SECTOR_LABELS } from '../hooks/useStockScreener';
import { Stock } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Skeleton } from './ui/Skeleton';
import EmptyState from './shared/EmptyState';
import { toast } from '../store/toastStore';

export default function PortfolioTracker() {
  const { t, i18n } = useTranslation('common');
  const { prices: livePrices } = useLivePrices();
  const { holdings, stats, isLoading, error, addHolding, removeHolding } = usePortfolio(livePrices);
  
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newHolding, setNewHolding] = useState({ ticker: '', shares: '', avgPrice: '', buyDate: new Date().toISOString().split('T')[0] });
  const [addError, setAddError] = useState<string | null>(null);
  const [showPortfolioLimitModal, setShowPortfolioLimitModal] = useState(false);

  const isRTL = i18n.language.startsWith('ar');

  useEffect(() => {
    const controller = new AbortController();
    const fetchStocks = async () => {
      try {
        const res = await api.get('/stocks/prices', { signal: controller.signal });
        const raw = (res.data as { data?: unknown[] })?.data ?? res.data;
        if (!controller.signal.aborted && Array.isArray(raw)) {
          setAllStocks(raw.sort((a: { ticker: string }, b: { ticker: string }) => a.ticker.localeCompare(b.ticker)));
        }
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED')) return;
        if (import.meta.env.DEV) console.error('Failed to fetch stocks for suggestions', err);
      }
    };
    fetchStocks();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError(null);
    const sharesRaw = newHolding.shares.trim();
    const sharesNum = parseInt(sharesRaw, 10);
    const priceNum = Math.round(parseFloat(newHolding.avgPrice) * 100) / 100;

    if (!newHolding.ticker || newHolding.ticker.length < 2) {
      setAddError(t('portfolio.invalidTicker'));
      return;
    }
    if (sharesRaw === '' || Number.isNaN(sharesNum)) {
      setAddError(t('portfolio.errors.quantityRequired'));
      return;
    }
    if (!Number.isInteger(parseFloat(sharesRaw)) || parseFloat(sharesRaw) !== sharesNum) {
      setAddError(t('portfolio.errors.quantityInt'));
      return;
    }
    if (sharesNum < 1) {
      setAddError(t('portfolio.errors.quantityMin'));
      return;
    }
    if (sharesNum > 1_000_000) {
      setAddError(t('portfolio.errors.quantityMax'));
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setAddError(t('portfolio.pricePositive'));
      return;
    }

    try {
      await addHolding({
        ticker: newHolding.ticker,
        shares: sharesNum,
        price: Number(priceNum.toFixed(2)),
        date: newHolding.buyDate
      });
      setIsAdding(false);
      setShowSuggestions(false);
      setNewHolding({ ticker: '', shares: '', avgPrice: '', buyDate: new Date().toISOString().split('T')[0] });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if ((err as Error & { code?: string }).code === 'PORTFOLIO_LIMIT_REACHED' || (err as Error & { code?: string }).code === 'PORTFOLIO_LIMIT') {
          setShowPortfolioLimitModal(true);
        } else {
          setAddError(t('common.error'));
        }
      } else {
        setAddError(t('common.error'));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('portfolio.deleteConfirm'))) return;
    try {
      await removeHolding(id);
    } catch (err: unknown) {
      toast.error(t('errors.internal', { defaultValue: 'An unknown error occurred' }));
    }
  };

  const chartData = useMemo(() => {
    const sectorData: Record<string, number> = {};
    holdings.forEach(h => {
      const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
      const sectorKey = livePrices[h.ticker]?.sector || allStocks.find(s => s.ticker === h.ticker)?.sector || 'OTHER';
      sectorData[sectorKey] = (sectorData[sectorKey] || 0) + (h.shares * currentPrice);
    });
    const labels = GICS_SECTOR_LABELS as Record<string, { ar: string; en: string }>;
    return Object.entries(sectorData).map(([key, value]) => {
      const label = key === 'OTHER'
        ? (isRTL ? 'أخرى' : 'Other')
        : (labels[key] ? (isRTL ? labels[key].ar : labels[key].en) : key);
      return { name: label, value };
    });
  }, [holdings, livePrices, allStocks, isRTL]);

  const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-[var(--danger)] card-base">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-[var(--text-secondary)] mb-2">
            <Briefcase className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">{t('portfolio.totalValue')}</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-[var(--text-muted)]">EGP</span></p>
        </div>
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-[var(--text-secondary)] mb-2">
            {stats.totalGain >= 0 ? <TrendingUp className="w-4 h-4 text-[var(--success)]" /> : <TrendingDown className="w-4 h-4 text-[var(--danger)]" />}
            <span className="text-sm font-medium uppercase tracking-wider">{t('portfolio.profitLoss')}</span>
          </div>
          <div className="flex items-baseline gap-2">
<p className={`text-3xl font-bold ${stats.totalGain >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.totalGain >= 0 ? '+' : ''}{stats.totalGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <span className={`text-sm font-bold ${stats.totalGain >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
              ({stats.gainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-[var(--text-secondary)] mb-2">
            <PieChartIcon className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">{t('portfolio.holdingsCount')}</span>
          </div>
          <p className="text-3xl font-bold">{holdings.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Holdings List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{t('portfolio.yourHoldings')}</h3>
            <Button onClick={() => setIsAdding(true)} variant="primary" size="md" icon={<Plus className="w-4 h-4" />} iconPosition="left">
              {t('portfolio.addStock')}
            </Button>
          </div>

          <div className="card-base overflow-hidden">
            {holdings.length === 0 && !isLoading ? (
              <EmptyState
                icon={PieChartIcon}
                title={t('portfolio.emptyTitle')}
                description={t('portfolio.emptyDescription')}
                actionLabel={t('portfolio.addFirst')}
                onAction={() => setIsAdding(true)}
              />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] text-label uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">{t('portfolio.stock')}</th>
                    <th className="px-6 py-4 font-medium">{t('portfolio.shares')}</th>
                    <th className="px-6 py-4 font-medium">{t('portfolio.avgPrice')}</th>
                    <th className="px-6 py-4 font-medium">{t('portfolio.currentPrice')}</th>
                    <th className="px-6 py-4 font-medium">{t('portfolio.pnl')}</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {holdings.map(h => {
                    const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
                    const profit = (currentPrice - h.avgPrice) * h.shares;
                    const profitPercent = h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
                    const lang = isRTL ? 'ar' : 'en';
                    const info = getStockInfo(h.ticker);

                    return (
                      <tr key={h.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold">{getStockName(h.ticker, lang)}</div>
                          <div className="text-xs text-[var(--text-muted)]">{h.ticker}</div>
                          {info?.nameEn && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{info.nameEn}</div>}
                        </td>
                        <td className="px-6 py-4 font-mono">{h.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">{h.avgPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">{currentPrice.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className={`font-bold ${profit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs ${profit >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                            {profitPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(h.id)} className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)]">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="card-base p-8">
          <h3 className="text-xl font-bold mb-8">{t('portfolio.sectorAllocation')}</h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                {isRTL ? 'لا توجد بيانات كافية' : 'Not enough data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Holding Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-base p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{t('portfolio.addNewHolding')}</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="relative">
                  <Input
                    label={t('portfolio.ticker')}
                    type="text"
                    required
                    value={newHolding.ticker}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setNewHolding({ ...newHolding, ticker: e.target.value });
                      setShowSuggestions(true);
                    }}
                    placeholder={t('portfolio.searchPlaceholder')}
                    inputClassName="input-base"
                  />
                  
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl"
                      >
                        {(() => {
                          const lang = isRTL ? 'ar' : 'en';
                          const suggestions = searchStocks(newHolding.ticker.trim(), lang).slice(0, 20);
                          return suggestions.length > 0 ? (
                            suggestions.map(eg => {
                              const priceStock = allStocks.find(s => s.ticker === eg.ticker);
                              return (
                                <Fragment key={eg.ticker}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                      const p = priceStock?.price;
                                      setNewHolding({
                                        ...newHolding,
                                        ticker: eg.ticker,
                                        avgPrice: p != null ? (Math.round(p * 100) / 100).toFixed(2) : ''
                                      });
                                      setShowSuggestions(false);
                                    }}
                                    className="w-full text-right px-4 py-3 justify-between border-b border-[var(--border-subtle)] last:border-0 rounded-none"
                                  >
                                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">{getStockName(eg.ticker, lang)}</span>
                                    <span className="font-bold text-sm">{eg.ticker}</span>
                                  </Button>
                                </Fragment>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                              {newHolding.ticker.trim() ? t('portfolio.noResults') : t('portfolio.typeToSearch')}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                  label={t('portfolio.shares')}
                  type="number"
                  required
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={newHolding.shares}
                  onChange={e => setNewHolding({ ...newHolding, shares: e.target.value })}
                  onKeyDown={(e) => {
                    if (['.', '-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (!/^\d+$/.test(pasted)) e.preventDefault();
                  }}
                  inputClassName="input-base"
                />
                  <Input
                    label={t('portfolio.buyPrice')}
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={newHolding.avgPrice}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || v === '.') {
                        setNewHolding({ ...newHolding, avgPrice: v });
                        return;
                      }
                      const num = parseFloat(v);
                      if (Number.isNaN(num)) return;
                      const [, dec] = v.split('.');
                      const limited = dec && dec.length > 2 ? `${Math.floor(num * 100) / 100}` : v;
                      setNewHolding({ ...newHolding, avgPrice: limited });
                    }}
                    inputClassName="input-base"
                  />
                </div>
                <Input label={isRTL ? 'تاريخ الشراء' : 'Buy Date'} type="date" required value={newHolding.buyDate} max={new Date().toISOString().slice(0, 10)} onChange={e => setNewHolding({ ...newHolding, buyDate: e.target.value })} inputClassName="input-base" />
                
                {addError && (
                  <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-xl text-[var(--danger)] text-sm">
                    {addError}
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <Button type="button" variant="secondary" size="lg" fullWidth onClick={() => { setIsAdding(false); setShowSuggestions(false); setAddError(null); }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" size="lg" fullWidth>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showPortfolioLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPortfolioLimitModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{t('plan.portfolioLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="primary" size="md" onClick={() => { setShowPortfolioLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }}>{t('plan.subscribeNow')}</Button>
              <Button type="button" variant="secondary" size="md" onClick={() => setShowPortfolioLimitModal(false)}>{t('plan.cancel')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
