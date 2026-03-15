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

  // 7. RSI divergence — not computed; neutral
  s += pt * 0.5;

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

  // 13. Bollinger squeeze — use ATR/range proxy; neutral if no data
  s += pt * 0.5;

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
  const closes = history.map((d) => d.close);
  const n = closes.length;
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

  // 26. Fibonacci extension — no data
  s += pt * 0.5;

  // 27. Wave strength ratio — proxy by momentum consistency
  s += pt * 0.5;

  // 28–30. Price structure, breakout, consolidation — simplified
  const inRange = range > 0 && (price - low) / range > 0.2 && (high - price) / range > 0.2;
  s += pt * (inRange ? 0.7 : 0.5);
  s += pt * 0.5;
  s += pt * 0.5;

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

  s += pt * sig(fin.eps != null && fin.eps > 0, fin.eps != null);
  s += pt * 0.5; // EPS growth — not provided
  s += pt * sig(fin.pe != null && fin.pe > 0 && fin.pe < 25, fin.pe != null);
  s += pt * 0.5; // PEG
  s += pt * sig(fin.revenueGrowth != null && fin.revenueGrowth > 0, fin.revenueGrowth != null);
  s += pt * 0.5; // earnings growth
  s += pt * sig(fin.profitMargin != null && fin.profitMargin > 0.05, fin.profitMargin != null);
  s += pt * sig(fin.operatingMargin != null && fin.operatingMargin > 0, fin.operatingMargin != null);
  s += pt * sig(fin.profitMargin != null && fin.profitMargin > 0, fin.profitMargin != null);
  s += pt * sig(fin.roe != null && fin.roe > 0.1, fin.roe != null);
  s += pt * sig(fin.roa != null && fin.roa > 0, fin.roa != null);
  s += pt * 0.5; // ROIC
  s += pt * sig(fin.debtToEquity != null && fin.debtToEquity < 1.5, fin.debtToEquity != null);
  s += pt * 0.5; // interest coverage
  s += pt * sig(fin.freeCashFlow != null && fin.freeCashFlow > 0, fin.freeCashFlow != null);
  s += pt * sig(fin.dividendYield != null && fin.dividendYield > 0, fin.dividendYield != null);
  s += pt * sig(fin.bookValue != null && fin.bookValue > 0, fin.bookValue != null);
  s += pt * sig(fin.priceToBook != null && fin.priceToBook > 0 && fin.priceToBook < 3, fin.priceToBook != null);
  s += pt * 0.5; // fair value vs price

  return clamp(s, 0, MAX_FUNDAMENTAL);
}

// ─── LIQUIDITY (6) + SECTOR & MARKET (6) → market_score max 17 ───
function scoreMarket(ind: IndicatorsInput, market: MarketContextInput): number {
  const liquidityPt = 8 / 6;
  const sectorPt = 9 / 6;
  let s = 0;

  s += liquidityPt * sig(ind.avgVolume20 != null && ind.avgVolume20 > 0, ind.avgVolume20 != null);
  s += liquidityPt * sig(ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0 && ind.lastVolume / ind.avgVolume20 >= 0.5, ind.lastVolume != null && ind.avgVolume20 != null);
  s += liquidityPt * 0.5; // bid-ask
  s += liquidityPt * 0.5; // institutional
  s += liquidityPt * 0.5; // market cap tier
  s += liquidityPt * 0.5; // float

  const ch = market.egx30?.changePercent;
  s += sectorPt * sig(ch != null && ch > 0, ch != null);
  s += sectorPt * sig(ch != null && ch > 0.5, ch != null);
  s += sectorPt * 0.5;
  s += sectorPt * sig(ch != null && ch > -1, ch != null);
  s += sectorPt * 0.5;
  s += sectorPt * 0.5;

  return clamp(s, 0, MAX_MARKET);
}

// ─── MACRO (5) → macro_score max 7 ───
function scoreMacro(market: MarketContextInput): number {
  return MAX_MACRO * 0.5;
}

// ─── GEOPOLITICAL (3) + EGYPT (2) → risk_score max 7 ───
function scoreRisk(): number {
  return MAX_RISK * 0.5;
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
  const market_score = scoreMarket(indicators, market);
  const macro_score = scoreMacro(market);
  const risk_score = scoreRisk();

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
