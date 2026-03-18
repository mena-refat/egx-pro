import { FormEvent, useState } from 'react';
import { adminApi } from '../lib/adminApi';

export function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await adminApi.post('/notifications/broadcast', { title, body, plan: plan || undefined });
      setStatus('sent');
    } catch (err: any) {
      setStatus(err?.response?.data?.error ?? 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Broadcast Notification</h1>
      {status && (
        <div className="text-sm text-emerald-300">
          {status === 'sent' ? 'Notification sent' : status}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
        <div className="space-y-1 text-sm">
          <label className="block text-slate-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <div className="space-y-1 text-sm">
          <label className="block text-slate-300">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 min-h-[120px]"
          />
        </div>
        <div className="space-y-1 text-sm">
          <label className="block text-slate-300">Plan filter (optional)</label>
          <input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="free, pro, ultra..."
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  );
}

