export const PERMS = [
  'users.view',
  'users.edit',
  'users.delete',
  'discounts.view',
  'discounts.manage',
  'support.view',
  'support.reply',
  'support.assign',
  'support.manage',
  'analytics.view',
  'blocklist.manage',
  'notifications.send',
];

export function getPermLabels(t: (k: string) => string): Record<string, string> {
  return {
    'users.view':         t('admins.permUsersView'),
    'users.edit':         t('admins.permUsersEdit'),
    'users.delete':       t('admins.permUsersDelete'),
    'discounts.view':     t('admins.permDiscountsView'),
    'discounts.manage':   t('admins.permDiscountsManage'),
    'support.view':       t('admins.permSupportView'),
    'support.reply':      t('admins.permSupportReply'),
    'support.assign':     t('admins.permSupportAssign'),
    'support.manage':     t('admins.permSupportManage'),
    'analytics.view':     t('admins.permAnalyticsView'),
    'blocklist.manage':   t('admins.permBlocklistManage'),
    'notifications.send': t('admins.permNotificationsSend'),
  };
}

export function getPermGroups(t: (k: string) => string): { label: string; perms: string[] }[] {
  return [
    { label: t('admins.permGroupUsers'),     perms: ['users.view', 'users.edit', 'users.delete'] },
    { label: t('admins.permGroupDiscounts'), perms: ['discounts.view', 'discounts.manage'] },
    { label: t('admins.permGroupSupport'),   perms: ['support.view', 'support.reply', 'support.assign', 'support.manage'] },
    { label: t('admins.permGroupOther'),     perms: ['analytics.view', 'blocklist.manage', 'notifications.send'] },
  ];
}

// Enabling a permission auto-enables these prerequisites
export const PERM_REQUIRES: Record<string, string[]> = {
  'users.edit':       ['users.view'],
  'users.delete':     ['users.view', 'users.edit'],
  'discounts.manage': ['discounts.view'],
  'support.reply':    ['support.view'],
  'support.assign':   ['support.view'],
  'support.manage':   ['support.view', 'support.reply', 'support.assign'],
};

// Disabling a permission auto-disables permissions that need it
export const PERM_BLOCKS: Record<string, string[]> = {
  'users.view':     ['users.edit', 'users.delete'],
  'users.edit':     ['users.delete'],
  'discounts.view': ['discounts.manage'],
  'support.view':   ['support.reply', 'support.assign', 'support.manage'],
  'support.reply':  ['support.manage'],
  'support.assign': ['support.manage'],
};

function disablePerm(perm: string, current: string[]): string[] {
  if (!current.includes(perm)) return current;
  const result = current.filter((p) => p !== perm);
  return (PERM_BLOCKS[perm] ?? []).reduce((acc, blocked) => disablePerm(blocked, acc), result);
}

function enablePerm(perm: string, current: string[]): string[] {
  if (current.includes(perm)) return current;
  const withDeps = (PERM_REQUIRES[perm] ?? []).reduce(
    (acc, req) => enablePerm(req, acc),
    [...current]
  );
  return [...new Set([...withDeps, perm])];
}

export function resolvePermToggle(perm: string, current: string[]): string[] {
  return current.includes(perm) ? disablePerm(perm, current) : enablePerm(perm, current);
}
