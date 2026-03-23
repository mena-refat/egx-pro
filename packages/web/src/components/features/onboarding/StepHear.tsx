import { Users, Share2, Megaphone, Search, Play, MoreHorizontal } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';
import type { ElementType } from 'react';

const OPTIONS: { ar: string; en: string; icon: ElementType }[] = [
  { ar: 'من صديق أو معارف',   en: 'From a friend',         icon: Users          },
  { ar: 'فيسبوك أو إنستجرام', en: 'Facebook or Instagram', icon: Share2         },
  { ar: 'إعلان ممول',         en: 'Paid ad',               icon: Megaphone      },
  { ar: 'بحث على جوجل',       en: 'Google search',         icon: Search         },
  { ar: 'يوتيوب أو محتوى',    en: 'YouTube or content',    icon: Play           },
  { ar: 'أخرى',               en: 'Other',                 icon: MoreHorizontal },
];

interface Props { formData: FormData; isAr: boolean; onToggle: (v: string) => void; }

export function StepHear({ formData, isAr, onToggle }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'كيف سمعت عن Borsa؟' : 'How did you hear about Borsa?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'ممكن تختار أكتر من إجابة' : 'You can select multiple answers'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map(({ ar, en, icon }) => {
          const label = isAr ? ar : en;
          return (
            <OptionCard
              key={ar}
              id={ar}
              title={label}
              icon={icon}
              selected={formData.hearAboutUs.includes(ar)}
              onClick={() => onToggle(ar)}
            />
          );
        })}
      </div>
    </div>
  );
}
