import { Sprout, BarChart, Briefcase, Rocket } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData, BudgetBand } from './types';

const OPTIONS: { id: BudgetBand; ar: string; en: string; arDesc: string; enDesc: string; icon: React.ElementType }[] = [
  { id: 'lt_1000', ar: 'أقل من 1,000 جنيه',        en: 'Less than EGP 1,000',   arDesc: 'البداية المهمة هي البداية',      enDesc: 'Every journey starts somewhere',   icon: Sprout    },
  { id: '1_5k',   ar: 'من 1,000 إلى 5,000 جنيه',   en: 'EGP 1,000 – 5,000',     arDesc: 'مبلغ ممتاز للبناء التدريجي',    enDesc: 'Great for steady growth',          icon: BarChart  },
  { id: '5_20k',  ar: 'من 5,000 إلى 20,000 جنيه',  en: 'EGP 5,000 – 20,000',    arDesc: 'محفظة متنوعة في متناول يدك',    enDesc: 'Build a diversified portfolio',    icon: Briefcase },
  { id: 'gt_20k', ar: 'أكثر من 20,000 جنيه',        en: 'More than EGP 20,000',  arDesc: 'مستثمر جاد بإمكانيات عالية',   enDesc: 'Serious investor, high potential', icon: Rocket   },
];

import React from 'react';

interface Props { formData: FormData; isAr: boolean; onSelect: (v: BudgetBand) => void; }

export function StepBudget({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'قدر تخصص كام جنيه للاستثمار شهرياً؟' : 'How much can you invest monthly?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'مش لازم يبقى كتير — المهم الانتظام' : "It doesn't have to be much — consistency is key"}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={isAr ? opt.ar : opt.en} desc={isAr ? opt.arDesc : opt.enDesc} icon={opt.icon} selected={formData.budgetBand === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
