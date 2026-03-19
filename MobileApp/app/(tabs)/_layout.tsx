import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Home, Briefcase, BarChart2, Sparkles, User } from 'lucide-react-native';

const TAB_LABELS: Record<string, { ar: string; en: string }> = {
  index:     { ar: 'الرئيسية', en: 'Home' },
  portfolio: { ar: 'محفظتي',  en: 'Portfolio' },
  market:    { ar: 'الأسواق',  en: 'Markets' },
  ai:        { ar: 'تحليلات', en: 'Analytics' },
  profile:   { ar: 'حسابي',   en: 'Account' },
};

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const tabBarStyle = {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
    height: 56 + insets.bottom,
    paddingBottom: insets.bottom || 8,
    paddingTop: 6,
  };

  const screenOptions = (name: keyof typeof TAB_LABELS) => ({
    headerShown: false,
    tabBarActiveTintColor: '#8b5cf6' as string,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle,
    tabBarLabel: TAB_LABELS[name]?.[lang] ?? name,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const, marginTop: 1 },
  });

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ ...screenOptions('index'), tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ ...screenOptions('portfolio'), tabBarIcon: ({ color, size }) => <Briefcase size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="market"
        options={{ ...screenOptions('market'), tabBarIcon: ({ color, size }) => <BarChart2 size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="ai"
        options={{ ...screenOptions('ai'), tabBarIcon: ({ color, size }) => <Sparkles size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ ...screenOptions('profile'), tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} /> }}
      />
    </Tabs>
  );
}
