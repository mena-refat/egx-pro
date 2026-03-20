import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'beginner', title: '🐣 مبتدئ تماماً', desc: 'لسه بتعلم وعندي أسئلة كتير' },
  { id: 'basics', title: '📚 بعرف الأساسيات', desc: 'فاهم المفاهيم الأساسية وبدأت أجرب' },
  { id: 'intermediate', title: '📈 متوسط', desc: 'عندي تجربة وبستثمر بانتظام' },
  { id: 'advanced', title: '🎯 متقدم', desc: 'خبرة واسعة وبتداول بثقة' },
];

interface Props { formData: FormData; onSelect: (v: string) => void; }

export function StepLevel({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">بعد كل اللي قلته... إيه مستواك الحقيقي؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">خلّيك صريح مع نفسك</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={opt.title} desc={opt.desc} selected={formData.level === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
