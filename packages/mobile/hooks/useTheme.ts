import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { DARK, LIGHT, type AppColors } from '../lib/theme';

export function useTheme(): { colors: AppColors; isDark: boolean; isRTL: boolean } {
  const systemScheme = useColorScheme();
  const userTheme = useAuthStore((s) => s.user?.theme);
  const language  = useAuthStore((s) => s.user?.language ?? 'ar');

  const isDark =
    userTheme === 'light' ? false :
    userTheme === 'dark'  ? true  :
    systemScheme === 'dark';

  return { colors: isDark ? DARK : LIGHT, isDark, isRTL: language.startsWith('ar') };
}
