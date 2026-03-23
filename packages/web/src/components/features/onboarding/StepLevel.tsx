import { BookOpen, BookMarked, BarChart2, Target } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'beginner',     ar: 'مبتدئ تماماً',  en: 'Complete beginner', arDesc: 'لسه بتعلم وعندي أسئلة كتير',        enDesc: 'Still learning, lots of questions',       icon: BookOpen   },
  { id: 'basics',       ar: 'بعرف الأساسيات', en: 'Know the basics',   arDesc: 'فاهم المفاهيم الأساسية وبدأت أجرب', enDesc: 'Familiar with concepts, started exploring', icon: BookMarked },
  { id: 'intermediate', ar: 'متوسط',           en: 'Intermediate',      arDesc: 'عندي تجربة وبستثمر بانتظام',         enDesc: 'Some experience, investing regularly',      icon: BarChart2  },
  { id: 'advanced',     ar: 'متقدم',           en: 'Advanced',          arDesc: 'خبرة واسعة وبتداول بثقة',            enDesc: 'Experienced and trading with confidence',   icon: Target     },
];

interface Props { formData: FormData; isAr: boolean; onSelect: (v: string) => void; }

export function StepLevel({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'بعد كل اللي قلته... إيه مستواك الحقيقي؟' : "Honestly, what's your real level?"}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'خلّيك صريح مع نفسك' : 'Be honest with yourself'}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={isAr ? opt.ar : opt.en} desc={isAr ? opt.arDesc : opt.enDesc} icon={opt.icon} selected={formData.level === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
