import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/adminApi';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { Search, RefreshCw, X, Monitor, Download } from 'lucide-react';
import { useAdminStore } from '../store/adminAuthStore';

const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'ADMIN_LOGIN',               label: 'Admin Login' },
  { value: 'ADMIN_CREATED',             label: 'Admin Created' },
  { value: 'ADMIN_DELETED',             label: 'Admin Deleted' },
  { value: 'ADMIN_PERMISSIONS_UPDATED', label: 'Permissions Updated' },
  { value: 'ADMIN_PASSWORD_CHANGED',    label: 'Password Changed' },
  { value: 'ADMIN_PROFILE_UPDATED',     label: 'Profile Updated' },
  { value: 'ADMIN_2FA_ENABLED',         label: '2FA Enabled' },
  { value: 'ADMIN_2FA_DISABLED',        label: '2FA Disabled' },
  { value: 'ADMIN_RESET_PASSWORD',      label: 'Admin Password Reset' },
  { value: 'ADMIN_RESET_2FA',           label: 'Admin 2FA Reset' },
  { value: 'USER_PLAN_UPDATED',         label: 'User Plan Updated' },
  { value: 'USER_DEACTIVATED',          label: 'User Deactivated' },
  { value: 'USER_REACTIVATED',          label: 'User Reactivated' },
  { value: 'USER_INVITED',              label: 'User Invited' },
  { value: 'SUPPORT_REPLIED',           label: 'Support Reply Sent' },
  { value: 'SUPPORT_STATUS_UPDATED',    label: 'Ticket Status Updated' },
  { value: 'DISCOUNT_CREATED',          label: 'Discount Created' },
  { value: 'DISCOUNT_UPDATED',          label: 'Discount Updated' },
  { value: 'DISCOUNT_DELETED',          label: 'Discount Deleted' },
  { value: 'NOTIFICATIONS_BROADCAST',   label: 'Broadcast Sent' },
  { value: 'BLOCKLIST_ADDED',           label: 'Blocklist Added' },
  { value: 'BLOCKLIST_REMOVED',         label: 'Blocklist Removed' },
  { value: 'USER_BANNED',               label: 'User Banned' },
  { value: 'USER_UNBANNED',             label: 'User Unbanned' },
];

function actionBadge(action: string) {
  if (action === 'ADMIN_LOGIN')            return 'bg-slate-500/15 text-slate-300 border border-slate-500/20';
  if (action.startsWith('ADMIN_'))         return 'bg-violet-500/15 text-violet-300 border border-violet-500/20';
  if (action.startsWith('USER_'))          return 'bg-blue-500/15 text-blue-300 border border-blue-500/20';
  if (action.startsWith('SUPPORT_'))       return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20';
  if (action.startsWith('DISCOUNT_'))      return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
  if (action.startsWith('NOTIFICATIONS_')) return 'bg-pink-500/15 text-pink-300 border border-pink-500/20';
  if (action.startsWith('BLOCKLIST_'))     return 'bg-red-500/15 text-red-300 border border-red-500/20';
  return 'bg-white/[0.06] text-slate-300';
}

function actionLabel(action: string): string {
  return AUDIT_ACTIONS.find((a) => a.value === action)?.label ?? action;
}

function parseUA(ua: string | null): string {
  if (!ua) return '';
  let browser = 'Unknown';
  let os = 'Unknown';
  if (/Edg\//.test(ua))           browser = 'Edge';
  else if (/Chrome\//.test(ua))   browser = 'Chrome';
  else if (/Firefox\//.test(ua))  browser = 'Firefox';
  else if (/Safari\//.test(ua))   browser = 'Safari';
  if (/Windows/.test(ua))         os = 'Windows';
  else if (/Macintosh/.test(ua))  os = 'macOS';
  else if (/Linux/.test(ua))      os = 'Linux';
  else if (/Android/.test(ua))    os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  return `${browser} · ${os}`;
}

function formatTarget(
  action: string,
  target: string | null,
  details: string | null
): { primary: string; secondary?: string } {
  switch (action) {
    case 'ADMIN_LOGIN':
      return { primary: 'Logged in successfully' };

    case 'ADMIN_CREATED':
      // details = "email: admin@example.com"
      return { primary: details ?? 'New admin created', secondary: 'New admin account' };

    case 'ADMIN_DELETED':
      return { primary: 'Admin account permanently deleted' };

    case 'ADMIN_PASSWORD_CHANGED':
      return { primary: 'Changed own password' };

    case 'ADMIN_PROFILE_UPDATED': {
      try {
        const d = JSON.parse(details ?? '{}') as Record<string, unknown>;
        const keys = Object.keys(d);
        const vals = keys.map((k) => `${k}: ${String(d[k])}`).join(' · ');
        return {
          primary: keys.length ? `Updated: ${keys.join(', ')}` : 'Profile updated',
          secondary: vals || undefined,
        };
      } catch {
        return { primary: details ?? 'Profile updated' };
      }
    }

    case 'ADMIN_2FA_ENABLED':
      return { primary: '2FA enabled on own account' };

    case 'ADMIN_2FA_DISABLED':
      return { primary: '2FA disabled on own account' };

    case 'ADMIN_PERMISSIONS_UPDATED': {
      try {
        const d = JSON.parse(details ?? '{}') as { permissions?: string[]; isActive?: boolean };
        const parts: string[] = [];
        if (d.isActive != null) parts.push(d.isActive ? 'Account activated' : 'Account deactivated');
        const perms = d.permissions;
        return {
          primary: parts.join(' · ') || 'Permissions updated',
          secondary: perms?.length ? `Perms: ${perms.join(', ')}` : (perms ? 'Permissions cleared' : undefined),
        };
      } catch {
        return { primary: 'Permissions updated' };
      }
    }

    case 'ADMIN_RESET_PASSWORD':
      return { primary: 'Password reset (forced change on next login)' };

    case 'ADMIN_RESET_2FA':
      return { primary: '2FA reset (setup required on next login)' };

    case 'USER_PLAN_UPDATED':
      // details = "plan → premium"
      return { primary: details ?? 'Plan updated', secondary: 'Subscription changed' };

    case 'USER_DEACTIVATED':
      return { primary: 'User account deactivated', secondary: 'Login access revoked' };

    case 'USER_REACTIVATED':
      return { primary: 'User account reactivated', secondary: 'Login access restored' };

    case 'USER_INVITED':
      // details = "email: user@example.com"
      return { primary: details ?? 'User invited', secondary: 'Credentials sent by email' };

    case 'SUPPORT_REPLIED':
      // details = "status → IN_PROGRESS"
      return { primary: 'Reply sent to ticket', secondary: details ?? undefined };

    case 'SUPPORT_STATUS_UPDATED': {
      try {
        const d = JSON.parse(details ?? '{}') as { status?: string; priority?: string };
        const parts: string[] = [];
        if (d.status)   parts.push(`Status → ${d.status}`);
        if (d.priority) parts.push(`Priority → ${d.priority}`);
        return { primary: parts.join(' · ') || 'Ticket updated' };
      } catch {
        return { primary: details ?? 'Ticket updated' };
      }
    }

    case 'DISCOUNT_CREATED':
      // details = "code: SAVE20"
      return { primary: details ?? 'Discount code created', secondary: 'New code is active' };

    case 'DISCOUNT_UPDATED': {
      try {
        const d = JSON.parse(details ?? '{}') as Record<string, unknown>;
        const keys = Object.keys(d);
        const vals = keys.map((k) => `${k}: ${String(d[k])}`).join(' · ');
        return {
          primary: keys.length ? `Updated: ${keys.join(', ')}` : 'Discount updated',
          secondary: vals || undefined,
        };
      } catch {
        return { primary: details ?? 'Discount updated' };
      }
    }

    case 'DISCOUNT_DELETED':
      return { primary: 'Discount code deleted permanently' };

    case 'NOTIFICATIONS_BROADCAST': {
      try {
        const d = JSON.parse(details ?? '{}') as { title?: string; plans?: string[] };
        return {
          primary: d.title ? `"${d.title}"` : 'Broadcast notification sent',
          secondary: d.plans?.length ? `Plans: ${d.plans.join(', ')}` : 'Sent to all users',
        };
      } catch {
        return { primary: 'Broadcast sent' };
      }
    }

    case 'BLOCKLIST_ADDED':
      // details = "EMAIL: test@example.com"
      return { primary: details ?? 'Identifier blocked', secondary: 'Registration will be rejected' };

    case 'BLOCKLIST_REMOVED':
      return { primary: details ?? 'Identifier unblocked', secondary: 'Registration allowed again' };

    case 'USER_BANNED':
      return { primary: 'User account banned', secondary: details ?? 'Access revoked immediately' };

    case 'USER_UNBANNED':
      return { primary: 'User account unbanned', secondary: details ?? 'Access restored' };

    default:
      return { primary: details ?? target ?? '—' };
  }
}

export default function AuditLogPage() {
  const { t } = useTranslation();
  const currentAdmin = useAdminStore((s) => s.admin);
  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  const [logs, setLogs]   = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const [adminSearch, setAdminSearch]       = useState('');
  const [adminDebounced, setAdminDebounced] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom]     = useState(yesterday);
  const [to, setTo]         = useState(today);

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
    setAction(''); setFrom(yesterday); setTo(today);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (adminDebounced) params.admin  = adminDebounced;
      if (action)         params.action = action;
      if (from)           params.from   = from;
      if (to)             params.to     = to;
      const res = await adminApi.get('/analytics/audit/export', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  };

  const hasFilters  = adminSearch || action || from || to;
  const totalPages  = Math.ceil(total / 50) || 1;

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
          <button
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all disabled:opacity-50"
          >
            <Download size={12} /> {exporting ? '...' : t('audit.exportCsv')}
          </button>
          <div className="p-2 rounded-lg border border-white/[0.08] text-slate-400">
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Admin email search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder={t('audit.filterByAdmin')}
            className="w-full ps-9 pe-4 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>

        {/* Action dropdown */}
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors min-w-[160px]"
        >
          <option value="">{t('audit.allActions')}</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-600 px-1">{t('audit.from')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-600 px-1">{t('audit.to')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500/40 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        headers={[
          t('audit.date'),
          t('audit.time'),
          t('audit.admin'),
          t('audit.action'),
          t('audit.target'),
          t('audit.deviceLocation'),
        ]}
        loading={loading}
        rowCount={logs.length}
        empty={t('audit.noEvents')}
      >
        {logs.map((l) => {
          const dt  = new Date(l.createdAt);
          const tgt = formatTarget(l.action, l.target, l.details);
          return (
            <tr key={l.id} className="hover:bg-white/[0.025] transition-colors text-xs border-b border-white/[0.04] last:border-0">
              {/* Date */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-slate-300">
                  {dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </td>

              {/* Time */}
              <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-400">
                {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </td>

              {/* Admin */}
              <td className="px-4 py-3">
                <p className="text-slate-200 font-medium">{l.admin?.email ?? '—'}</p>
                {l.admin?.fullName && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{l.admin.fullName}</p>
                )}
                {isSuperAdmin && l.adminId != null && (
                  <p className="text-[10px] font-mono text-slate-700 mt-0.5 select-all" title={l.adminId}>
                    ID: {l.adminId}
                  </p>
                )}
              </td>

              {/* Action badge */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${actionBadge(l.action)}`}>
                  {actionLabel(l.action)}
                </span>
              </td>

              {/* Target — human readable */}
              <td className="px-4 py-3 max-w-[260px]">
                <p className="text-slate-200 truncate" title={tgt.primary}>{tgt.primary}</p>
                {tgt.secondary && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={tgt.secondary}>
                    {tgt.secondary}
                  </p>
                )}
                {isSuperAdmin && l.target && (
                  <p className="text-[10px] font-mono text-slate-700 mt-0.5 select-all" title={`ref: ${l.target}`}>
                    ref: {l.target}
                  </p>
                )}
              </td>

              {/* Device + Location */}
              <td className="px-4 py-3">
                {l.userAgent && (
                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                    <Monitor size={10} className="shrink-0" />
                    {parseUA(l.userAgent)}
                  </p>
                )}
                {l.city && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    📍 {l.city}
                  </p>
                )}
                {!l.userAgent && !l.city && (
                  <span className="text-slate-700">—</span>
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
