export const ADMIN_PERMISSIONS = [
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
  'notifications.send',
  'blocklist.manage',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// Permissions implied by compound permissions
const IMPLIED: Record<string, string[]> = {
  'discounts.manage': ['discounts.view', 'discounts.create', 'discounts.edit', 'discounts.delete'],
  'support.manage':   ['support.view', 'support.reply', 'support.assign'],
};

export function hasPermission(
  admin: { role: string; permissions: string[] },
  permission: AdminPermission | string
): boolean {
  if (admin.role === 'SUPER_ADMIN') return true;
  if (admin.permissions.includes(permission)) return true;
  // Check if any compound permission implies the requested one
  for (const [compound, implied] of Object.entries(IMPLIED)) {
    if (admin.permissions.includes(compound) && implied.includes(permission)) return true;
  }
  return false;
}

