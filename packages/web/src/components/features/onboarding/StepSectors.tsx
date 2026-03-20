import { FormData, SECTORS } from './types';

interface Props { formData: FormData; onToggle: (id: string) => void; }

export function StepSectors({ formData, onToggle }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">إيه القطاعات اللي تهمك؟</h2>
        <p className="text-[var(--text-secondary)] text-sm">اختر واحد أو أكتر - هنخصص تجربتك</p>
      </div>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 bg-[var(--bg-card)]/60 rounded-2xl">
        {SECTORS.map((sector) => (
          <button
            key={sector.id}
            type="button"
            onClick={() => onToggle(sector.id)}
            className={`px-4 py-2 rounded-full text-xs border transition-all ${
              formData.sectors.includes(sector.id)
                ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
            }`}
          >
            {sector.label}
          </button>
        ))}
      </div>
    </div>
  );
}
