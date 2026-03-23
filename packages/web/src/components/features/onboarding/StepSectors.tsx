import { FormData, SECTORS } from './types';

interface Props { formData: FormData; isAr: boolean; onToggle: (id: string) => void; }

export function StepSectors({ formData, isAr, onToggle }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isAr ? 'إيه القطاعات اللي تهمك؟' : 'Which sectors interest you?'}</h2>
        <p className="text-[var(--text-secondary)] text-sm">{isAr ? 'اختر واحد أو أكتر — هنخصص تجربتك' : 'Pick one or more — we\'ll personalize your experience'}</p>
      </div>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border)]">
        {SECTORS.map((sector) => (
          <button
            key={sector.id}
            type="button"
            onClick={() => onToggle(sector.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              formData.sectors.includes(sector.id)
                ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/50 hover:text-[var(--text-primary)]'
            }`}
          >
            {isAr ? sector.ar : sector.en}
          </button>
        ))}
      </div>
    </div>
  );
}
