import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { MessageSquare } from 'lucide-react';

export function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply]     = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async (p = page, s = status) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (s) params.status = s;
      const r = await adminApi.get('/support', { params });
      setTickets(r.data.data.tickets ?? []);
      setTotal(r.data.data.total ?? 0);
    } finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { void load(); }, [page]);// eslint-disable-line

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await adminApi.patch(`/support/${selected.id}/reply`, { reply, status: newStatus });
      setSelected(null); setReply('');
      await load();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Support Tickets</h1>
          <p className="text-sm text-slate-500">{total} tickets</p>
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); load(1, e.target.value); }}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none">
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <DataTable headers={['Subject', 'User', 'Status', 'Priority', 'Date', '']} loading={loading} rowCount={tickets.length}>
        {tickets.map((t) => (
          <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3">
              <p className="text-sm text-white font-medium">{t.subject}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.message}</p>
            </td>
            <td className="px-4 py-3 text-sm text-slate-400">{t.user?.email ?? t.user?.username ?? '—'}</td>
            <td className="px-4 py-3"><Badge label={t.status} /></td>
            <td className="px-4 py-3"><Badge label={t.priority} /></td>
            <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
            <td className="px-4 py-3">
              <button onClick={() => { setSelected(t); setReply(t.reply ?? ''); setNewStatus('RESOLVED'); }}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                <MessageSquare size={12} /> Reply
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} limit={20} onChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reply to Ticket">
        {selected && (
          <div className="space-y-4">
            <div className="bg-[#0d0d14] rounded-lg p-4 border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-1">{selected.user?.email}</p>
              <p className="text-sm font-semibold text-white mb-2">{selected.subject}</p>
              <p className="text-sm text-slate-300">{selected.message}</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Your Reply</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                className="w-full px-3 py-2.5 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Set Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none">
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
              <button onClick={handleReply} disabled={saving || !reply.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
                {saving ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

