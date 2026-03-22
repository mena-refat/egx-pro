import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Briefcase, BarChart3, Sparkles, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useWatchlistTargets } from '../../hooks/useWatchlistTargets';
import { BRAND } from '../../lib/theme';

type TabName = 'index' | 'portfolio' | 'market' | 'ai' | 'profile';

/** Invisible component — monitors watchlist price targets and fires push notifications. */
function WatchlistTargetMonitor() {
  const { items } = useWatchlist();
  const tickers = items
    .filter((w) => (w as unknown as { targetPrice?: number | null }).targetPrice != null)
    .map((w) => w.ticker);
  const { prices } = useLivePrices(tickers);
  useWatchlistTargets(
    items as unknown as { ticker: string; targetPrice?: number | null; targetDirection?: 'UP' | 'DOWN' | null }[],
    prices as Record<string, { price: number }>,
  );
  return null;
}

const TAB_LABELS: Record<TabName, { ar: string; en: string }> = {
  index:     { ar: 'الرئيسية', en: 'Home' },
  portfolio: { ar: 'محفظتي',   en: 'Portfolio' },
  market:    { ar: 'السوق',  en: 'Markets' },
  ai:        { ar: 'الذكاء',   en: 'AI' },
  profile:   { ar: 'حسابي',    en: 'Profile' },
};

const TAB_ICONS: Record<TabName, React.ComponentType<{ size?: number; color?: string }>> = {
  index: House,
  market: BarChart3,
  portfolio: Briefcase,
  ai: Sparkles,
  profile: User,
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
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Icon size={22} color={color} />
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: BRAND,
          }}
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { i18n }        = useTranslation();
  const insets          = useSafeAreaInsets();
  const { colors, isRTL } = useTheme();
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

  const screenOptions = (name: TabName) => ({
    headerShown:          false,
    tabBarActiveTintColor: BRAND,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle,
    tabBarLabel:          TAB_LABELS[name]?.[lang] ?? name,
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle:     { fontSize: 10, fontWeight: '500' as const },
    tabBarItemStyle:      { paddingVertical: 0 },
  });

  const tabOrder: TabName[] = isRTL
    ? ['profile', 'ai', 'portfolio', 'market', 'index']
    : ['index', 'market', 'portfolio', 'ai', 'profile'];

  return (
    <>
    <WatchlistTargetMonitor />
    <Tabs>
      {tabOrder.map((name) => {
        const Icon = TAB_ICONS[name];

        const extraOptions =
          name === 'profile'
            ? {
                tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
                tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 9, minWidth: 16, height: 16 },
              }
            : {};

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              ...screenOptions(name),
              ...extraOptions,
              tabBarIcon: ({ color, focused }) => <TabIcon Icon={Icon} color={color} focused={focused} />,
            }}
          />
        );
      })}
    </Tabs>
    </>
  );
}
