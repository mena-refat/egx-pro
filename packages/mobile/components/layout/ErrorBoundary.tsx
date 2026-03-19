import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AppColors } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';

interface BaseProps {
  children: ReactNode;
  colors: AppColors;
}

interface State {
  hasError: boolean;
}

/**
 * Catches unhandled render errors anywhere in the component tree.
 * Without this, any crash brings down the entire app with no recovery path.
 */
class ErrorBoundaryBase extends Component<BaseProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { colors } = this.props;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
          حدث خطأ غير متوقع
        </Text>
        <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', lineHeight: 22 }}>
          نأسف على ذلك. يرجى إعادة تشغيل التطبيق.
        </Text>
        <Pressable
          onPress={() => this.setState({ hasError: false })}
          style={{
            backgroundColor: '#8b5cf6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>حاول مرة أخرى</Text>
        </Pressable>
      </View>
    );
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <ErrorBoundaryBase colors={colors}>{children}</ErrorBoundaryBase>;
}
