import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, CheckCircle2, AlertCircle, Target, TrendingUp,
  DollarSign, Moon, Building2, Megaphone, Layers, RefreshCw,
} from 'lucide-react';
import { adminApi } from '../lib/adminApi';

/* ── types ───────────────────────────────────────────────────── */
interface OnboardingStats {
  totalUsers: number;
  completedOnboarding: number;
  completionRate: number;
  riskTolerance: Record<string, number>;
  investmentHorizon: Record<string, number>;
  monthlyBudget: Record<string, number>;
  shariaMode: { yes: number; no: number };
  sectors: Record<string, number>;
  goals: Record<string, number>;
  levels: Record<string, number>;
  hearAboutUs: Record<string, number>;
}

/* ── label maps ──────────────────────────────────────────────── */
const GOAL_LABELS: Record<string, { en: string; ar: string }> = {
  property_or_car: { en: 'Buy Property / Car',      ar: 'شراء عقار أو سيارة' },
  wealth:          { en: 'Grow Wealth',              ar: 'تنمية الثروة' },
  retirement:      { en: 'Retirement',               ar: 'التقاعد المريح' },
  travel:          { en: 'Travel & Adventures',      ar: 'سفر ومغامرات' },
  trading:         { en: 'Quick Profits',            ar: 'أرباح سريعة' },
  wealth_growth:   { en: 'Long-term Wealth',         ar: 'تنمية الثروة على المدى البعيد' },
  passive_income:  { en: 'Passive Income',           ar: 'دخل شهري من التوزيعات' },
  short_gains:     { en: 'Short-term Gains',         ar: 'مكاسب قصيرة المدى' },
  learn:           { en: 'Learn Investing',          ar: 'تعلّم الاستثمار' },
  other:           { en: 'Other',                    ar: 'أخرى' },
};

const RISK_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  conservative: { en: 'Conservative', ar: 'محافظ',  color: 'bg-blue-500' },
  moderate:     { en: 'Moderate',     ar: 'معتدل',  color: 'bg-amber-500' },
  aggressive:   { en: 'Aggressive',   ar: 'مغامر',  color: 'bg-red-500' },
};

const HORIZON_LABELS: Record<string, { en: string; ar: string }> = {
  '1':  { en: '< 1 year',   ar: 'أقل من سنة' },
  '3':  { en: '1–3 years',  ar: '١–٣ سنوات' },
  '5':  { en: '3–7 years',  ar: '٣–٧ سنوات' },
  '10': { en: '7+ years',   ar: '٧ سنوات فأكثر' },
};

const BUDGET_LABELS: Record<string, { en: string; ar: string }> = {
  '500':   { en: '< 1,000 EGP',       ar: 'أقل من ١٠٠٠ جنيه' },
  '3000':  { en: '1,000–5,000 EGP',   ar: '١٠٠٠–٥٠٠٠ جنيه' },
  '10000': { en: '5,000–20,000 EGP',  ar: '٥٠٠٠–٢٠٠٠٠ جنيه' },
  '25000': { en: '> 20,000 EGP',      ar: 'أكثر من ٢٠٠٠٠ جنيه' },
};

const SECTOR_LABELS: Record<string, { en: string; ar: string }> = {
  banks_financial:         { en: 'Banks & Finance',           ar: 'البنوك والخدمات المالية' },
  real_estate_construction:{ en: 'Real Estate',               ar: 'العقارات والإنشاءات' },
  food_beverages:          { en: 'Food & Beverages',          ar: 'الأغذية والمشروبات' },
  healthcare_pharma:       { en: 'Healthcare & Pharma',       ar: 'الرعاية الصحية والأدوية' },
  it_media_telecom:        { en: 'Tech & Telecom',            ar: 'الاتصالات والتكنولوجيا' },
  industrial_auto:         { en: 'Industrial & Auto',         ar: 'الصناعة والسيارات' },
  tourism_entertainment:   { en: 'Tourism & Entertainment',   ar: 'السياحة والترفيه' },
  basic_resources:         { en: 'Basic Resources',           ar: 'الموارد الأساسية' },
  utilities:               { en: 'Utilities',                 ar: 'المرافق' },
  textiles_durables:       { en: 'Textiles & Durables',       ar: 'المنسوجات والسلع المعمرة' },
  diversified:             { en: 'Diversified',               ar: 'متنوع' },
  unknown:                 { en: 'Not Sure Yet',              ar: 'لا أعرف بعد' },
};

const LEVEL_LABELS: Record<string, { en: string; ar: string }> = {
  beginner:     { en: 'Beginner',     ar: 'مبتدئ' },
  intermediate: { en: 'Intermediate', ar: 'متوسط' },
  advanced:     { en: 'Advanced',     ar: 'متقدم' },
};

/* ── helper ──────────────────────────────────────────────────── */
function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/* ── bar row ──────────────────────────────────────────────────── */
function Bar({ label, count, total, color = 'bg-emerald-500' }: {
  label: string; count: number; total: number; color?: string;
}) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-slate-400 w-40 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-16 text-end shrink-0">{count} ({p}%)</span>
    </div>
  );
}

/* ── section card ─────────────────────────────────────────────── */
function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── component ────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.get('/analytics/onboarding')
      .then((r) => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const label = (map: Record<string, { en: string; ar: string }>, key: string) =>
    (isAr ? map[key]?.ar : map[key]?.en) ?? key;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500">
        <AlertCircle size={24} />
        <p className="text-sm">Failed to load onboarding stats.</p>
        <button onClick={load} className="text-xs text-emerald-400 hover:underline">Retry</button>
      </div>
    );
  }

  const n = stats.completedOnboarding;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('nav.onboarding')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAr ? 'تحليل اختيارات المستخدمين أثناء الإعداد الأولي' : 'User choices made during the onboarding flow'}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Completion KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Users size={10} /> {isAr ? 'إجمالي المستخدمين' : 'Total Users'}
          </span>
          <span className="text-2xl font-bold text-white tabular-nums">{stats.totalUsers.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-emerald-500/70 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 size={10} /> {isAr ? 'أكملوا الإعداد' : 'Completed Onboarding'}
          </span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.completedOnboarding.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isAr ? 'نسبة الإكمال' : 'Completion Rate'}
          </span>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold tabular-nums ${
              stats.completionRate >= 70 ? 'text-emerald-400' :
              stats.completionRate >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>{stats.completionRate}%</span>
          </div>
          <div className="mt-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                stats.completionRate >= 70 ? 'bg-emerald-500' :
                stats.completionRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-column grid for sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Goals */}
        <Section icon={<Target size={13} />} title={isAr ? 'هدف الاستثمار' : 'Investment Goal'}>
          {sortedEntries(stats.goals).length === 0
            ? <p className="text-xs text-slate-600">{isAr ? 'لا توجد بيانات' : 'No data yet'}</p>
            : sortedEntries(stats.goals).map(([k, v]) => (
              <Bar key={k} label={label(GOAL_LABELS, k)} count={v} total={n} color="bg-violet-500" />
            ))}
        </Section>

        {/* Risk Tolerance */}
        <Section icon={<TrendingUp size={13} />} title={isAr ? 'مستوى المخاطرة' : 'Risk Tolerance'}>
          {Object.entries(RISK_LABELS).map(([k, meta]) => {
            const v = stats.riskTolerance[k] ?? 0;
            return (
              <Bar key={k} label={isAr ? meta.ar : meta.en} count={v} total={n} color={meta.color} />
            );
          })}
        </Section>

        {/* Investment Horizon */}
        <Section icon={<TrendingUp size={13} />} title={isAr ? 'مدة الاستثمار' : 'Investment Horizon'}>
          {(['1','3','5','10'] as const).map((k) => {
            const v = stats.investmentHorizon[k] ?? 0;
            return (
              <Bar key={k} label={label(HORIZON_LABELS, k)} count={v} total={n} color="bg-sky-500" />
            );
          })}
        </Section>

        {/* Monthly Budget */}
        <Section icon={<DollarSign size={13} />} title={isAr ? 'الميزانية الشهرية' : 'Monthly Budget'}>
          {(['500','3000','10000','25000'] as const).map((k) => {
            const v = stats.monthlyBudget[k] ?? 0;
            return (
              <Bar key={k} label={label(BUDGET_LABELS, k)} count={v} total={n} color="bg-emerald-500" />
            );
          })}
        </Section>

        {/* Sharia Mode */}
        <Section icon={<Moon size={13} />} title={isAr ? 'وضع الأسهم الإسلامية' : 'Sharia Mode'}>
          <Bar label={isAr ? 'مفعّل' : 'Enabled'} count={stats.shariaMode.yes} total={n} color="bg-emerald-500" />
          <Bar label={isAr ? 'غير مفعّل' : 'Disabled'} count={stats.shariaMode.no} total={n} color="bg-slate-500" />
        </Section>

        {/* Experience Level */}
        <Section icon={<Layers size={13} />} title={isAr ? 'مستوى الخبرة' : 'Experience Level'}>
          {sortedEntries(stats.levels).length === 0
            ? <p className="text-xs text-slate-600">{isAr ? 'لا توجد بيانات' : 'No data yet'}</p>
            : sortedEntries(stats.levels).map(([k, v]) => (
              <Bar key={k} label={label(LEVEL_LABELS, k)} count={v} total={n} color="bg-amber-500" />
            ))}
        </Section>

        {/* Sectors — full width */}
        <div className="lg:col-span-2">
          <Section icon={<Building2 size={13} />} title={isAr ? 'القطاعات المفضلة (اختيار متعدد)' : 'Interested Sectors (multi-select)'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {sortedEntries(stats.sectors).map(([k, v]) => (
                <Bar key={k} label={label(SECTOR_LABELS, k)} count={v} total={n} color="bg-blue-500" />
              ))}
              {Object.keys(stats.sectors).length === 0 && (
                <p className="text-xs text-slate-600">{isAr ? 'لا توجد بيانات' : 'No data yet'}</p>
              )}
            </div>
          </Section>
        </div>

        {/* Hear About Us — full width */}
        <div className="lg:col-span-2">
          <Section icon={<Megaphone size={13} />} title={isAr ? 'كيف سمعوا عن التطبيق؟' : 'How Did They Hear About Us?'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {sortedEntries(stats.hearAboutUs).map(([k, v]) => (
                <Bar key={k} label={k} count={v} total={n} color="bg-pink-500" />
              ))}
              {Object.keys(stats.hearAboutUs).length === 0 && (
                <p className="text-xs text-slate-600">{isAr ? 'لا توجد بيانات' : 'No data yet'}</p>
              )}
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
}
