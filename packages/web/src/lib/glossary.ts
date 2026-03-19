/**
 * قاموس المصطلحات — مخزّن في الكود، بدون أي استدعاء لـ AI.
 * عندما يرد أحد هذه المصطلحات في تقرير التحليل نعرض شرحه هنا.
 * كل عنصر: كلمات مفتاحية للبحث في النص + شرح بسيط للمستخدم.
 */
import type { LearnCard } from '../types/analysis';

export interface GlossaryEntry {
  /** الاسم المعروض للمصطلح */
  term: string;
  /** كلمات تبحث عنها في نص التقرير (عربي أو إنجليزي) */
  keywords: string[];
  /** شرح قصير بلغة بسيطة */
  simple: string;
  /** أيقونة اختيارية */
  emoji?: string;
  /** شرح أطول يظهر عند التوسيع */
  detail?: string;
}

/** القاموس الثابت — مصطلحات صعبة قد ترد في تقارير التحليل */
export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'نسبة السعر للربح (P/E)',
    keywords: ['P/E', 'السعر للربح', 'price to earnings', 'الربحية', 'مضاعف الربحية'],
    simple: 'كم مرة أرباح الشركة السنوية تساوي سعر السهم. رقم أقل قد يعني سهم رخيص نسبياً.',
    emoji: '📊',
    detail: 'لو P/E = 10 معناها إنك بتدفع 10 أضعاف ربح السهم الواحد في السنة. بيختلف حسب القطاع والسوق.',
  },
  {
    term: 'مؤشر القوة النسبية (RSI)',
    keywords: ['RSI', 'القوة النسبية', 'relative strength'],
    simple: 'مؤشر فني من 0 لـ 100: فوق 70 السهم قد يكون غالي، تحت 30 قد يكون رخيص.',
    emoji: '📈',
    detail: 'بيقولك لو السهم اتباع كتير (RSI تحت 30) أو اتباع قليل وطالع (فوق 70). مش حكم نهائي، بس إشارة.',
  },
  {
    term: 'الدعم والمقاومة',
    keywords: ['الدعم', 'المقاومة', 'دعم', 'مقاومة', 'support', 'resistance'],
    simple: 'مستويات سعر السهم اتوقف عندها قبل كده: الدعم تحت السعر الحالي، والمقاومة فوقه.',
    emoji: '〰️',
    detail: 'المحللين بيتابعوا لو السعر نزل لدعم هل هيرتد، ولو طلع لمقاومة هل هيكسرها ولا يرجع.',
  },
  {
    term: 'وقف الخسارة',
    keywords: ['وقف الخسارة', 'وقف خسارة', 'stop loss', 'ستوب لوس'],
    simple: 'سعر تحدده قبل ما تشتري: لو السهم نزل ليه تبيع عشان ما تخسرش أكتر.',
    emoji: '🛑',
    detail: 'أداة إدارة مخاطر: تحدد سعر أقل من سعر الشراء، لو الوضع انعكس تخرج بخسارة محدودة.',
  },
  {
    term: 'السعر المستهدف',
    keywords: ['السعر المستهدف', 'سعر مستهدف', 'price target', 'هدف السعر', 'target price'],
    simple: 'السعر اللي المحلل يتوقع إن السهم يوصل له في مدى زمني معين.',
    emoji: '🎯',
    detail: 'تقدير مش ضمان. بيتحدد بناءً على التحليل الفني والأساسي، وبيختلف من محلل لآخر.',
  },
  {
    term: 'الربحية السهمية (EPS)',
    keywords: ['EPS', 'الربحية السهمية', 'ربح السهم', 'earnings per share'],
    simple: 'قسمة أرباح الشركة الصافية على عدد الأسهم. كل ما أعلى كل ما السهم مربح أكثر.',
    emoji: '💰',
    detail: 'رقم من القوائم المالية. بيستخدم مع P/E عشان تعرف هل السهم غالي أو رخيص بالنسبة لأرباحه.',
  },
  {
    term: 'العائد على حقوق الملكية (ROE)',
    keywords: ['ROE', 'العائد على حقوق الملكية', 'عائد الملكية', 'return on equity'],
    simple: 'قد إيه الشركة بتحقق ربح من كل جنيه مستثمر من ملاكها. نسبة أعلى = إدارة أفضل.',
    emoji: '📌',
    detail: 'بيبان كفاءة الشركة في استخدام أموال المساهمين. فوق 15% غالباً يعتبر قوي حسب القطاع.',
  },
  {
    term: 'التدفق النقدي الحر',
    keywords: ['التدفق النقدي', 'التدفق النقدي الحر', 'free cash flow', 'السيولة النقدية'],
    simple: 'الفلوس اللي فضلت للشركة بعد ما دفعت مصاريفها واستثماراتها. شركات كتير فلوس = أقوى.',
    emoji: '💵',
    detail: 'أهم من الربح المحاسبي أحياناً: الشركة قد تعلن ربح لكن التدفق النقدي سالب فـ وضعها يبقى ضعيف.',
  },
  {
    term: 'المتوسط المتحرك',
    keywords: ['المتوسط المتحرك', 'متوسط 200', 'MA', 'SMA', 'المتوسطات', 'sma200', '50 يوم'],
    simple: 'متوسط سعر السهم في عدد أيام معينة. السعر فوق المتوسط غالباً = اتجاه صاعد.',
    emoji: '📉',
    detail: 'مثلاً متوسط 200 يوم: لو السعر فوقه الاتجاه طويل المدى صاعد. بيستخدم في الدخول والخروج.',
  },
  {
    term: 'MACD',
    keywords: ['MACD', 'ماكد'],
    simple: 'مؤشر فني بيقيس زخم الحركة. تقاطع الخطين بيدي إشارات شراء أو بيع مبكرة.',
    emoji: '⚡',
    detail: 'بيتكون من خطين: لما الخط السريع يعبر فوق البطيء ممكن تكون إشارة شراء، والعكس بيع.',
  },
  {
    term: 'هامش الربح',
    keywords: ['هامش الربح', 'profit margin', 'الربحية', 'هوامش الربح'],
    simple: 'نسبة الربح من الإيرادات. شركة هامشها عالي غالباً قوية في تسعير أو تخفيض تكلفة.',
    emoji: '📊',
    detail: 'إجمالي أو صافي: كام في المية من المبيعات بتبقى ربح بعد خصم التكاليف والمصروفات.',
  },
  {
    term: 'نسبة الدين لحقوق الملكية',
    keywords: ['نسبة الدين', 'الدين لحقوق الملكية', 'debt to equity', 'الرفع المالي'],
    simple: 'كم دين على الشركة مقارنة بأموال المساهمين. نسبة عالية = مخاطرة أعلى لو الفوائد زادت.',
    emoji: '⚖️',
    detail: 'شركات بتقترض عشان تنمو، لكن دين كتير مع ارتفاع الفائدة بيضغط على الأرباح.',
  },
  {
    term: 'عائد التوزيعات',
    keywords: ['عائد التوزيعات', 'dividend yield', 'التوزيعات', 'العائد على التوزيع'],
    simple: 'نسبة ما توزعه الشركة من أرباح على السعر الحالي. سهم يوزع 5% معناها 5 جنيه لكل 100 جنيه سعر.',
    emoji: '🎁',
    detail: 'مهم للمستثمر اللي عايز دخل دوري. الشركة مش ملزمة توزع؛ التوزيع ممكن يقل أو يوقف.',
  },
  {
    term: 'القيمة الدفترية',
    keywords: ['القيمة الدفترية', 'book value', 'القيمة الدفترية للسهم'],
    simple: 'قيمة أصول الشركة ناقص ديونها، مقسومة على عدد الأسهم. سعر تحت القيمة الدفترية = سهم قد يكون مهمل.',
    emoji: '📒',
    detail: 'مش دايماً تعكس السوق الحقيقي للأصول. مفيدة في بنوك وشركات أصول ثابتة.',
  },
  {
    term: 'التنويع',
    keywords: ['التنويع', 'diversification', 'تنويع المحفظة'],
    simple: 'توزيع استثمارك على أكثر من سهم أو قطاع عشان لو واحد نزل الباقي قد يخفف الخسارة.',
    emoji: '🧩',
    detail: 'مبدأ أساسي: "ما تضعش كل بيضك في سلة". تنوع في القطاعات والشركات يقلل المخاطر.',
  },
  {
    term: 'المضاعف السعري (P/B)',
    keywords: ['P/B', 'السعر للقيمة الدفترية', 'price to book'],
    simple: 'كم مرة سعر السهم أكبر من قيمته الدفترية. أقل من 1 قد يعني سهم تحت قيمته المحاسبية.',
    emoji: '📗',
  },
  {
    term: 'الاتجاه (الترند)',
    keywords: ['الاتجاه', 'الترند', 'trend', 'صاعد', 'هابط', 'جانبي'],
    simple: 'اتجاه حركة السعر: صاعد (هبوطيات)، هابط (نزوليات)، أو جانبي (تذبذب في نطاق).',
    emoji: '〰️',
  },
  {
    term: 'حجم التداول',
    keywords: ['حجم التداول', 'volume', 'الحجم', 'كمية التداول'],
    simple: 'كم سهم اتباع واتشترى في الفترة. حجم عالي مع ارتفاع السعر = قوة، مع انخفاض = ضغط بيع.',
    emoji: '📦',
  },
];

/** يحوّل مدخل القاموس لشكل LearnCard (بدون inThisStock) */
function entryToLearnCard(entry: GlossaryEntry): LearnCard {
  return {
    term: entry.term,
    emoji: entry.emoji ?? '📚',
    simple: entry.simple,
    detail: entry.detail,
  };
}

/**
 * يجمع كل النص من تقرير التحليل (سطر واحد) للبحث عن المصطلحات.
 * نمرّر النص اللي نستخرجه من نتيجة التحليل/المقارنة/التوصيات.
 */
function buildSearchableText(parts: (string | undefined | null)[]): string {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .join(' ')
    .toLowerCase();
}

/**
 * يحدد أي مصطلحات القاموس وردت في النص ويرجعها كـ LearnCard[].
 * بدون أي استدعاء AI — كلّ شيء من القاموس الثابت.
 */
export function getMatchedGlossaryCards(searchableText: string): LearnCard[] {
  if (!searchableText || searchableText.length < 2) return [];

  const normalized = searchableText.replace(/\s+/g, ' ');
  const seen = new Set<string>();
  const matched: LearnCard[] = [];

  for (const entry of GLOSSARY) {
    if (seen.has(entry.term)) continue;
    const found = entry.keywords.some((kw) => {
      const k = kw.trim().toLowerCase();
      return k.length >= 2 && normalized.includes(k);
    });
    if (found) {
      seen.add(entry.term);
      matched.push(entryToLearnCard(entry));
    }
  }

  return matched;
}

/**
 * يستخرج نصاً قابلاً للبحث من نتيجة تحليل سهم واحد.
 */
export function getSearchableTextFromAnalysis(analysis: {
  summary?: string;
  researchNote?: { explanation?: string; investment_thesis?: string; key_drivers?: string[] };
  fundamental?: { highlights?: string[] };
  technical?: { highlights?: string[] };
  shortTerm?: { summary?: string };
  mediumTerm?: { summary?: string };
  longTerm?: { summary?: string };
  risks?: Array<{ risk?: string }>;
  suitability?: string;
  confidenceReason?: string;
}): string {
  const parts: string[] = [];
  if (analysis.summary) parts.push(analysis.summary);
  const rn = analysis.researchNote;
  if (rn?.explanation) parts.push(rn.explanation);
  if (rn?.investment_thesis) parts.push(rn.investment_thesis);
  if (Array.isArray(rn?.key_drivers)) parts.push(rn.key_drivers.join(' '));
  if (Array.isArray(analysis.fundamental?.highlights)) parts.push(analysis.fundamental.highlights.join(' '));
  if (Array.isArray(analysis.technical?.highlights)) parts.push(analysis.technical.highlights.join(' '));
  if (analysis.shortTerm?.summary) parts.push(analysis.shortTerm.summary);
  if (analysis.mediumTerm?.summary) parts.push(analysis.mediumTerm.summary);
  if (analysis.longTerm?.summary) parts.push(analysis.longTerm.summary);
  if (Array.isArray(analysis.risks)) parts.push(analysis.risks.map((r) => r.risk).filter(Boolean).join(' '));
  if (analysis.suitability) parts.push(analysis.suitability);
  if (analysis.confidenceReason) parts.push(analysis.confidenceReason);
  return buildSearchableText(parts);
}

/**
 * يستخرج نصاً قابلاً للبحث من نتيجة مقارنة سهمين.
 */
export function getSearchableTextFromCompare(result: {
  summary?: string;
  winnerReason?: string;
  recommendation?: string;
  stock1?: { fundamental?: { summary?: string }; technical?: { summary?: string }; strengths?: string[]; weaknesses?: string[] };
  stock2?: { fundamental?: { summary?: string }; technical?: { summary?: string }; strengths?: string[]; weaknesses?: string[] };
}): string {
  const parts: string[] = [];
  if (result.summary) parts.push(result.summary);
  if (result.winnerReason) parts.push(result.winnerReason);
  if (result.recommendation) parts.push(result.recommendation);
  const s1 = result.stock1;
  if (s1?.fundamental?.summary) parts.push(s1.fundamental.summary);
  if (s1?.technical?.summary) parts.push(s1.technical.summary);
  if (Array.isArray(s1?.strengths)) parts.push(s1.strengths.join(' '));
  if (Array.isArray(s1?.weaknesses)) parts.push(s1.weaknesses.join(' '));
  const s2 = result.stock2;
  if (s2?.fundamental?.summary) parts.push(s2.fundamental.summary);
  if (s2?.technical?.summary) parts.push(s2.technical.summary);
  if (Array.isArray(s2?.strengths)) parts.push(s2.strengths.join(' '));
  if (Array.isArray(s2?.weaknesses)) parts.push(s2.weaknesses.join(' '));
  return buildSearchableText(parts);
}

/**
 * يستخرج نصاً قابلاً للبحث من نتيجة التوصيات.
 */
export function getSearchableTextFromRecommendations(result: {
  summary?: string;
  marketOutlook?: string;
  portfolioHealth?: { issues?: string[] };
  recommendations?: Array<{ reason?: string }>;
}): string {
  const parts: string[] = [];
  if (result.summary) parts.push(result.summary);
  if (result.marketOutlook) parts.push(result.marketOutlook);
  if (Array.isArray(result.portfolioHealth?.issues)) parts.push(result.portfolioHealth.issues.join(' '));
  if (Array.isArray(result.recommendations)) {
    parts.push(result.recommendations.map((r) => r.reason).filter(Boolean).join(' '));
  }
  return buildSearchableText(parts);
}
