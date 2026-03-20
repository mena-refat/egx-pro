export function formatValue(n: number, decimals = 2): string {
  if (!Number.isFinite(n) || n === 0) return '-';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export function formatChange(changePercent: number): string {
  if (!Number.isFinite(changePercent)) return '-';
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export function minutesAgo(ts: number): number {
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}
