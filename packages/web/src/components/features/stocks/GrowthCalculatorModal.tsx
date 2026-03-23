import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { formatNum } from '../analysis/analysisUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  stockName: string;
  price: number;
  high52w: number;
  low52w: number;
  isRTL: boolean;
}

const YEARS = [1, 2, 3, 5, 10];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmtEGP(n: number, isRTL: boolean): string {
  return isRTL ? `${fmt(n)} ج.م` : `EGP ${fmt(n)}`;
}

export function GrowthCalculatorModal({ isOpen, onClose, ticker, stockName, price, high52w, low52w, isRTL }: Props) {
  const ar = isRTL;

  // Estimate annual return from 52-week performance (current vs 52w low)
  const estimatedReturn = useMemo(() => {
    if (!low52w || !price || low52w <= 0) return 10;
    const r = ((price - low52w) / low52w) * 100;
    // Cap between -50% and 300% to keep projections sensible
    return Math.min(300, Math.max(-50, Math.round(r * 10) / 10));
  }, [price, low52w]);

  const [investment, setInvestment] = useState('10000');
  const [rate, setRate]             = useState(String(estimatedReturn));

  const parsedInvestment = Math.max(0, parseFloat(investment) || 0);
  const parsedRate       = Math.min(300, Math.max(-99, parseFloat(rate) || 0));

  const sharesCount = price > 0 ? Math.floor(parsedInvestment / price) : 0;

  const projections = YEARS.map((y) => {
    const value  = parsedInvestment * Math.pow(1 + parsedRate / 100, y);
    const profit = value - parsedInvestment;
    const pct    = parsedInvestment > 0 ? (profit / parsedInvestment) * 100 : 0;
    return { years: y, value, profit, pct };
  });

  const range52wPct = low52w > 0 ? ((high52w - low52w) / low52w) * 100 : 0;

  const bump = (delta: number) => {
    setRate((prev) => {
      const next = (parseFloat(prev) || 0) + delta;
      return String(Math.min(300, Math.max(-99, Math.round(next * 10) / 10)));
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            dir={ar ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[var(--brand)]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">
                    {ar ? 'حاسبة النمو' : 'Growth Calculator'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{ticker} · {stockName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* 52-week context */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: ar ? 'السعر الحالي' : 'Current price', value: `${formatNum(price)} EGP`, highlight: true },
                  { label: ar ? 'أدنى 52 أسبوع' : '52w Low',  value: `${formatNum(low52w)} EGP`,  highlight: false },
                  { label: ar ? 'أعلى 52 أسبوع' : '52w High', value: `${formatNum(high52w)} EGP`, highlight: false },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl p-3 text-center border ${item.highlight ? 'bg-[var(--brand)]/8 border-[var(--brand)]/20' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
                    <p className={`text-xs font-bold tabular-nums ${item.highlight ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{item.value}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <p className="text-xs text-[var(--text-muted)]">
                  {ar
                    ? `نطاق السعر خلال 52 أسبوع: ${range52wPct >= 0 ? '+' : ''}${range52wPct.toFixed(1)}%`
                    : `52-week price swing: ${range52wPct >= 0 ? '+' : ''}${range52wPct.toFixed(1)}%`
                  }
                </p>
              </div>

              {/* Investment input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  {ar ? 'مبلغ الاستثمار' : 'Investment amount'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 transition"
                    placeholder="10000"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium pointer-events-none">
                    {ar ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                {sharesCount > 0 && price > 0 && (
                  <p className="text-xs text-[var(--text-muted)] ps-1">
                    {ar
                      ? `≈ ${sharesCount.toLocaleString('ar-EG')} سهم بالسعر الحالي`
                      : `≈ ${sharesCount.toLocaleString()} shares at current price`
                    }
                  </p>
                )}
              </div>

              {/* Annual rate input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                    {ar ? 'معدل النمو السنوي المتوقع' : 'Expected annual growth rate'}
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                    {ar ? 'مبني على أداء 52 أسبوع' : 'based on 52-week data'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 transition"
                    />
                    <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium pointer-events-none">%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => bump(1)}  className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] transition-colors">
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                    <button onClick={() => bump(-1)} className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] transition-colors">
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Projections table */}
              {parsedInvestment > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                    {ar ? 'التوقعات' : 'Projections'}
                  </p>
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    {projections.map((row, i) => {
                      const isPositive = row.profit >= 0;
                      return (
                        <div
                          key={row.years}
                          className={`flex items-center justify-between px-4 py-3 gap-3 ${i < projections.length - 1 ? 'border-b border-[var(--border)]' : ''} ${i === projections.length - 1 ? 'bg-[var(--brand)]/5' : ''}`}
                        >
                          <span className="text-sm font-medium text-[var(--text-secondary)] shrink-0">
                            {ar ? `${row.years} ${row.years === 1 ? 'سنة' : 'سنوات'}` : `${row.years}y`}
                          </span>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                              {fmtEGP(row.value, ar)}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                              {isPositive ? '+' : ''}{row.pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] ps-1">
                    {ar
                      ? `بدأت بـ ${fmtEGP(parsedInvestment, ar)} · عائد سنوي ${parsedRate >= 0 ? '+' : ''}${parsedRate}% · نمو مركّب`
                      : `Starting ${fmtEGP(parsedInvestment, ar)} · ${parsedRate >= 0 ? '+' : ''}${parsedRate}% p.a. · compounded`
                    }
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  {ar
                    ? 'هذه حسابات توقعية فقط بناءً على الأداء التاريخي للسهم. الأداء السابق لا يضمن نتائج مستقبلية. قد تنخفض قيمة الاستثمار أو ترتفع. هذا ليس نصيحة مالية.'
                    : 'These are projections only, based on historical price performance. Past performance does not guarantee future results. Investment value can go up or down. This is not financial advice.'
                  }
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
