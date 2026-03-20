import { Trash2, ToggleLeft, ToggleRight, Pencil, KeyRound, ShieldOff, Sliders } from 'lucide-react';
import { Badge } from '../Badge';

interface Admin {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  permissions?: string[];
  managerId?: number | null;
}

interface AdminTableProps {
  admins: Admin[];
  currentAdminId?: number | string;
  isSuperAdmin: boolean;
  t: (k: string) => string;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
  onDelete: (id: string) => void;
  onEditProfile: (admin: Admin) => void;
  onResetPassword: (id: string) => void;
  onReset2FA: (id: string) => void;
  onEditPermissions: (admin: Admin) => void;
}

export function AdminTable({
  admins, currentAdminId, isSuperAdmin, t,
  onToggleActive, onDelete, onEditProfile, onResetPassword, onReset2FA, onEditPermissions,
}: AdminTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#111118]">
      <table className="min-w-full text-sm">
        <thead className="text-slate-300 border-b border-white/[0.06] bg-[#0f0f17]">
          <tr>
            <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.email')}</th>
            <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.name')}</th>
            <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.role')}</th>
            <th className="px-3 py-2 text-start text-xs font-semibold">{t('admins.active')}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {admins.map((a) => (
            <tr key={a.id} className="hover:bg-white/[0.02]">
              <td className="px-3 py-2 text-slate-200">{a.email}</td>
              <td className="px-3 py-2 text-slate-300">{a.fullName}</td>
              <td className="px-3 py-2"><Badge label={a.role ?? 'ADMIN'} /></td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                  a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
                }`}>
                  {a.isActive ? t('common.yes') : t('common.no')}
                </span>
              </td>
              <td className="px-3 py-2">
                {a.id !== currentAdminId && (
                  <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => onEditProfile(a)} title={t('admins.editProfile')} className="text-slate-600 hover:text-blue-400 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => onResetPassword(String(a.id))} title={t('admins.resetPassword')} className="text-slate-600 hover:text-amber-400 transition-colors">
                          <KeyRound size={13} />
                        </button>
                        <button onClick={() => onReset2FA(String(a.id))} title={t('admins.reset2FA')} className="text-slate-600 hover:text-violet-400 transition-colors">
                          <ShieldOff size={13} />
                        </button>
                        <button onClick={() => onEditPermissions(a)} title="Edit Permissions" className="text-slate-600 hover:text-emerald-400 transition-colors">
                          <Sliders size={13} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onToggleActive(String(a.id), a.isActive)}
                      title={a.isActive ? t('admins.deactivate') : t('admins.activate')}
                      className={`transition-colors ${a.isActive ? 'text-emerald-500/60 hover:text-amber-400' : 'text-slate-600 hover:text-emerald-400'}`}
                    >
                      {a.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => onDelete(String(a.id))} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
