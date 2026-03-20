import { OptionCard } from './OptionCard';
import { FormData } from './types';

interface Props { formData: FormData; onSelect: (v: boolean) => void; }

export function StepIslamic({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">هل تفضل استثماراً متوافقاً مع الشريعة؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">
          لو فعّلت هذا الوضع، سنُنبّهك تلقائياً عند اختيار أي سهم قد لا يكون متوافقاً مع أحكام الشريعة الإسلامية
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <OptionCard
          id="yes"
          title="☑️ نعم، أفضل الاستثمار الحلال"
          desc="سنُنبّهك قبل أي قرار غير متوافق"
          selected={formData.shariaMode}
          onClick={() => onSelect(true)}
        />
        <OptionCard
          id="no"
          title="⬜ لا، سأختار بنفسي"
          desc="ستظهر لك جميع الأسهم بدون قيود"
          selected={!formData.shariaMode}
          onClick={() => onSelect(false)}
        />
      </div>
    </div>
  );
}
