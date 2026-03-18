import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { MessageSquare, RefreshCw } from 'lucide-react';

export default function SupportPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply]     = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async (p = page, s = status) => {
    setLoading(true);
    setLoadError('');
    try {
      const params: Record<string, string> = { page: String(p) };
      if (s) params.status = s;
      const r = await adminApi.get('/support', { params });
      setTickets(r.data.data.tickets ?? []);
      setTotal(r.data.data.total ?? 0);
    } catch (err: any) {
      setTickets([]);
      setLoadError(err?.response?.data?.error ?? 'Failed to load tickets');
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
          <h1 className="text-xl font-bold text-white">{t('support.title')}</h1>
          <p className="text-sm text-slate-500">{total} {t('support.tickets')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page, status)}
            className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); load(1, e.target.value); }}
            className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none">
            <option value="">{t('support.all')}</option>
            <option value="OPEN">{t('support.open')}</option>
            <option value="IN_PROGRESS">{t('support.inProgress')}</option>
            <option value="RESOLVED">{t('support.resolved')}</option>
            <option value="CLOSED">{t('support.closed')}</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      <DataTable
        headers={[t('support.subject'), t('support.user'), t('support.status'), t('support.priority'), t('support.date'), '']}
        loading={loading}
        rowCount={tickets.length}
        empty={t('support.noTickets')}
      >
        {tickets.map((tk) => (
          <tr key={tk.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3">
              <p className="text-sm text-white font-medium">{tk.subject}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tk.message}</p>
            </td>
            <td className="px-4 py-3 text-sm text-slate-400">{tk.user?.email ?? tk.user?.username ?? '—'}</td>
            <td className="px-4 py-3"><Badge label={tk.status} /></td>
            <td className="px-4 py-3"><Badge label={tk.priority} /></td>
            <td className="px-4 py-3 text-xs text-slate-500">{new Date(tk.createdAt).toLocaleDateString()}</td>
            <td className="px-4 py-3">
              <button onClick={() => { setSelected(tk); setReply(tk.reply ?? ''); setNewStatus('RESOLVED'); }}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                <MessageSquare size={12} /> {t('support.reply')}
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} limit={20} onChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('support.replyToTicket')}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-[#0d0d14] rounded-lg p-4 border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-1">{selected.user?.email}</p>
              <p className="text-sm font-semibold text-white mb-2">{selected.subject}</p>
              <p className="text-sm text-slate-300">{selected.message}</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.yourReply')}</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                className="w-full px-3 py-2.5 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">{t('support.setStatus')}</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0d0d14] border border-white/[0.08] rounded-lg text-white focus:outline-none">
                <option value="IN_PROGRESS">{t('support.inProgress')}</option>
                <option value="RESOLVED">{t('support.resolved')}</option>
                <option value="CLOSED">{t('support.closed')}</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-slate-400">{t('common.cancel')}</button>
              <button onClick={handleReply} disabled={saving || !reply.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 transition-all">
                {saving ? t('common.sending') : t('support.sendReply')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
