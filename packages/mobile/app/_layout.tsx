import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import Constants from 'expo-constants';
import i18n from '../i18n';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { ToastProvider } from '../components/ui/Toast';
import { I18nManager } from 'react-native';

SplashScreen.preventAutoHideAsync();

// Push notifications are not supported in Expo Go SDK 53+
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export default function RootLayout() {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    checkAuth().finally(() => {
      SplashScreen.hideAsync();
    });
  }, [checkAuth]);

  // Sync RTL with current language
  useEffect(() => {
    const isRTL = i18n.language?.startsWith('ar');
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // ملاحظة: لتطبيق التغيير بالكامل قد تحتاج لإعادة تشغيل التطبيق يدوياً
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isExpoGo) {
      import('../lib/notifications')
        .then(({ registerPushToken }) => registerPushToken())
        .catch(() => null);
    }
  }, [isAuthenticated, isExpoGo]);

  if (isLoading) return null;

  return (
    <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <SafeAreaProvider>
          <ToastProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
            <Stack.Screen
              name="onboarding/index"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="setup-username"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="stocks/[ticker]"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="predictions/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="goals/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="notifications"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/account"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/security"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/notifications"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/biometric"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="settings/subscription"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ai/analyze"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ai/compare"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ai/recommendations"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="calculator/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="support/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="referral/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="achievements/index"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="news/index"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
    </ErrorBoundary>
  );
}

