import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'sell_immediately', title: '😰 هبيع فوراً وأوقف الخسارة', desc: 'سلامتي أهم من أي ربح' },
  { id: 'wait_and_see', title: '🤔 هستنى وأشوف السوق', desc: 'مش هتصرف إلا لو الوضع اتضح' },
  { id: 'buy_more', title: '😎 فرصة ذهبية — هشتري أكتر', desc: 'انخفاض السعر يعني صفقة أفضل' },
  { id: 'long_term_calm', title: '🧘 مش هتأثر — استثماري طويل المدى', desc: 'التقلبات طبيعية ومش بتقلقني' },
];

interface Props { formData: FormData; onSelect: (v: string) => void; }

export function StepRisk({ formData, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">لو السهم اللي اشتريته نزل 30%...</h2>
        <p className="text-[var(--text-secondary)] text-sm">جاوب بصدق — ده بيحدد مستوى مخاطرتك الحقيقي</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={opt.title} desc={opt.desc} selected={formData.reaction30 === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
