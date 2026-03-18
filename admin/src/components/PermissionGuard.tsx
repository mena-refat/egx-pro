import type { ReactNode } from 'react';
import { useAdminStore } from '../store/adminAuthStore';

interface Props {
  permission: string;
  children: ReactNode;
}

export function PermissionGuard({ permission, children }: Props) {
  const hasPermission = useAdminStore((s) => s.hasPermission);
  if (!hasPermission(permission)) return null;
  return <>{children}</>;
}

