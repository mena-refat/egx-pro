import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminAuthStore';
import { PermissionGuard } from './PermissionGuard';

export function AdminLayout() {
  const admin = useAdminStore((s) => s.admin);
  const logout = useAdminStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-4">
        <div className="font-semibold text-lg">Borsa Admin</div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link to="/" className="hover:text-emerald-300">
            Dashboard
          </Link>
          <PermissionGuard permission="users.view">
            <Link to="/users" className="hover:text-emerald-300">
              Users
            </Link>
          </PermissionGuard>
          <PermissionGuard permission="discounts.view">
            <Link to="/discounts" className="hover:text-emerald-300">
              Discounts
            </Link>
          </PermissionGuard>
          <PermissionGuard permission="support.view">
            <Link to="/support" className="hover:text-emerald-300">
              Support
            </Link>
          </PermissionGuard>
          <PermissionGuard permission="notifications.send">
            <Link to="/notifications" className="hover:text-emerald-300">
              Broadcast
            </Link>
          </PermissionGuard>
          {admin?.role === 'SUPER_ADMIN' && (
            <Link to="/admins" className="hover:text-emerald-300">
              Admins
            </Link>
          )}
          <PermissionGuard permission="audit.view">
            <Link to="/audit" className="hover:text-emerald-300">
              Audit Log
            </Link>
          </PermissionGuard>
        </nav>
        <div className="mt-auto text-xs text-slate-400">
          {admin && (
            <div className="space-y-1">
              <div>{admin.fullName}</div>
              <div className="text-slate-500">{admin.email}</div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 text-rose-300 hover:text-rose-200"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

