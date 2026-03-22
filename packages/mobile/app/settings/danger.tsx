import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Trash2, AlertTriangle,
  Lock, CheckCircle,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

const DANGER_RED = '#ef4444';
const DANGER_BG  = '#ef444412';

export default function DangerZonePage() {
  const router  = useRouter();
  const { colors, isRTL } = useTheme();
  const { logout } = useAuthStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword]               = useState('');
  const [confirmText, setConfirmText]         = useState('');
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState<string | null>(null);
  const [showSuccess, setShowSuccess]         = useState(false);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const CONFIRM_KEYWORD = 'حذف';

  const handleDeleteAccount = async () => {
    if (confirmText.trim() !== CONFIRM_KEYWORD) {
      setDeleteError(`اكتب كلمة "${CONFIRM_KEYWORD}" للتأكيد`);
      return;
    }
    if (!password.trim()) {
      setDeleteError('أدخل كلمة المرور للتأكيد');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete('/api/user/account', {
        data: { password: password.trim(), confirmText: confirmText.trim() },
      });
      setShowDeleteModal(false);
      setShowSuccess(true);
      // Give user time to read the success message then log out
      setTimeout(async () => {
        await logout();
        router.replace('/(auth)/login');
      }, 3000);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'INVALID_PASSWORD' || code === 'WRONG_PASSWORD') {
        setDeleteError('كلمة المرور غير صحيحة');
      } else if (code === 'INVALID_CONFIRMATION') {
        setDeleteError(`اكتب كلمة "${CONFIRM_KEYWORD}" بالضبط`);
      } else {
        setDeleteError('حدث خطأ — حاول مرة أخرى');
      }
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    Alert.alert(
      'حذف الحساب',
      'هذا الإجراء لا يمكن التراجع عنه. ستُحذف جميع بياناتك نهائياً بعد 30 يوماً.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'متابعة',
          style: 'destructive',
          onPress: () => {
            setPassword('');
            setConfirmText('');
            setDeleteError(null);
            setShowDeleteModal(true);
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper padded={false}>
      {/* ─── Header ─── */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: RADIUS.xl,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.hover, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <BackIcon size={16} color={colors.textSub} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: DANGER_RED, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>المنطقة الخطرة</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }}>
            إجراءات لا يمكن التراجع عنها
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 48 }}>

        {/* ─── Warning Banner ─── */}
        <View style={{
          backgroundColor: DANGER_BG, borderColor: DANGER_RED + '30',
          borderWidth: 1, borderRadius: RADIUS.xl,
          padding: SPACE.lg, marginBottom: SPACE.lg,
          flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md,
        }}>
          <AlertTriangle size={20} color={DANGER_RED} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: DANGER_RED, fontSize: FONT.sm, fontWeight: WEIGHT.bold, marginBottom: 4 }}>
              تحذير
            </Text>
            <Text style={{ color: colors.textSub, fontSize: FONT.xs, lineHeight: 18 }}>
              الإجراءات في هذه الصفحة خطيرة وقد تؤدي إلى فقدان بياناتك بشكل دائم. تأكد من قرارك قبل المتابعة.
            </Text>
          </View>
        </View>

        {/* ─── Delete Account Card ─── */}
        <View style={{
          backgroundColor: colors.card, borderColor: DANGER_RED + '30',
          borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.lg, gap: SPACE.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <View style={{
              width: 44, height: 44, borderRadius: RADIUS.lg,
              backgroundColor: DANGER_BG, alignItems: 'center', justifyContent: 'center',
            }}>
              <Trash2 size={20} color={DANGER_RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>حذف الحساب</Text>
              <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>
                حذف نهائي لجميع بياناتك
              </Text>
            </View>
          </View>

          <View style={{ gap: SPACE.sm }}>
            {[
              'ستُحذف محفظتك وتوقعاتك وأهدافك',
              'لن تتمكن من استعادة حسابك بعد 30 يوماً',
              'سيُلغى اشتراكك الحالي دون استرداد',
              'سيتم حذف جميع بياناتك الشخصية',
            ].map((item) => (
              <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: DANGER_RED, marginTop: 6,
                }} />
                <Text style={{ color: colors.textSub, fontSize: FONT.xs, lineHeight: 18, flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={{
            backgroundColor: colors.bg, borderRadius: RADIUS.lg,
            padding: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
          }}>
            <Lock size={13} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: FONT.xs, flex: 1, lineHeight: 16 }}>
              لديك 30 يوماً لإلغاء حذف الحساب عبر تسجيل الدخول مجدداً
            </Text>
          </View>

          <Pressable
            onPress={openDeleteModal}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#dc2626' : DANGER_RED,
              borderRadius: RADIUS.xl, paddingVertical: 14,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: SPACE.sm,
            })}
          >
            <Trash2 size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
              حذف حسابي نهائياً
            </Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!deleting) setShowDeleteModal(false); }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000060' }}
          onPress={() => { if (!deleting) setShowDeleteModal(false); }}
        />
        <View style={{
          backgroundColor: colors.card, borderTopColor: colors.border,
          borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: SPACE.lg, paddingBottom: 40, gap: SPACE.md,
        }}>
          {/* Modal header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: DANGER_RED, fontSize: FONT.md, fontWeight: WEIGHT.bold }}>
              تأكيد حذف الحساب
            </Text>
            {!deleting && (
              <Pressable onPress={() => setShowDeleteModal(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
              </Pressable>
            )}
          </View>

          {/* Error */}
          {deleteError && (
            <View style={{
              backgroundColor: DANGER_BG, borderColor: DANGER_RED + '30',
              borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACE.md,
            }}>
              <Text style={{ color: DANGER_RED, fontSize: FONT.xs }}>{deleteError}</Text>
            </View>
          )}

          {/* Confirm keyword */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSub, fontSize: FONT.xs }}>
              اكتب كلمة{' '}
              <Text style={{ color: DANGER_RED, fontWeight: WEIGHT.bold }}>"{CONFIRM_KEYWORD}"</Text>
              {' '}للتأكيد
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={CONFIRM_KEYWORD}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              editable={!deleting}
              style={{
                color: DANGER_RED, backgroundColor: colors.bg,
                borderColor: confirmText === CONFIRM_KEYWORD ? DANGER_RED + '60' : colors.border,
                borderWidth: 1, borderRadius: RADIUS.xl,
                paddingHorizontal: SPACE.md, paddingVertical: 12,
                fontSize: FONT.sm, fontWeight: WEIGHT.bold, textAlign: 'right',
              }}
            />
          </View>

          {/* Password */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSub, fontSize: FONT.xs }}>كلمة المرور الحالية</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!deleting}
              style={{
                color: colors.text, backgroundColor: colors.bg,
                borderColor: colors.border, borderWidth: 1,
                borderRadius: RADIUS.xl,
                paddingHorizontal: SPACE.md, paddingVertical: 12,
                fontSize: FONT.sm, textAlign: 'right',
              }}
            />
          </View>

          {/* Confirm button */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleting || confirmText !== CONFIRM_KEYWORD || !password}
            style={{
              backgroundColor: DANGER_RED, borderRadius: RADIUS.xl,
              paddingVertical: 14, alignItems: 'center',
              opacity: (deleting || confirmText !== CONFIRM_KEYWORD || !password) ? 0.5 : 1,
            }}
          >
            {deleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
                  تأكيد الحذف النهائي
                </Text>
            }
          </Pressable>
        </View>
      </Modal>

      {/* ─── Success Modal (after deletion) ─── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: SPACE.xl }}>
          <View style={{
            backgroundColor: colors.card, borderRadius: RADIUS.xl,
            padding: SPACE.xl, alignItems: 'center', gap: SPACE.md, width: '100%',
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#4ade8020', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={32} color="#4ade80" />
            </View>
            <Text style={{ color: colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>
              تم جدولة الحذف
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 }}>
              سيُحذف حسابك نهائياً بعد 30 يوماً. يمكنك إلغاء الحذف بتسجيل الدخول خلال هذه المدة.
            </Text>
            <Text style={{ color: BRAND, fontSize: FONT.xs }}>جاري تسجيل الخروج...</Text>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
