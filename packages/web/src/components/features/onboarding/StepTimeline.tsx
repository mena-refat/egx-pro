import { OptionCard } from './OptionCard';
import { FormData, TimelineChoice } from './types';

const OPTIONS: { id: TimelineChoice; title: string; desc: string }[] = [
  { id: 'lt1', title: '⚡ أقل من سنة', desc: 'هدف قريب — استراتيجية محافظة' },
  { id: '1_3', title: '📅 من 1 إلى 3 سنوات', desc: 'أفق قصير — توازن بين الأمان والنمو' },
  { id: '3_7', title: '📆 من 3 إلى 7 سنوات', desc: 'متوسط الأجل — نمو تدريجي ومستقر' },
  { id: 'gt7', title: '🏆 أكثر من 7 سنوات', desc: 'طويل الأجل — أعلى عائد على المدى البعيد' },
];

interface Props { formData: FormData; onSelect: (v: TimelineChoice) => void; }

export function StepTimeline({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">إمتى عايز تحقق هدفك؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">الأفق الزمني بيحدد استراتيجيتك</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={opt.title} desc={opt.desc} selected={formData.timeline === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
