import { TrendingDown, Eye, ShoppingCart, ShieldCheck } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { FormData } from './types';

const OPTIONS = [
  { id: 'sell_immediately', ar: 'هبيع فوراً وأوقف الخسارة',        en: 'Sell immediately — stop the loss',    arDesc: 'سلامتي أهم من أي ربح',          enDesc: 'Capital safety above all',              icon: TrendingDown },
  { id: 'wait_and_see',     ar: 'هستنى وأشوف السوق',               en: 'Wait and watch the market',           arDesc: 'مش هتصرف إلا لو الوضع اتضح',    enDesc: "Won't act until the picture clears",    icon: Eye          },
  { id: 'buy_more',         ar: 'فرصة ذهبية — هشتري أكتر',        en: 'Golden opportunity — buy more',       arDesc: 'انخفاض السعر يعني صفقة أفضل',   enDesc: 'A lower price means a better deal',     icon: ShoppingCart },
  { id: 'long_term_calm',   ar: 'مش هتأثر — استثماري طويل المدى', en: "Not affected — I'm in it long-term",  arDesc: 'التقلبات طبيعية ومش بتقلقني',   enDesc: 'Volatility is normal, I stay the course', icon: ShieldCheck },
];

interface Props { formData: FormData; isAr: boolean; onSelect: (v: string) => void; }

export function StepRisk({ formData, isAr, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'لو السهم اللي اشتريته نزل 30%...' : 'If a stock you bought drops 30%...'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'جاوب بصدق — ده بيحدد مستوى مخاطرتك الحقيقي' : 'Answer honestly — this reveals your true risk level'}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.id} id={opt.id} title={isAr ? opt.ar : opt.en} desc={isAr ? opt.arDesc : opt.enDesc} icon={opt.icon} selected={formData.reaction30 === opt.id} onClick={() => onSelect(opt.id)} />
        ))}
      </div>
    </div>
  );
}
