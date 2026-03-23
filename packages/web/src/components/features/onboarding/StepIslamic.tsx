import { OptionCard } from './OptionCard';
import { FormData } from './types';

interface Props { formData: FormData; onSelect: (v: boolean) => void; }

export function StepIslamic({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">كيف تفضل اختيار أسهمك؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">
          سنخصص توصياتنا بناءً على أسلوبك
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <OptionCard
          id="all"
          title="🌍 أختار من جميع الأسهم المتاحة"
          desc="حرية كاملة في الاختيار بدون قيود"
          selected={!formData.shariaMode}
          onClick={() => onSelect(false)}
        />
        <OptionCard
          id="sharia"
          title="☪️ أُفضّل الأسهم المتوافقة مع الشريعة"
          desc="سننبهك تلقائياً عند اختيار أي سهم غير متوافق"
          selected={formData.shariaMode}
          onClick={() => onSelect(true)}
        />
      </div>
    </div>
  );
}
