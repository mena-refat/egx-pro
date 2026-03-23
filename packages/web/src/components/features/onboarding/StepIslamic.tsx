import { Globe, Star } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';

interface Props { formData: FormData; isAr: boolean; onSelect: (v: boolean) => void; }

export function StepIslamic({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'كيف تفضل اختيار أسهمك؟' : 'How do you prefer to pick stocks?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'سنخصص توصياتنا بناءً على أسلوبك' : "We'll tailor our recommendations to your style"}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <OptionCard
          id="all"
          title={isAr ? 'أختار من جميع الأسهم المتاحة' : 'All available stocks'}
          desc={isAr ? 'حرية كاملة في الاختيار بدون قيود' : 'Full freedom to choose with no restrictions'}
          icon={Globe}
          selected={formData.shariaMode === false}
          onClick={() => onSelect(false)}
        />
        <OptionCard
          id="sharia"
          title={isAr ? 'أُفضّل الأسهم المتوافقة مع الشريعة' : 'Sharia-compliant stocks only'}
          desc={isAr ? 'سننبهك تلقائياً عند اختيار أي سهم غير متوافق' : "We'll alert you if a stock isn't Sharia-compliant"}
          icon={Star}
          selected={formData.shariaMode === true}
          onClick={() => onSelect(true)}
        />
      </div>
    </div>
  );
}
