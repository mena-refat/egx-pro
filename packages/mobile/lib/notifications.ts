import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './api/client';

const isExpoGo = Constants.appOwnership === 'expo';

export async function registerPushToken(): Promise<void> {
  // Push tokens not supported in Expo Go SDK 53+
  if (isExpoGo) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Borsa Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });
    }

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
      // Project not yet linked to EAS — push tokens unavailable.
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiClient.post('/api/mobile/push-token', {
      token: token.data,
      platform: Platform.OS,
    });
  } catch {
    // non-critical — ignore silently
  }
}
