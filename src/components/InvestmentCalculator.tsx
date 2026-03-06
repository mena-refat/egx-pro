import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, TrendingUp, Crown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const MONTHLY_MIN = 500;
const MONTHLY_MAX = 100_000;
const MONTHLY_STEP = 500;
const INITIAL_MIN = 0;
const INITIAL_MAX = 500_000;
const INITIAL_STEP = 5_000;
const YEARS_MIN = 1;
const YEARS_MAX = 30;
const RETURN_OPTIONS = [
  { id: 'conservative' as const, rate: 15 },
  { id: 'moderate' as const, rate: 25 },
  { id: 'optimistic' as const, rate: 40 },
];

function calculate(
  monthly: number,
  initial: number,
  years: number,
  annualRatePercent: number
): { total: number; invested: number; profit: number } {
  const monthlyRate = annualRatePercent / 100 / 12;
  const months = years * 12;

  const initialGrowth = initial * Math.pow(1 + monthlyRate, months);
  const monthlyGrowth =
    monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  const total = initialGrowth + monthlyGrowth;
  const invested = initial + monthly * months;
  const profit = total - invested;

  return { total, invested, profit };
}

function chartData(
  monthly: number,
  initial: number,
  years: number,
  annualRatePercent: number
): { year: number; total: number; principal: number; profit: number }[] {
  const monthlyRate = annualRatePercent / 100 / 12;
  const points: { year: number; total: number; principal: number; profit: number }[] = [];

  for (let y = 0; y <= years; y++) {
    const months = y * 12;
    const principal = initial + monthly * months;
    const initialGrowth = initial * Math.pow(1 + monthlyRate, months);
    const monthlyGrowth =
      months > 0
        ? monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        : 0;
    const total = initialGrowth + monthlyGrowth;
    points.push({
      year: y,
      total: Math.round(total),
      principal: Math.round(principal),
      profit: Math.round(total - principal),
    });
  }
  return points;
}

function formatAxis(value: number, locale: string): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatMoney(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function AnimatedNumber({
  value,
  duration = 600,
  className = '',
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  const [display, setDisplay] = useState(safeValue);
  const prevRef = useRef(safeValue);

  useEffect(() => {
    if (prevRef.current === safeValue) return;
    const start = prevRef.current;
    prevRef.current = safeValue;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (safeValue - start) * easeOut));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [safeValue, duration]);

  const formatted = Number.isFinite(display) ? display.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }) : '0';
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

function getMotivationalMessage(
  total: number,
  t: (key: string) => string
): string {
  if (total < 500_000) return t('calculator.msgStart');
  if (total < 2_000_000) return t('calculator.msgMid');
  if (total < 10_000_000) return t('calculator.msgMillion');
  return t('calculator.msgTop');
}

export default function InvestmentCalculator() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en';
  const isRTL = i18n.language === 'ar';

  const [monthly, setMonthly] = useState(5000);
  const [initial, setInitial] = useState(0);
  const [years, setYears] = useState(10);
  const [returnId, setReturnId] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');

  const annualRate = RETURN_OPTIONS.find((o) => o.id === returnId)?.rate ?? 25;

  const result = useMemo(
    () => calculate(monthly, initial, years, annualRate),
    [monthly, initial, years, annualRate]
  );

  const data = useMemo(
    () => chartData(monthly, initial, years, annualRate),
    [monthly, initial, years, annualRate]
  );

  const message = getMotivationalMessage(result.total, t);

  const compareBank = useMemo(
    () => calculate(monthly, initial, years, 8),
    [monthly, initial, years]
  );
  const compareGold = useMemo(
    () => calculate(monthly, initial, years, 12),
    [monthly, initial, years]
  );

  const currencyShort = t('calculator.currencyShort');

  return (
    <div
      className={`w-full max-w-full grid gap-8 lg:gap-10 lg:grid-cols-[1fr_1fr] ${isRTL ? 'lg:grid-flow-dense' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* 50/50 column: Chart + Results (left in LTR, left in RTL) */}
      <div className={`space-y-6 min-w-0 ${isRTL ? 'lg:col-start-2' : 'lg:col-start-1'}`}>
        {/* Result cards — same size, full numbers visible (no truncation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center gap-3 h-[88px]">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{t('calculator.totalInvested')}</p>
              <p className="text-base font-bold text-slate-200 break-all leading-tight">
                <AnimatedNumber value={result.invested} suffix={` ${currencyShort}`} />
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center gap-3 h-[88px]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{t('calculator.netProfit')}</p>
              <p className="text-base font-bold text-emerald-400 break-all leading-tight">
                <AnimatedNumber value={result.profit} prefix="+ " suffix={` ${currencyShort}`} />
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 flex items-center gap-3 h-[88px]">
            <div className="w-10 h-10 rounded-lg bg-violet-500/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs text-violet-300/80 uppercase tracking-wider">{t('calculator.finalWealth')}</p>
              <p className="text-base font-bold text-violet-400 break-all leading-tight">
                <AnimatedNumber value={result.total} suffix={` ${currencyShort}`} />
              </p>
            </div>
          </div>
        </div>

        {/* Motivational message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center text-slate-400 text-sm py-1"
          >
            {message}
          </motion.p>
        </AnimatePresence>

        {/* Chart — 400px height, full width */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <defs>
                <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-700" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (locale.startsWith('ar') ? `${v} س` : `${v}y`)}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatAxis}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 shadow-xl text-sm">
                      <p className="text-slate-300 font-medium mb-2">
                        {t('calculator.tooltipAfter', { n: d.year })}
                      </p>
                      <p className="text-slate-400">
                        {t('calculator.tooltipWealth')}: {formatMoney(d.total, locale)}
                      </p>
                      <p className="text-slate-400">
                        {t('calculator.tooltipPrincipal')}: {formatMoney(d.principal, locale)}
                      </p>
                      <p className="text-emerald-400">
                        {t('calculator.tooltipProfit')}: {formatMoney(d.profit, locale)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name={t('calculator.chartWealth')}
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#wealthFill)"
                isAnimationActive
                animationDuration={400}
                animationEasing="ease"
              />
              <Area
                type="monotone"
                dataKey="principal"
                name={t('calculator.chartPrincipal')}
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="6 4"
                fill="transparent"
                isAnimationActive
                animationDuration={400}
                animationEasing="ease"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison */}
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-3">{t('calculator.compareTitle')}</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{t('calculator.compareBank')}</p>
              <p className="text-sm text-slate-400">~8%</p>
              <p className="text-lg font-bold text-slate-200 mt-1">
                {formatMoney(compareBank.total, locale)} {currencyShort}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{t('calculator.compareGold')}</p>
              <p className="text-sm text-slate-400">~12%</p>
              <p className="text-lg font-bold text-slate-200 mt-1">
                {formatMoney(compareGold.total, locale)} {currencyShort}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/15 p-4 text-center relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-500 text-white text-xs font-medium">
                {t('calculator.best')}
              </span>
              <p className="text-xs text-violet-300/90 mb-1">{t('calculator.compareEGX')}</p>
              <p className="text-sm text-violet-400">~{annualRate}%</p>
              <p className="text-lg font-bold text-violet-400 mt-1">
                {formatMoney(result.total, locale)} {currencyShort}
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 leading-relaxed">{t('calculator.disclaimer')}</p>
      </div>

      {/* 40% column: Controls (right in LTR, right in RTL) */}
      <div className={`space-y-8 min-w-0 ${isRTL ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{t('calculator.title')}</h2>
          <p className="text-slate-400 text-sm mt-1">{t('calculator.subtitle')}</p>
        </div>

        {/* [1] Monthly — slider + numeric input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('calculator.monthly')}</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={MONTHLY_MIN}
              max={MONTHLY_MAX}
              step={MONTHLY_STEP}
              value={Math.min(MONTHLY_MAX, Math.max(MONTHLY_MIN, monthly))}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="flex-1 min-w-0 h-2.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <input
              type="number"
              min={0}
              step={500}
              value={monthly}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 0) setMonthly(v);
              }}
              className="w-28 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-500 text-sm w-6 shrink-0">{currencyShort}</span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{MONTHLY_MIN.toLocaleString()} {currencyShort}</span>
            <span>{MONTHLY_MAX.toLocaleString()} {currencyShort}</span>
          </div>
        </div>

        {/* [2] Initial — 0 left, 500,000 right (dir=ltr so slider never reversed) */}
        <div dir="ltr">
          <label className="block text-sm text-slate-400 mb-2">{t('calculator.initialLabel')}</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={INITIAL_MIN}
              max={INITIAL_MAX}
              step={INITIAL_STEP}
              value={Math.min(INITIAL_MAX, Math.max(INITIAL_MIN, initial))}
              onChange={(e) => setInitial(Number(e.target.value))}
              className="flex-1 min-w-0 h-2.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <input
              type="number"
              min={0}
              step={5000}
              value={initial}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 0) setInitial(v);
              }}
              className="w-28 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-500 text-sm w-6 shrink-0">{currencyShort}</span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{INITIAL_MIN.toLocaleString()} {currencyShort}</span>
            <span>{INITIAL_MAX.toLocaleString()} {currencyShort}</span>
          </div>
        </div>

        {/* [3] Years — slider + numeric input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('calculator.years')}</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={YEARS_MIN}
              max={YEARS_MAX}
              value={Math.min(YEARS_MAX, Math.max(YEARS_MIN, years))}
              onChange={(e) => setYears(Number(e.target.value))}
              className="flex-1 min-w-0 h-2.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 1) setYears(Math.floor(v));
              }}
              className="w-20 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-500 text-sm shrink-0">{t('calculator.yearsShort')}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[5, 10, 20, 30].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  years === y
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {y} {t('calculator.yearsShort')}
              </button>
            ))}
          </div>
        </div>

        {/* [4] Return toggle */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('calculator.return')}</label>
          <div className="grid grid-cols-3 gap-2">
            {RETURN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReturnId(opt.id)}
                className={`py-3 px-2 rounded-xl border text-center transition-colors ${
                  returnId === opt.id
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                }`}
              >
                <p className="text-sm font-medium">{t(`calculator.${opt.id}`)}</p>
                <p className="text-lg font-bold">{opt.rate}%</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">{t('calculator.returnNote')}</p>
        </div>
      </div>
    </div>
  );
}
