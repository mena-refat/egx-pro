import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { FormData } from './types';

interface ReferralState {
  checking: boolean;
  successName?: string;
  error?: string;
}

interface Props {
  formData: FormData;
  isAr: boolean;
  referralState: ReferralState;
  saving: boolean;
  finishError: string | null;
  onCodeChange: (v: string) => void;
  onApply: () => void;
  onSkip: () => void;
}

export function StepReferral({ formData, isAr, referralState, saving, finishError, onCodeChange, onApply, onSkip }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'هل دعاك أحد للانضمام؟' : 'Were you referred by someone?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'اكتب كود الدعوة إن وجد — اختياري' : 'Enter a referral code if you have one — optional'}</p>
      </div>
      <div className="space-y-4">
        <Input
          type="text"
          value={formData.referralCode}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder={isAr ? 'مثال: EGX-A7K2M' : 'e.g. EGX-A7K2M'}
          inputClassName="text-center text-lg tracking-[0.2em]"
        />
        {referralState.successName && (
          <p className="text-sm text-[var(--success)] text-center">
            {isAr ? `تم! انضممت عن طريق دعوة ${referralState.successName}` : `Done! You joined via ${referralState.successName}'s referral`}
          </p>
        )}
        {referralState.error && (
          <p className="text-sm text-[var(--danger)] text-center">{referralState.error}</p>
        )}
        {finishError && (
          <p className="text-sm text-[var(--danger)] text-center" role="alert">{finishError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button type="button" variant="primary" size="lg" fullWidth onClick={onApply} disabled={referralState.checking || saving}>
            {referralState.checking
              ? (isAr ? 'جاري التحقق...' : 'Verifying...')
              : (isAr ? 'تأكيد وابدأ' : 'Confirm & Start')}
          </Button>
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onSkip} disabled={saving}>
            {saving
              ? (isAr ? 'جارٍ الحفظ...' : 'Saving...')
              : (isAr ? 'تخطي وابدأ' : 'Skip & Start')}
          </Button>
        </div>
      </div>
    </div>
  );
}
