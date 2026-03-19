import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { colors } = useTheme();
  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}


