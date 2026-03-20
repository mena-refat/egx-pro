import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Holding = { buyDate: string; shares: number; avgPrice: number };

type Props = {
  holdings: Holding[];
  totalCost: number;
  totalValue: number;
};

/** تنسيق مختصر للمحور X فقط */
function formatDateLabelShort(date: Date, range: string, locale: string): string {
  const isAr = locale.startsWith('ar');
  if (range === '1D') {
    let h = date.getHours();
    const m = date.getMinutes();
    if (m === 0) {
      const isAm = h < 12;
      if (h === 0) h = 12;
      if (h > 12) h = h - 12;
      return `${h}${isAr ? (isAm ? 'ص' : 'م') : isAm ? 'AM' : 'PM'}`;
    }
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (range === '1W') return String(date.getDate());
  if (range === '1M') return `${date.getDate()}/${date.getMonth() + 1}`;
  if (range === '6M' || range === '1Y') {
    const short = date.toLocaleDateString(locale, { month: 'short' });
    return isAr && short.length > 3 ? short.slice(0, 3) : short;
  }
  if (range === '3Y') {
    const m = date.toLocaleDateString(locale, { month: 'short' });
    const y = date.getFullYear().toString().slice(-2);
    return isAr && m.length > 3 ? `${m.slice(0, 3)} ${y}` : `${m} ${y}`;
  }
  if (range === '5Y') return date.getFullYear().toString();
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** إنشاء تواريخ يومية/ساعة للرسم (في الخفاء) - دقة أعلى */
function getTimelineDatesDaily(range: string): { dates: Date[]; showTickAt: (d: Date, i: number) => boolean } {
  const now = new Date();
  const out: Date[] = [];

  if (range === '1D') {
    const endHour = now.getHours();
    for (let hour = 0; hour <= endHour; hour++) {
      const d = new Date(now);
      d.setHours(hour, 0, 0, 0);
      out.push(d);
    }
    return {
      dates: out,
      // لا نعرض عند نقطة الأصل (0 على المحورين)، نبدأ من 12 AM (index 0) حتى الآن، كل ساعة، لكن بدون كتابة عند التلاقي مع محور Y
      showTickAt: (_d, i) => i > 0,
    };
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
    for (let i = 365 * 3 - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  } else if (range === '5Y') {
    for (let i = 365 * 5 - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
  }

  // نضيف نقطة \"اليوم\" فقط للفترات الكبيرة (1Y, 3Y, 5Y) لضمان وجود القيمة الحالية
  // 6M مبني بالفعل على آخر 180 يوم من ضمنهم اليوم، فلا نكرر نقطة اليوم
  if (['1Y', '3Y', '5Y'].includes(range)) {
    out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0));
  }

  const showTickAt = (d: Date, i: number): boolean => {
    // لا نعرض أي نص على محور X عند النقطة 0 (تلاقيه مع محور Y)
    if (i === 0) return false;
    if (i === out.length - 1) return true;
    // الأسبوع: كل نقطة = يوم، لكن لا نكتب عند نقطة الأصل (index 0)
    if (range === '1W') return i > 0;
    // في الشهر: تيك كل أسبوع تقريباً (كل 7 أيام) + النهاية
    if (range === '1M') return i % 7 === 0 || i === out.length - 1;
    if (range === '6M' || range === '1Y') return d.getDate() === 1;
    if (range === '3Y' || range === '5Y') return d.getDate() === 1 && d.getMonth() === 0;
    return false;
  };
  return { dates: out, showTickAt };
}

type ChartPoint = {
  /** القيمة الفعلية على محور X (timestamp) */
  x: number;
  /** النص المعروض على محور X (قد يكون فارغ لإخفاء التكة) */
  label: string;
  value: number;
  showTick: boolean;
  /** نص التاريخ/الوقت بالإنجليزي للـ Tooltip فقط */
  tooltipLabelEn: string;
};

/** بناء بيانات الرسم: نقطة لكل يوم (أو ساعة في 1D) + قيم حقيقية، مع showTick لعرض تسميات المحور */
function buildChartData(
  holdings: Holding[],
  totalCost: number,
  totalValue: number,
  range: string,
  locale: string, // يُستخدم فقط لتحديد شكل التكة (اختصار عربي/إنجليزي)
  purchaseLabel: string, // متروك للمستقبل لو أحببنا استعماله
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
  const currentLabelEn = 'Current Value';
  return timeline.map((d, i) => {
    const isLast = i === lastIndex;
    const value = isLast ? totalValue : getValueAt(d);
    const showTick = showTickAt(d, i);
    const x = d.getTime();
    const label = isLast ? currentLabel : showTick ? formatDateLabelShort(d, range, locale) : '';

    // Tooltip label بالإنجليزي فقط
    const dateForEn = new Date(x);
    let tooltipLabelEn: string;
    if (isLast) {
      tooltipLabelEn = currentLabelEn;
    } else if (range === '1D') {
      tooltipLabelEn = dateForEn.toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      tooltipLabelEn = dateForEn.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    tooltipLabelEn = tooltipLabelEn.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

    return { x, label, value, showTick, tooltipLabelEn };
  });
}

const ranges = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'];

const PortfolioPerformanceChart = memo(function PortfolioPerformanceChart({
  holdings,
  totalCost,
  totalValue,
}: Props) {
  const { t } = useTranslation('common');
  const [selectedRange, setSelectedRange] = useState('1M');
  // نستخدم إنجليزي دائمًا للأرقام والتواريخ على المحاور والـ Tooltip
  const locale = 'en-GB';

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
                  dataKey="x"
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)' }}
                  ticks={['6M', '1Y', '3Y', '5Y'].includes(selectedRange) ? data.filter((d) => d.showTick || d.x === data[data.length - 1]?.x).map((d) => d.x) : undefined}
                  tickFormatter={(value: number) => {
                    if (!data.length) return '';
                    const firstX = data[0].x;
                    const lastX = data[data.length - 1].x;
                    if (value === firstX) return '';
                    const d = new Date(value);
                    if (value === lastX) return currentLabel;
                    if (selectedRange === '1D') return formatDateLabelShort(d, selectedRange, locale);
                    if (selectedRange === '1W') return formatDateLabelShort(d, selectedRange, locale);
                    if (selectedRange === '1M') {
                      const daysFromStart = Math.round((value - firstX) / 86400000);
                      if (daysFromStart % 7 === 0) return formatDateLabelShort(d, selectedRange, locale);
                      return '';
                    }
                    if (selectedRange === '6M' || selectedRange === '1Y') {
                      const point = data.find((p) => p.x === value);
                      return point?.label ?? d.toLocaleDateString('en-GB', { month: 'short' });
                    }
                    if (selectedRange === '3Y' || selectedRange === '5Y') {
                      const point = data.find((p) => p.x === value);
                      return point?.label ?? (selectedRange === '5Y' ? d.getFullYear().toString() : "'" + d.getFullYear().toString().slice(-2));
                    }
                    return '';
                  }}
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
                  contentStyle={{ background: 'transparent', border: 'none', padding: 0 }}
                  itemStyle={{ display: 'none' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as ChartPoint;
                    return (
                      <div
                        dir="ltr"
                        className="px-4 py-2.5 rounded-xl bg-black/75 dark:bg-white/15 backdrop-blur-md border border-white/20 shadow-lg text-white dark:text-[var(--text-primary)] text-left"
                      >
                        <div className="text-xs font-medium opacity-90">{p.tooltipLabelEn}</div>
                        <div className="font-number tabular-nums text-sm font-semibold mt-0.5">
                          {typeof p.value === 'number'
                            ? `${p.value.toLocaleString('en-GB', { maximumFractionDigits: 0 })} EGP`
                            : p.value}
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
