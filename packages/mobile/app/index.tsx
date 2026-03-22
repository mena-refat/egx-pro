import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return null;

  // Not authenticated, OR authenticated but no user data loaded yet
  // (can happen on network errors where isAuthenticated is kept from AsyncStorage but user is null)
  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;

  if (user.isFirstLogin || !user.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  if (!user.username) return <Redirect href="/setup-username" />;

  return <Redirect href="/(tabs)" />;
}

