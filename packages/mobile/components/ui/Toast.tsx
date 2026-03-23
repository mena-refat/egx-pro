import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react-native';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Single Toast Item ────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { color: string; bg: string; border: string; Icon: typeof CheckCircle }> = {
  success: { color: '#4ade80', bg: '#4ade8012', border: '#4ade8030', Icon: CheckCircle },
  error:   { color: '#f87171', bg: '#f8717112', border: '#f8717130', Icon: AlertTriangle },
  warning: { color: '#fbbf24', bg: '#fbbf2412', border: '#fbbf2430', Icon: AlertTriangle },
  info:    { color: BRAND,     bg: BRAND + '12', border: BRAND + '30', Icon: Info },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const cfg = VARIANT_CONFIG[toast.variant];
  const Icon = cfg.Icon;
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (done) => {
      if (done) runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, translateY, opacity, onDismiss]);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    const duration = toast.duration ?? 3500;
    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, { marginBottom: SPACE.sm }]}>
      <Pressable
        onPress={dismiss}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
          backgroundColor: colors.card, borderWidth: 1,
          borderColor: cfg.border, borderRadius: RADIUS.xl,
          paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm + 2,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
        }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: RADIUS.md,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: cfg.bg,
        }}>
          <Icon size={15} color={cfg.color} />
        </View>
        <Text style={{
          flex: 1, color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium,
          lineHeight: 18,
        }} numberOfLines={2}>
          {toast.message}
        </Text>
        <Pressable onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => show(msg, 'success'), [show]);
  const error   = useCallback((msg: string) => show(msg, 'error'),   [show]);
  const warning = useCallback((msg: string) => show(msg, 'warning'), [show]);
  const info    = useCallback((msg: string) => show(msg, 'info'),    [show]);

  // Stable reference — only changes when show/helpers change (never in practice)
  const ctx = useMemo<ToastContextValue>(
    () => ({ show, success, error, warning, info }),
    [show, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container — floats above all content */}
      <View
        style={{
          position: 'absolute', top: insets.top + SPACE.sm,
          left: SPACE.md, right: SPACE.md,
          zIndex: 9999, pointerEvents: 'box-none',
        }}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
