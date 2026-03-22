import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Globe, Eye, EyeOff,
  BookOpen, Lock, Unlock, Moon, Sun, Monitor,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/api/client';
import i18n from '../../i18n';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

type LangOption  = 'ar' | 'en';
type ThemeOption = 'dark' | 'light' | 'system';

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
  const { colors, isRTL } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: SPACE.md,
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
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const currentLang   = ((user?.language?.startsWith('ar') ?? true) ? 'ar' : 'en') as LangOption;
  const currentTheme  = (user?.theme ?? 'system') as ThemeOption;
  const shariaMode    = user?.shariaMode ?? false;
  const isPrivate     = (user as { isPrivate?: boolean })?.isPrivate ?? false;
  const showPortfolio = (user as { showPortfolio?: boolean })?.showPortfolio ?? true;

  const LANG_OPTIONS: { id: LangOption; label: string; nativeLabel: string }[] = [
    { id: 'ar', label: t('settings.arabicLang'),   nativeLabel: 'Arabic'  },
    { id: 'en', label: t('settings.englishLang'),  nativeLabel: 'English' },
  ];

  const THEME_OPTIONS: { id: ThemeOption; label: string; Icon: typeof Moon }[] = [
    { id: 'dark',   label: t('settings.dark'),   Icon: Moon    },
    { id: 'system', label: t('settings.system'), Icon: Monitor },
    { id: 'light',  label: t('settings.light'),  Icon: Sun     },
  ];

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
    await i18n.changeLanguage(lang);
    await updateProfile({ language: lang });
  };

  const handleThemeChange = (theme: ThemeOption) => {
    updateUser({ theme });
    void apiClient.put('/api/user/profile', { theme }).catch(() => null);
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
          <Text style={{ color: colors.text, fontSize: FONT.lg, fontWeight: WEIGHT.bold }}>{t('settings.preferencesTitle')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 1 }}>
            {t('profile.preferencesSub')}
          </Text>
        </View>
        {saving && <ActivityIndicator size="small" color={BRAND} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: 48 }}
      >

        {/* ─── Theme ─── */}
        <SectionTitle title={t('settings.appearance')} />
        <View style={{
          flexDirection: 'row', gap: SPACE.sm,
          backgroundColor: colors.card, borderColor: colors.border,
          borderWidth: 1, borderRadius: RADIUS.xl, padding: 6,
          marginBottom: SPACE.sm,
        }}>
          {THEME_OPTIONS.map(({ id, label, Icon }) => {
            const active = currentTheme === id;
            return (
              <Pressable
                key={id}
                onPress={() => handleThemeChange(id)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 11, borderRadius: RADIUS.lg,
                  backgroundColor: active ? BRAND : 'transparent',
                }}
              >
                <Icon size={13} color={active ? '#fff' : colors.textMuted} />
                <Text style={{ color: active ? '#fff' : colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Language ─── */}
        <SectionTitle title={t('settings.languageLabel')} />
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
        <SectionTitle title={t('settings.islamicMode')} />
        <Card>
          <RowItem
            icon={BookOpen}
            label={t('settings.islamicModeTitle')}
            sub={t('settings.islamicModeDesc')}
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
        <SectionTitle title={t('settings.privacyLabel')} />
        <Card>
          <RowItem
            icon={isPrivate ? Lock : Unlock}
            label={t('settings.privateAccount')}
            sub={
              isPrivate
                ? t('settings.privateAccountOn')
                : t('settings.privateAccountOff')
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
            label={t('settings.showPortfolio')}
            sub={
              showPortfolio
                ? t('settings.showPortfolioOn')
                : t('settings.showPortfolioOff')
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
          {t('settings.privacyNote')}
        </Text>

      </ScrollView>
    </ScreenWrapper>
  );
}
