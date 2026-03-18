import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from './api/client';

export async function registerPushToken(): Promise<void> {
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
      lightColor: '#10b981',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    await apiClient.post('/api/user/push-token', {
      token: token.data,
      platform: Platform.OS,
    });
  } catch {
    // non-critical
  }
}

