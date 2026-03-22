import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet, TrendingUp, TrendingDown, Crown, Target, BarChart2,
  Trophy, Repeat2, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'growth' | 'target' | 'trade';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHLY_MIN  = 0;
const MONTHLY_MAX  = 500_000;
const MONTHLY_STEP = 1_000;
const INITIAL_MIN  = 0;
const INITIAL_MAX  = 5_000_000;
const INITIAL_STEP = 50_000;
const YEARS_MIN    = 1;
const YEARS_MAX    = 30;

const RETURN_OPTIONS = [
  { id: 'conservative' as const, rate: 15 },
  { id: 'moderate'     as const, rate: 25 },
  { id: 'optimistic'   as const, rate: 40 },
];

const YEAR_PRESETS = [1, 3, 5, 10, 15, 20, 30];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcGrowth(monthly: number, initial: number, years: number, annualRate: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const initialGrowth = initial * Math.pow(1 + r, n);
  const monthlyGrowth = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  const total    = initialGrowth + monthlyGrowth;
  const invested = initial + monthly * n;
  return {
    total,
    invested,
    profit: total - invested,
    profitPct: invested > 0 ? ((total - invested) / invested) * 100 : 0,
  };
}

function yearByYear(monthly: number, initial: number, years: number, annualRate: number) {
  return Array.from({ length: years }, (_, i) => calcGrowth(monthly, initial, i + 1, annualRate));
}

function calcMonthlyNeeded(target: number, initial: number, years: number, annualRate: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const initialFV = initial * Math.pow(1 + r, n);
  const remaining = target - initialFV;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / n;
  return remaining / ((Math.pow(1 + r, n) - 1) / r);
}

function calcTradeFees(value: number, brokerPct: number) {
  const broker = value * (brokerPct / 100);
  const fra    = value * 0.00005;
  const mcsd   = Math.min(value * 0.00009, 100);
  const stamp  = value * 0.001;
  return { broker, fra, mcsd, stamp, total: broker + fra + mcsd + stamp };
}

function calcTrade(buyPrice: number, shares: number, sellPrice: number, brokerPct: number) {
  const buyVal   = buyPrice  * shares;
  const sellVal  = sellPrice * shares;
  const buyFees  = calcTradeFees(buyVal,  brokerPct);
  const sellFees = calcTradeFees(sellVal, brokerPct);
  const totalFees = buyFees.total + sellFees.total;
  const netProfit = sellVal - buyVal - totalFees;
  const sellFeeRate = (brokerPct / 100) + 0.00005 + 0.00009 + 0.001;
  const breakEven = (buyVal + buyFees.total) / (shares * (1 - sellFeeRate));
  return {
    buyVal, sellVal, buyFees, sellFees, totalFees,
    grossProfit: sellVal - buyVal,
    netProfit,
    roi: buyVal > 0 ? (netProfit / (buyVal + buyFees.total)) * 100 : 0,
    breakEven,
  };
}

function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(digits)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(digits)}K`;
  return Math.round(n).toLocaleString('en-US');
}

function fmtAr(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(digits)} مليار`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(digits)} مليون`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(digits)} ألف`;
  return Math.round(n).toLocaleString('en-US');
}

function fmtSmart(n: number, isAr: boolean, digits = 1): string {
  return isAr ? fmtAr(n, digits) : fmt(n, digits);
}

function fmtFull(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function chartData(monthly: number, initial: number, years: number, annualRatePercent: number) {
  const r = annualRatePercent / 100 / 12;
  const points: { year: number; total: number; principal: number; profit: number }[] = [];
  for (let y = 0; y <= years; y++) {
    const months    = y * 12;
    const principal = initial + monthly * months;
    const initGrow  = initial * Math.pow(1 + r, months);
    const mthGrow   = months > 0 && r !== 0
      ? monthly * ((Math.pow(1 + r, months) - 1) / r)
      : monthly * months;
    const total = initGrow + mthGrow;
    points.push({ year: y, total: Math.round(total), principal: Math.round(principal), profit: Math.round(total - principal) });
  }
  return points;
}

function formatAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function formatMoney(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function getMotivationalMessage(total: number, t: (k: string) => string): string {
  if (total < 500_000)    return t('calculator.msgStart');
  if (total < 2_000_000)  return t('calculator.msgMid');
  if (total < 10_000_000) return t('calculator.msgMillion');
  return t('calculator.msgTop');
}

function getMilestone(total: number, t: (k: string) => string): string {
  if (total < 100_000)    return t('calculator.milestoneBegin');
  if (total < 500_000)    return t('calculator.milestoneSteady');
  if (total < 1_000_000)  return t('calculator.milestoneMillion');
  if (total < 5_000_000)  return t('calculator.milestoneMillionaire');
  if (total < 10_000_000) return t('calculator.milestoneWealth');
  return t('calculator.milestoneElite');
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 600, className = '', prefix = '', suffix = '' }: {
  value: number; duration?: number; className?: string; prefix?: string; suffix?: string;
}) {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const [display, setDisplay] = useState(safe);
  const prev = useRef(safe);

  useEffect(() => {
    if (prev.current === safe) return;
    const start = prev.current;
    prev.current = safe;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisplay(Math.round(start + (safe - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [safe, duration]);

  const formatted = Number.isFinite(display)
    ? display.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '0';
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}

// ─── Shared form components ───────────────────────────────────────────────────

/** Formats a raw numeric string with thousands commas when not focused */
function formatNumStr(raw: string, focused: boolean): string {
  if (focused || !raw) return raw;
  const [intPart, decPart] = raw.split('.');
  const int = parseInt(intPart || '0', 10);
  if (isNaN(int)) return raw;
  const formatted = int.toLocaleString('en-US');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

function CalcInput({ label, value, onChange, suffix, placeholder = '0', hint }: {
  label: string; value: string; onChange: (v: string) => void;
  suffix: string; placeholder?: string; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={formatNumStr(value, focused)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value.replace(/,/g, ''))}
          placeholder={placeholder}
          dir="ltr"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-body pe-14 ps-3 py-2.5 font-number tabular-nums text-right placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
        <span className="pointer-events-none absolute end-3 text-xs font-medium text-[var(--text-muted)]">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

/** Number input for slider rows — plain number while editing, commas when blurred */
function NumericBox({ value, onChange, className }: {
  value: number; onChange: (v: number) => void; className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? String(value) : value.toLocaleString('en-US')}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = Number(e.target.value.replace(/[^0-9]/g, ''));
        if (!isNaN(v)) onChange(v);
      }}
      className={className}
    />
  );
}

function YearPills({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const { t } = useTranslation('common');
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.durationLabel')}</label>
      <div className="flex flex-wrap gap-1.5">
        {YEAR_PRESETS.map((y) => (
          <button
            key={y} type="button" onClick={() => onChange(y)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
              value === y
                ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm'
                : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/50 hover:text-[var(--text-primary)]'
            }`}
          >
            {y}{t('calculator.yearSuffix')}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatePills({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  const { t } = useTranslation('common');
  const [custom, setCustom] = useState('');
  const OPTIONS = [
    { labelKey: 'calculator.rateConservative', rate: 12 },
    { labelKey: 'calculator.rateModerate',     rate: 22 },
    { labelKey: 'calculator.rateOptimistic',   rate: 38 },
  ];
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.rateLabel')}</label>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.rate} type="button"
            onClick={() => { onChange(o.rate); setCustom(''); }}
            className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all ${
              value === o.rate && !custom
                ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm'
                : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <span className="text-[10px] font-medium leading-none mb-1">{t(o.labelKey)}</span>
            <span className="text-base font-bold font-number">{o.rate}%</span>
          </button>
        ))}
        <div className={`flex flex-col items-center py-2.5 rounded-xl border transition-all ${
          custom ? 'bg-[var(--brand)]/8 border-[var(--brand)] shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border)]'
        }`}>
          <span className="text-[10px] font-medium leading-none mb-1 text-[var(--text-muted)]">{t('calculator.rateCustom')}</span>
          <div className="flex items-baseline gap-0.5">
            <input
              type="number" value={custom}
              onChange={(e) => { setCustom(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n > 0) onChange(n); }}
              placeholder="0"
              className="w-10 text-center text-base font-bold font-number bg-transparent text-[var(--text-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none"
            />
            <span className="text-xs text-[var(--text-muted)]">%</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">{t('calculator.rateNote')}</p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string;
  icon?: React.ComponentType<{ size: number }>;
}) {
  return (
    <div className="card-base p-4 flex items-center gap-3">
      {Icon && (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon size={15} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">{label}</p>
        <p className="text-base font-bold font-number tabular-nums truncate" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Mode: Growth ─────────────────────────────────────────────────────────────

function GrowthMode() {
  const { t, i18n } = useTranslation('common');
  const locale  = i18n.language.startsWith('ar') ? 'ar-EG' : 'en';
  const isRTL   = i18n.language.startsWith('ar');
  const isAr    = isRTL;

  const [monthly,  setMonthly ] = useState(5000);
  const [initial,  setInitial ] = useState(0);
  const [years,    setYears   ] = useState(10);
  const [returnId, setReturnId] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const annualRate   = RETURN_OPTIONS.find((o) => o.id === returnId)?.rate ?? 25;
  const result       = useMemo(() => calcGrowth(monthly, initial, years, annualRate), [monthly, initial, years, annualRate]);
  const data         = useMemo(() => chartData(monthly, initial, years, annualRate),  [monthly, initial, years, annualRate]);
  const breakdown    = useMemo(() => yearByYear(monthly, initial, years, annualRate), [monthly, initial, years, annualRate]);
  const compareBank  = useMemo(() => calcGrowth(monthly, initial, years, 8),          [monthly, initial, years]);
  const compareGold  = useMemo(() => calcGrowth(monthly, initial, years, 12),         [monthly, initial, years]);
  const message      = getMotivationalMessage(result.total, t);
  const milestone    = getMilestone(result.total, t);
  const currencyShort = t('calculator.currencyShort');
  const multiplier   = result.invested > 0 ? result.total / result.invested : 1;

  return (
    <div
      className={`grid gap-8 lg:gap-10 lg:grid-cols-[1fr_1fr] ${isRTL ? 'lg:grid-flow-dense' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── LEFT: Results ─────────────────────────────────────────── */}
      <div className={`space-y-5 ${isRTL ? 'lg:col-start-2' : 'lg:col-start-1'}`}>

        {/* Badges */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand)]/20 text-[var(--brand-text)] text-sm font-semibold">
            {milestone}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand)]/20 text-[var(--brand-text)] text-xs font-bold font-number">
            {t('calculator.badgeMultiplier', { n: multiplier.toFixed(1) })}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--success-bg)] border border-[var(--success)]/20 text-[var(--success-text)] text-xs font-bold font-number">
            {t('calculator.badgeReturn', { n: result.profitPct.toFixed(0) })}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-base p-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
              <Wallet size={14} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              {t('calculator.totalInvested')}
            </p>
            <p className="text-sm font-bold font-number tabular-nums text-[var(--text-primary)] leading-tight">
              <AnimatedNumber value={result.invested} suffix={` ${currencyShort}`} />
            </p>
          </div>
          <div className="card-base p-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--success-bg)] flex items-center justify-center mb-3">
              <TrendingUp size={14} className="text-[var(--success)]" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              {t('calculator.netProfit')}
            </p>
            <p className="text-sm font-bold font-number tabular-nums text-[var(--success)] leading-tight">
              <AnimatedNumber value={result.profit} prefix="+ " suffix={` ${currencyShort}`} />
            </p>
          </div>
          <div className="card-base p-4 border-[var(--brand)]/30 bg-[var(--brand-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/20 flex items-center justify-center mb-3">
              <Crown size={14} className="text-[var(--brand)]" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              {t('calculator.finalWealth')}
            </p>
            <p className="text-sm font-bold font-number tabular-nums text-[var(--brand)] leading-tight">
              <AnimatedNumber value={result.total} suffix={` ${currencyShort}`} />
            </p>
          </div>
        </div>

        {/* Motivational */}
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
            className="text-center text-[var(--text-muted)] text-sm"
          >
            {message}
          </motion.p>
        </AnimatePresence>

        {/* Chart */}
        <div className="card-base card-elevated p-4 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => isAr ? `${v}${t('calculator.yearSuffix')}` : `${v}${t('calculator.yearSuffix')}`}
              />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatAxis} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 shadow-lg text-sm">
                      <p className="font-semibold text-[var(--text-primary)] mb-2">{t('calculator.tooltipAfter', { n: d.year })}</p>
                      <p className="text-[var(--text-muted)]">{t('calculator.tooltipWealth')}: <span className="font-number font-semibold text-[var(--brand)]">{formatMoney(d.total, locale)}</span></p>
                      <p className="text-[var(--text-muted)]">{t('calculator.tooltipPrincipal')}: <span className="font-number">{formatMoney(d.principal, locale)}</span></p>
                      <p className="text-[var(--text-muted)]">{t('calculator.tooltipProfit')}: <span className="font-number text-[var(--success)]">+{formatMoney(d.profit, locale)}</span></p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="total" name={t('calculator.chartWealth')} stroke="var(--brand)" strokeWidth={2} fill="url(#wealthFill)" isAnimationActive animationDuration={500} />
              <Area type="monotone" dataKey="principal" name={t('calculator.chartPrincipal')} stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="5 3" fill="transparent" isAnimationActive animationDuration={500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            {t('calculator.compareTitle')}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('calculator.compareBank'), rate: 8,         value: compareBank.total, color: 'var(--text-secondary)', highlight: false },
              { label: t('calculator.compareGold'), rate: 12,        value: compareGold.total, color: 'var(--cream)',          highlight: false },
              { label: t('calculator.compareEGX'),  rate: annualRate, value: result.total,     color: 'var(--brand)',          highlight: true  },
            ].map((c) => (
              <div
                key={c.label}
                className={`card-base p-4 text-center relative ${c.highlight ? 'border-[var(--brand)]/40 bg-[var(--brand-subtle)]' : ''}`}
              >
                {c.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)] text-white">
                    {t('calculator.best')}
                  </span>
                )}
                <p className="text-xs text-[var(--text-muted)] mb-0.5">{c.label}</p>
                <p className="text-xs font-semibold mb-1.5" style={{ color: c.color }}>~{c.rate}%</p>
                <p className="text-base font-bold font-number tabular-nums" style={{ color: c.color }}>
                  {formatMoney(c.value, locale)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{currencyShort}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Year-by-year breakdown */}
        <div>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <BarChart2 size={14} className="text-[var(--brand)] shrink-0" />
            <span className="flex-1 text-start">{t('calculator.breakdownToggle')}</span>
            {showBreakdown ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
          </button>
          {showBreakdown && (
            <div className="mt-1 card-base overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center w-14">{t('calculator.breakdownYear')}</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-end">{t('calculator.breakdownInvested')}</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--success-text)] text-end">{t('calculator.breakdownTotal')}</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text)] text-end">{t('calculator.breakdownProfit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row, idx) => (
                    <tr key={idx} className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? 'bg-[var(--bg-secondary)]/40' : ''}`}>
                      <td className="px-4 py-2 text-[var(--text-muted)] text-center font-number">{idx + 1}</td>
                      <td className="px-4 py-2 text-[var(--text-secondary)] text-end font-number tabular-nums">{fmtSmart(row.invested, isAr, 0)}</td>
                      <td className="px-4 py-2 text-[var(--success-text)] font-semibold text-end font-number tabular-nums">{fmtSmart(row.total, isAr, 0)}</td>
                      <td className="px-4 py-2 text-[var(--brand-text)] font-semibold text-end font-number tabular-nums">+{fmtSmart(row.profit, isAr, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('calculator.disclaimer')}</p>
      </div>

      {/* ── RIGHT: Controls ───────────────────────────────────────── */}
      <div className={`space-y-7 ${isRTL ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('calculator.title')}</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">{t('calculator.subtitle')}</p>
        </div>

        {/* Monthly */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.monthly')}</label>
          <div className="flex items-center gap-2" dir="ltr">
            <input
              type="range" min={MONTHLY_MIN} max={MONTHLY_MAX} step={MONTHLY_STEP}
              value={Math.min(MONTHLY_MAX, Math.max(MONTHLY_MIN, monthly))}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="flex-1 h-2 rounded-full cursor-pointer accent-[var(--brand)] bg-[var(--bg-secondary)]"
            />
            <NumericBox
              value={monthly} onChange={(v) => setMonthly(v)}
              className="w-28 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-bold font-number tabular-nums text-center px-2 py-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <span className="text-xs text-[var(--text-muted)] shrink-0 w-8">{currencyShort}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-number" dir="ltr">
            <span>{MONTHLY_MIN.toLocaleString()}</span>
            <span>{MONTHLY_MAX.toLocaleString()}</span>
          </div>
        </div>

        {/* Initial capital */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.initialLabel')}</label>
          <div className="flex items-center gap-2" dir="ltr">
            <input
              type="range" min={INITIAL_MIN} max={INITIAL_MAX} step={INITIAL_STEP}
              value={Math.min(INITIAL_MAX, Math.max(INITIAL_MIN, initial))}
              onChange={(e) => setInitial(Number(e.target.value))}
              className="flex-1 h-2 rounded-full cursor-pointer accent-[var(--brand)] bg-[var(--bg-secondary)]"
            />
            <NumericBox
              value={initial} onChange={(v) => setInitial(v)}
              className="w-28 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-bold font-number tabular-nums text-center px-2 py-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <span className="text-xs text-[var(--text-muted)] shrink-0 w-8">{currencyShort}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-number" dir="ltr">
            <span>{INITIAL_MIN.toLocaleString()}</span>
            <span>{INITIAL_MAX.toLocaleString()}</span>
          </div>
        </div>

        {/* Years */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.years')}</label>
          <div className="flex items-center gap-2" dir="ltr">
            <input
              type="range" min={YEARS_MIN} max={YEARS_MAX}
              value={Math.min(YEARS_MAX, Math.max(YEARS_MIN, years))}
              onChange={(e) => setYears(Number(e.target.value))}
              className="flex-1 h-2 rounded-full cursor-pointer accent-[var(--brand)] bg-[var(--bg-secondary)]"
            />
            <input
              type="number" min={1} max={50} value={years}
              onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 1) setYears(Math.floor(v)); }}
              className="w-16 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-bold font-number tabular-nums text-center px-2 py-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-[var(--text-muted)] shrink-0">{t('calculator.yearsShort')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 20, 30].map((y) => (
              <button key={y} type="button" onClick={() => setYears(y)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  years === y
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                {y} {t('calculator.yearsShort')}
              </button>
            ))}
          </div>
        </div>

        {/* Return rate */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.return')}</label>
          <div className="grid grid-cols-3 gap-2">
            {RETURN_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => setReturnId(opt.id)}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  returnId === opt.id
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm'
                    : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <p className="text-xs font-medium">{t(`calculator.${opt.id}`)}</p>
                <p className="text-xl font-bold font-number mt-0.5">{opt.rate}%</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">{t('calculator.returnNote')}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Mode: Target ─────────────────────────────────────────────────────────────

function TargetMode() {
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language.startsWith('ar');
  const isAr  = isRTL;
  const cu    = t('calculator.currencyUnit');

  const [targetStr,  setTargetStr ] = useState('1000000');
  const [initialStr, setInitialStr] = useState('0');
  const [years,      setYears     ] = useState(10);
  const [rate,       setRate      ] = useState(22);

  const targetAmt  = Math.max(0, Number(targetStr)  || 0);
  const initialAmt = Math.max(0, Number(initialStr) || 0);

  const monthly = useMemo(
    () => calcMonthlyNeeded(targetAmt, initialAmt, years, rate),
    [targetAmt, initialAmt, years, rate],
  );
  const check = useMemo(
    () => calcGrowth(monthly, initialAmt, years, rate),
    [monthly, initialAmt, years, rate],
  );
  const yearsToDouble = useMemo(
    () => rate > 0 ? (Math.log(2) / Math.log(1 + rate / 100)).toFixed(1) : null,
    [rate],
  );
  const alreadyReached = initialAmt >= targetAmt && targetAmt > 0;

  return (
    <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_1fr]" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Left: Inputs ────────────────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('calculator.targetTitle')}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('calculator.targetSubtitle')}</p>
        </div>
        <div className="card-base card-elevated p-5 space-y-5">
          <CalcInput
            label={t('calculator.targetAmount')}
            value={targetStr} onChange={setTargetStr}
            suffix={cu} hint={t('calculator.targetAmountHint')}
            placeholder="1,000,000"
          />
          <CalcInput
            label={t('calculator.initialCapital')}
            value={initialStr} onChange={setInitialStr}
            suffix={cu} hint={t('calculator.targetInitialHint')}
          />
          <YearPills value={years} onChange={setYears} />
          <RatePills value={rate}  onChange={setRate} />
        </div>
      </div>

      {/* ── Right: Results ──────────────────────────────────────── */}
      <div className="space-y-4 flex flex-col justify-start">

        {alreadyReached ? (
          <div className="card-base p-6 border-[var(--success)]/30 bg-[var(--success-bg)] flex items-center gap-4">
            <Trophy size={28} className="text-[var(--success)] shrink-0" />
            <div>
              <p className="font-bold text-[var(--success-text)]">{t('calculator.targetReached')}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('calculator.targetReachedSub')}</p>
            </div>
          </div>
        ) : (
          <div className="card-base card-elevated p-6 border-[var(--success)]/20 bg-gradient-to-br from-emerald-950/60 via-green-950/40 to-[var(--bg-card)] relative overflow-hidden">
            <div className="absolute w-56 h-56 -top-12 -right-12 bg-emerald-500 opacity-[0.06] blur-3xl rounded-full pointer-events-none" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500/70 mb-1">
                {t('calculator.targetHeroLabel', { amount: `${fmtSmart(targetAmt, isAr)} ${cu}`, years })}
              </p>
              <p className="text-4xl font-bold font-number tabular-nums text-emerald-400 leading-none">
                {fmtSmart(monthly, isAr)}
              </p>
              <p className="text-lg text-emerald-400/80 font-medium mt-1">{cu} {t('calculator.targetPerMonth')}</p>
              <p className="text-sm text-emerald-500/55 mt-1 font-number">
                {t('calculator.targetMonthlyFull', { amount: fmtFull(monthly) })}
              </p>
            </div>
          </div>
        )}

        {!alreadyReached && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t('calculator.targetDeposits')}      value={`${fmtSmart(check.invested, isAr)} ${cu}`} color="var(--text-secondary)" icon={Wallet} />
            <StatCard label={t('calculator.targetExpectedProfit')} value={`${fmtSmart(check.profit, isAr)} ${cu}`}  color="var(--success)"        icon={TrendingUp} />
          </div>
        )}

        {/* Rule of 72 */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-subtle)] flex items-center justify-center shrink-0">
              <Repeat2 size={13} className="text-[var(--brand)]" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{t('calculator.rule72Title')}</h4>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {t('calculator.rule72Text', { rate, years: yearsToDouble ?? '—' })}
          </p>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] text-center">{t('calculator.educationalNote')}</p>
      </div>
    </div>
  );
}

// ─── Mode: Trade ──────────────────────────────────────────────────────────────

function TradeMode() {
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language.startsWith('ar');
  const cu    = t('calculator.currencyUnit');

  const [buyPrice,  setBuyPrice ] = useState('10.00');
  const [shares,    setShares   ] = useState('1000');
  const [sellPrice, setSellPrice] = useState('12.50');
  const [brokerPct, setBrokerPct] = useState('0.25');
  const [showFees,  setShowFees ] = useState(false);

  const bp = Math.max(0, Number(buyPrice)  || 0);
  const sh = Math.max(0, Number(shares)    || 0);
  const sp = Math.max(0, Number(sellPrice) || 0);
  const bk = Math.max(0, Number(brokerPct) || 0);

  const result   = useMemo(() => (bp > 0 && sh > 0 ? calcTrade(bp, sh, sp, bk) : null), [bp, sh, sp, bk]);
  const isProfit = (result?.netProfit ?? 0) >= 0;

  const EGX_FEES = [
    { label: t('calculator.tradeFeesBroker'), key: 'broker' as const },
    { label: t('calculator.tradeFeesFRA'),    key: 'fra'    as const },
    { label: t('calculator.tradeFeesMCSD'),   key: 'mcsd'   as const },
    { label: t('calculator.tradeFeesStamp'),  key: 'stamp'  as const },
  ];

  return (
    <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_1fr]" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Left: Inputs ────────────────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('calculator.tradeTitle')}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('calculator.tradeSubtitle')}</p>
        </div>
        <div className="card-base card-elevated p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <CalcInput label={t('calculator.tradeBuyPrice')}  value={buyPrice}  onChange={setBuyPrice}  suffix={cu} placeholder="0.00" />
            <CalcInput label={t('calculator.tradeSellPrice')} value={sellPrice} onChange={setSellPrice} suffix={cu} placeholder="0.00" />
          </div>
          <CalcInput
            label={t('calculator.tradeShares')} value={shares} onChange={setShares}
            suffix={isRTL ? 'سهم' : 'shares'} hint={t('calculator.tradeSharesHint')}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">{t('calculator.tradeBrokerLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {['0.175', '0.25', '0.35', '0.5'].map((v) => (
                <button key={v} type="button" onClick={() => setBrokerPct(v)}
                  className={`px-4 py-2 rounded-xl border text-sm font-bold font-number transition-all ${
                    brokerPct === v
                      ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/50 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Results ──────────────────────────────────────── */}
      <div className="space-y-4">

        {result ? (
          <>
            {/* Buy / Sell value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={13} className="text-[var(--text-muted)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('calculator.tradeBuyValue')}</p>
                </div>
                <p className="text-lg font-bold font-number tabular-nums text-[var(--text-primary)]">{fmtFull(result.buyVal)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{cu}</p>
              </div>
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={13} className="text-[var(--text-muted)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('calculator.tradeSellValue')}</p>
                </div>
                <p className="text-lg font-bold font-number tabular-nums text-[var(--text-primary)]">{fmtFull(result.sellVal)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{cu}</p>
              </div>
            </div>

            {/* Net profit */}
            <div className={`card-base card-elevated p-5 relative overflow-hidden ${isProfit ? 'border-[var(--success)]/25' : 'border-[var(--danger)]/25'}`}>
              <div className={`absolute inset-0 pointer-events-none ${isProfit ? 'bg-emerald-500/4' : 'bg-red-500/4'}`} />
              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isProfit ? 'bg-[var(--success-bg)]' : 'bg-[var(--danger-bg)]'}`}>
                  {isProfit
                    ? <TrendingUp  size={20} className="text-[var(--success)]" />
                    : <TrendingDown size={20} className="text-[var(--danger)]" />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {isProfit ? t('calculator.tradeNetProfit') : t('calculator.tradeNetLoss')}
                  </p>
                  <p className={`text-2xl font-bold font-number tabular-nums mt-0.5 ${isProfit ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                    {isProfit ? '+' : ''}{fmtFull(result.netProfit)} {cu}
                  </p>
                  <p className={`text-sm font-number mt-0.5 ${isProfit ? 'text-[var(--success)]/70' : 'text-[var(--danger)]/70'}`}>
                    {t('calculator.tradeROI', { n: result.roi.toFixed(2) })}
                  </p>
                </div>
              </div>
            </div>

            {/* Break-even */}
            <div className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Target size={13} className="text-amber-500" />
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{t('calculator.tradeBreakEven')}</h4>
              </div>
              <p className="text-2xl font-bold font-number tabular-nums text-amber-500">
                {fmtPrice(result.breakEven)} <span className="text-base font-medium">{cu}</span>
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('calculator.tradeBreakEvenHint', { price: fmtPrice(result.breakEven) })}
              </p>
            </div>

            {/* Fees breakdown */}
            <div>
              <button
                type="button"
                onClick={() => setShowFees((v) => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <span className="flex-1 text-start">{t('calculator.tradeFeesToggle')}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold font-number">
                  {fmtFull(result.totalFees)} {cu}
                </span>
                {showFees ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
              </button>

              {showFees && (
                <div className="mt-1 card-base overflow-hidden">
                  {(['buy', 'sell'] as const).map((side, sideIdx) => {
                    const fees = side === 'buy' ? result.buyFees : result.sellFees;
                    return (
                      <div key={side} className={sideIdx === 0 ? 'border-b border-[var(--border)]' : ''}>
                        <div className="px-4 py-2.5 bg-[var(--bg-secondary)]/60 flex items-center justify-between">
                          <p className={`text-xs font-bold uppercase tracking-wider ${side === 'buy' ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                            {t(side === 'buy' ? 'calculator.tradeFeesBuySide' : 'calculator.tradeFeesSellSide', { amount: `${fmtFull(fees.total)} ${cu}` })}
                          </p>
                        </div>
                        <div className="px-4 py-2 space-y-2">
                          {EGX_FEES.map(({ label, key }) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-muted)]">{label}</span>
                              <span className="text-[var(--text-secondary)] font-number tabular-nums">{fmtFull(fees[key])} {cu}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)]/40 border-t border-[var(--border)]">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{t('calculator.tradeFeesTotal')}</span>
                    <span className="text-sm font-bold font-number tabular-nums text-amber-500">{fmtFull(result.totalFees)} {cu}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card-base p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
            <BarChart2 size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('calculator.tradeEmptyState')}</p>
          </div>
        )}

        <p className="text-[11px] text-[var(--text-muted)] text-center">{t('calculator.educationalNote')}</p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function InvestmentCalculator() {
  const [mode, setMode] = useState<Mode>('growth');
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language.startsWith('ar');

  const MODES = [
    { id: 'growth' as Mode, labelKey: 'calculator.modeGrowth', sublabel: 'Growth',  Icon: TrendingUp, color: 'var(--brand)' },
    { id: 'target' as Mode, labelKey: 'calculator.modeTarget', sublabel: 'Target',  Icon: Target,     color: '#10b981'     },
    { id: 'trade'  as Mode, labelKey: 'calculator.modeTrade',  sublabel: 'Trading', Icon: BarChart2,  color: '#f59e0b'     },
  ];

  const active = MODES.find((m) => m.id === mode)!;

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Mode tab bar ─────────────────────────────────────────── */}
      <div className="card-base card-elevated p-1.5 flex gap-1">
        {MODES.map(({ id, labelKey, Icon, color }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--bg-primary)] shadow-md'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]'
              }`}
              style={isActive ? { color } : undefined}
            >
              <Icon size={16} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* ── Thin color bar ───────────────────────────────────────── */}
      <div className="h-px w-full rounded-full opacity-30 -mt-4" style={{ background: active.color }} />

      {/* ── Mode content ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {mode === 'growth' && <GrowthMode />}
          {mode === 'target' && <TargetMode />}
          {mode === 'trade'  && <TradeMode />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
