import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAdminStore } from './store/adminAuthStore';
import { AdminLayout } from './components/AdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import './i18n';
import './index.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminsPage = lazy(() => import('./pages/AdminsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const RevenuePage = lazy(() => import('./pages/RevenuePage'));
const AdminAccountPage = lazy(() => import('./pages/AdminAccountPage'));

function App() {
  const admin = useAdminStore((s) => s.admin);

  if (!admin) {
    return (
      <BrowserRouter basename="/admin">
        <Suspense fallback={<div />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  const perms = admin.permissions ?? [];
  const isSuperAdmin = admin.role === 'SUPER_ADMIN';
  const canSeeDashboard = isSuperAdmin || perms.includes('analytics.view');

  // First accessible page for redirect
  const defaultRoute = canSeeDashboard ? '/'
    : perms.some((p) => ['support.view', 'support.manage', 'support.reply'].includes(p)) ? '/support'
    : perms.includes('users.view') ? '/users'
    : perms.some((p) => ['discounts.view', 'discounts.manage'].includes(p)) ? '/discounts'
    : perms.includes('notifications.send') ? '/notifications'
    : '/account';

  return (
    <BrowserRouter basename="/admin">
      <ErrorBoundary>
        <Suspense fallback={<div />}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/" element={canSeeDashboard ? <DashboardPage /> : <Navigate to={defaultRoute} replace />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/discounts" element={<DiscountsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/account" element={<AdminAccountPage />} />
              {isSuperAdmin && (
                <Route path="/admins" element={<AdminsPage />} />
              )}
              {isSuperAdmin && (
                <Route path="/audit" element={<AuditLogPage />} />
              )}
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

