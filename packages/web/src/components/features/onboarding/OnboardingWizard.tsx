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
    case 4: return data.shariaMode !== null;
    case 5: return data.sectors.length > 0;
    case 6: return data.level !== '';
    case 7: return data.hearAboutUs.length > 0;
    default: return true;
  }
}

const INITIAL_FORM: FormData = {
  goal: '', timeline: '', reaction30: '', budgetBand: '',
  shariaMode: null, sectors: [], level: '', hearAboutUs: [], referralCode: '',
};

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation('common');
  const isAr = i18n.language.startsWith('ar');
  const isRTL = isAr;

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referralState, setReferralState] = useState<{ checking: boolean; successName?: string; error?: string }>({ checking: false });
  const [finishError, setFinishError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current); }, []);

  const goToStep = (next: number) => {
    setDirection(next > currentStep ? 1 : -1);
    setCurrentStep(next);
  };

  // called by single-select steps — auto-advances if valid
  const advance = (updatedData: FormData, stepIndex: number) => {
    setFormData(updatedData);
    setValidationError(null);
    if (isStepValid(stepIndex, updatedData)) {
      setTimeout(() => goToStep(stepIndex + 1), 120); // tiny delay feels intentional
    }
  };

  const handleNext = () => {
    if (!isStepValid(currentStep, formData)) {
      setValidationError(isAr ? 'يرجى اختيار إجابة للمتابعة' : 'Please select an answer to continue');
      return;
    }
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
      if (!accessToken) { setFinishError(isAr ? 'يجب تسجيل الدخول أولاً' : 'Please log in first'); return; }
      const payload: Record<string, unknown> = {
        riskTolerance: mapRiskTolerance(formData.reaction30),
        investmentHorizon: mapTimelineToYears(formData.timeline || '3_7'),
        monthlyBudget: mapBudgetToNumber(formData.budgetBand || '1_5k'),
        shariaMode: formData.shariaMode ?? false,
        interestedSectors: formData.sectors,
        investorProfile: {
          goal: formData.goal, timeline: formData.timeline, reaction30: formData.reaction30,
          budgetBand: formData.budgetBand, shariaMode: formData.shariaMode ?? false, sectors: formData.sectors,
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
        setFinishError(
          errJson.error === 'VALIDATION_ERROR'
            ? (isAr ? 'البيانات المرسلة غير صحيحة. حاول مرة أخرى.' : 'Invalid data. Please try again.')
            : (isAr ? 'فشل حفظ البيانات. حاول مرة أخرى.' : 'Failed to save. Please try again.')
        );
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save onboarding', err);
      setFinishError(isAr ? 'حدث خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.' : 'Connection error. Check your internet and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReferralApply = async () => {
    if (!formData.referralCode.trim()) {
      setReferralState({ checking: false, error: isAr ? 'من فضلك اكتب كود الدعوة أو اضغط تخطي' : 'Please enter a referral code or skip' });
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
      if (!res.ok) { setReferralState({ checking: false, error: (data as { error?: string }).error || (isAr ? 'كود غير صحيح' : 'Invalid code') }); return; }
      const referrerName = (data as { data?: { referrerName?: string }; referrerName?: string }).data?.referrerName ?? (data as { referrerName?: string }).referrerName;
      setReferralState({ checking: false, successName: referrerName, error: undefined });
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = setTimeout(() => { handleFinish(); finishTimeoutRef.current = null; }, TIMEOUTS.successFeedback);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to apply referral code', err);
      setReferralState({ checking: false, error: isAr ? 'حدث خطأ أثناء التحقق من الكود' : 'Error verifying code' });
    }
  };

  // Steps that auto-advance on selection (single-select)
  const AUTO_ADVANCE_STEPS = new Set([0, 1, 2, 3, 4, 6]);
  const isMultiSelect = !AUTO_ADVANCE_STEPS.has(currentStep) && currentStep !== STEPS.length - 1;

  const stepContent = [
    <StepGoal     isAr={isAr} formData={formData} onSelect={(goal)       => advance({ ...formData, goal }, 0)} />,
    <StepTimeline isAr={isAr} formData={formData} onSelect={(timeline)   => advance({ ...formData, timeline }, 1)} />,
    <StepRisk     isAr={isAr} formData={formData} onSelect={(reaction30) => advance({ ...formData, reaction30 }, 2)} />,
    <StepBudget   isAr={isAr} formData={formData} onSelect={(budgetBand) => advance({ ...formData, budgetBand }, 3)} />,
    <StepIslamic  isAr={isAr} formData={formData} onSelect={(shariaMode) => advance({ ...formData, shariaMode }, 4)} />,
    <StepSectors  isAr={isAr} formData={formData} onToggle={(id) => {
      const sectors = formData.sectors.includes(id) ? formData.sectors.filter((s) => s !== id) : [...formData.sectors, id];
      setFormData({ ...formData, sectors });
      setValidationError(null);
    }} />,
    <StepLevel isAr={isAr} formData={formData} onSelect={(level) => advance({ ...formData, level }, 6)} />,
    <StepHear  isAr={isAr} formData={formData} onToggle={(v) => {
      const current = formData.hearAboutUs;
      const updated = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      setFormData({ ...formData, hearAboutUs: updated });
      setValidationError(null);
    }} />,
    <StepReferral
      isAr={isAr}
      formData={formData}
      referralState={referralState}
      saving={saving}
      finishError={finishError}
      onCodeChange={(referralCode) => { setFormData({ ...formData, referralCode }); setReferralState({ checking: false }); }}
      onApply={handleReferralApply}
      onSkip={handleFinish}
    />,
  ];

  const isLastStep = currentStep === STEPS.length - 1;
  const slideOffset = isRTL ? -40 : 40;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 text-[var(--text-primary)] font-sans"
    >
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/borsa-logo.webp" alt="" width={28} height={28} className="w-7 h-7 shrink-0 object-contain" aria-hidden loading="lazy" />
          <span className="font-bold text-xl tracking-tight">Borsa</span>
        </div>

        {/* Progress bar + step counter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {isAr ? `الخطوة ${currentStep + 1} من ${STEPS.length}` : `Step ${currentStep + 1} of ${STEPS.length}`}
            </span>
            {isMultiSelect && (
              <span className="text-xs text-[var(--text-muted)]">
                {isAr ? 'اختيار متعدد' : 'Multi-select'}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  index < currentStep  ? 'bg-[var(--brand)]' :
                  index === currentStep ? 'bg-[var(--brand)] opacity-60' :
                  'bg-[var(--bg-secondary)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: direction === 1 ? slideOffset : -slideOffset }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Step icon header */}
          <div className="flex justify-center pt-8 pb-2">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center">
              {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="w-7 h-7 text-[var(--brand)]" />; })()}
            </div>
          </div>

          {/* Step content */}
          <div className="px-6 pb-6 pt-2">
            {stepContent[currentStep]}
          </div>

          {/* Footer nav — hidden for auto-advance single-select steps (except last) */}
          {(isMultiSelect || isLastStep) ? null : (
            <div className="px-6 pb-6 flex justify-between items-center gap-3 border-t border-[var(--border)] pt-4">
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                disabled={currentStep === 0}
                icon={isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                iconPosition="left"
                className={currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}
              >
                {isAr ? 'السابق' : 'Back'}
              </Button>
              <span className="text-xs text-[var(--text-muted)]">
                {isAr ? 'اختر للمتابعة تلقائياً' : 'Select to continue'}
              </span>
            </div>
          )}

          {/* Multi-select footer */}
          {isMultiSelect && (
            <div className="px-6 pb-6 pt-4 border-t border-[var(--border)] flex justify-between items-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                icon={isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                iconPosition="left"
              >
                {isAr ? 'السابق' : 'Back'}
              </Button>
              <div className="flex flex-col items-end gap-1.5">
                {validationError && (
                  <p className="text-[var(--danger)] text-xs">{validationError}</p>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  icon={isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  {isAr ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
