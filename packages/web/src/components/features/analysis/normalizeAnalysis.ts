import type { AnalysisResult } from '../../../types';

function inferOutlook(text: string): string {
  if (!text) return 'محايد';
  const positive = ['صاعد', 'إيجابي', 'ارتفاع', 'شراء', 'فرصة', 'نمو', 'اختراق'];
  const negative = ['هابط', 'سلبي', 'انخفاض', 'بيع', 'خطر', 'تراجع', 'ضغط'];
  const posCount = positive.filter((w) => text.includes(w)).length;
  const negCount = negative.filter((w) => text.includes(w)).length;
  if (posCount > negCount + 1) return 'إيجابي';
  if (negCount > posCount + 1) return 'سلبي';
  return 'محايد';
}

function makeOutlook(
  term: AnalysisResult['shortTerm'] | undefined,
  oldText: string | undefined
) {
  if (term) return term;
  if (!oldText) return undefined;
  return {
    outlook: inferOutlook(oldText),
    title: oldText.slice(0, 60) + (oldText.length > 60 ? '...' : ''),
    summary: oldText,
    reasons: [],
    action: '',
  };
}

export function normalizeAnalysis(raw: AnalysisResult): AnalysisResult {
  // Fundamental - backward compat: if score is not a number, convert old format
  let fundamental = raw.fundamental;
  if (fundamental && typeof (fundamental as { score?: unknown }).score !== 'number') {
    const old = fundamental as { outlook?: string; ratios?: string; verdict?: string };
    fundamental = {
      score: old.verdict === 'قوي' ? 75 : old.verdict === 'ضعيف' ? 30 : 50,
      highlights: [old.outlook, old.ratios].filter(Boolean) as string[],
      keyRatios: undefined,
    };
  }
  if (fundamental && (fundamental as { score: number }).score === 0 && !(fundamental as { highlights?: string[] }).highlights?.length) {
    fundamental = undefined;
  }

  // Technical - same
  let technical = raw.technical;
  if (technical && typeof (technical as { score?: unknown }).score !== 'number') {
    const old = technical as { signal?: string; indicators?: string; levels?: string };
    technical = {
      score: old.signal?.includes('صاعد') ? 70 : old.signal?.includes('هابط') ? 30 : 50,
      trend: old.signal || 'جانبي',
      highlights: [old.indicators, old.levels].filter(Boolean) as string[],
      keyIndicators: undefined,
      support: undefined,
      resistance: undefined,
    };
  }
  if (technical && (technical as { score: number }).score === 0 && !(technical as { highlights?: string[] }).highlights?.length) {
    technical = undefined;
  }

  // Confidence from verdict text
  const verdictText = raw.verdictBadge || raw.verdict || '';
  let defaultConfidence = 50;
  if (verdictText.includes('شراء قوي')) defaultConfidence = 82;
  else if (verdictText.includes('شراء')) defaultConfidence = 68;
  else if (verdictText.includes('بيع قوي')) defaultConfidence = 20;
  else if (verdictText.includes('بيع')) defaultConfidence = 32;
  else if (verdictText.includes('انتظار')) defaultConfidence = 50;

  return {
    ...raw,
    verdictBadge: verdictText,
    confidenceScore: raw.confidenceScore ?? defaultConfidence,
    fundamental: fundamental as AnalysisResult['fundamental'],
    technical: technical as AnalysisResult['technical'],
    shortTerm: makeOutlook(raw.shortTerm, raw.shortTermOutlook),
    mediumTerm: makeOutlook(raw.mediumTerm, raw.mediumTermOutlook),
    longTerm: makeOutlook(raw.longTerm, raw.longTermOutlook),
    sentiment:
      typeof raw.sentiment === 'string'
        ? { overall: inferOutlook(raw.sentiment), explain: raw.sentiment }
        : raw.sentiment ?? undefined,
  };
}
