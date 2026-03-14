/**
 * Quick Analysis — تحليل سريع بدون AI
 *
 * يستخدم البيانات المحسوبة فقط (technicalIndicators + financials + price)
 * ويرجع نتيجة في < 1 ثانية مع صفر tokens
 *
 * يُستخدم كـ:
 * 1. Preview سريع قبل الـ deep analysis
 * 2. بديل مجاني للمستخدمين اللي خلصوا quota
 * 3. Fallback لو Claude فشل
 */
import type { OHLCV } from './technicalIndicators.ts';
import { calculateIndicators } from './technicalIndicators.ts';

export interface QuickResult {
  type: 'quick';
  ticker: string;
  price: number | null;
  changePercent: number | null;

  // Technical signals
  trend: string;
  rsiSignal: string;
  rsiValue: number | null;
  macdSignal: string;
  volumeSignal: string;

  // Support/Resistance
  support: number | null;
  resistance: number | null;

  // Overall
  overallSignal: 'صاعد' | 'هابط' | 'محايد';
  score: number; // 0-100

  // Key levels
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;

  // Fundamental (if available)
  pe: number | null;
  roe: number | null;

  disclaimer: string;
}

export function generateQuickAnalysis(
  ticker: string,
  price: { price: number; changePercent: number } | null,
  history: OHLCV[],
  financials: { pe: number | null; roe: number | null; profitMargin: number | null; debtToEquity: number | null } | null
): QuickResult {
  const ind = calculateIndicators(history);

  // ══ RSI Signal ══
  let rsiSignal = 'محايد';
  let rsiScore = 50;
  if (ind.rsi14 != null) {
    if (ind.rsi14 > 70) {
      rsiSignal = 'تشبع شراء ⚠️';
      rsiScore = 30;
    } else if (ind.rsi14 > 60) {
      rsiSignal = 'قوة شرائية';
      rsiScore = 65;
    } else if (ind.rsi14 < 30) {
      rsiSignal = 'تشبع بيع — فرصة 🎯';
      rsiScore = 75;
    } else if (ind.rsi14 < 40) {
      rsiSignal = 'ضعف';
      rsiScore = 35;
    } else {
      rsiSignal = 'محايد';
      rsiScore = 50;
    }
  }

  // ══ MACD Signal ══
  let macdSignal = 'محايد';
  let macdScore = 50;
  if (ind.macd != null && ind.macdSignal != null) {
    if (ind.macd > ind.macdSignal && ind.macd > 0) {
      macdSignal = 'صاعد قوي 📈';
      macdScore = 75;
    } else if (ind.macd > ind.macdSignal) {
      macdSignal = 'بداية صعود';
      macdScore = 60;
    } else if (ind.macd < ind.macdSignal && ind.macd < 0) {
      macdSignal = 'هابط قوي 📉';
      macdScore = 25;
    } else if (ind.macd < ind.macdSignal) {
      macdSignal = 'بداية هبوط';
      macdScore = 40;
    }
  }

  // ══ Volume Signal ══
  let volumeSignal = 'عادي';
  let volumeScore = 50;
  if (ind.lastVolume != null && ind.avgVolume20 != null && ind.avgVolume20 > 0) {
    const ratio = ind.lastVolume / ind.avgVolume20;
    if (ratio > 1.5) {
      volumeSignal = 'حجم مرتفع جداً 🔥';
      volumeScore = 70;
    } else if (ratio > 1.2) {
      volumeSignal = 'حجم فوق المتوسط';
      volumeScore = 60;
    } else if (ratio < 0.5) {
      volumeSignal = 'حجم ضعيف ⚠️';
      volumeScore = 35;
    }
  }

  // ══ Trend Score ══
  let trendScore = 50;
  if (ind.trend === 'صاعد') trendScore = 70;
  else if (ind.trend === 'هابط') trendScore = 30;

  // ══ Fundamental Score ══
  let fundScore = 50;
  if (financials?.pe != null) {
    if (financials.pe > 0 && financials.pe < 10) fundScore += 15;
    else if (financials.pe > 25) fundScore -= 10;
  }
  if (financials?.roe != null) {
    if (financials.roe > 0.15) fundScore += 10;
    else if (financials.roe < 0.05) fundScore -= 10;
  }

  // ══ Overall Score ══
  const score = Math.round(
    trendScore * 0.25 +
      rsiScore * 0.2 +
      macdScore * 0.2 +
      volumeScore * 0.15 +
      Math.min(100, Math.max(0, fundScore)) * 0.2
  );

  const overallSignal: QuickResult['overallSignal'] =
    score >= 60 ? 'صاعد' : score <= 40 ? 'هابط' : 'محايد';

  return {
    type: 'quick',
    ticker,
    price: price?.price ?? null,
    changePercent: price?.changePercent ?? null,
    trend: ind.trend,
    rsiSignal,
    rsiValue: ind.rsi14,
    macdSignal,
    volumeSignal,
    support: ind.support,
    resistance: ind.resistance,
    overallSignal,
    score,
    sma20: ind.sma20,
    sma50: ind.sma50,
    sma200: ind.sma200,
    pe: financials?.pe ?? null,
    roe: financials?.roe ?? null,
    disclaimer:
      'تحليل سريع آلي — للحصول على تحليل شامل بالذكاء الاصطناعي، استخدم التحليل العميق.',
  };
}
