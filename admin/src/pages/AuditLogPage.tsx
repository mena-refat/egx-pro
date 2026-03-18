import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';

export function AuditLogPage() {
  const [logs, setLogs]   = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [admin, setAdmin] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = page, a = admin) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (a) params.admin = a;
      const res = await adminApi.get('/analytics/audit', { params });
      setLogs(res.data.data.logs ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, admin]);

  useEffect(() => { void load(); }, [page]); // eslint-disable-line

  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Audit Log</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} events</p>
        </div>
        <input
          value={admin}
          onChange={(e) => { setAdmin(e.target.value); setPage(1); void load(1, e.target.value); }}
          placeholder="Filter by admin email..."
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      <DataTable
        headers={['Time', 'Admin', 'Action', 'Target']}
        loading={loading}
        rowCount={logs.length}
        empty="No audit events found"
      >
        {logs.map((l) => (
          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors text-xs">
            <td className="px-4 py-3 text-slate-400">
              {new Date(l.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-slate-300">
              {l.admin?.email ?? '—'}
            </td>
            <td className="px-4 py-3 text-slate-200">{l.action}</td>
            <td className="px-4 py-3 text-slate-400">{l.target ?? '—'}</td>
          </tr>
        ))}
      </DataTable>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={50}
        onChange={setPage}
      />
    </div>
  );
}

