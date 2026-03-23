import { Zap, CalendarDays, CalendarRange, Trophy } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData, TimelineChoice } from './types';

const OPTIONS: { id: TimelineChoice; ar: string; en: string; arDesc: string; enDesc: string; icon: React.ElementType }[] = [
  { id: 'lt1', ar: 'أقل من سنة',        en: 'Less than 1 year',  arDesc: 'هدف قريب — استراتيجية محافظة',             enDesc: 'Short-term — conservative strategy',    icon: Zap          },
  { id: '1_3', ar: 'من 1 إلى 3 سنوات', en: '1 – 3 years',       arDesc: 'أفق قصير — توازن بين الأمان والنمو',       enDesc: 'Short horizon — balance safety & growth', icon: CalendarDays  },
  { id: '3_7', ar: 'من 3 إلى 7 سنوات', en: '3 – 7 years',       arDesc: 'متوسط الأجل — نمو تدريجي ومستقر',          enDesc: 'Mid-term — steady, gradual growth',      icon: CalendarRange },
  { id: 'gt7', ar: 'أكثر من 7 سنوات',  en: 'More than 7 years', arDesc: 'طويل الأجل — أعلى عائد على المدى البعيد',  enDesc: 'Long-term — highest return potential',   icon: Trophy        },
];

import React from 'react';

interface Props { formData: FormData; isAr: boolean; onSelect: (v: TimelineChoice) => void; }

export function StepTimeline({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'إمتى عايز تحقق هدفك؟' : 'When do you want to reach your goal?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'الأفق الزمني بيحدد استراتيجيتك' : 'Your time horizon defines your strategy'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={isAr ? opt.ar : opt.en} desc={isAr ? opt.arDesc : opt.enDesc} icon={opt.icon} selected={formData.timeline === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
