import { Home, TrendingUp, Umbrella, Compass, Zap, Plus } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'property_or_car', ar: 'شراء عقار أو سيارة',  en: 'Buy property or a car',      arDesc: 'هدف ملموس وقابل للتحقيق',           enDesc: 'A tangible, achievable goal',          icon: Home      },
  { id: 'wealth',          ar: 'تنمية ثروتي',           en: 'Grow my wealth',              arDesc: 'خلّي فلوسك تشتغل نيابة عنك',          enDesc: 'Make your money work for you',         icon: TrendingUp },
  { id: 'retirement',      ar: 'التقاعد المريح',         en: 'Comfortable retirement',      arDesc: 'ضمان مستقبلك بكره',                  enDesc: 'Secure your future',                   icon: Umbrella  },
  { id: 'travel',          ar: 'سفر ومغامرات',          en: 'Travel & adventures',         arDesc: 'عيش الحياة اللي تستحقها',             enDesc: 'Live the life you deserve',            icon: Compass   },
  { id: 'trading',         ar: 'أرباح سريعة',           en: 'Quick profits',               arDesc: 'مضاربة وتداول نشط',                  enDesc: 'Active trading & speculation',         icon: Zap       },
  { id: 'other',           ar: 'أخرى',                  en: 'Other',                       arDesc: 'هدف خاص بيك',                        enDesc: 'A goal unique to you',                 icon: Plus      },
];

interface Props { formData: FormData; isAr: boolean; onSelect: (goal: string) => void; }

export function StepGoal({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'إيه اللي بتستثمر عشانه؟' : 'What are you investing for?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'اختر الهدف الأقرب لحلمك' : 'Choose the goal closest to your dream'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            id={opt.id}
            title={isAr ? opt.ar : opt.en}
            desc={isAr ? opt.arDesc : opt.enDesc}
            icon={opt.icon}
            selected={formData.goal === opt.id}
            onClick={() => onSelect(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
