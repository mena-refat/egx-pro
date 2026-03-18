import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

export function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    adminApi
      .get('/analytics/audit', { params: { page: 1 } })
      .then((res) => setLogs(res.data.data.logs))
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Audit Log</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-900/60">
                <td className="px-3 py-2">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {l.admin?.email ?? '—'}
                </td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.target ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

