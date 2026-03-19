import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches unhandled render errors anywhere in the component tree.
 * Without this, any crash brings down the entire app with no recovery path.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0d1117',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 16,
        }}
      >
        <Text style={{ color: '#e6edf3', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
          حدث خطأ غير متوقع
        </Text>
        <Text style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', lineHeight: 22 }}>
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
