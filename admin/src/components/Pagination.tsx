interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm text-slate-400 mt-4">
      <p>
        {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-white/10/80 hover:bg-white/5/50 disabled:opacity-30 transition-all text-xs"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-xs text-slate-500">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-white/10/80 hover:bg-white/5/50 disabled:opacity-30 transition-all text-xs"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

