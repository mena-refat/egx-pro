import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { DARK, LIGHT, type AppColors } from '../lib/theme';

export function useTheme(): { colors: AppColors; isDark: boolean; isRTL: boolean } {
  const systemScheme = useColorScheme();

  // Single selector → one subscription, one re-render when user changes
  const { userTheme, language } = useAuthStore((s) => ({
    userTheme: s.user?.theme,
    language:  s.user?.language ?? 'ar',
  }));

  const isDark =
    userTheme === 'light' ? false :
    userTheme === 'dark'  ? true  :
    systemScheme === 'dark';

  return useMemo(
    () => ({ colors: isDark ? DARK : LIGHT, isDark, isRTL: language.startsWith('ar') }),
    [isDark, language],
  );
}
