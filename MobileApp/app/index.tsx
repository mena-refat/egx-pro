import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.isFirstLogin || !user?.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  if (!user?.username) return <Redirect href="/setup-username" />;

  return <Redirect href="/(tabs)" />;
}

