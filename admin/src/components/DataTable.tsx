import type { ReactNode } from 'react';

interface DataTableProps {
  headers: ReactNode[];
  children: ReactNode;
  loading?: boolean;
  empty?: string;
  rowCount?: number;
}

export function DataTable({ headers, children, loading, empty = 'No data found', rowCount }: DataTableProps) {
  return (
    <div className="rounded-xl border border-white/10/70 bg-[#111118] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10/60">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10/40">
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-slate-500 text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : rowCount === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-slate-500 text-sm"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

