import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  'من صديق أو معارف',
  'فيسبوك أو إنستجرام',
  'إعلان ممول',
  'بحث على جوجل',
  'يوتيوب أو محتوى',
  'أخرى',
];

interface Props { formData: FormData; onToggle: (v: string) => void; }

export function StepHear({ formData, onToggle }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">كيف سمعت عن Borsa؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">ممكن تختار أكتر من إجابة</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((option) => (
          <OptionCard
            key={option}
            id={option}
            title={option}
            selected={formData.hearAboutUs.includes(option)}
            onClick={() => onToggle(option)}
          />
        ))}
      </div>
    </div>
  );
}
