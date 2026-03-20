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
  referralState: ReferralState;
  saving: boolean;
  finishError: string | null;
  onCodeChange: (v: string) => void;
  onApply: () => void;
  onSkip: () => void;
}

export function StepReferral({ formData, referralState, saving, finishError, onCodeChange, onApply, onSkip }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">هل دعاك أحد للانضمام؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">اكتب كود الدعوة إن وجد — اختياري</p>
      </div>
      <div className="space-y-4">
        <Input
          type="text"
          value={formData.referralCode}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder="مثال: EGX-A7K2M"
          inputClassName="text-center text-lg tracking-[0.2em]"
        />
        {referralState.successName && (
          <p className="text-sm text-[var(--success)] text-center">
            تم! انضممت عن طريق دعوة {referralState.successName}
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
            {referralState.checking ? 'جاري التحقق...' : 'تأكيد وابدأ'}
          </Button>
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onSkip} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'تخطي وابدأ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
