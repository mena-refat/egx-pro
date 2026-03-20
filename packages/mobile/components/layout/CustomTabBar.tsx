import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type React from 'react';
import { I18nManager, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';

const TAB_HEIGHT = 60;
const ICON_SIZE = 20;
const LABEL_FONT_SIZE = 10;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: TAB_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: 8,
        flexDirection: 'row',
      }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const options = descriptor?.options as any;
        const isFocused = state.index === index;

        const tabBarIcon = options?.tabBarIcon as
          | ((props: { color: string; focused: boolean; size?: number }) => React.ReactNode)
          | undefined;

        const tabBarLabel = options?.tabBarLabel ?? route.name;
        const color = isFocused ? BRAND : colors.textMuted;

        const badge = options?.tabBarBadge;
        const badgeText = badge == null ? null : String(badge);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : undefined}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              style={{
                width: 38,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {typeof tabBarIcon === 'function' ? tabBarIcon({ color, focused: isFocused }) : null}

              {/* Keep dot in the tree always to prevent icon "shifts" */}
              <View
                style={{
                  marginTop: 3,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isFocused ? BRAND : 'transparent',
                }}
              />

              {badgeText && badgeText !== '0' && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    ...(isRTL ? { left: -4 } : { right: -4 }),
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ef4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                marginTop: 4,
                fontSize: LABEL_FONT_SIZE,
                fontWeight: '500',
                color: isFocused ? BRAND : colors.textMuted,
                lineHeight: 12,
              }}
              numberOfLines={1}
            >
              {tabBarLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

