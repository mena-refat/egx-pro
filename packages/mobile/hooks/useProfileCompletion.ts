import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import apiClient from '../lib/api/client';

export type CompletionField = 'email' | 'phone' | 'username' | 'goal' | 'watchlist';

export interface ProfileCompletionData {
  percentage: number;
  missing: Array<{ field: CompletionField; route: string }>;
}

// Map backend web routes → mobile routes
const MOBILE_ROUTES: Record<CompletionField, string> = {
  email:     '/settings/account',
  phone:     '/settings/account',
  username:  '/settings/account',
  goal:      '/goals',
  watchlist: '/(tabs)/market',
};

export const FIELD_LABELS: Record<CompletionField, string> = {
  email:     'بريد إلكتروني',
  phone:     'رقم موبايل',
  username:  'تغيير اسم المستخدم',
  goal:      'هدف مالي',
  watchlist: 'سهم في القائمة',
};

export function useProfileCompletion() {
  const [data, setData] = useState<ProfileCompletionData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<ProfileCompletionData>('/api/profile/completion');
      const raw = res.data;
      setData({
        percentage: raw.percentage,
        missing: raw.missing.map((m) => ({
          field: m.field,
          route: MOBILE_ROUTES[m.field],
        })),
      });
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  return { data, loading };
}
