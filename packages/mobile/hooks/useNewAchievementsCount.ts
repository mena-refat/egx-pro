import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/api/client';

const STORAGE_KEY = 'borsa-seen-achievements';

/** Call this when the user visits the achievements screen to clear the badge. */
export async function markAchievementsSeen(completedIds: string[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
  } catch { /* non-critical */ }
}

/** Returns the backend IDs that are completed but not yet seen by the user. */
export async function getUnseenIds(completedIds: string[]): Promise<string[]> {
  try {
    const seenJson = await AsyncStorage.getItem(STORAGE_KEY);
    const seen: string[] = seenJson ? (JSON.parse(seenJson) as string[]) : [];
    return completedIds.filter((id) => !seen.includes(id));
  } catch {
    return [];
  }
}

/** Returns the count of completed achievements the user hasn't seen yet. */
export function useNewAchievementsCount() {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/user/achievements');
      const raw: { id: string; completed?: boolean }[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as { data?: unknown[] }).data)
          ? (res.data as { data: { id: string; completed?: boolean }[] }).data
          : [];

      const completedIds = raw.filter((a) => a.completed).map((a) => a.id);
      const seenJson = await AsyncStorage.getItem(STORAGE_KEY);
      const seen: string[] = seenJson ? (JSON.parse(seenJson) as string[]) : [];
      setCount(completedIds.filter((id) => !seen.includes(id)).length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);
  useFocusEffect(useCallback(() => { void check(); }, [check]));

  return count;
}
