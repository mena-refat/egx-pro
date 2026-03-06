import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, TrendingUp, TrendingDown, Briefcase, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../lib/api';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { getStockName, getStockInfo, searchStocks } from '../lib/egxStocks';
import { Stock } from '../types';

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

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await api.get('/stocks/prices');
        if (Array.isArray(res.data)) {
          setAllStocks(res.data.sort((a, b) => a.ticker.localeCompare(b.ticker)));
        }
      } catch (err) {
        console.error('Failed to fetch stocks for suggestions', err);
      }
    };
    fetchStocks();
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
    const sharesNum = parseFloat(newHolding.shares);
    const priceNum = parseFloat(newHolding.avgPrice);

    if (!newHolding.ticker || newHolding.ticker.length < 2) {
      setAddError(isRTL ? 'يرجى إدخال رمز سهم صحيح' : 'Please enter a valid ticker');
      return;
    }
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setAddError(isRTL ? 'الكمية يجب أن تكون أكبر من صفر' : 'Shares must be greater than zero');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setAddError(isRTL ? 'السعر يجب أن يكون أكبر من صفر' : 'Price must be greater than zero');
      return;
    }

    try {
      await addHolding({
        ticker: newHolding.ticker,
        shares: sharesNum,
        price: priceNum,
        date: newHolding.buyDate
      });
      setIsAdding(false);
      setShowSuggestions(false);
      setNewHolding({ ticker: '', shares: '', avgPrice: '', buyDate: new Date().toISOString().split('T')[0] });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if ((err as Error & { code?: string }).code === 'PORTFOLIO_LIMIT') {
          setShowPortfolioLimitModal(true);
        } else {
          setAddError(err.message);
        }
      } else {
        setAddError('An unknown error occurred');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا السهم؟' : 'Are you sure you want to delete this holding?')) return;
    try {
      await removeHolding(id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  const chartData = useMemo(() => {
    const sectorData: Record<string, number> = {};
    holdings.forEach(h => {
      const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
      const sector = livePrices[h.ticker]?.sector || allStocks.find(s => s.ticker === h.ticker)?.sector || 'Other';
      sectorData[sector] = (sectorData[sector] || 0) + (h.shares * currentPrice);
    });
    return Object.entries(sectorData).map(([name, value]) => ({ name, value }));
  }, [holdings, livePrices, allStocks]);

  const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-base p-6 h-32 animate-pulse bg-slate-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 card-base animate-pulse bg-slate-800/50" />
          <div className="h-96 card-base animate-pulse bg-slate-800/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 card-base">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <Briefcase className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">EGP</span></p>
        </div>
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            {stats.totalGain >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-medium uppercase tracking-wider">{isRTL ? 'الربح / الخسارة' : 'Profit / Loss'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${stats.totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stats.totalGain >= 0 ? '+' : ''}{stats.totalGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <span className={`text-sm font-bold ${stats.totalGain >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
              ({stats.gainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <PieChartIcon className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">{isRTL ? 'عدد الأسهم' : 'Holdings Count'}</span>
          </div>
          <p className="text-3xl font-bold">{holdings.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Holdings List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{isRTL ? 'الأسهم المملوكة' : 'Your Holdings'}</h3>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold transition-all text-white"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة سهم' : 'Add Stock'}
            </button>
          </div>

          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">{isRTL ? 'السهم' : 'Stock'}</th>
                    <th className="px-6 py-4 font-medium">{isRTL ? 'الكمية' : 'Shares'}</th>
                    <th className="px-6 py-4 font-medium">{isRTL ? 'متوسط السعر' : 'Avg Price'}</th>
                    <th className="px-6 py-4 font-medium">{isRTL ? 'السعر الحالي' : 'Current'}</th>
                    <th className="px-6 py-4 font-medium">{isRTL ? 'الربح/الخسارة' : 'P&L'}</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                  {holdings.map(h => {
                    const currentPrice = livePrices[h.ticker]?.price || h.avgPrice;
                    const profit = (currentPrice - h.avgPrice) * h.shares;
                    const profitPercent = h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
                    const lang = isRTL ? 'ar' : 'en';
                    const info = getStockInfo(h.ticker);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold">{getStockName(h.ticker, lang)}</div>
                          <div className="text-xs text-slate-500">{h.ticker}</div>
                          {info?.nameEn && <div className="text-xs text-slate-400 mt-0.5">{info.nameEn}</div>}
                        </td>
                        <td className="px-6 py-4 font-mono">{h.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">{h.avgPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">{currentPrice.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className={`font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs ${profit >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                            {profitPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDelete(h.id)}
                            className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {holdings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        {isRTL ? 'لا توجد أسهم مضافة بعد' : 'No holdings added yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="card-base p-8">
          <h3 className="text-xl font-bold mb-8">{isRTL ? 'توزيع القطاعات' : 'Sector Allocation'}</h3>
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
              <div className="h-full flex items-center justify-center text-slate-500">
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
              <h3 className="text-2xl font-bold mb-6">{isRTL ? 'إضافة سهم جديد' : 'Add New Holding'}</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm text-slate-400 mb-1">{isRTL ? 'رمز السهم' : 'Ticker'}</label>
                  <input 
                    type="text" required
                    value={newHolding.ticker}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setNewHolding({ ...newHolding, ticker: e.target.value });
                      setShowSuggestions(true);
                    }}
                    className="input-base"
                    placeholder={isRTL ? 'ابحث بالرمز أو الاسم...' : 'Search by ticker or name...'}
                  />
                  
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl"
                      >
                        {(() => {
                          const lang = isRTL ? 'ar' : 'en';
                          const suggestions = searchStocks(newHolding.ticker.trim(), lang).slice(0, 20);
                          return suggestions.length > 0 ? (
                            suggestions.map(eg => {
                              const priceStock = allStocks.find(s => s.ticker === eg.ticker);
                              return (
                                <button
                                  key={eg.ticker}
                                  type="button"
                                  onClick={() => {
                                    setNewHolding({
                                      ...newHolding,
                                      ticker: eg.ticker,
                                      avgPrice: priceStock?.price?.toString() || ''
                                    });
                                    setShowSuggestions(false);
                                  }}
                                  className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between border-b border-slate-100 dark:border-white/5 last:border-0"
                                >
                                  <span className="text-xs text-slate-500 truncate max-w-[150px]">{getStockName(eg.ticker, lang)}</span>
                                  <span className="font-bold text-sm">{eg.ticker}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              {newHolding.ticker.trim() ? (isRTL ? 'لا توجد نتائج' : 'No results found') : (isRTL ? 'اكتب للبحث بالعربي أو الإنجليزي أو الرمز' : 'Type to search by ticker or name')}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">{isRTL ? 'الكمية' : 'Shares'}</label>
                    <input 
                      type="number" required step="any"
                      value={newHolding.shares}
                      onChange={e => setNewHolding({ ...newHolding, shares: e.target.value })}
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">{isRTL ? 'سعر الشراء' : 'Buy Price'}</label>
                    <input 
                      type="number" required step="any"
                      value={newHolding.avgPrice}
                      onChange={e => setNewHolding({ ...newHolding, avgPrice: e.target.value })}
                      className="input-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{isRTL ? 'تاريخ الشراء' : 'Buy Date'}</label>
                  <input 
                    type="date" required
                    value={newHolding.buyDate}
                    onChange={e => setNewHolding({ ...newHolding, buyDate: e.target.value })}
                    className="input-base"
                  />
                </div>
                
                {addError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                    {addError}
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setShowSuggestions(false);
                      setAddError(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all text-slate-900 dark:text-white"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold shadow-lg shadow-violet-600/20 text-white transition-all"
                  >
                    {isRTL ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showPortfolioLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPortfolioLimitModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{t('plan.portfolioLimitMessage')}</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => { setShowPortfolioLimitModal(false); window.dispatchEvent(new CustomEvent('navigate-to-subscription')); }} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm">{t('plan.subscribeNow')}</button>
              <button type="button" onClick={() => setShowPortfolioLimitModal(false)} className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl font-medium text-sm">{t('plan.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
