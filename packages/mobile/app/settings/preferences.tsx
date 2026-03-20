import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Switch,
  ActivityIndicator, I18nManager, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Globe, Eye, EyeOff,
  BookOpen, Lock, Unlock,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';
import i18n from '../../i18n';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type LangOption = 'ar' | 'en';

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{
      color: colors.textMuted, fontSize: FONT.xs, fontWeight: WEIGHT.semibold,
      textTransform: 'uppercase', letterSpacing: 0.8,
      paddingHorizontal: 4, marginBottom: SPACE.sm, marginTop: SPACE.md,
    }}>
      {title}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.card, borderColor: colors.border,
      borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

function RowItem({
  icon: Icon, label, sub, right, last = false, onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingVertical: 14,
        backgroundColor: pressed && onPress ? colors.hover : 'transparent',
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: RADIUS.lg,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${colors.textSub}15`,
      }}>
        <Icon size={16} color={colors.textSub} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>{label}</Text>
        {sub && <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

export default function PreferencesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const BackIcon = I18nManager.isRTL ? ArrowRight : ArrowLeft;

  const currentLang   = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as LangOption;
  const shariaMode    = user?.shariaMode ?? false;
  const isPrivate     = (user as { isPrivate?: boolean })?.isPrivate ?? false;
  const showPortfolio = (user as { showPortfolio?: boolean })?.showPortfolio ?? true;

  const updateProfile = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      updateUser(patch as Parameters<typeof updateUser>[0]);
      await apiClient.put('/api/user/profile', patch);
    } catch {
      /* ignore — local update already applied */
    } finally {
      setSaving(false);
    }
  };

  const updateSocialSettings = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      updateUser(patch as Parameters<typeof updateUser>[0]);
      await apiClient.patch('/api/social/settings', patch);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleLangChange = async (lang: LangOption) => {
    const isRTL = lang === 'ar';

    // Update i18n language
    await i18n.changeLanguage(lang);

    // Update RTL — on Android needs app restart, iOS adjusts live
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      Alert.alert(
        lang === 'ar' ? 'تغيير اللغة' : 'Language Change',
        lang === 'ar'
          ? 'سيتم تطبيق التغيير عند إعادة تشغيل التطبيق'
          : 'Change will take effect after restarting the app',
        [{ text: lang === 'ar' ? 'حسناً' : 'OK' }],
      );
    }

    // Persist to server
    await updateProfile({ language: lang });
  };

  const LANG_OPTIONS: { id: LangOption; label: string; nativeLabel: string }[] = [
    { id: 'ar', label: 'العربية', nativeLabel: 'Arabic' },
    { id: 'en', label: 'الإنجليزية', nativeLabel: 'English' },
  ];

  return (
    <ScreenWrapper padded={false}>
      {/* ─── Header ─── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
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
          <Text style={{ color: colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>التفضيلات</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }}>
            اللغة والخصوصية والوضع الإسلامي
          </Text>
        </View>
        {saving && <ActivityIndicator size="small" color={BRAND} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: 48 }}
      >

        {/* ─── Language ─── */}
        <SectionTitle title="اللغة" />
        <View style={{
          flexDirection: 'row', gap: SPACE.sm,
          backgroundColor: colors.card, borderColor: colors.border,
          borderWidth: 1, borderRadius: RADIUS.xl, padding: 6,
        }}>
          {LANG_OPTIONS.map(({ id, label, nativeLabel }) => {
            const active = currentLang === id;
            return (
              <Pressable
                key={id}
                onPress={() => void handleLangChange(id)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 11, borderRadius: RADIUS.lg,
                  backgroundColor: active ? BRAND : 'transparent',
                }}
              >
                <Globe size={13} color={active ? '#fff' : colors.textMuted} />
                <View>
                  <Text style={{ color: active ? '#fff' : colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                    {label}
                  </Text>
                  <Text style={{ color: active ? '#fff' : colors.textMuted, fontSize: 10 }}>{nativeLabel}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Sharia Mode ─── */}
        <SectionTitle title="الوضع الإسلامي" />
        <Card>
          <RowItem
            icon={BookOpen}
            label="وضع الشريعة الإسلامية"
            sub="إظهار الأسهم المتوافقة مع الشريعة فقط"
            last
            right={
              <Switch
                value={shariaMode}
                onValueChange={(v) => void updateProfile({ shariaMode: v })}
                trackColor={{ false: colors.border, true: BRAND }}
                thumbColor="#fff"
              />
            }
          />
        </Card>

        {/* ─── Privacy ─── */}
        <SectionTitle title="الخصوصية" />
        <Card>
          <RowItem
            icon={isPrivate ? Lock : Unlock}
            label="حساب خاص"
            sub={
              isPrivate
                ? 'فقط المتابَعون يرون محفظتك وتوقعاتك'
                : 'حسابك عام — يمكن للجميع رؤية نشاطك'
            }
            right={
              <Switch
                value={isPrivate}
                onValueChange={(v) => void updateSocialSettings({ isPrivate: v })}
                trackColor={{ false: colors.border, true: BRAND }}
                thumbColor="#fff"
              />
            }
          />
          <RowItem
            icon={showPortfolio ? Eye : EyeOff}
            label="إظهار المحفظة"
            sub={
              showPortfolio
                ? 'المتابعون يرون تفاصيل محفظتك'
                : 'محفظتك مخفية عن الجميع'
            }
            last
            right={
              <Switch
                value={showPortfolio}
                onValueChange={(v) => void updateSocialSettings({ showPortfolio: v })}
                trackColor={{ false: colors.border, true: BRAND }}
                thumbColor="#fff"
              />
            }
          />
        </Card>

        {/* Info note */}
        <Text style={{
          color: colors.textMuted, fontSize: FONT.xs,
          lineHeight: 18, textAlign: 'center',
          marginTop: SPACE.lg, paddingHorizontal: SPACE.sm,
        }}>
          تغييرات الخصوصية تنطبق فوراً على ملفك الشخصي وقائمة المتابعة.
        </Text>

      </ScrollView>
    </ScreenWrapper>
  );
}
