import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  // Only redirect away from auth screens when we have confirmed auth AND loaded user data
  if (!isLoading && isAuthenticated && user) return <Redirect href="/" />;

  return (
    <>
      {/* Auth screens use a dark hero section — always light-content StatusBar */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#090e1a' },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
