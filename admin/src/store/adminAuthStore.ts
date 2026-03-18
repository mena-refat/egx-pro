import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  mustChangePassword?: boolean;
  mustSetup2FA?: boolean;
}

interface AdminState {
  token: string | null;
  admin: AdminInfo | null;
  setAuth: (token: string, admin: AdminInfo) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => set({ token, admin }),
      logout: () => set({ token: null, admin: null }),
      hasPermission: (permission) => {
        const admin = get().admin;
        if (!admin) return false;
        if (admin.role === 'SUPER_ADMIN') return true;
        return admin.permissions.includes(permission);
      },
    }),
    {
      name: 'borsa-admin-auth',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
      }),
    }
  )
);

