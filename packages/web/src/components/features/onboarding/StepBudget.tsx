import { OptionCard } from './OptionCard';
import { FormData, BudgetBand } from './types';

const OPTIONS: { id: BudgetBand; title: string; desc: string }[] = [
  { id: 'lt_1000', title: '🌱 أقل من 1,000 جنيه', desc: 'البداية المهمة هي البداية' },
  { id: '1_5k', title: '📊 من 1,000 إلى 5,000 جنيه', desc: 'مبلغ ممتاز للبناء التدريجي' },
  { id: '5_20k', title: '💼 من 5,000 إلى 20,000 جنيه', desc: 'محفظة متنوعة في متناول يدك' },
  { id: 'gt_20k', title: '🚀 أكثر من 20,000 جنيه', desc: 'مستثمر جاد بإمكانيات عالية' },
];

interface Props { formData: FormData; onSelect: (v: BudgetBand) => void; }

export function StepBudget({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">قدر تخصص كام جنيه للاستثمار شهرياً؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">مش لازم يبقى كتير — المهم الانتظام</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={opt.title} desc={opt.desc} selected={formData.budgetBand === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
