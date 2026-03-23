import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { TIMEOUTS } from '../../../lib/constants';
import { Button } from '../../ui/Button';
import { StepGoal } from './StepGoal';
import { StepTimeline } from './StepTimeline';
import { StepRisk } from './StepRisk';
import { StepBudget } from './StepBudget';
import { StepIslamic } from './StepIslamic';
import { StepSectors } from './StepSectors';
import { StepLevel } from './StepLevel';
import { StepHear } from './StepHear';
import { StepReferral } from './StepReferral';
import { STEPS, FormData, TimelineChoice, BudgetBand } from './types';

function mapTimelineToYears(choice: TimelineChoice | ''): number {
  switch (choice) {
    case 'lt1': return 1;
    case '1_3': return 3;
    case '3_7': return 5;
    case 'gt7': return 10;
    default: return 5;
  }
}

function mapBudgetToNumber(band: BudgetBand | ''): number {
  switch (band) {
    case 'lt_1000': return 500;
    case '1_5k': return 3000;
    case '5_20k': return 10000;
    case 'gt_20k': return 25000;
    default: return 0;
  }
}

function mapRiskTolerance(reaction: string): 'conservative' | 'moderate' | 'aggressive' {
  switch (reaction) {
    case 'sell_immediately': return 'conservative';
    case 'buy_more': return 'aggressive';
    default: return 'moderate';
  }
}

function isStepValid(stepIndex: number, data: FormData): boolean {
  switch (stepIndex) {
    case 0: return data.goal !== '';
    case 1: return data.timeline !== '';
    case 2: return data.reaction30 !== '';
    case 3: return data.budgetBand !== '';
    case 5: return data.sectors.length > 0;
    case 6: return data.level !== '';
    case 7: return data.hearAboutUs.length > 0;
    default: return true;
  }
}

const INITIAL_FORM: FormData = {
  goal: '', timeline: '', reaction30: '', budgetBand: '',
  shariaMode: false, sectors: [], level: '', hearAboutUs: [], referralCode: '',
};

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referralState, setReferralState] = useState<{ checking: boolean; successName?: string; error?: string }>({ checking: false });
  const [finishError, setFinishError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRTL = i18n.language.startsWith('ar');

  useEffect(() => () => { if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current); }, []);

  const goToStep = (next: number) => {
    setDirection(next > currentStep ? 1 : -1);
    setCurrentStep(next);
  };

  const advance = (updatedData: FormData, stepIndex: number) => {
    setFormData(updatedData);
    setValidationError(null);
    if (isStepValid(stepIndex, updatedData)) goToStep(stepIndex + 1);
  };

  const handleNext = () => {
    if (!isStepValid(currentStep, formData)) { setValidationError('يرجى اختيار إجابة للمتابعة'); return; }
    setValidationError(null);
    if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (currentStep > 0) { setValidationError(null); goToStep(currentStep - 1); }
  };

  const handleFinish = async () => {
    setFinishError(null);
    try {
      setSaving(true);
      const accessToken = useAuthStore.getState().accessToken;
      if (!accessToken) { setFinishError('يجب تسجيل الدخول أولاً'); return; }
      const payload: Record<string, unknown> = {
        riskTolerance: mapRiskTolerance(formData.reaction30),
        investmentHorizon: mapTimelineToYears(formData.timeline || '3_7'),
        monthlyBudget: mapBudgetToNumber(formData.budgetBand || '1_5k'),
        shariaMode: formData.shariaMode,
        interestedSectors: formData.sectors,
        investorProfile: {
          goal: formData.goal, timeline: formData.timeline, reaction30: formData.reaction30,
          budgetBand: formData.budgetBand, shariaMode: formData.shariaMode, sectors: formData.sectors,
          level: formData.level, hearAboutUs: formData.hearAboutUs.length ? formData.hearAboutUs.join(', ') : null,
        },
        onboardingCompleted: true,
        isFirstLogin: false,
      };
      if (formData.hearAboutUs.length) payload.hearAboutUs = formData.hearAboutUs.join(', ');

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onComplete();
      } else {
        const errBody = await res.text();
        let errJson: { error?: string; details?: unknown } = {};
        try { errJson = JSON.parse(errBody) as typeof errJson; } catch { /* non-JSON */ }
        if (import.meta.env.DEV) console.error('Onboarding save failed', { status: res.status, ...errJson });
        setFinishError(errJson.error === 'VALIDATION_ERROR' ? 'البيانات المرسلة غير صحيحة. حاول مرة أخرى أو أعد تحميل الصفحة.' : 'فشل حفظ البيانات. حاول مرة أخرى.');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save onboarding', err);
      setFinishError('حدث خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.');
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ code: formData.referralCode }),
      });
      const data = await res.json();
      if (!res.ok) { setReferralState({ checking: false, error: (data as { error?: string }).error || 'كود غير صحيح' }); return; }
      const referrerName = (data as { data?: { referrerName?: string }; referrerName?: string }).data?.referrerName ?? (data as { referrerName?: string }).referrerName;
      setReferralState({ checking: false, successName: referrerName, error: undefined });
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = setTimeout(() => { handleFinish(); finishTimeoutRef.current = null; }, TIMEOUTS.successFeedback);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to apply referral code', err);
      setReferralState({ checking: false, error: 'حدث خطأ أثناء التحقق من الكود' });
    }
  };

  const stepContent = [
    <StepGoal formData={formData} onSelect={(goal) => advance({ ...formData, goal }, 0)} />,
    <StepTimeline formData={formData} onSelect={(timeline) => advance({ ...formData, timeline }, 1)} />,
    <StepRisk formData={formData} onSelect={(reaction30) => advance({ ...formData, reaction30 }, 2)} />,
    <StepBudget formData={formData} onSelect={(budgetBand) => advance({ ...formData, budgetBand }, 3)} />,
    <StepIslamic formData={formData} onSelect={(shariaMode) => setFormData({ ...formData, shariaMode })} />,
    <StepSectors formData={formData} onToggle={(id) => {
      const sectors = formData.sectors.includes(id) ? formData.sectors.filter((s) => s !== id) : [...formData.sectors, id];
      setFormData({ ...formData, sectors });
      setValidationError(null);
    }} />,
    <StepLevel formData={formData} onSelect={(level) => advance({ ...formData, level }, 6)} />,
    <StepHear formData={formData} onToggle={(v) => {
      const current = formData.hearAboutUs;
      const updated = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      setFormData({ ...formData, hearAboutUs: updated });
    }} />,
    <StepReferral
      formData={formData}
      referralState={referralState}
      saving={saving}
      finishError={finishError}
      onCodeChange={(referralCode) => { setFormData({ ...formData, referralCode }); setReferralState({ checking: false }); }}
      onApply={handleReferralApply}
      onSkip={handleFinish}
    />,
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 text-[var(--text-primary)] font-sans">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <img src="/borsa-logo.webp" alt="" width={24} height={24} className="w-6 h-6 shrink-0 object-contain" aria-hidden loading="lazy" />
            <span className="font-bold text-lg">Borsa</span>
          </div>
        </div>

        <div className="flex gap-2 mb-10">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index <= currentStep ? 'bg-[var(--brand)]' : 'bg-[var(--bg-secondary)]'}`}
            />
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: direction === 1 ? (isRTL ? -40 : 40) : (isRTL ? 40 : -40) }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl min-h-[460px] flex flex-col"
        >
          <div className="flex-1">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-[var(--brand)]/10 rounded-2xl">
                {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="w-8 h-8 text-[var(--brand)]" />; })()}
              </div>
            </div>
            {stepContent[currentStep]}
          </div>

          <div className="flex justify-between mt-10 pt-6 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              size="md"
              onClick={handleBack}
              disabled={currentStep === 0}
              icon={isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              iconPosition="left"
              className={currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}
            >
              {isRTL ? 'السابق' : 'Back'}
            </Button>
            <div className="flex flex-col items-end gap-2">
              {validationError && <p className="text-[var(--danger)] text-xs">{validationError}</p>}
              {currentStep < STEPS.length - 1 && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  icon={isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  iconPosition="right"
                >
                  {isRTL ? 'التالي' : 'Next'}
                </Button>
              )}
              {currentStep === STEPS.length - 1 && (
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
