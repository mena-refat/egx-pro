import { useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';

export function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    adminApi
      .get('/support', { params: { page: 1 } })
      .then((res) => setTickets(res.data.data.tickets))
      .catch(() => setTickets([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Support Tickets</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-900/60">
                <td className="px-3 py-2">{t.subject}</td>
                <td className="px-3 py-2">{t.user?.email ?? t.user?.username ?? '—'}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

