import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { DARK, LIGHT, type AppColors } from '../lib/theme';

export function useTheme(): { colors: AppColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const userTheme = useAuthStore((s) => s.user?.theme);

  const isDark =
    userTheme === 'light' ? false :
    userTheme === 'dark'  ? true  :
    systemScheme === 'dark'; // تلقائي: يتبع إعداد الجهاز

  return { colors: isDark ? DARK : LIGHT, isDark };
}
