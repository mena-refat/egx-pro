import { Check } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';

interface DiscountSectionProps {
  showDiscount: boolean;
  discountCode: string;
  discountCodeError: string | null;
  discountPercent: number | null;
  validating: boolean;
  onShowDiscount: () => void;
  onCodeChange: (value: string) => void;
  onValidate: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export function DiscountSection({
  showDiscount, discountCode, discountCodeError, discountPercent, validating,
  onShowDiscount, onCodeChange, onValidate, t,
}: DiscountSectionProps) {
  if (!showDiscount) {
    return (
      <button
        type="button"
        onClick={onShowDiscount}
        className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium underline underline-offset-2 transition-colors"
      >
        {t('billing.hasDiscount')}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
      <div className="flex gap-2 w-full">
        <Input
          value={discountCode}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={t('billing.placeholderCode', { defaultValue: 'XXXXXXXXXXXXXXXXXX' })}
          wrapperClassName="flex-1"
          inputClassName="flex-1 rounded-xl font-mono tracking-wider"
          maxLength={30}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onValidate}
          loading={validating}
          disabled={validating || discountCode.length < 18}
          className="rounded-xl h-12 font-semibold"
        >
          {t('billing.applyCode')}
        </Button>
      </div>
      {discountCodeError && (
        <p className="text-[var(--danger)] text-xs w-full text-start">{discountCodeError}</p>
      )}
      {discountCode.length > 0 && !discountCodeError && (
        <p className="text-[var(--text-muted)] text-xs w-full text-start">{discountCode.length}/30</p>
      )}
      {discountPercent != null && (
        <div className="flex items-center gap-2 text-[var(--success)] text-sm font-medium">
          <Check className="w-4 h-4" aria-hidden />
          <span>{t('billing.codeSuccess')}</span>
        </div>
      )}
    </div>
  );
}
