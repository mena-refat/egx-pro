/**
 * تعريفات الإنجازات الـ 40 — 4 مستويات × 10
 * level: beginner | growth | pro | legend
 */
export type AchievementLevel = 'beginner' | 'growth' | 'pro' | 'legend';

export interface AchievementDef {
  id: string;
  level: AchievementLevel;
  title: string;
  shortDescription: string;
  longDescription: string;
  route: string | null; // null = لا يوجد زر
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // المستوى الأول — الناشئ
  { id: 'first-step', level: 'beginner', title: 'الخطوة الأولى', shortDescription: 'أول خطواتك في عالم الاستثمار', longDescription: 'أنشأت حسابك وبدأت رحلتك مع EGX Pro. كل مستثمر عظيم يبدأ بخطوة واحدة.', route: null },
  { id: 'know-yourself', level: 'beginner', title: 'اعرف نفسك', shortDescription: 'حدّد شخصيتك الاستثمارية', longDescription: 'عبر تحديد شخصيتك الاستثمارية تعرف كيف تتعامل مع المخاطر والفرص. هذا أساس كل قرار استثماري سليم.', route: '/onboarding' },
  { id: 'profile-complete', level: 'beginner', title: 'الملف المكتمل', shortDescription: 'أكمل بياناتك وابدأ رحلتك', longDescription: 'إكمال ملفك الشخصي يفتح لك كل مميزات التطبيق ويُظهر توصيات مخصصة لك. البيانات الكاملة = قرارات أوضح.', route: '/account?tab=settings' },
  { id: 'first-look', level: 'beginner', title: 'أول نظرة', shortDescription: 'حلّل سهمك الأول بالذكاء الاصطناعي', longDescription: 'أول تحليل بالذكاء الاصطناعي يضعك على أول الطريق لفهم الأسهم. الاستمرار يبني الخبرة.', route: '/stocks' },
  { id: 'watcher', level: 'beginner', title: 'المراقب', shortDescription: 'ابدأ بمتابعة الأسهم', longDescription: 'إضافة أول سهم لقائمة المراقبة يعني أنك بدأت تتابع السوق بوعي. المراقبة تسبق القرار.', route: '/stocks' },
  { id: 'investor', level: 'beginner', title: 'المستثمر', shortDescription: 'ضع أول استثمار في محفظتك', longDescription: 'أول سهم في المحفظة هو بداية بناء الثروة. كل رحلة طويلة تبدأ بخطوة.', route: '/portfolio' },
  { id: 'dreamer', level: 'beginner', title: 'الحالم', shortDescription: 'حدد هدفك المالي الأول', longDescription: 'الأهداف المالية تحوّل الأحلام إلى أرقام وخطة. من يحدد هدفه يصل أسرع.', route: '/goals' },
  { id: 'first-referrer', level: 'beginner', title: 'الداعي الأول', shortDescription: 'شارك EGX Pro مع صديق', longDescription: 'مشاركة EGX Pro مع صديق تعني أنك تثق بالتطبيق وتريد نشر الفائدة. الدعوة الصادقة تُكسب الجميع.', route: '/account?tab=referrals' },
  { id: 'subscriber', level: 'beginner', title: 'المشترك', shortDescription: 'انضم لمجتمع المحترفين', longDescription: 'الاشتراك في خطة Pro يعني استثمارك في أدوات أفضل وقرارات أوضح. المجتمع يبنيه من يدفع قدماً.', route: '/account?tab=subscription' },
  { id: 'week-with-us', level: 'beginner', title: 'أسبوع معنا', shortDescription: 'سبعة أيام متتالية من النمو', longDescription: 'سبعة أيام متتالية من المتابعة تبني عادة الاستثمار الواعي. الاتساق يخلق النتائج.', route: null },
  // المستوى الثاني — المستثمر
  { id: 'active-analyst', level: 'growth', title: 'المحلل النشط', shortDescription: '10 تحليلات تصنع المستثمر الواعي', longDescription: 'عشر تحليلات تعني أنك لم تعد تعتمد على الحدس فقط. البيانات والتحليل يصنعان المستثمر الواعي.', route: '/stocks' },
  { id: 'wealth-builder', level: 'growth', title: 'بناء الثروة', shortDescription: '5 أسهم تبني محفظة متوازنة', longDescription: 'خمسة أسهم مختلفة هي بداية التنويع الحقيقي. المحفظة المتوازنة تقلل المخاطر وتوزع الفرص.', route: '/portfolio' },
  { id: 'long-list', level: 'growth', title: 'القائمة الطويلة', shortDescription: '10 أسهم تحت عينك', longDescription: 'عشر أسهم في قائمة المراقبة تعني أنك توسع أفقك وتتابع السوق بجدية. المراقبة الواسعة تفتح الفرص.', route: '/stocks' },
  { id: 'planner', level: 'growth', title: 'المخطط', shortDescription: '3 أهداف مالية في آنٍ واحد', longDescription: 'ثلاثة أهداف مالية تعني أنك تخطط لمستقبلك من أكثر من زاوية. التخطيط المتعدد يبني الاستقرار.', route: '/goals' },
  { id: 'loyal', level: 'growth', title: 'الوفي', shortDescription: '30 يوماً من الاتساق', longDescription: 'ثلاثون يوماً من المتابعة تعني التزاماً حقيقياً برحلتك الاستثمارية. الالتزام يصنع الفرق.', route: null },
  { id: 'network', level: 'growth', title: 'الشبكة', shortDescription: 'دعوة 5 أصدقاء للنجاح', longDescription: 'خمس دعوات ناجحة تعني أنك تبني شبكة من المستثمرين الواعين. النجاح يُقاس أحياناً بمن نرفع معنا.', route: '/account?tab=referrals' },
  { id: 'diversified', level: 'growth', title: 'المتنوع', shortDescription: 'استثمر في 3 قطاعات مختلفة', longDescription: 'الاستثمار في ثلاثة قطاعات يقلل مخاطر الاعتماد على قطاع واحد. التنويع حماية وفرصة.', route: '/stocks' },
  { id: 'decision-maker', level: 'growth', title: 'صانع القرار', shortDescription: '25 تحليلاً يصنع الخبير', longDescription: 'خمسة وعشرون تحليلاً تضعك في مصاف من يعتمد على التحليل لا العاطفة. القرارات المدروسة تصنع النتائج.', route: '/stocks' },
  { id: 'first-goal-achieved', level: 'growth', title: 'الهدف الأول', shortDescription: 'حققت ما خططت له', longDescription: 'تحقيق أول هدف مالي يثبت أن التخطيط والالتزام ينجحان. أول هدف محقق يفتح الباب للتالي.', route: '/goals' },
  { id: 'devoted', level: 'growth', title: 'المخلص', shortDescription: '3 أشهر من الالتزام', longDescription: 'ثلاثة أشهر متتالية تعني أن الاستثمار أصبح جزءاً من روتينك. الإخلاص للعملية يبني الثروة.', route: null },
  // المستوى الثالث — المحترف
  { id: 'expert-analyst', level: 'pro', title: 'المحلل الخبير', shortDescription: '50 تحليلاً من علامات الاحتراف', longDescription: 'خمسون تحليلاً تضعك بين المحترفين. الخبرة تتراكم تحليلًا بعد تحليل.', route: '/stocks' },
  { id: 'diverse-portfolio', level: 'pro', title: 'محفظة متنوعة', shortDescription: '5 قطاعات تعني توازناً حقيقياً', longDescription: 'خمسة قطاعات في محفظتك تعني تنويعاً حقيقياً يقلل الصدمات ويفتح آفاقاً أوسع.', route: '/stocks' },
  { id: 'strategist', level: 'pro', title: 'الاستراتيجي', shortDescription: '5 أهداف محققة لا تكذب', longDescription: 'خمسة أهداف محققة تثبت أنك لا تحلم فقط بل تنفذ. الاستراتيجية بدون تنفيذ وهم.', route: '/goals' },
  { id: 'egx-ambassador', level: 'pro', title: 'سفير EGX Pro', shortDescription: '20 شخصاً آمنوا بتوصيتك', longDescription: 'عشرون شخصاً انضموا بفضلك يعني أنك سفير حقيقي للاستثمار الواعي. التأثير يُقاس بالأثر.', route: '/account?tab=referrals' },
  { id: 'big-portfolio', level: 'pro', title: 'المحفظة الكبيرة', shortDescription: '15 سهماً تحت إدارتك', longDescription: 'خمسة عشر سهمًا في محفظتك تعني إدارة حقيقية للتنويع والمخاطر. الحجم يأتي مع المسؤولية.', route: '/portfolio' },
  { id: 'patient', level: 'pro', title: 'الصبور', shortDescription: '6 أشهر والرحلة مستمرة', longDescription: 'ستة أشهر من المتابعة تعني صبراً على العملية. الاستثمار لعبة طويلة الأمد.', route: null },
  { id: 'daily-follower', level: 'pro', title: 'المتابع اليومي', shortDescription: '100 يوم من المعرفة المتراكمة', longDescription: 'مئة يوم من المتابعة تبني عادة يومية قوية. المعرفة المتراكمة تصنع الفارق.', route: null },
  { id: 'researcher', level: 'pro', title: 'الباحث', shortDescription: 'حللت 10 أسهم مختلفة', longDescription: 'تحليل عشرة أسهم مختلفة يوسع فهمك للسوق. البحث يفتح العين على الفرص الخفية.', route: '/stocks' },
  { id: 'annual-subscriber', level: 'pro', title: 'المشترك السنوي', shortDescription: 'استثمرت في نفسك سنة كاملة', longDescription: 'الاشتراك السنوي يعني أنك استثمرت في أدواتك لمدة عام. الاستثمار في النفس أعلى العوائد.', route: '/account?tab=subscription' },
  { id: 'leader', level: 'pro', title: 'القائد', shortDescription: '60 يوماً متتالياً بلا توقف', longDescription: 'ستون يوماً متتالياً تثبت أنك قائد لالتزامك. القيادة تبدأ بالاستمرارية.', route: null },
  // المستوى الرابع — الأسطورة
  { id: 'legend-analyst', level: 'legend', title: 'المحلل الأسطوري', shortDescription: '100 تحليل — هذا هو المستوى', longDescription: 'مئة تحليل تضعك في نادي النخبة. هذا هو مستوى التحليل الذي لا يصل إليه إلا القلة.', route: '/stocks' },
  { id: 'kings-portfolio', level: 'legend', title: 'محفظة الملوك', shortDescription: '25 سهماً تدار باحترافية', longDescription: 'خمسة وعشرون سهمًا في محفظة واحدة تحتاج إدارة ووعي. أنت تدير أصولك باحتراف.', route: '/portfolio' },
  { id: 'full-year', level: 'legend', title: 'سنة كاملة', shortDescription: '365 يوماً من النمو المستمر', longDescription: 'سنة كاملة مع التطبيق تعني أن الاستثمار أصبح جزءاً من حياتك. النمو المستمر يبني الأساطير.', route: null },
  { id: 'mega-referrer', level: 'legend', title: 'الداعية الكبير', shortDescription: '50 شخصاً يثقون في رأيك', longDescription: 'خمسون شخصاً انضموا بفضلك يعني ثقة كبيرة في توصيتك. أنت داعية الاستثمار الواعي.', route: '/account?tab=referrals' },
  { id: 'referral-legend', level: 'legend', title: 'أسطورة الدعوات', shortDescription: '100 شخص انضموا بفضلك', longDescription: 'مئة شخص انضموا بفضلك يضعك بين أساطير الدعوة. التأثير الحقيقي يُقاس بالأعداد.', route: '/account?tab=referrals' },
  { id: 'community-leader', level: 'legend', title: 'قائد المجتمع', shortDescription: '500 شخص في مجتمعك', longDescription: 'خمسمائة شخص في مجتمعك يعني أنك قائد حقيقي. المجتمع يبنيه من يرفع الآخرين.', route: '/account?tab=referrals' },
  { id: 'the-1000', level: 'legend', title: 'الـ 1000', shortDescription: 'ألف شخص — أنت ظاهرة', longDescription: 'ألف شخص انضموا بفضلك يعني أنك ظاهرة نادرة. هذا المستوى للقلة فقط.', route: '/account?tab=referrals' },
  { id: 'overachiever', level: 'legend', title: 'المتفوق', shortDescription: '200 تحليل لا يفعلها إلا النخبة', longDescription: 'مئتا تحليل تضعك في قمة الهرم التحليلي. النخبة تُعرف بالأرقام.', route: '/stocks' },
  { id: 'sector-expert', level: 'legend', title: 'خبير القطاعات', shortDescription: 'حللت كل قطاعات البورصة', longDescription: 'تحليل أسهم من كل قطاعات البورصة يعني رؤية شاملة. الخبرة الشاملة نادرة.', route: '/stocks' },
  { id: 'legend', level: 'legend', title: 'الأسطورة', shortDescription: 'أكملت كل المستويات — أنت الأسطورة', longDescription: 'إكمال كل الإنجازات الأربعين يعني أنك وصلت لقمة الرحلة. أنت الأسطورة.', route: null },
];

export const LEVEL_LABELS: Record<AchievementLevel, string> = {
  beginner: 'الناشئ',
  growth: 'المستثمر',
  pro: 'المحترف',
  legend: 'الأسطورة',
};

export const LEVEL_COLORS: Record<AchievementLevel, { border: string; text: string; bg?: string }> = {
  beginner: { border: 'border-[#7c3aed]', text: 'text-[#a78bfa]', bg: 'bg-[#7c3aed]/10' },
  growth: { border: 'border-[#3b82f6]', text: 'text-[#60a5fa]', bg: 'bg-[#3b82f6]/10' },
  pro: { border: 'border-[#f59e0b]', text: 'text-[#fbbf24]', bg: 'bg-[#f59e0b]/10' },
  legend: { border: 'border-[#f43f5e]', text: 'text-[#fb7185]', bg: 'bg-[#f43f5e]/10' },
};
