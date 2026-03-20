import { type ReactNode } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ErrorBoundary } from './ErrorBoundary';
import { Skeleton } from '../ui/Skeleton';
import { SPACE } from '../../lib/theme';

interface Props {
  children?:     ReactNode;
  scrollable?:   boolean;
  refreshing?:   boolean;
  onRefresh?:    () => void;
  padded?:       boolean;
  withKeyboard?: boolean;
  edges?:        Edge[];
  contentStyle?: ViewStyle;
  header?:       ReactNode;
  footer?:       ReactNode;
  loading?:      boolean;
}

export function ScreenWrapper({
  children,
  scrollable   = false,
  refreshing   = false,
  onRefresh,
  padded       = true,
  withKeyboard = false,
  edges        = ['top'],
  contentStyle,
  header,
  footer,
  loading      = false,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Full-screen loading skeleton
  if (loading) {
    return (
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, padding: SPACE.lg, gap: SPACE.md }}>
          <Skeleton.Box height={120} radius={16} />
          <Skeleton.Line width="80%" height={16} />
          <Skeleton.Line width="60%" height={14} />
          <Skeleton.Box height={80} radius={12} />
          <Skeleton.Box height={80} radius={12} />
          <Skeleton.Box height={80} radius={12} />
        </View>
      </SafeAreaView>
    );
  }

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingHorizontal: padded ? SPACE.lg : 0,
          paddingTop:        padded ? SPACE.sm  : 0,
          paddingBottom:     Math.max(SPACE['2xl'], insets.bottom + SPACE.lg),
          flexGrow:          1,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, paddingHorizontal: padded ? SPACE.lg : 0 },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const inner = withKeyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {content}
    </KeyboardAvoidingView>
  ) : content;

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ErrorBoundary>
        {header && <View>{header}</View>}
        {inner}
        {footer && (
          <View style={{ paddingBottom: insets.bottom || SPACE.sm }}>
            {footer}
          </View>
        )}
      </ErrorBoundary>
    </SafeAreaView>
  );
}
