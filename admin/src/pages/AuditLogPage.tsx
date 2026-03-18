import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { Search, RefreshCw, X, Monitor } from 'lucide-react';

const AUDIT_ACTIONS = [
  'ADMIN_LOGIN',
  'ADMIN_CREATED',
  'ADMIN_DELETED',
  'ADMIN_PERMISSIONS_UPDATED',
  'ADMIN_PASSWORD_CHANGED',
  'ADMIN_PROFILE_UPDATED',
  'ADMIN_2FA_ENABLED',
  'ADMIN_2FA_DISABLED',
  'ADMIN_RESET_PASSWORD',
  'ADMIN_RESET_2FA',
  'USER_PLAN_UPDATED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_INVITED',
  'SUPPORT_REPLIED',
  'SUPPORT_STATUS_UPDATED',
  'DISCOUNT_CREATED',
  'DISCOUNT_UPDATED',
  'DISCOUNT_DELETED',
  'NOTIFICATIONS_BROADCAST',
  'BLOCKLIST_ADDED',
  'BLOCKLIST_REMOVED',
] as const;

function actionBadge(action: string) {
  if (action === 'ADMIN_LOGIN')             return 'bg-slate-500/15 text-slate-300';
  if (action.startsWith('ADMIN_'))          return 'bg-violet-500/15 text-violet-300';
  if (action.startsWith('USER_'))           return 'bg-blue-500/15 text-blue-300';
  if (action.startsWith('SUPPORT_'))        return 'bg-emerald-500/15 text-emerald-300';
  if (action.startsWith('DISCOUNT_'))       return 'bg-amber-500/15 text-amber-300';
  if (action.startsWith('NOTIFICATIONS_'))  return 'bg-pink-500/15 text-pink-300';
  if (action.startsWith('BLOCKLIST_'))      return 'bg-red-500/15 text-red-300';
  return 'bg-white/[0.06] text-slate-300';
}

// Parse browser/OS from user-agent string
function parseUA(ua: string | null): string {
  if (!ua) return '—';
  let browser = 'Unknown';
  let os = 'Unknown';
  if (/Edg\//.test(ua))       browser = 'Edge';
  else if (/Chrome\//.test(ua))  browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua))  browser = 'Safari';
  if (/Windows/.test(ua))     os = 'Windows';
  else if (/Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua))    os = 'Linux';
  else if (/Android/.test(ua))  os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  return `${browser} / ${os}`;
}

// Format target based on action type
function formatTarget(action: string, target: string | null, details: string | null): string {
  if (!target && !details) return '—';
  const parts: string[] = [];
  if (target) parts.push(target);
  if (details) parts.push(details);
  return parts.join(' — ');
}

export default function AuditLogPage() {
  const { t } = useTranslation();

  const [logs, setLogs]   = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);

  const [adminSearch, setAdminSearch]     = useState('');
  const [adminDebounced, setAdminDebounced] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setAdminDebounced(adminSearch), 400);
    return () => clearTimeout(timer);
  }, [adminSearch]);

  useEffect(() => { setPage(1); }, [adminDebounced, action, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string> = { page: String(page) };
    if (adminDebounced) params.admin  = adminDebounced;
    if (action)         params.action = action;
    if (from)           params.from   = from;
    if (to)             params.to     = to;

    adminApi
      .get('/analytics/audit', { params })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data.data.logs ?? []);
        setTotal(res.data.data.total ?? 0);
      })
      .catch(() => { if (!cancelled) { setLogs([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, adminDebounced, action, from, to]);

  const clearFilters = () => {
    setAdminSearch(''); setAdminDebounced('');
    setAction(''); setFrom(''); setTo('');
  };

  const hasFilters = adminSearch || action || from || to;
  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('audit.title')}</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} {t('audit.events')}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 rounded-lg transition-all">
              <X size={12} /> {t('audit.clearFilters')}
            </button>
          )}
          <div className="p-2 rounded-lg border border-white/[0.08] text-slate-400">
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)}
            placeholder={t('audit.filterByAdmin')}
            className="w-full ps-9 pe-4 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all">
          <option value="">{t('audit.allActions')}</option>
          {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          title={t('audit.from')}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          title={t('audit.to')}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]" />
      </div>

      {/* Table */}
      <DataTable
        headers={[
          t('audit.date'),
          t('audit.time'),
          t('audit.admin'),
          t('audit.action'),
          t('audit.target'),
          t('audit.ip'),
        ]}
        loading={loading}
        rowCount={logs.length}
        empty={t('audit.noEvents')}
      >
        {logs.map((l) => {
          const dt = new Date(l.createdAt);
          return (
            <tr key={l.id} className="hover:bg-white/[0.02] transition-colors text-xs">
              {/* Date */}
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                {dt.toLocaleDateString()}
              </td>
              {/* Time */}
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                {dt.toLocaleTimeString()}
              </td>
              {/* Admin */}
              <td className="px-4 py-3">
                <p className="text-slate-200">{l.admin?.email ?? '—'}</p>
                {l.admin?.fullName && (
                  <p className="text-[11px] text-slate-500">{l.admin.fullName}</p>
                )}
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">{l.adminId}</p>
              </td>
              {/* Action */}
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${actionBadge(l.action)}`}>
                  {l.action}
                </span>
              </td>
              {/* Target */}
              <td className="px-4 py-3 text-slate-400 max-w-[220px]">
                {l.target && (
                  <p className="font-mono text-[11px] text-slate-300 truncate" title={l.target}>{l.target}</p>
                )}
                {l.details && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={l.details}>{l.details}</p>
                )}
                {!l.target && !l.details && '—'}
              </td>
              {/* IP + Device */}
              <td className="px-4 py-3">
                <p className="text-[11px] font-mono text-slate-400">{l.ipAddress ?? '—'}</p>
                {l.userAgent && (
                  <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                    <Monitor size={10} /> {parseUA(l.userAgent)}
                  </p>
                )}
              </td>
            </tr>
          );
        })}
      </DataTable>

      <Pagination page={page} totalPages={totalPages} total={total} limit={50} onChange={setPage} />
    </div>
  );
}
