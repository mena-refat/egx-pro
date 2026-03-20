import { Home, TrendingUp, Umbrella, Compass, Zap, Plus } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'property_or_car', title: 'شراء عقار أو سيارة', desc: 'هدف ملموس وقابل للتحقيق', icon: Home },
  { id: 'wealth', title: 'تنمية ثروتي', desc: 'خلّي فلوسك تشتغل نيابة عنك', icon: TrendingUp },
  { id: 'retirement', title: 'التقاعد المريح', desc: 'ضمان مستقبلك بكره', icon: Umbrella },
  { id: 'travel', title: 'سفر ومغامرات', desc: 'عيش الحياة اللي تستحقها', icon: Compass },
  { id: 'trading', title: 'أرباح سريعة', desc: 'مضاربة وتداول نشط', icon: Zap },
  { id: 'other', title: 'أخرى', desc: 'هدف خاص بيك', icon: Plus },
];

interface Props {
  formData: FormData;
  onSelect: (goal: string) => void;
}

export function StepGoal({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">إيه اللي بتستثمر عشانه؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">اختر الهدف الأقرب لحلمك</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            id={opt.id}
            title={opt.title}
            desc={opt.desc}
            icon={opt.icon}
            selected={formData.goal === opt.id}
            onClick={() => onSelect(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
