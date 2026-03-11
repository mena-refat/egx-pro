import React from 'react';

const DONUT_COLORS = [
  'var(--brand)',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

type Props = { items: Array<{ ticker: string; percentage: number }> };

export function SocialProfilePortfolioDonut({ items }: Props) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.percentage, 0);
  if (total <= 0) return null;
  let acc = 0;
  const segments = items.map((item, i) => {
    const start = (acc / 100) * 360;
    acc += item.percentage;
    const end = (acc / 100) * 360;
    return { ...item, start, end, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });
  const conic = segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ');

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="w-24 h-24 rounded-full shrink-0" style={{ background: `conic-gradient(${conic})` }} />
      <div className="space-y-1 text-sm min-w-0">
        {items.map((p, i) => (
          <div key={p.ticker} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="font-medium truncate">{p.ticker}</span>
            <span className="text-[var(--text-secondary)]">{p.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
