import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm text-slate-400 mt-4">
      <p>{from}–{to} {t('common.of')} {total.toLocaleString()}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 transition-all text-xs"
        >
          {t('common.prev')}
        </button>
        <span className="px-3 py-1.5 text-xs text-slate-500">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 transition-all text-xs"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
