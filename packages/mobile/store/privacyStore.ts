import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivacyState {
  isBalanceHidden: boolean;
  toggleBalance: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      isBalanceHidden: false,
      toggleBalance: () => set((s) => ({ isBalanceHidden: !s.isBalanceHidden })),
    }),
    {
      name: 'borsa-mobile-privacy',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
