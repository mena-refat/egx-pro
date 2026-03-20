import { TrendingUp, Brain, Zap } from 'lucide-react';

interface TrustSectionProps {
  t: (k: string) => string;
}

export function TrustSection({ t }: TrustSectionProps) {
  const items = [
    { icon: TrendingUp, titleKey: 'billing.trust1Title', descKey: 'billing.trust1' },
    { icon: Brain, titleKey: 'billing.trust2Title', descKey: 'billing.trust2' },
    { icon: Zap, titleKey: 'billing.trust3Title', descKey: 'billing.trust3' },
  ];
  return (
    <section className="py-12 px-8 rounded-[20px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]" aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="text-[22px] font-bold text-[var(--text-primary)] text-center mb-10">
        {t('billing.trustTitle')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {items.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-[var(--brand)]" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{t(titleKey)}</h3>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
