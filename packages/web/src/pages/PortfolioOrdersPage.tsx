import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Trash2, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { useLivePrices } from '../hooks/useLivePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { getStockName } from '../lib/egxStocks';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { BlurNum } from '../components/ui/BlurNum';
import EmptyState from '../components/shared/EmptyState';
import { toast } from '../store/toastStore';

export default function PortfolioOrdersPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isRTL = i18n.language.startsWith('ar');
  const { prices: livePrices } = useLivePrices();
  const { holdings, isLoading, removeHolding } = usePortfolio(livePrices);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handleDelete = async (id: string) => {
    if (!confirm(t('portfolio.deleteConfirm'))) return;
    try {
      await removeHolding(id);
    } catch {
      toast.error(t('errors.internal', { defaultValue: 'An unknown error occurred' }));
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/portfolio')}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <BackIcon className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('portfolio.yourOrders')}</h2>
          {!isLoading && holdings.length > 0 && (
            <p className="text-sm text-[var(--text-muted)]">{holdings.length} {isRTL ? 'أمر' : 'orders'}</p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={t('portfolio.noOrders')}
            description={t('portfolio.emptyDescription')}
            actionLabel={t('portfolio.addFirst')}
            onAction={() => navigate('/portfolio')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] text-label uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium text-start">{t('portfolio.stock')}</th>
                  <th className="px-6 py-4 font-medium text-center">{isRTL ? 'النوع' : 'Type'}</th>
                  <th className="px-6 py-4 font-medium text-center">{t('portfolio.shares')}</th>
                  <th className="px-6 py-4 font-medium text-center">{isRTL ? 'السعر' : 'Price'}</th>
                  <th className="px-6 py-4 font-medium text-center">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...holdings].sort((a, b) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()).map(h => {
                  const lang = isRTL ? 'ar' : 'en';
                  const date = new Date(h.buyDate);
                  const dateStr = date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <tr key={h.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="px-6 py-4 text-start">
                        <div className="font-bold text-[var(--text-primary)]">{getStockName(h.ticker, lang)}</div>
                        <div className="text-xs text-[var(--text-muted)]">{h.ticker}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {h.type === 'SELL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                            <TrendingDown className="w-3 h-3" />
                            {isRTL ? 'بيع' : 'SELL'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                            <TrendingUp className="w-3 h-3" />
                            {isRTL ? 'شراء' : 'BUY'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums text-center">{h.shares.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono tabular-nums text-center">
                        <BlurNum>{h.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</BlurNum>
                        <span className="ms-1 text-xs text-[var(--text-muted)]">EGP</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-[var(--text-secondary)] tabular-nums">{dateStr}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(h.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)]"
                          aria-label={t('portfolio.deleteOrder')}
                        >
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
  );
}
