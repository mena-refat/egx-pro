import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target, Clock, AlertTriangle, Wallet, TrendingUp,
  Home, Umbrella, Compass, Zap, Plus, Check, Save, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

// ─── Constants (mirror of OnboardingWizard) ──────────────────────────────────

const GOAL_OPTIONS = [
  { id: 'property_or_car', icon: Home,      title: 'شراء عقار أو سيارة',   desc: 'هدف ملموس وقابل للتحقيق' },
  { id: 'wealth',          icon: TrendingUp, title: 'تنمية ثروتي',          desc: 'خلّي فلوسك تشتغل نيابة عنك' },
  { id: 'retirement',      icon: Umbrella,   title: 'التقاعد المريح',        desc: 'ضمان مستقبلك بكره' },
  { id: 'travel',          icon: Compass,    title: 'سفر ومغامرات',          desc: 'عيش الحياة اللي تستحقها' },
  { id: 'trading',         icon: Zap,        title: 'أرباح سريعة',           desc: 'مضاربة وتداول نشط' },
  { id: 'other',           icon: Plus,       title: 'أخرى',                  desc: 'هدف خاص بيك' },
] as const;

const TIMELINE_OPTIONS = [
  { id: 'lt1', title: '⚡ أقل من سنة',          desc: 'هدف قريب - استراتيجية محافظة', years: 1 },
  { id: '1_3', title: '📅 من 1 إلى 3 سنوات',    desc: 'أفق قصير - توازن بين الأمان والنمو', years: 3 },
  { id: '3_7', title: '📆 من 3 إلى 7 سنوات',    desc: 'متوسط الأجل - نمو تدريجي ومستقر', years: 5 },
  { id: 'gt7', title: '🏆 أكثر من 7 سنوات',     desc: 'طويل الأجل - أعلى عائد على المدى البعيد', years: 10 },
] as const;

const RISK_OPTIONS = [
  { id: 'sell_immediately', risk: 'conservative' as const, title: '😰 هبيع فوراً وأوقف الخسارة', desc: 'سلامتي أهم من أي ربح' },
  { id: 'wait_and_see',    risk: 'moderate' as const,     title: '🤔 هستنى وأشوف السوق',        desc: 'مش هتصرف إلا لو الوضع اتضح' },
  { id: 'buy_more',        risk: 'aggressive' as const,   title: '😎 فرصة ذهبية - هشتري أكتر', desc: 'انخفاض السعر يعني صفقة أفضل' },
  { id: 'long_term_calm',  risk: 'moderate' as const,     title: '🧘 مش هتأثر - استثماري طويل المدى', desc: 'التقلبات طبيعية ومش بتقلقني' },
] as const;

const BUDGET_OPTIONS = [
  { id: 'lt_1000', title: '🌱 أقل من 1,000 جنيه',       desc: 'البداية المهمة هي البداية', amount: 500 },
  { id: '1_5k',    title: '📊 من 1,000 إلى 5,000',       desc: 'مبلغ ممتاز للبناء التدريجي', amount: 3000 },
  { id: '5_20k',   title: '💼 من 5,000 إلى 20,000',      desc: 'محفظة متنوعة في متناول يدك', amount: 10000 },
  { id: 'gt_20k',  title: '🚀 أكثر من 20,000 جنيه',     desc: 'مستثمر جاد بإمكانيات عالية', amount: 25000 },
] as const;

const LEVEL_OPTIONS = [
  { id: 'beginner',     title: '🐣 مبتدئ تماماً',       desc: 'لسه بتعلم وعندي أسئلة كتير' },
  { id: 'basics',       title: '📚 بعرف الأساسيات',     desc: 'فاهم المفاهيم الأساسية وبدأت أجرب' },
  { id: 'intermediate', title: '📈 متوسط',               desc: 'عندي تجربة وبستثمر بانتظام' },
  { id: 'advanced',     title: '🎯 متقدم',               desc: 'خبرة واسعة وبتداول بثقة' },
] as const;

const SECTORS = [
  { id: 'banks_financial',         label: 'البنوك والخدمات المالية' },
  { id: 'real_estate_construction', label: 'العقارات والإنشاءات' },
  { id: 'food_beverages',           label: 'الأغذية والمشروبات' },
  { id: 'healthcare_pharma',        label: 'الرعاية الصحية والأدوية' },
  { id: 'it_media_telecom',         label: 'الاتصالات والتكنولوجيا' },
  { id: 'industrial_auto',          label: 'الصناعة والسيارات' },
  { id: 'tourism_entertainment',    label: 'السياحة والترفيه' },
  { id: 'basic_resources',          label: 'الموارد الأساسية' },
  { id: 'utilities',                label: 'المرافق' },
  { id: 'textiles_durables',        label: 'المنسوجات والسلع المعمرة' },
  { id: 'diversified',              label: 'متنوع' },
  { id: 'unknown',                  label: 'لا أعرف بعد' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvestorFormState {
  goal: string;
  timeline: string;
  reaction30: string;
  budgetBand: string;
  sectors: string[];
  level: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function invertRiskToReaction(riskTolerance?: string): string {
  switch (riskTolerance) {
    case 'conservative': return 'sell_immediately';
    case 'aggressive':   return 'buy_more';
    default:             return 'wait_and_see';
  }
}

function invertHorizonToBand(horizon?: number): string {
  if (!horizon) return '';
  if (horizon <= 1) return 'lt1';
  if (horizon <= 3) return '1_3';
  if (horizon <= 7) return '3_7';
  return 'gt7';
}

function invertBudgetToBand(budget?: number): string {
  if (!budget) return '';
  if (budget < 1000) return 'lt_1000';
  if (budget < 5000) return '1_5k';
  if (budget < 20000) return '5_20k';
  return 'gt_20k';
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-subtle)]">
        <Icon className="w-4 h-4 text-[var(--brand)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type OptionCardProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ className?: string }>;
};
const OptionCard: React.FC<OptionCardProps> = ({ selected, onClick, title, desc, icon: Icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-right w-full p-3.5 rounded-xl border-2 transition-all duration-150 text-sm
        ${selected
          ? 'border-[var(--brand)] bg-[var(--brand)]/8 shadow-sm'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
        }`}
    >
      {selected && (
        <span className="absolute top-2.5 left-2.5 rtl:right-2.5 rtl:left-auto w-4 h-4 rounded-full bg-[var(--brand)] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-center gap-2 mb-0.5">
        {Icon && <Icon className="w-4 h-4 text-[var(--brand)] shrink-0" />}
        <span className="font-semibold text-[var(--text-primary)]">{title}</span>
      </div>
      {desc && <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvestorProfileTab() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const rawProfile = user?.investorProfile as Record<string, unknown> | null | undefined;

  const [form, setForm] = useState<InvestorFormState>({
    goal:       (rawProfile?.goal as string)       || '',
    timeline:   (rawProfile?.timeline as string)   || invertHorizonToBand(user?.investmentHorizon),
    reaction30: (rawProfile?.reaction30 as string) || invertRiskToReaction(user?.riskTolerance),
    budgetBand: (rawProfile?.budgetBand as string) || invertBudgetToBand(user?.monthlyBudget),
    sectors:    (rawProfile?.sectors as string[])  || user?.interestedSectors || [],
    level:      (rawProfile?.level as string)      || '',
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty);

  function update(patch: Partial<InvestorFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setStatus(null);
  }

  function toggleSector(id: string) {
    setForm((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(id)
        ? prev.sectors.filter((s) => s !== id)
        : [...prev.sectors, id],
    }));
    setDirty(true);
    setStatus(null);
  }

  const riskMap: Record<string, 'conservative' | 'moderate' | 'aggressive'> = {
    sell_immediately: 'conservative',
    wait_and_see:     'moderate',
    buy_more:         'aggressive',
    long_term_calm:   'moderate',
  };

  const timelineYears: Record<string, number> = { lt1: 1, '1_3': 3, '3_7': 5, gt7: 10 };
  const budgetAmount:  Record<string, number> = { lt_1000: 500, '1_5k': 3000, '5_20k': 10000, gt_20k: 25000 };

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await api.put('/user/profile', {
        riskTolerance:     riskMap[form.reaction30] ?? 'moderate',
        investmentHorizon: timelineYears[form.timeline] ?? 5,
        monthlyBudget:     budgetAmount[form.budgetBand] ?? 0,
        interestedSectors: form.sectors,
        investorProfile: {
          ...(rawProfile ?? {}),
          goal:       form.goal,
          timeline:   form.timeline,
          reaction30: form.reaction30,
          budgetBand: form.budgetBand,
          sectors:    form.sectors,
          level:      form.level,
        },
      });
      updateUser({
        interestedSectors: form.sectors,
        riskTolerance:     riskMap[form.reaction30] ?? 'moderate',
        investmentHorizon: timelineYears[form.timeline] ?? 5,
        monthlyBudget:     budgetAmount[form.budgetBand] ?? 0,
        investorProfile: {
          ...(rawProfile ?? {}),
          goal: form.goal, timeline: form.timeline, reaction30: form.reaction30,
          budgetBand: form.budgetBand, sectors: form.sectors, level: form.level,
        },
      });
      setStatus({ type: 'success', msg: 'تم حفظ تفضيلاتك بنجاح ✓' });
      setDirty(false);
    } catch {
      setStatus({ type: 'error', msg: 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="relative bg-gradient-to-br from-violet-400/10 via-transparent to-transparent p-5">
          <div className="absolute -top-8 -end-8 w-32 h-32 rounded-full bg-violet-400/6 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">ملف المستثمر</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">حدّد أهدافك وشخصيتك الاستثمارية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal */}
      <Section icon={Target} title="هدف الاستثمار">
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.goal === opt.id}
              onClick={() => update({ goal: opt.id })}
              title={opt.title}
              desc={opt.desc}
              icon={opt.icon}
            />
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section icon={Clock} title="الأفق الزمني">
        <div className="grid grid-cols-2 gap-2">
          {TIMELINE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.timeline === opt.id}
              onClick={() => update({ timeline: opt.id })}
              title={opt.title}
              desc={opt.desc}
            />
          ))}
        </div>
      </Section>

      {/* Risk */}
      <Section icon={AlertTriangle} title="مستوى تحمل المخاطر">
        <div className="grid grid-cols-1 gap-2">
          {RISK_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.reaction30 === opt.id}
              onClick={() => update({ reaction30: opt.id })}
              title={opt.title}
              desc={opt.desc}
            />
          ))}
        </div>
      </Section>

      {/* Budget */}
      <Section icon={Wallet} title="الميزانية الشهرية للاستثمار">
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.budgetBand === opt.id}
              onClick={() => update({ budgetBand: opt.id })}
              title={opt.title}
              desc={opt.desc}
            />
          ))}
        </div>
      </Section>

      {/* Sectors */}
      <Section icon={Target} title="القطاعات المفضلة">
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((sector) => {
            const selected = form.sectors.includes(sector.id);
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => toggleSector(sector.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                  ${selected
                    ? 'bg-[var(--brand)]/10 border-[var(--brand)] text-[var(--brand-text)]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
              >
                {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                {sector.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Level */}
      <Section icon={TrendingUp} title="مستوى خبرتك في الاستثمار">
        <div className="grid grid-cols-2 gap-2">
          {LEVEL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.level === opt.id}
              onClick={() => update({ level: opt.id })}
              title={opt.title}
              desc={opt.desc}
            />
          ))}
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10">
        <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-[var(--shadow-xl)] backdrop-blur-sm transition-all duration-200
          ${dirty ? 'bg-[var(--bg-card)]/95 border-[var(--border-strong)]' : 'bg-[var(--bg-card)]/60 border-[var(--border)]'}`}>
          {status && (
            <p className={`text-xs font-medium flex-1 ${status.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {status.msg}
            </p>
          )}
          {!status && <p className="text-xs text-[var(--text-muted)] flex-1">{dirty ? 'لديك تغييرات غير محفوظة' : 'جميع التفضيلات محدّثة'}</p>}
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!dirty || saving}
            onClick={handleSave}
            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            iconPosition="left"
          >
            {saving ? t('common.saving', { defaultValue: 'جاري الحفظ...' }) : t('common.save', { defaultValue: 'حفظ التغييرات' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
