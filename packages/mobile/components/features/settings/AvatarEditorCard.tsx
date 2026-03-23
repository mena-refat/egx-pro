import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '../../../hooks/useTheme';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../lib/api/client';
import { BRAND } from '../../../lib/theme';

export function AvatarEditorCard() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [uploading, setUploading] = useState(false);

  const pickAndUploadAvatar = async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('صلاحية مطلوبة', 'لازم تسمح بالوصول للصور عشان تغيّر الصورة الشخصية.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('تعذر الرفع', 'لم نتمكن من قراءة الصورة. جرّب صورة أخرى.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const image = `data:${mimeType};base64,${asset.base64}`;

    setUploading(true);
    try {
      const res = await apiClient.post('/api/user/avatar', { image });
      const body = res.data as { data?: { avatarUrl?: string }; avatarUrl?: string };
      const avatarUrl = body.data?.avatarUrl ?? body.avatarUrl ?? null;
      updateUser({ avatarUrl });
    } catch {
      Alert.alert('فشل الرفع', 'حدث خطأ أثناء رفع الصورة، حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Pressable
        onPress={() => void pickAndUploadAvatar()}
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: `${BRAND}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <Text style={{ fontSize: 30, fontWeight: '800', color: BRAND }}>
            {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        )}

        {uploading && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#00000055',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </Pressable>

      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        {uploading ? 'جاري رفع الصورة...' : 'اضغط لتغيير الصورة'}
      </Text>
    </View>
  );
}
