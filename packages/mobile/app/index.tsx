import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const user            = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090e1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  // Not authenticated, OR authenticated but no user data loaded yet
  // (can happen on network errors where isAuthenticated is kept from AsyncStorage but user is null)
  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;

  if (user.isFirstLogin || !user.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  if (!user.username) return <Redirect href="/setup-username" />;

  return <Redirect href="/(tabs)" />;
}

