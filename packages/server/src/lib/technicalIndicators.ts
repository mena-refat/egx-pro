/**
 * حساب المؤشرات الفنية من بيانات OHLCV — للتحليل الذكي.
 */

export type OHLCV = { date: Date; open: number; high: number; low: number; close: number; volume: number };

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let emaVal = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

export function calculateIndicators(data: OHLCV[]): {
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  atr14: number | null;
  vwap: number | null;
  avgVolume20: number | null;
  lastVolume: number | null;
  support: number | null;
  resistance: number | null;
  trend: 'صاعد' | 'هابط' | 'جانبي';
  priceVsSma200: string;
} {
  if (data.length < 20) {
    return {
      rsi14: null,
      sma20: null,
      sma50: null,
      sma200: null,
      ema12: null,
      ema26: null,
      macd: null,
      macdSignal: null,
      bollingerUpper: null,
      bollingerLower: null,
      atr14: null,
      vwap: null,
      avgVolume20: null,
      lastVolume: null,
      support: null,
      resistance: null,
      trend: 'جانبي',
      priceVsSma200: 'غير متاح',
    };
  }

  const closes = data.map((d) => d.close);
  const volumes = data.map((d) => d.volume);
  const last = closes[closes.length - 1];

  // RSI 14
  let rsi14: number | null = null;
  if (closes.length >= 15) {
    const changes = closes.slice(1).map((c, i) => c - closes[i]);
    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? -c : 0));
    let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    for (let i = 14; i < changes.length; i++) {
      avgGain = (avgGain * 13 + gains[i]) / 14;
      avgLoss = (avgLoss * 13 + losses[i]) / 14;
    }
    rsi14 = avgLoss === 0 ? 100 : Math.round(100 - 100 / (1 + avgGain / avgLoss));
  }

  // SMAs
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  // EMA 12 / 26 + MACD
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdVal = ema12 != null && ema26 != null ? ema12 - ema26 : null;

  // MACD Signal (EMA 9 of MACD) — simplified
  let macdSignal: number | null = null;
  if (closes.length >= 35 && macdVal != null) {
    const macdValues: number[] = [];
    for (let i = Math.max(0, closes.length - 20); i < closes.length; i++) {
      const e12 = ema(closes.slice(0, i + 1), 12);
      const e26 = ema(closes.slice(0, i + 1), 26);
      if (e12 != null && e26 != null) macdValues.push(e12 - e26);
    }
    macdSignal = macdValues.length >= 9 ? ema(macdValues, 9) : null;
  }

  // Bollinger Bands (20-day, 2 std dev)
  let bollingerUpper: number | null = null;
  let bollingerLower: number | null = null;
  if (sma20 != null && closes.length >= 20) {
    const slice = closes.slice(-20);
    const std = Math.sqrt(slice.reduce((sum, c) => sum + Math.pow(c - sma20, 2), 0) / 20);
    bollingerUpper = Math.round((sma20 + 2 * std) * 100) / 100;
    bollingerLower = Math.round((sma20 - 2 * std) * 100) / 100;
  }

  // ATR 14
  let atr14: number | null = null;
  if (data.length >= 15) {
    const trs = data
      .slice(1)
      .map((d, i) =>
        Math.max(
          d.high - d.low,
          Math.abs(d.high - data[i].close),
          Math.abs(d.low - data[i].close)
        )
      );
    atr14 = Math.round((trs.slice(-14).reduce((a, b) => a + b, 0) / 14) * 100) / 100;
  }

  // VWAP (last 20 days)
  const recent = data.slice(-20);
  const totalVP = recent.reduce((s, d) => s + (d.high + d.low + d.close) / 3 * d.volume, 0);
  const totalVol = recent.reduce((s, d) => s + d.volume, 0);
  const vwap = totalVol > 0 ? Math.round((totalVP / totalVol) * 100) / 100 : null;

  // Volume
  const avgVolume20 = Math.round(
    volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length)
  );
  const lastVolume = volumes[volumes.length - 1];

  // Support & Resistance (simple: min/max of last 20 days)
  const recentCloses = closes.slice(-20);
  const support = Math.round(Math.min(...recentCloses) * 100) / 100;
  const resistance = Math.round(Math.max(...recentCloses) * 100) / 100;

  // Trend
  let trend: 'صاعد' | 'هابط' | 'جانبي' = 'جانبي';
  if (sma20 != null && sma50 != null) {
    if (last > sma20 && sma20 > sma50) trend = 'صاعد';
    else if (last < sma20 && sma20 < sma50) trend = 'هابط';
  }

  // Price vs SMA200
  let priceVsSma200 = 'غير متاح';
  if (sma200 != null) {
    const pct = ((last - sma200) / sma200) * 100;
    priceVsSma200 = pct > 0 ? `أعلى بـ ${pct.toFixed(1)}%` : `أقل بـ ${Math.abs(pct).toFixed(1)}%`;
  }

  return {
    rsi14,
    sma20: sma20 != null ? Math.round(sma20 * 100) / 100 : null,
    sma50: sma50 != null ? Math.round(sma50 * 100) / 100 : null,
    sma200: sma200 != null ? Math.round(sma200 * 100) / 100 : null,
    ema12: ema12 != null ? Math.round(ema12 * 100) / 100 : null,
    ema26: ema26 != null ? Math.round(ema26 * 100) / 100 : null,
    macd: macdVal != null ? Math.round(macdVal * 1000) / 1000 : null,
    macdSignal: macdSignal != null ? Math.round(macdSignal * 1000) / 1000 : null,
    bollingerUpper,
    bollingerLower,
    atr14,
    vwap,
    avgVolume20,
    lastVolume,
    support,
    resistance,
    trend,
    priceVsSma200,
  };
}
