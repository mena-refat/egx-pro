import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronLeft,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
  Wallet,
  Settings,
  Users,
  Gift,
  Home,
  Umbrella,
  Compass,
  Zap,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const steps = [
  { id: 'goal', icon: Wallet },
  { id: 'timeline', icon: Clock },
  { id: 'risk', icon: AlertTriangle },
  { id: 'budget', icon: Wallet },
  { id: 'islamic', icon: Settings },
  { id: 'sectors', icon: Target },
  { id: 'level', icon: TrendingUp },
  { id: 'hear', icon: Users },
  { id: 'referral', icon: Gift },
];

const SECTORS = [
  { id: 'banks_financial', label: 'البنوك والخدمات المالية (غير مصرفية)' },
  { id: 'real_estate_construction', label: 'العقارات والإنشاءات' },
  { id: 'food_beverages', label: 'الأغذية والمشروبات والتبغ' },
  { id: 'healthcare_pharma', label: 'الرعاية الصحية والأدوية' },
  { id: 'it_media_telecom', label: 'الاتصالات والتكنولوجيا والإعلام' },
  { id: 'industrial_auto', label: 'السلع والخدمات الصناعية والسيارات' },
  { id: 'tourism_entertainment', label: 'السياحة والترفيه' },
  { id: 'basic_resources', label: 'الموارد الأساسية' },
  { id: 'utilities', label: 'المرافق' },
  { id: 'textiles_durables', label: 'المنسوجات والسلع المعمرة' },
  { id: 'diversified', label: 'متنوع' },
  { id: 'unknown', label: 'لا أعرف بعد' },
];

type TimelineChoice = 'lt1' | '1_3' | '3_7' | 'gt7';
type BudgetBand = 'lt_1000' | '1_5k' | '5_20k' | 'gt_20k';

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referralState, setReferralState] = useState<{
    checking: boolean;
    successName?: string;
    error?: string;
  }>({ checking: false });

  const [formData, setFormData] = useState({
    // step 1
    goal: '',
    // step 2
    timeline: '' as TimelineChoice | '',
    // step 3
    reaction30: '',
    // step 4
    budgetBand: '' as BudgetBand | '',
    // step 5
    shariaMode: false,
    // step 6
    sectors: [] as string[],
    // step 7
    level: '',
    // step 8
    hearAboutUs: '',
    // step 9
    referralCode: '',
  });

  const isRTL = i18n.language.startsWith('ar');

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > currentStep ? 1 : -1);
    setCurrentStep(nextStep);
  };

  const isStepValid = (stepIndex: number, data = formData) => {
    switch (stepIndex) {
      case 0:
        return data.goal !== '';
      case 1:
        return data.timeline !== '';
      case 2:
        return data.reaction30 !== '';
      case 3:
        return data.budgetBand !== '';
      case 4:
        return true; // islamic mode has explicit Next button but not strictly required
      case 5:
        return data.sectors.length > 0;
      case 6:
        return data.level !== '';
      case 7:
        // hearAboutUs is optional (there is a Skip button)
        return true;
      case 8:
        // referralCode optional; we handle via button
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      setValidationError('يرجى اختيار إجابة للمتابعة');
      return;
    }
    setValidationError(null);
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setValidationError(null);
      goToStep(currentStep - 1);
    }
  };

  const mapTimelineToYears = (choice: TimelineChoice | ''): number => {
    switch (choice) {
      case 'lt1':
        return 1;
      case '1_3':
        return 3;
      case '3_7':
        return 5;
      case 'gt7':
        return 10;
      default:
        return 5;
    }
  };

  const mapBudgetToNumber = (band: BudgetBand | ''): number => {
    switch (band) {
      case 'lt_1000':
        return 500;
      case '1_5k':
        return 3000;
      case '5_20k':
        return 10000;
      case 'gt_20k':
        return 25000;
      default:
        return 0;
    }
  };

  const mapRiskTolerance = (reaction: string): string => {
    switch (reaction) {
      case 'sell_immediately':
        return 'very_conservative';
      case 'wait_and_see':
        return 'moderate';
      case 'buy_more':
        return 'aggressive';
      case 'long_term_calm':
        return 'long_term';
      default:
        return 'moderate';
    }
  };

  const buildInvestorProfile = () => ({
    goal: formData.goal,
    timeline: formData.timeline,
    reaction30: formData.reaction30,
    budgetBand: formData.budgetBand,
    shariaMode: formData.shariaMode,
    sectors: formData.sectors,
    level: formData.level,
    hearAboutUs: formData.hearAboutUs || null,
  });

  const handleFinish = async () => {
    try {
      setSaving(true);
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          riskTolerance: mapRiskTolerance(formData.reaction30),
          investmentHorizon: mapTimelineToYears(formData.timeline || '3_7'),
          monthlyBudget: mapBudgetToNumber(formData.budgetBand || '1_5k'),
          shariaMode: formData.shariaMode,
          interestedSectors: formData.sectors,
          hearAboutUs: formData.hearAboutUs || null,
          investorProfile: buildInvestorProfile(),
          onboardingCompleted: true,
          isFirstLogin: false,
        }),
      });
      if (res.ok) {
        onComplete();
      } else {
        console.error('Failed to save onboarding', await res.text());
      }
    } catch (err) {
      console.error('Failed to save onboarding', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReferralApply = async () => {
    if (!formData.referralCode.trim()) {
      setReferralState({ checking: false, error: 'من فضلك اكتب كود الدعوة أو اضغط تخطي' });
      return;
    }
    try {
      setReferralState({ checking: true });
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch('/api/user/referral/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code: formData.referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReferralState({ checking: false, error: data.error || 'كود غير صحيح' });
        return;
      }
      setReferralState({ checking: false, successName: data.referrerName, error: undefined });
      // بعد نجاح الكود نكمل وإنهاء الـ Onboarding بعد لحظات بسيطة
      setTimeout(() => {
        handleFinish();
      }, 2000);
    } catch (err) {
      console.error('Failed to apply referral code', err);
      setReferralState({ checking: false, error: 'حدث خطأ أثناء التحقق من الكود' });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      // الخطوة 1 — هدفك
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">إيه اللي بتستثمر عشانه؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">اختر الهدف الأقرب لحلمك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'property_or_car',
                  title: 'شراء عقار أو سيارة',
                  desc: 'هدف ملموس وقابل للتحقيق',
                  icon: Home,
                },
                {
                  id: 'wealth',
                  title: 'تنمية ثروتي',
                  desc: 'خلّي فلوسك تشتغل نيابة عنك',
                  icon: TrendingUp,
                },
                {
                  id: 'retirement',
                  title: 'التقاعد المريح',
                  desc: 'ضمان مستقبلك بكره',
                  icon: Umbrella,
                },
                {
                  id: 'travel',
                  title: 'سفر ومغامرات',
                  desc: 'عيش الحياة اللي تستحقها',
                  icon: Compass,
                },
                {
                  id: 'trading',
                  title: 'أرباح سريعة',
                  desc: 'مضاربة وتداول نشط',
                  icon: Zap,
                },
                {
                  id: 'other',
                  title: 'أخرى',
                  desc: 'هدف خاص بيك',
                  icon: Plus,
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const updated = { ...formData, goal: opt.id };
                    setFormData(updated);
                    setValidationError(null);
                    // single-select → انتقال أوتوماتيك
                    if (isStepValid(0, updated)) {
                      goToStep(1);
                    }
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.goal === opt.id
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    {opt.icon && <opt.icon className="w-5 h-5 text-violet-400" />}
                    <div className="font-semibold">{opt.title}</div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 2 — الأفق الزمني
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">إمتى عايز تحقق هدفك؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">الأفق الزمني بيحدد استراتيجيتك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'lt1' as TimelineChoice,
                  title: '⚡ أقل من سنة',
                  desc: 'هدف قريب — استراتيجية محافظة',
                },
                {
                  id: '1_3' as TimelineChoice,
                  title: '📅 من 1 إلى 3 سنوات',
                  desc: 'أفق قصير — توازن بين الأمان والنمو',
                },
                {
                  id: '3_7' as TimelineChoice,
                  title: '📆 من 3 إلى 7 سنوات',
                  desc: 'متوسط الأجل — نمو تدريجي ومستقر',
                },
                {
                  id: 'gt7' as TimelineChoice,
                  title: '🏆 أكثر من 7 سنوات',
                  desc: 'طويل الأجل — أعلى عائد على المدى البعيد',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const updated = { ...formData, timeline: opt.id };
                    setFormData(updated);
                    setValidationError(null);
                    if (isStepValid(1, updated)) {
                      goToStep(2);
                    }
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.timeline === opt.id
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="font-semibold mb-1">{opt.title}</div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 3 — رد فعلك عند -30%
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">لو السهم اللي اشتريته نزل 30%...</h2>
              <p className="text-[var(--text-secondary)] text-sm">جاوب بصدق — ده بيحدد مستوى مخاطرتك الحقيقي</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  id: 'sell_immediately',
                  title: '😰 هبيع فوراً وأوقف الخسارة',
                  desc: 'سلامتي أهم من أي ربح',
                },
                {
                  id: 'wait_and_see',
                  title: '🤔 هستنى وأشوف السوق',
                  desc: 'مش هتصرف إلا لو الوضع اتضح',
                },
                {
                  id: 'buy_more',
                  title: '😎 فرصة ذهبية — هشتري أكتر',
                  desc: 'انخفاض السعر يعني صفقة أفضل',
                },
                {
                  id: 'long_term_calm',
                  title: '🧘 مش هتأثر — استثماري طويل المدى',
                  desc: 'التقلبات طبيعية ومش بتقلقني',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const updated = { ...formData, reaction30: opt.id };
                    setFormData(updated);
                    setValidationError(null);
                    if (isStepValid(2, updated)) {
                      goToStep(3);
                    }
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.reaction30 === opt.id
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="font-semibold mb-1">{opt.title}</div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 4 — الميزانية الشهرية
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">قدر تخصص كام جنيه للاستثمار شهرياً؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">مش لازم يبقى كتير — المهم الانتظام</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'lt_1000' as BudgetBand,
                  title: '🌱 أقل من 1,000 جنيه',
                  desc: 'البداية المهمة هي البداية',
                },
                {
                  id: '1_5k' as BudgetBand,
                  title: '📊 من 1,000 إلى 5,000 جنيه',
                  desc: 'مبلغ ممتاز للبناء التدريجي',
                },
                {
                  id: '5_20k' as BudgetBand,
                  title: '💼 من 5,000 إلى 20,000 جنيه',
                  desc: 'محفظة متنوعة في متناول يدك',
                },
                {
                  id: 'gt_20k' as BudgetBand,
                  title: '🚀 أكثر من 20,000 جنيه',
                  desc: 'مستثمر جاد بإمكانيات عالية',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const updated = { ...formData, budgetBand: opt.id };
                    setFormData(updated);
                    setValidationError(null);
                    if (isStepValid(3, updated)) {
                      goToStep(4);
                    }
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.budgetBand === opt.id
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="font-semibold mb-1">{opt.title}</div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 5 — وضع الشريعة الإسلامية
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">هل تفضل استثماراً متوافقاً مع الشريعة؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                لو فعّلت هذا الوضع، سنُنبّهك تلقائياً عند اختيار أي سهم قد لا يكون متوافقاً مع أحكام الشريعة
                الإسلامية
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  setFormData({ ...formData, shariaMode: true });
                  setValidationError(null);
                }}
                className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                  formData.shariaMode
                    ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="font-semibold mb-1">☑️ نعم، أفضل الاستثمار الحلال</div>
                <p className="text-xs text-[var(--text-secondary)]">سنُنبّهك قبل أي قرار غير متوافق</p>
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, shariaMode: false });
                  setValidationError(null);
                }}
                className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                  !formData.shariaMode
                    ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="font-semibold mb-1">⬜ لا، سأختار بنفسي</div>
                <p className="text-xs text-[var(--text-secondary)]">ستظهر لك جميع الأسهم بدون قيود</p>
              </button>
            </div>
          </div>
        );

      // الخطوة 6 — القطاعات
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">إيه القطاعات اللي تهمك؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">اختر واحد أو أكتر — هنخصص تجربتك</p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 bg-[var(--bg-card)]/60 rounded-2xl">
              {SECTORS.map((sector) => {
                const selected = formData.sectors.includes(sector.id);
                return (
                  <button
                    key={sector.id}
                    onClick={() => {
                      const exists = formData.sectors.includes(sector.id);
                      const sectors = exists
                        ? formData.sectors.filter((s) => s !== sector.id)
                        : [...formData.sectors, sector.id];
                      setFormData({ ...formData, sectors });
                      setValidationError(null);
                    }}
                    className={`px-4 py-2 rounded-full text-xs border transition-all ${
                      selected
                        ? 'bg-violet-500 border-violet-500 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-secondary)] border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    {sector.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      // الخطوة 7 — مستوى الاستثمار
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">بعد كل اللي قلته... إيه مستواك الحقيقي؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">خلّيك صريح مع نفسك</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  id: 'beginner',
                  title: '🐣 مبتدئ تماماً',
                  desc: 'لسه بتعلم وعندي أسئلة كتير',
                },
                {
                  id: 'basics',
                  title: '📚 بعرف الأساسيات',
                  desc: 'فاهم المفاهيم الأساسية وبدأت أجرب',
                },
                {
                  id: 'intermediate',
                  title: '📈 متوسط',
                  desc: 'عندي تجربة وبستثمر بانتظام',
                },
                {
                  id: 'advanced',
                  title: '🎯 متقدم',
                  desc: 'خبرة واسعة وبتداول بثقة',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const updated = { ...formData, level: opt.id };
                    setFormData(updated);
                    setValidationError(null);
                    if (isStepValid(6, updated)) {
                      goToStep(7);
                    }
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.level === opt.id
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="font-semibold mb-1">{opt.title}</div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 8 — كيف سمعت عنا؟
      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">كيف سمعت عن EGX Pro؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">اختر المصدر الأقرب (اختياري)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'من صديق أو معارف',
                'فيسبوك أو إنستجرام',
                'إعلان ممول',
                'بحث على جوجل',
                'يوتيوب أو محتوى',
                'أخرى',
              ].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setFormData({ ...formData, hearAboutUs: option });
                    setValidationError(null);
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all bg-[var(--bg-card)]/60 hover:bg-[var(--bg-secondary)]/70 ${
                    formData.hearAboutUs === option
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      // الخطوة 9 — كود الدعوة
      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">هل دعاك أحد للانضمام؟</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                اكتب كود الدعوة إن وجد — اختياري
              </p>
            </div>
            <div className="space-y-4">
              <Input
                type="text"
                value={formData.referralCode}
                onChange={(e) => {
                  setFormData({ ...formData, referralCode: e.target.value.toUpperCase() });
                  setReferralState({ checking: false });
                }}
                placeholder="مثال: EGX-A7K2M"
                inputClassName="text-center text-lg tracking-[0.2em]"
              />
              {referralState.successName && (
                <p className="text-sm text-emerald-400 text-center">
                  تم! انضممت عن طريق دعوة {referralState.successName}
                </p>
              )}
              {referralState.error && (
                <p className="text-sm text-red-400 text-center">{referralState.error}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button type="button" variant="primary" size="lg" fullWidth onClick={handleReferralApply} disabled={referralState.checking}>
                  {referralState.checking ? 'جاري التحقق...' : 'تأكيد وابدأ'}
                </Button>
                <Button type="button" variant="secondary" size="lg" fullWidth onClick={handleFinish}>
                  تخطي وابدأ
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 text-[var(--text-primary)] font-sans">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-violet-500 w-6 h-6" />
            <span className="font-bold text-lg">EGX Pro</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                index <= currentStep ? 'bg-violet-500' : 'bg-[var(--bg-secondary)]'
              }`}
            />
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: direction === 1 ? (isRTL ? -40 : 40) : (isRTL ? 40 : -40) }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === 1 ? (isRTL ? 40 : -40) : (isRTL ? -40 : 40) }}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl min-h-[460px] flex flex-col"
        >
          <div className="flex-1">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-violet-500/10 rounded-2xl">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="w-8 h-8 text-violet-500" />;
                })()}
              </div>
            </div>
            {renderStep()}
          </div>

          <div className="flex justify-between mt-10 pt-6 border-t border-[var(--border)]">
            <Button variant="ghost" size="md" onClick={handleBack} disabled={currentStep === 0} icon={isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />} iconPosition="left" className={currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}>
              {isRTL ? 'السابق' : 'Back'}
            </Button>
            <div className="flex flex-col items-end gap-2">
              {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
              {currentStep < steps.length - 1 && (
                <Button variant="primary" size="md" onClick={handleNext} icon={isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />} iconPosition="right">
                  {isRTL ? 'التالي' : 'Next'}
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button variant="primary" size="md" disabled={saving} onClick={handleFinish}>
                  {saving ? 'جارٍ الحفظ...' : 'تخطي وابدأ'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
