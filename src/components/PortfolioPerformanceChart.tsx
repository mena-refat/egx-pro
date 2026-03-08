import { memo, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const generateMockData = (range: string) => {
  const data = [];
  const now = new Date();

  if (range === '1D') {
    // 9 AM to 3 PM (15:00)
    for (let hour = 9; hour <= 15; hour++) {
      const date = new Date(now);
      date.setHours(hour, 0, 0, 0);
      data.push({
        date: date.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '1W') {
    // 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      data.push({
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '1M') {
    // 1 month ago to now, 4 points
    for (let i = 3; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 7);
      data.push({
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '6M') {
    // 6 months, 1 point per month
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      data.push({
        date: date.toLocaleDateString([], { month: 'short' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '1Y') {
    // 12 months, 1 point per month
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      data.push({
        date: date.toLocaleDateString([], { month: 'short' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '3Y') {
    // 3 years, 6 points (every 6 months)
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i * 6);
      data.push({
        date: date.toLocaleDateString([], { month: 'short', year: '2-digit' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  } else if (range === '5Y') {
    // 5 years, 5 points (every year)
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now);
      date.setFullYear(now.getFullYear() - i);
      data.push({
        date: date.toLocaleDateString([], { year: 'numeric' }),
        value: 100000 + Math.random() * 50000,
      });
    }
  }
  return data;
};

const ranges = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'];

const PortfolioPerformanceChart = memo(function PortfolioPerformanceChart() {
  const [selectedRange, setSelectedRange] = useState('1M');
  const data = useMemo(() => generateMockData(selectedRange), [selectedRange]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedRange === range
                ? 'bg-violet-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value, index) => index === 0 ? '' : value}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
              dx={-20}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              formatter={(value: unknown) => [typeof value === 'number' ? value.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) : value, '']}
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
    </div>
  );
});

export default PortfolioPerformanceChart;
