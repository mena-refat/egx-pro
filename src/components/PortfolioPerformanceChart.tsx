import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Holding = { buyDate: string; shares: number; avgPrice: number };

type Props = {
  holdings: Holding[];
  totalCost: number;
  totalValue: number;
};

/** تنسيق التاريخ للمحور الأفقي حسب الفترة */
function formatDateLabel(date: Date, range: string, locale: string): string {
  if (range === '1D') return date.toLocaleTimeString(locale, { hour: 'numeric', hour12: true });
  if (range === '1W' || range === '1M') return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (range === '6M' || range === '1Y') return date.toLocaleDateString(locale, { month: 'short' });
  if (range === '3Y') return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
  if (range === '5Y') return date.toLocaleDateString(locale, { year: 'numeric' });
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** إنشاء تواريخ يومية للرسم (في الخفاء أيام كثيرة) — دقة أعلى */
function getTimelineDatesDaily(range: string): { dates: Date[]; showTickAt: (d: Date, i: number) => boolean } {
  const now = new Date();
  const out: Date[] = [];

  if (range === '1D') {
    for (let hour = 9; hour <= 15; hour++) {
      const d = new Date(now);
      d.setHours(hour, 0, 0, 0);
      out.push(d);
    }
    return { dates: out, showTickAt: (_, i) => i === 0 || i === out.length - 1 };
  }

  if (range === '1W') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '1M') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '6M') {
    for (let i = 179; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '1Y') {
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '3Y') {
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (365 * 3 - 1 - i * 3));
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '5Y') {
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (365 * 5 - 1 - i * 5));
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  }

  out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0));

  const showTickAt = (d: Date, i: number): boolean => {
    if (i === 0 || i === out.length - 1) return true;
    if (range === '1W') return true;
    if (range === '1M') return d.getDate() === 1 || i === 0 || i === out.length - 1;
    if (range === '6M' || range === '1Y') return d.getDate() === 1;
    if (range === '3Y' || range === '5Y') return d.getDate() === 1 && d.getMonth() === 0;
    return false;
  };
  return { dates: out, showTickAt };
}

type ChartPoint = { date: string; value: number; showTick: boolean; tooltipLabel: string };

/** بناء بيانات الرسم: نقطة لكل يوم (أو ساعة في 1D) + قيم حقيقية، مع showTick لعرض تسميات المحور */
function buildChartData(
  holdings: Holding[],
  totalCost: number,
  totalValue: number,
  range: string,
  locale: string,
  purchaseLabel: string,
  currentLabel: string
): ChartPoint[] {
  const now = new Date();
  const { dates: timeline, showTickAt } = getTimelineDatesDaily(range);
  if (timeline.length === 0) return [];

  const sorted = [...holdings].sort(
    (a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime()
  );

  const getValueAt = (t: Date): number => {
    const tMs = t.getTime();
    const nowMs = now.getTime();
    if (tMs >= nowMs) return totalValue;
    if (!sorted.length) return tMs <= nowMs - 86400000 ? totalCost : totalValue;
    const firstMs = new Date(sorted[0].buyDate).getTime();
    if (tMs < firstMs) return 0;
    let cumulative = 0;
    for (const h of sorted) {
      const dMs = new Date(h.buyDate).getTime();
      if (tMs >= dMs) cumulative += h.shares * h.avgPrice;
      else break;
    }
    return cumulative;
  };

  const lastIndex = timeline.length - 1;
  return timeline.map((d, i) => {
    const isLast = i === lastIndex;
    const value = isLast ? totalValue : getValueAt(d);
    const showTick = showTickAt(d, i);
    const dateStr = isLast ? currentLabel : showTick ? formatDateLabel(d, range, locale) : ' ';
    const tooltipLabel = isLast ? currentLabel : formatDateLabel(d, range, locale);
    return { date: dateStr, value, showTick, tooltipLabel };
  });
}

const ranges = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'];

const PortfolioPerformanceChart = memo(function PortfolioPerformanceChart({
  holdings,
  totalCost,
  totalValue,
}: Props) {
  const { t, i18n } = useTranslation('common');
  const [selectedRange, setSelectedRange] = useState('1M');
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';

  const purchaseLabel = t('dashboard.chartPurchaseValue');
  const currentLabel = t('dashboard.chartCurrentValue');
  const data = useMemo(
    () => buildChartData(holdings, totalCost, totalValue, selectedRange, locale, purchaseLabel, currentLabel),
    [holdings, totalCost, totalValue, selectedRange, locale, purchaseLabel, currentLabel]
  );

  const hasData = data.length > 0 && (totalCost > 0 || totalValue > 0);
  const values = data.map((d) => d.value).filter((v) => Number.isFinite(v));
  const minVal = values.length ? Math.min(...values, totalCost, totalValue) : 0;
  const maxVal = values.length ? Math.max(...values, totalCost, totalValue) : 1;
  const padding = maxVal > minVal ? (maxVal - minVal) * 0.1 : minVal * 0.05 || 1;
  const minDomain = Math.max(0, minVal - padding);
  const maxDomain = maxVal + padding;

  return (
    <div className="space-y-4">
      {!hasData ? (
        <p className="text-body text-[var(--text-muted)] py-8 text-center rounded-xl bg-[var(--bg-secondary)]">
          {t('dashboard.noPerformanceData')}
        </p>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {ranges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedRange === range
                    ? 'bg-[var(--brand)] text-[var(--text-inverse)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)' }}
                  tickFormatter={(value, index) => (data[index]?.showTick ? value : '')}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  domain={[minDomain, maxDomain]}
                  dx={-20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as ChartPoint;
                    return (
                      <div className="px-3 py-2">
                        <div className="text-label text-[var(--text-muted)]">{p.tooltipLabel}</div>
                        <div className="font-number tabular-nums">
                          {typeof p.value === 'number' ? `${p.value.toLocaleString(locale, { maximumFractionDigits: 0 })} EGP` : p.value}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
});

export default PortfolioPerformanceChart;
