/**
 * Deterministic quantitative stock scoring engine — 70 factors.
 * Each factor: positive → 1, neutral → 0.5, negative → 0.
 * Same engine for single, compare, ranking, recommendations.
 * AI only explains; it does not determine scores or winner.
 */

import type { OHLCV } from './technicalIndicators.ts';
import type { calculateIndicators } from './technicalIndicators.ts';

export type IndicatorsInput = ReturnType<typeof calculateIndicators>;

export interface FinancialsInput {
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
  roe: number | null;
  roa: number | null;
  revenueGrowth: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  dividendYield: number | null;
  bookValue: number | null;
  marketCap: number | null;
  priceToBook: number | null;
  revenue: number | null;
  netIncome: number | null;
  beta: number | null;
}

export interface MarketContextInput {
  egx30: { price: number; changePercent: number } | null;
  usdEgp: number | null;
  marketStatus?: string;
}

export interface ScoringInput {
  price: number;
  changePercent: number;
  volume: number | null;
  history: OHLCV[];
  indicators: IndicatorsInput;
  financials: FinancialsInput | null;
  market: MarketContextInput;
}

/** 0–40 Avoid, 40–55 High Risk, 55–70 Neutral, 70–85 Buy Candidate, 85–100 Strong Buy */
export type DecisionLabel = 'Avoid' | 'HighRisk' | 'Neutral' | 'BuyCandidate' | 'StrongBuy';

export interface ScoringResult {
  score: number;
  decision: DecisionLabel;
  technical_score: number;
  momentum_score: number;
  fundamental_score: number;
  market_score: number;
  macro_score: number;
  risk_score: number;
}

const MAX_TECHNICAL = 28;  // 15 technical + 7 wave factors
const MAX_MOMENTUM = 12;
const MAX_FUNDAMENTAL = 29;
const MAX_MARKET = 17;     // 6 liquidity + 6 sector
const MAX_MACRO = 7;
const MAX_RISK = 7;        // 3 geopolitical + 2 Egypt

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Signal: 1 = positive, 0.5 = neutral, 0 = negative. Missing data → 0.5 */
function sig(pos: boolean, hasData: boolean): number {
  if (!hasData) return 0.5;
  return pos ? 1 : 0;
}

export function scoreToDecision(score: number): DecisionLabel {
  if (score >= 85) return 'StrongBuy';
  if (score >= 70) return 'BuyCandidate';
  if (score >= 55) return 'Neutral';
  if (score >= 40) return 'HighRisk';
  return 'Avoid';
}

export const DECISION_LABELS_AR: Record<DecisionLabel, string> = {
  Avoid: 'تجنّب',
  HighRisk: 'مخاطرة عالية',
  Neutral: 'محايد / انتظار',
  BuyCandidate: 'مرشح شراء',
  StrongBuy: 'شراء قوي',
};

/** Momentum from history (1m, 3m, 6m, ROC). Requires at least 5 sessions for 1m. */
function getMomentum(history: OHLCV[], price: number): {
  mom1m: number | null;
  mom3m: number | null;
  mom6m: number | null;
  roc: number | null;
  stochastic: number | null;
} {
  const closes = history.map((d) => d.close);
  const lows = history.map((d) => d.low);
  const highs = history.map((d) => d.high);
  const n = closes.length;
  if (n < 5) return { mom1m: null, mom3m: null, mom6m: null, roc: null, stochastic: null };

  const idx = (days: number) => Math.max(0, n - 1 - days);
  const past = (d: number) => closes[idx(d)] ?? null;
  const mom = (d: number) => {
    const p = past(d);
    return p != null && p > 0 ? ((price - p) / p) * 100 : null;
  };

  const mom1m = mom(21);
  const mom3m = mom(63);
  const mom6m = mom(126);
  const roc = mom(14);
  let stochastic: number | null = null;
  if (n >= 14 && lows.length >= 14 && highs.length >= 14) {
    const recentLow = Math.min(...lows.slice(-14));
    const recentHigh = Math.max(...highs.slice(-14));
    const range = recentHigh - recentLow;
    if (range > 0) stochastic = ((price - recentLow) / range) * 100;
  }

  return { mom1m, mom3m, mom6m, roc, stochastic };
}

// ─── TECHNICAL (15 factors) + WAVE (7) → technical_score max 28 ───
function scoreTechnicalAndWave(price: number, ind: IndicatorsInput, history: OHLCV[]): number {
  const pt = 28 / 22;
  let s = 0;

  // Hoist history arrays — used in both technical and wave sections
  const closes = history.map((d) => d.close);
  const n = closes.length;

  // 1. Trend direction
  s += pt * sig(ind.trend === 'صاعد', true);
  if (ind.trend === 'هابط') s += 0;
  else if (ind.trend === 'جانبي') s += pt * 0.5;

  // 2–4. Price vs MA20, MA50, MA200
  s += pt * sig(ind.sma20 != null && price > ind.sma20, ind.sma20 != null);
  s += pt * sig(ind.sma50 != null && price > ind.sma50, ind.sma50 != null);
  s += pt * sig(ind.sma200 != null && price > ind.sma200, ind.sma200 != null);

  // 5. Golden cross / death cross (MA20 vs MA50)
  const golden = ind.sma20 != null && ind.sma50 != null && ind.sma20 > ind.sma50;
  s += pt * sig(golden, ind.sma20 != null && ind.sma50 != null);

  // 6. RSI level (30–50 bullish, <30 oversold bounce, 50–70 neutral, >70 bearish)
  if (ind.rsi14 != null) {
    if (ind.rsi14 < 30) s += pt * 1;
    else if (ind.rsi14 <= 50) s += pt * 0.8;
    else if (ind.rsi14 <= 70) s += pt * 0.5;
    else s += pt * 0;
  } else s += pt * 0.5;

  // 7. RSI divergence — bullish when RSI oversold while price dropping (bounce signal)
  let rsiDiv = 0.5;
  if (ind.rsi14 != null && n >= 11) {
    const priceOld = closes[n - 11] ?? closes[0];
    const priceChg10 = priceOld != null && priceOld > 0 ? ((price - priceOld) / priceOld) * 100 : 0;
    if (ind.rsi14 < 30 && priceChg10 < -5) rsiDiv = 1;
    else if (ind.rsi14 < 40 && priceChg10 < 0) rsiDiv = 0.75;
    else if (ind.rsi14 > 70 && priceChg10 > 5) rsiDiv = 0.1;
    else if (ind.rsi14 > 60 && priceChg10 > 0) rsiDiv = 0.35;
  }
  s += pt * rsiDiv;

  // 8. MACD signal
  const macdBull = ind.macd != null && ind.macdSignal != null && ind.macd > ind.macdSignal;
  s += pt * sig(macdBull, ind.macd != null && ind.macdSignal != null);

  // 9. MACD histogram momentum — use MACD sign
  const macdPos = ind.macd != null && ind.macd > 0;
  s += pt * sig(macdPos, ind.macd != null);

  // 10. Volume trend
  const volUp = ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0 && ind.lastVolume > ind.avgVolume20;
  s += pt * sig(volUp, ind.lastVolume != null && ind.avgVolume20 != null);

  // 11. Volume spike
  const spike = ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0 && ind.lastVolume > ind.avgVolume20 * 1.5;
  s += pt * sig(spike, ind.lastVolume != null && ind.avgVolume20 != null);

  // 12. Bollinger position (near lower = bounce potential)
  let bbPos = 0.5;
  if (ind.bollingerLower != null && ind.bollingerUpper != null && price > 0) {
    const range = ind.bollingerUpper - ind.bollingerLower;
    if (range > 0) {
      const pos = (price - ind.bollingerLower) / range;
      if (pos < 0.2) bbPos = 1;
      else if (pos < 0.5) bbPos = 0.7;
      else if (pos > 0.9) bbPos = 0;
    }
  }
  s += pt * bbPos;

  // 13. Bollinger squeeze — narrow bandwidth signals coil/breakout potential
  let bbSqueeze = 0.5;
  if (ind.bollingerUpper != null && ind.bollingerLower != null && ind.sma20 != null && ind.sma20 > 0) {
    const bandwidth = (ind.bollingerUpper - ind.bollingerLower) / ind.sma20;
    bbSqueeze = bandwidth < 0.04 ? 1 : bandwidth < 0.08 ? 0.75 : bandwidth > 0.20 ? 0.25 : 0.5;
  }
  s += pt * bbSqueeze;

  // 14. Distance to support (close to support = upside room)
  let distSup = 0.5;
  if (ind.support != null && price > 0 && ind.support > 0) {
    const pct = ((price - ind.support) / price) * 100;
    if (pct < 3) distSup = 1;
    else if (pct < 8) distSup = 0.7;
    else if (pct > 20) distSup = 0.3;
  }
  s += pt * distSup;

  // 15. Distance to resistance (far from resistance = upside)
  let distRes = 0.5;
  if (ind.resistance != null && price > 0 && ind.resistance > price) {
    const pct = ((ind.resistance - price) / price) * 100;
    if (pct > 10) distRes = 1;
    else if (pct > 5) distRes = 0.7;
    else if (pct < 2) distRes = 0.2;
  } else if (ind.resistance != null) distRes = 0.5;
  s += pt * distRes;

  // ─── WAVE / STRUCTURE (7 factors) ───
  const recent = n >= 20 ? closes.slice(-60) : [];
  const high = recent.length ? Math.max(...recent) : price;
  const low = recent.length ? Math.min(...recent) : price;
  const range = high - low;

  // 24. Elliott wave position — proxy by retracement
  let elliott = 0.5;
  if (range > 0 && n >= 20) {
    const retrace = (high - price) / range;
    if (retrace >= 0.382 && retrace <= 0.618) elliott = 1;
    else if (retrace >= 0.2 && retrace <= 0.8) elliott = 0.7;
  }
  s += pt * elliott;

  // 25. Fibonacci retracement level
  s += pt * (range > 0 ? elliott : 0.5);

  // 26. Fibonacci extension — price position above recent low relative to range
  let fibExt = 0.5;
  if (range > 0 && n >= 20) {
    const ext = (price - low) / range;
    fibExt = ext > 1.272 ? 0.9 : ext > 1.0 ? 0.8 : ext > 0.618 ? 0.6 : 0.35;
  }
  s += pt * fibExt;

  // 27. Wave strength — consistency of multi-period uptrend
  let waveStr = 0.5;
  if (n >= 22) {
    const p5  = closes[n - 6]  ?? closes[0];
    const p10 = closes[n - 11] ?? closes[0];
    const p21 = closes[n - 22] ?? closes[0];
    const up1 = price > (p5 ?? 0);
    const up2 = (p5 ?? 0) > (p10 ?? 0);
    const up3 = (p10 ?? 0) > (p21 ?? 0);
    const upCount = [up1, up2, up3].filter(Boolean).length;
    waveStr = upCount === 3 ? 1 : upCount === 2 ? 0.7 : upCount === 1 ? 0.35 : 0.1;
  }
  s += pt * waveStr;

  // 28–30. Price structure, breakout, consolidation
  const inRange = range > 0 && (price - low) / range > 0.2 && (high - price) / range > 0.2;
  s += pt * (inRange ? 0.7 : 0.5);

  // 29. Breakout — price near recent 60-bar high
  let breakout = 0.3;
  if (range > 0 && n >= 20) {
    const pctFromHigh = high > 0 ? (high - price) / high : 1;
    breakout = pctFromHigh < 0.03 ? 1 : pctFromHigh < 0.08 ? 0.7 : pctFromHigh < 0.18 ? 0.45 : 0.2;
  }
  s += pt * breakout;

  // 30. Consolidation — tight recent 20-bar range = coil/spring setup
  let consolidation = 0.4;
  if (n >= 20) {
    const r20Hi = Math.max(...closes.slice(-20) as number[]);
    const r20Lo = Math.min(...closes.slice(-20) as number[]);
    const tightness = r20Hi > 0 ? (r20Hi - r20Lo) / r20Hi : 1;
    consolidation = tightness < 0.04 ? 0.9 : tightness < 0.08 ? 0.7 : tightness < 0.15 ? 0.5 : 0.35;
  }
  s += pt * consolidation;

  return clamp(s, 0, MAX_TECHNICAL);
}

// ─── MOMENTUM (8 factors) → momentum_score max 12 ───
function scoreMomentum(price: number, changePercent: number, ind: IndicatorsInput, history: OHLCV[], marketChg: number | null): number {
  const pt = 12 / 8;
  const m = getMomentum(history, price);
  let s = 0;

  s += pt * sig(m.mom1m != null && m.mom1m > 0, m.mom1m != null);
  s += pt * sig(m.mom3m != null && m.mom3m > 0, m.mom3m != null);
  s += pt * sig(m.mom6m != null && m.mom6m > 0, m.mom6m != null);
  s += pt * sig(m.roc != null && m.roc > 0, m.roc != null);
  s += pt * sig(m.stochastic != null && m.stochastic > 20 && m.stochastic < 80, m.stochastic != null);
  s += pt * sig(changePercent > 0, true);
  s += pt * sig(marketChg != null ? changePercent >= marketChg : true, marketChg != null);
  s += pt * 0.5;

  return clamp(s, 0, MAX_MOMENTUM);
}

// ─── FUNDAMENTAL (18 factors) → fundamental_score max 29 ───
function scoreFundamental(price: number, fin: FinancialsInput | null): number {
  const pt = 29 / 18;
  let s = 0;
  if (!fin) return pt * 9;

  // 1. EPS positive
  s += pt * sig(fin.eps != null && fin.eps > 0, fin.eps != null);

  // 2. EPS growth proxy — positive EPS + strong revenue growth signals earnings expansion
  const epsGrowth = fin.eps != null && fin.eps > 0 && fin.revenueGrowth != null && fin.revenueGrowth > 0.05;
  s += pt * sig(epsGrowth, fin.eps != null && fin.revenueGrowth != null);

  // 3. PE valuation
  s += pt * sig(fin.pe != null && fin.pe > 0 && fin.pe < 25, fin.pe != null);

  // 4. PEG ratio — PE / (revenueGrowth * 100); <1 undervalued, >2 expensive
  let pegScore = 0.5;
  if (fin.pe != null && fin.pe > 0 && fin.revenueGrowth != null && fin.revenueGrowth > 0) {
    const peg = fin.pe / (fin.revenueGrowth * 100);
    pegScore = peg < 1 ? 1 : peg < 2 ? 0.7 : peg < 3 ? 0.35 : 0.1;
  } else if (fin.pe != null && fin.pe > 0 && fin.pe < 12) {
    pegScore = 0.7; // low PE without growth data = fair value proxy
  }
  s += pt * pegScore;

  // 5. Revenue growth
  s += pt * sig(fin.revenueGrowth != null && fin.revenueGrowth > 0, fin.revenueGrowth != null);

  // 6. Earnings growth proxy — strong operating margin + revenue growth signals earnings quality
  const earningsGrowth = fin.operatingMargin != null && fin.operatingMargin > 0.08
    && fin.revenueGrowth != null && fin.revenueGrowth > 0;
  s += pt * sig(earningsGrowth, fin.operatingMargin != null && fin.revenueGrowth != null);

  // 7. Profit margin quality
  s += pt * sig(fin.profitMargin != null && fin.profitMargin > 0.05, fin.profitMargin != null);

  // 8. Operating margin
  s += pt * sig(fin.operatingMargin != null && fin.operatingMargin > 0, fin.operatingMargin != null);

  // 9. Gross margin quality
  s += pt * sig(fin.grossMargin != null && fin.grossMargin > 0.2, fin.grossMargin != null);

  // 10. ROE
  s += pt * sig(fin.roe != null && fin.roe > 0.1, fin.roe != null);

  // 11. ROA
  s += pt * sig(fin.roa != null && fin.roa > 0, fin.roa != null);

  // 12. ROIC proxy — ROE adjusted for leverage: high ROE on low D/E = genuine return
  let roicScore = 0.5;
  if (fin.roe != null && fin.debtToEquity != null && fin.debtToEquity >= 0) {
    const roic = fin.roe / (1 + fin.debtToEquity);
    roicScore = roic > 0.15 ? 1 : roic > 0.08 ? 0.7 : roic > 0 ? 0.4 : 0.1;
  } else if (fin.roe != null) {
    roicScore = fin.roe > 0.12 ? 0.7 : fin.roe > 0 ? 0.45 : 0.2;
  }
  s += pt * roicScore;

  // 13. Debt/equity
  s += pt * sig(fin.debtToEquity != null && fin.debtToEquity < 1.5, fin.debtToEquity != null);

  // 14. Interest coverage proxy — low leverage + positive operating margin = serviceable debt
  let icScore = 0.5;
  if (fin.debtToEquity != null && fin.operatingMargin != null) {
    if (fin.debtToEquity < 0.3) icScore = 1;
    else if (fin.debtToEquity < 0.8 && fin.operatingMargin > 0.05) icScore = 0.75;
    else if (fin.debtToEquity > 2.5 || fin.operatingMargin < 0) icScore = 0.1;
    else icScore = 0.4;
  }
  s += pt * icScore;

  // 15. Free cash flow
  s += pt * sig(fin.freeCashFlow != null && fin.freeCashFlow > 0, fin.freeCashFlow != null);

  // 16. Dividend yield
  s += pt * sig(fin.dividendYield != null && fin.dividendYield > 0, fin.dividendYield != null);

  // 17. Book value positive
  s += pt * sig(fin.bookValue != null && fin.bookValue > 0, fin.bookValue != null);

  // 18. Price-to-book valuation
  s += pt * sig(fin.priceToBook != null && fin.priceToBook > 0 && fin.priceToBook < 3, fin.priceToBook != null);

  // 19. Fair value — P/B < 1 = trading below book (deep value); PE cross-check as fallback
  let fairVal = 0.5;
  if (fin.priceToBook != null && fin.priceToBook > 0) {
    fairVal = fin.priceToBook < 1 ? 1 : fin.priceToBook < 2 ? 0.75 : fin.priceToBook < 4 ? 0.4 : 0.15;
  } else if (fin.pe != null && fin.pe > 0) {
    fairVal = fin.pe < 10 ? 1 : fin.pe < 18 ? 0.7 : fin.pe < 30 ? 0.35 : 0.15;
  }
  s += pt * fairVal;

  return clamp(s, 0, MAX_FUNDAMENTAL);
}

// ─── LIQUIDITY (6) + SECTOR & MARKET (6) → market_score max 17 ───
function scoreMarket(ind: IndicatorsInput, market: MarketContextInput, fin?: FinancialsInput | null, price?: number): number {
  const liquidityPt = 8 / 6;
  const sectorPt = 9 / 6;
  let s = 0;

  // 1. Average volume — has any liquidity at all
  s += liquidityPt * sig(ind.avgVolume20 != null && ind.avgVolume20 > 0, ind.avgVolume20 != null);

  // 2. Relative volume — today vs 20-day avg (0.5× = acceptable floor)
  s += liquidityPt * sig(
    ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0 && ind.lastVolume / ind.avgVolume20 >= 0.5,
    ind.lastVolume != null && ind.avgVolume20 != null,
  );

  // 3. Bid-ask proxy — daily turnover rate: volume*price / marketCap; high turnover = tight spread
  let bidAsk = 0.5;
  if (price != null && price > 0 && fin?.marketCap != null && fin.marketCap > 0 && ind.lastVolume != null) {
    const turnover = (ind.lastVolume * price) / fin.marketCap;
    bidAsk = turnover > 0.01 ? 1 : turnover > 0.003 ? 0.7 : turnover > 0.001 ? 0.45 : 0.2;
  } else if (ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0) {
    const ratio = ind.lastVolume / ind.avgVolume20;
    bidAsk = ratio > 2 ? 0.85 : ratio > 1 ? 0.65 : 0.4;
  }
  s += liquidityPt * bidAsk;

  // 4. Institutional proxy — no data available; neutral
  s += liquidityPt * 0.5;

  // 5. Market cap tier — large/mid = higher liquidity and institutional interest
  let capTier = 0.5;
  if (fin?.marketCap != null && fin.marketCap > 0) {
    // EGP tiers: >10B = large, >1B = mid, >100M = small, else micro
    capTier = fin.marketCap > 10_000_000_000 ? 1
      : fin.marketCap > 1_000_000_000 ? 0.75
      : fin.marketCap > 100_000_000 ? 0.5
      : 0.25;
  }
  s += liquidityPt * capTier;

  // 6. VWAP signal — price above VWAP = net buying pressure during session
  let vwapSignal = 0.5;
  if (price != null && ind.vwap != null && ind.vwap > 0) {
    const pctVwap = (price - ind.vwap) / ind.vwap;
    vwapSignal = pctVwap > 0.02 ? 0.9 : pctVwap > 0 ? 0.7 : pctVwap > -0.02 ? 0.35 : 0.15;
  }
  s += liquidityPt * vwapSignal;

  const ch = market.egx30?.changePercent;

  // 7. EGX30 positive — broad market tailwind
  s += sectorPt * sig(ch != null && ch > 0, ch != null);

  // 8. EGX30 strong positive (>0.5%) — momentum environment
  s += sectorPt * sig(ch != null && ch > 0.5, ch != null);

  // 9. EGX30 magnitude — strong move (>2%) = high-conviction market session
  let egxMag = 0.5;
  if (ch != null) {
    egxMag = ch > 2 ? 0.9 : ch > 1 ? 0.7 : ch > -1 ? 0.5 : ch > -2 ? 0.25 : 0.1;
  }
  s += sectorPt * egxMag;

  // 10. EGX30 not in deep decline (>-1%)
  s += sectorPt * sig(ch != null && ch > -1, ch != null);

  // 11. Market session — open market = can act on signals
  const isOpen = typeof market.marketStatus === 'string' && market.marketStatus.includes('مفتوح');
  s += sectorPt * (market.marketStatus != null ? (isOpen ? 0.75 : 0.45) : 0.5);

  // 12. USD/EGP macro equity pressure — stable currency benefits equities
  const usd = market.usdEgp;
  let usdEquity = 0.5;
  if (usd != null) {
    usdEquity = usd < 40 ? 0.85 : usd < 50 ? 0.6 : usd < 58 ? 0.35 : 0.15;
  }
  s += sectorPt * usdEquity;

  return clamp(s, 0, MAX_MARKET);
}

// ─── MACRO (5) → macro_score max 7 ───
function scoreMacro(market: MarketContextInput): number {
  const pt = MAX_MACRO / 5;
  let s = 0;

  // 1. EGX30 daily direction — broad market health
  const ch = market.egx30?.changePercent;
  if (ch != null) {
    s += pt * (ch > 1 ? 1 : ch > 0 ? 0.7 : ch > -1 ? 0.4 : 0.1);
  } else {
    s += pt * 0.5;
  }

  // 2. USD/EGP rate — lower = more stable macro environment for equities
  const usd = market.usdEgp;
  if (usd != null) {
    s += pt * (usd < 35 ? 1 : usd < 48 ? 0.65 : usd < 57 ? 0.4 : 0.15);
  } else {
    s += pt * 0.5;
  }

  // 3. Market session activity — open market = price discovery and liquidity
  const isActive = typeof market.marketStatus === 'string' && market.marketStatus.includes('مفتوح');
  s += pt * (market.marketStatus != null ? (isActive ? 0.7 : 0.45) : 0.5);

  // 4. CBE interest rate environment — no real-time feed; neutral
  s += pt * 0.5;

  // 5. Inflation / CPI environment — no real-time feed; neutral
  s += pt * 0.5;

  return clamp(s, 0, MAX_MACRO);
}

// ─── GEOPOLITICAL (3) + EGYPT (2) → risk_score max 7 ───
function scoreRisk(price: number, ind: IndicatorsInput, fin: FinancialsInput | null, market: MarketContextInput): number {
  const pt = MAX_RISK / 5;
  let s = 0;

  // 1. Beta — lower beta = less systemic risk
  if (fin?.beta != null && fin.beta > 0) {
    s += pt * (fin.beta < 0.8 ? 1 : fin.beta < 1.2 ? 0.7 : fin.beta < 1.8 ? 0.35 : 0.1);
  } else {
    s += pt * 0.5;
  }

  // 2. ATR volatility — ATR14 / price; lower daily swing = lower risk
  if (ind.atr14 != null && price > 0) {
    const atrPct = ind.atr14 / price;
    s += pt * (atrPct < 0.025 ? 1 : atrPct < 0.05 ? 0.7 : atrPct < 0.10 ? 0.35 : 0.1);
  } else {
    s += pt * 0.5;
  }

  // 3. Leverage (D/E) — lower debt = lower financial risk
  if (fin?.debtToEquity != null && fin.debtToEquity >= 0) {
    s += pt * (fin.debtToEquity < 0.5 ? 1 : fin.debtToEquity < 1.5 ? 0.65 : fin.debtToEquity < 3 ? 0.3 : 0.1);
  } else {
    s += pt * 0.5;
  }

  // 4. Currency risk (USD/EGP) — weaker pound = higher cost-of-imports / financing risk
  const usd = market.usdEgp;
  if (usd != null) {
    s += pt * (usd < 40 ? 0.9 : usd < 52 ? 0.55 : 0.2);
  } else {
    s += pt * 0.5;
  }

  // 5. Geopolitical / regional risk — no real-time data; neutral
  s += pt * 0.5;

  return clamp(s, 0, MAX_RISK);
}

/**
 * Compute deterministic score (0–100) from 70 factors.
 * Same function for single stock, comparison, ranking, recommendations.
 */
export function computeScore(input: ScoringInput): ScoringResult {
  const { price, changePercent, indicators, financials, market, history } = input;
  const marketChg = market.egx30?.changePercent ?? null;

  const technical_score = scoreTechnicalAndWave(price, indicators, history);
  const momentum_score = scoreMomentum(price, changePercent, indicators, history, marketChg);
  const fundamental_score = scoreFundamental(price, financials ?? null);
  const market_score = scoreMarket(indicators, market, financials, price);
  const macro_score = scoreMacro(market);
  const risk_score = scoreRisk(price, indicators, financials ?? null, market);

  const total =
    technical_score +
    momentum_score +
    fundamental_score +
    market_score +
    macro_score +
    risk_score;
  const score = Math.round(clamp(total, 0, 100));
  const decision = scoreToDecision(score);

  return {
    score,
    decision,
    technical_score: Math.round(technical_score * 100) / 100,
    momentum_score: Math.round(momentum_score * 100) / 100,
    fundamental_score: Math.round(fundamental_score * 100) / 100,
    market_score: Math.round(market_score * 100) / 100,
    macro_score: Math.round(macro_score * 100) / 100,
    risk_score: Math.round(risk_score * 100) / 100,
  };
}
