import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, TrendingUp, Briefcase, Bot, User } from 'lucide-react-native';

const TAB_ICONS = {
  index: LayoutDashboard,
  market: TrendingUp,
  portfolio: Briefcase,
  ai: Bot,
  profile: User,
};

const TAB_LABELS = {
  index: { ar: 'الرئيسية', en: 'Home' },
  market: { ar: 'السوق', en: 'Market' },
  portfolio: { ar: 'محفظتي', en: 'Portfolio' },
  ai: { ar: 'AI', en: 'AI' },
  profile: { ar: 'حسابي', en: 'Profile' },
};

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#0d0d14',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 0.5,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom || 8,
        },
        tabBarIcon: ({ color, size }) => {
          const Icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
          return Icon ? <Icon size={size} color={color} /> : null;
        },
        tabBarLabel:
          TAB_LABELS[route.name as keyof typeof TAB_LABELS]?.[lang] ?? route.name,
      })}
    />
  );
}

