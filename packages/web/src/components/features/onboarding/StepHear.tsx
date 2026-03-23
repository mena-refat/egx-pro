import { Users, Share2, Megaphone, Search, Play, MoreHorizontal } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';
import type { ElementType } from 'react';

const OPTIONS: { label: string; icon: ElementType }[] = [
  { label: 'من صديق أو معارف',   icon: Users          },
  { label: 'فيسبوك أو إنستجرام', icon: Share2         },
  { label: 'إعلان ممول',         icon: Megaphone      },
  { label: 'بحث على جوجل',       icon: Search         },
  { label: 'يوتيوب أو محتوى',    icon: Play           },
  { label: 'أخرى',               icon: MoreHorizontal },
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
        {OPTIONS.map(({ label, icon }) => (
          <OptionCard
            key={label}
            id={label}
            title={label}
            icon={icon}
            selected={formData.hearAboutUs.includes(label)}
            onClick={() => onToggle(label)}
          />
        ))}
      </div>
    </div>
  );
}
