import { ShieldAlert, ShieldCheck, AlertTriangle, ShieldOff, X } from 'lucide-react';
import { Pagination } from '../Pagination';
import type { AbuseReport } from './types';
import { timeAgo } from './helpers';

interface AbuseViewProps {
  abuseReports: AbuseReport[];
  abuseTotal: number;
  abusePage: number;
  abuseFilter: string;
  abuseLoading: boolean;
  locale: string;
  t: (k: string) => string;
  onFilterChange: (f: string) => void;
  onPageChange: (p: number) => void;
  onWarn: (r: AbuseReport) => void;
  onDismiss: (r: AbuseReport) => void;
}

export function AbuseView({
  abuseReports, abuseTotal, abusePage, abuseFilter, abuseLoading,
  locale, t,
  onFilterChange, onPageChange, onWarn, onDismiss,
}: AbuseViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white">{t('support.abuseReports')}</h2>
          {abuseTotal > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
              {abuseTotal}
            </span>
          )}
        </div>
        <div className="flex gap-1 p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg ms-auto">
          {(['PENDING', ''] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                abuseFilter === f ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'PENDING' ? t('support.abuseReportsPending') : t('support.abuseReportsAll')}
            </button>
          ))}
        </div>
      </div>

      {abuseLoading && (
        <div className="flex items-center justify-center py-16 text-slate-600 text-sm">{t('common.loading')}</div>
      )}

      {!abuseLoading && abuseReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
            <ShieldCheck size={20} className="text-slate-700" />
          </div>
          <p className="text-sm text-slate-600">{t('support.noAbuseReports')}</p>
        </div>
      )}

      <div className="space-y-2">
        {abuseReports.map((r) => (
          <div key={r.id} className="rounded-xl border border-white/[0.07] bg-[#111118] overflow-hidden">
            <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                r.status === 'PENDING' ? 'bg-amber-400' : r.status === 'WARNED' ? 'bg-red-400' : 'bg-slate-600'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.ticket.subject}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">
                        {r.user.fullName ?? r.user.username ?? r.user.email ?? `#${r.user.id}`}
                      </span>
                      {r.user.warningCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                          <AlertTriangle size={8} /> {r.user.warningCount} {t('support.warningCount')}
                        </span>
                      )}
                      {r.user.isSuspended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/15 flex items-center gap-0.5">
                          <ShieldOff size={8} /> {t('support.suspended')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                      r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : r.status === 'WARNED' ? 'bg-red-500/10 text-red-400 border-red-500/15'
                      : 'bg-slate-700/40 text-slate-500 border-slate-700/60'
                    }`}>
                      {t(`support.abuseStatus${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`)}
                    </span>
                    <p className="text-[9px] text-slate-600 mt-1">{timeAgo(r.createdAt, locale)}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 mb-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed">{r.reason}</p>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-600">
                    {t('support.reportedBy')}: <span className="text-slate-500">{r.reporter.fullName || r.reporter.email}</span>
                  </span>
                  {r.reviewNote && (
                    <span className="text-[10px] text-slate-600 italic">"{r.reviewNote}"</span>
                  )}
                </div>
              </div>

              {r.status === 'PENDING' && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => onWarn(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-all whitespace-nowrap"
                  >
                    <AlertTriangle size={9} /> {t('support.warnUser')}
                  </button>
                  <button
                    onClick={() => onDismiss(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                  >
                    <X size={9} /> {t('support.dismissReport')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {abuseTotal > 20 && (
        <Pagination
          page={abusePage}
          totalPages={Math.ceil(abuseTotal / 20)}
          total={abuseTotal}
          limit={20}
          onChange={onPageChange}
        />
      )}
    </div>
  );
}
