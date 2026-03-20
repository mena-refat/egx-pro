import { getPermLabels, getPermGroups, PERM_REQUIRES } from './permissions';
import { getPresetRoles, ROLE_COLORS } from './presetRoles';

interface SupportManager {
  id: number;
  fullName: string;
  email: string;
}

interface PermissionsPanelProps {
  permissions: string[];
  managerId: string;
  supportManagers: SupportManager[];
  isSuperAdmin?: boolean;
  showSuperAdmin?: boolean;
  t: (k: string) => string;
  onPermissionToggle: (perm: string) => void;
  onManagerChange: (id: string) => void;
  onSuperAdminChange?: (checked: boolean) => void;
  onPresetSelect: (permissions: string[]) => void;
}

export function PermissionsPanel({
  permissions, managerId, supportManagers, isSuperAdmin, showSuperAdmin,
  t, onPermissionToggle, onManagerChange, onSuperAdminChange, onPresetSelect,
}: PermissionsPanelProps) {
  const PERM_LABELS = getPermLabels(t);
  const PERM_GROUPS = getPermGroups(t);
  const PRESET_ROLES = getPresetRoles(t);

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">{t('admins.quickPresets')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ROLES.map((role) => (
            <button
              key={role.label}
              type="button"
              title={role.desc}
              onClick={() => onPresetSelect([...role.permissions])}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${ROLE_COLORS[role.color]}`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Permission groups grid */}
      <div className="grid grid-cols-2 gap-2">
        {PERM_GROUPS.map((group) => (
          <div key={group.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2.5">{group.label}</p>
            <div className="space-y-2">
              {group.perms.map((p) => {
                const isRequired = Object.entries(PERM_REQUIRES).some(
                  ([higher, deps]) => deps.includes(p) && permissions.includes(higher)
                );
                return (
                  <label key={p} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permissions.includes(p)}
                      onChange={() => onPermissionToggle(p)}
                      disabled={isRequired}
                      className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer disabled:opacity-40 shrink-0"
                    />
                    <span className={`text-xs leading-tight transition-colors ${isRequired ? 'text-emerald-500/60' : 'text-slate-400 group-hover:text-white'}`}>
                      {PERM_LABELS[p] ?? p}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Manager assignment for support agents */}
      {permissions.includes('support.reply') && !permissions.includes('support.manage') && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-3 space-y-1.5">
          <label className="text-xs font-medium text-blue-300 block">{t('admins.managerLabel')}</label>
          <select
            value={managerId}
            onChange={(e) => onManagerChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#111118] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500/40"
          >
            <option value="">{t('admins.noManagerAssigned')}</option>
            {supportManagers.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.fullName || m.email}</option>
            ))}
          </select>
        </div>
      )}

      {/* Super Admin */}
      {showSuperAdmin && onSuperAdminChange && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-3 py-2.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => onSuperAdminChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
            />
            <div>
              <span className="text-xs font-semibold text-amber-300">{t('admins.superAdmin')}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('admins.superAdminNote')}</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
