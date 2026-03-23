import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Globe, ExternalLink } from 'lucide-react';
import { adminApi } from '../lib/adminApi';
import { slugify } from '../lib/slugify';
import { Badge } from '../components/Badge';

/* ── helpers ──────────────────────────────────────────────────── */
function timeAgo(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (locale.startsWith('ar')) {
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${d} يوم`;
  }
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

type GroupType = 'super-admins' | 'managers' | 'staff';

interface Admin {
  id: number;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

const GROUP_CONFIG: Record<GroupType, {
  titleKey: string;
  descKey: string;
  color: string;
  dotColor: string;
  filter: (a: Admin) => boolean;
}> = {
  'super-admins': {
    titleKey: 'dashboard.superAdmins',
    descKey:  'dashboard.superAdminsDesc',
    color:    'text-amber-400',
    dotColor: 'bg-amber-400',
    filter:   (a) => a.role === 'SUPER_ADMIN',
  },
  managers: {
    titleKey: 'dashboard.managers',
    descKey:  'dashboard.managersDesc',
    color:    'text-violet-400',
    dotColor: 'bg-violet-400',
    filter:   (a) => a.role === 'ADMIN' && a.permissions.includes('support.manage'),
  },
  staff: {
    titleKey: 'dashboard.staff',
    descKey:  'dashboard.staffDesc',
    color:    'text-blue-400',
    dotColor: 'bg-blue-400',
    filter:   (a) => a.role === 'ADMIN' && !a.permissions.includes('support.manage'),
  },
};

/* ── component ────────────────────────────────────────────────── */
export default function AdminGroupPage() {
  const { type } = useParams<{ type: string }>();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = `${i18n.language}-u-nu-latn`;

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const config = GROUP_CONFIG[type as GroupType];

  useEffect(() => {
    setLoading(true);
    adminApi.get('/admins')
      .then((r) => setAdmins(r.data.data ?? []))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []);

  const members = useMemo(() => {
    if (!config) return [];
    return admins
      .filter(config.filter)
      .filter((a) => {
        if (filterActive === 'active') return a.isActive;
        if (filterActive === 'inactive') return !a.isActive;
        return true;
      })
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return a.fullName?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
      });
  }, [admins, config, filterActive, search]);

  if (!config) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center text-slate-500 text-sm">
        Group not found.
        <button onClick={() => nav('/admins')} className="block mx-auto mt-4 text-emerald-400 hover:underline text-xs">
          {t('adminDetail.backToAdmins')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => nav('/admins')}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {t('adminDetail.backToAdmins')}
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <div>
          <h1 className={`text-lg font-bold ${config.color}`}>{t(config.titleKey as any)}</h1>
          <p className="text-xs text-slate-500">{t(config.descKey as any)}</p>
        </div>
        <span className={`ms-2 text-2xl font-bold tabular-nums ${config.color}`}>
          {loading ? '—' : members.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full ps-8 pe-3 py-2 text-xs bg-[#111118] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-emerald-500/40 placeholder-slate-700"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                filterActive === f
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/[0.06] text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? t('adminDetail.filterAll') : f === 'active' ? t('adminDetail.active') : t('adminDetail.inactive')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] py-16 text-center">
          <p className="text-sm text-slate-600">لا يوجد أعضاء في هذه المجموعة</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/[0.06] bg-[#0f0f17]">
              <tr>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-slate-400">{t('adminDetail.profile')}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-slate-400">{t('adminDetail.status')}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-slate-400">{t('adminDetail.lastLoginTime')}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-slate-400">{t('adminDetail.lastLoginIp')}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-slate-400">{t('adminDetail.createdAt')}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {members.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => nav(`/admins/${slugify(a.fullName)}`)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                  {/* Name + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {a.fullName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{a.fullName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{a.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Active */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {a.isActive
                        ? <><CheckCircle size={9} /> {t('adminDetail.active')}</>
                        : <><XCircle size={9} /> {t('adminDetail.inactive')}</>
                      }
                    </span>
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3">
                    {a.lastLoginAt ? (
                      <div>
                        <p className="text-xs text-slate-300 flex items-center gap-1">
                          <Clock size={9} className="text-slate-600" />
                          {timeAgo(a.lastLoginAt, locale)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {new Date(a.lastLoginAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">{t('adminDetail.never')}</span>
                    )}
                  </td>

                  {/* IP */}
                  <td className="px-4 py-3">
                    {a.lastLoginIp ? (
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Globe size={9} className="text-slate-600" />
                        {a.lastLoginIp}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">{t('adminDetail.unknown')}</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3">
                    <ExternalLink size={12} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
