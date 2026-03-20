export type PresetRole = { label: string; color: string; desc: string; permissions: string[] };

export function getPresetRoles(t: (k: string) => string): PresetRole[] {
  return [
    {
      label: t('admins.presetSupportAgent'),
      color: 'blue',
      desc: t('admins.presetSupportAgentDesc'),
      permissions: ['support.view', 'support.reply'],
    },
    {
      label: t('admins.presetSupportManager'),
      color: 'violet',
      desc: t('admins.presetSupportManagerDesc'),
      permissions: ['support.view', 'support.reply', 'support.assign', 'support.manage'],
    },
    {
      label: t('admins.presetContentManager'),
      color: 'amber',
      desc: t('admins.presetContentManagerDesc'),
      permissions: ['discounts.view', 'discounts.manage', 'notifications.send'],
    },
    {
      label: t('admins.presetAnalyst'),
      color: 'emerald',
      desc: t('admins.presetAnalystDesc'),
      permissions: ['users.view', 'analytics.view'],
    },
    {
      label: t('admins.presetAuditor'),
      color: 'rose',
      desc: t('admins.presetAuditorDesc'),
      permissions: ['users.view', 'analytics.view'],
    },
    {
      label: t('admins.presetModerator'),
      color: 'orange',
      desc: t('admins.presetModeratorDesc'),
      permissions: ['users.view', 'users.edit', 'support.view', 'support.reply'],
    },
  ];
}

export const ROLE_COLORS: Record<string, string> = {
  blue:    'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20',
  violet:  'bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20',
  amber:   'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20',
  rose:    'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20',
  orange:  'bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20',
};

export function buildPassword(rules: { pwdUppercase: boolean; pwdLowercase: boolean; pwdSymbols: boolean }): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const digits  = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.?';

  let pool = digits;
  const required: string[] = [];
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  if (rules.pwdUppercase) { pool += upper;   required.push(pick(upper)); }
  if (rules.pwdLowercase) { pool += lower;   required.push(pick(lower)); }
  if (rules.pwdSymbols)   { pool += symbols; required.push(pick(symbols)); }
  if (!rules.pwdUppercase && !rules.pwdLowercase) pool += lower;

  const chars: string[] = [...required];
  while (chars.length < 18) chars.push(pick(pool));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
