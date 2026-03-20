import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Briefcase, BarChart3, Sparkles, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { BRAND } from '../../lib/theme';

const TAB_LABELS: Record<string, { ar: string; en: string }> = {
  index:     { ar: 'الرئيسية', en: 'Home' },
  portfolio: { ar: 'محفظتي',   en: 'Portfolio' },
  market:    { ar: 'الأسواق',  en: 'Markets' },
  ai:        { ar: 'الذكاء',   en: 'AI' },
  profile:   { ar: 'حسابي',    en: 'Profile' },
};

const TAB_HEIGHT = 60;

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={tabIconContainerStyle}>
      <Icon size={22} color={color} />
      {/* Always render the dot to avoid any layout shift when focused/unfocused */}
      <View
        style={{
          position: 'absolute',
          bottom: -1,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: focused ? BRAND : 'transparent',
        }}
      />
    </View>
  );
}

const tabIconContainerStyle = {
  width: 38,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { i18n }        = useTranslation();
  const insets          = useSafeAreaInsets();
  const { colors }      = useTheme();
  const unreadCount     = useUnreadCount();
  const lang            = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const tabBarStyle = {
    backgroundColor:  colors.card,
    borderTopColor:   colors.border,
    borderTopWidth:   1,
    height:           TAB_HEIGHT + insets.bottom,
    paddingBottom:    insets.bottom,
    paddingTop:       8,
    elevation:        0,
  };

  const screenOptions = (name: keyof typeof TAB_LABELS) => ({
    headerShown:          false,
    tabBarActiveTintColor: BRAND,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle,
    tabBarLabel:          TAB_LABELS[name]?.[lang] ?? name,
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle:     { fontSize: 10, fontWeight: '500' as const },
    tabBarItemStyle:      { paddingVertical: 0 },
  });

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          ...screenOptions('index'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={House} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          ...screenOptions('market'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={BarChart3} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          ...screenOptions('portfolio'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Briefcase} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          ...screenOptions('ai'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Sparkles} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          ...screenOptions('profile'),
          tabBarBadge:      unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 9, minWidth: 16, height: 16 },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
