import { ReactNode } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  children: ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  withKeyboard?: boolean;
}

export function ScreenWrapper({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  padded = true,
  withKeyboard = false,
}: Props) {
  const { colors } = useTheme();

  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: padded ? 16 : 0, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
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
    <View className={`flex-1 ${padded ? 'px-4' : ''}`}>{children}</View>
  );

  const inner = withKeyboard ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {inner}
    </SafeAreaView>
  );
}
