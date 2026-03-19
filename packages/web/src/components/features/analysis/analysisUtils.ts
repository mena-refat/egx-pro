export function formatNum(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatBig(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Pivot points: P = (H+L+C)/3, R1 = 2*P-L, ... */
export function pivotPoints(high: number, low: number, close: number) {
  const p = (high + low + close) / 3;
  return {
    pivot: p,
    r1: 2 * p - low,
    r2: p + (high - low),
    r3: high + 2 * (p - low),
    s1: 2 * p - high,
    s2: p - (high - low),
    s3: low - 2 * (high - p),
  };
}

/** Fibonacci from 52w high to low */
export function fibonacciLevels(high: number, low: number) {
  const d = high - low;
  return {
    p100: high,
    p786: low + 0.786 * d,
    p618: low + 0.618 * d,
    p50: low + 0.5 * d,
    p382: low + 0.382 * d,
    p236: low + 0.236 * d,
    p0: low,
  };
}
