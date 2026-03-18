export const ADMIN_PERMISSIONS = [
  'users.view',
  'users.edit',
  'users.delete',
  'discounts.view',
  'discounts.create',
  'discounts.edit',
  'discounts.delete',
  'support.view',
  'support.reply',
  'support.assign',
  'analytics.view',
  'audit.view',
  'notifications.send',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function hasPermission(
  admin: { role: string; permissions: string[] },
  permission: AdminPermission
): boolean {
  if (admin.role === 'SUPER_ADMIN') return true;
  return admin.permissions.includes(permission);
}

