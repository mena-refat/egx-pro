import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  Modal, TextInput, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Shield, Fingerprint, Smartphone,
  Trash2, LogOut, ShieldCheck, ShieldOff, ChevronRight, ChevronLeft,
  Monitor, MapPin,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';
import { BRAND, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

// ─── types ───────────────────────────────────────────────────────────────────

interface SecurityData {
  twoFactorEnabled: boolean;
  twoFactorEnabledAt?: string;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  lastLoginIp?: string;
}

interface Session {
  id: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  deviceInfo?: string;
  city?: string;
  country?: string;
  createdAt: string;
  expiresAt: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function sessionLabel(s: Session) {
  const parts: string[] = [];
  if (s.browser) parts.push(s.browser);
  if (s.os) parts.push(s.os);
  if (!parts.length && s.deviceInfo) parts.push(s.deviceInfo);
  return parts.join(' — ') || 'جهاز غير معروف';
}

function sessionLocation(s: Session) {
  const parts: string[] = [];
  if (s.city) parts.push(s.city);
  if (s.country) parts.push(s.country);
  return parts.join('، ');
}

// ─── 2FA Setup Modal ─────────────────────────────────────────────────────────

interface SetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function TwoFASetupModal({ visible, onClose, onSuccess }: SetupModalProps) {
  const { colors } = useTheme();
  const [step, setStep]         = useState<'loading' | 'qr' | 'code'>('loading');
  const [qrUrl, setQrUrl]       = useState('');
  const [manualCode, setManual] = useState('');
  const [code, setCode]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!visible) { setStep('loading'); setCode(''); setError(null); return; }
    void (async () => {
      try {
        const res = await apiClient.post('/api/auth/2fa/setup', {});
        const d = res.data as { qrCodeUrl: string; manualCode: string };
        setQrUrl(d.qrCodeUrl);
        setManual(d.manualCode);
        setStep('qr');
      } catch {
        setError('حدث خطأ أثناء الإعداد');
        setStep('qr');
      }
    })();
  }, [visible]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSaving(true); setError(null);
    try {
      await apiClient.post('/api/auth/2fa/verify', { code });
      onSuccess();
      onClose();
    } catch {
      setError('الكود غير صحيح — تأكد من تطبيق المصادقة وأعد المحاولة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <ScrollView
        style={{ backgroundColor: colors.card, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], borderTopWidth: 1, borderColor: colors.border }}
        contentContainerStyle={{ padding: SPACE.xl, gap: SPACE.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <ShieldCheck size={18} color={BRAND} />
            <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>تفعيل التحقق الثنائي</Text>
          </View>
          <Pressable onPress={onClose}><Text style={{ color: colors.textSub, fontSize: FONT.lg }}>✕</Text></Pressable>
        </View>

        {step === 'loading' ? (
          <View style={{ alignItems: 'center', paddingVertical: SPACE['3xl'] }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : (
          <>
            <Text style={{ color: colors.textSub, fontSize: FONT.sm, lineHeight: 20 }}>
              افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح الكود التالي:
            </Text>

            {/* QR Code */}
            {qrUrl ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', padding: SPACE.md, borderRadius: RADIUS.lg }}>
                  <Image
                    source={{ uri: qrUrl }}
                    style={{ width: 180, height: 180 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ) : null}

            {/* Manual code */}
            {manualCode ? (
              <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg, padding: SPACE.md, gap: SPACE.xs }}>
                <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>أو أدخله يدوياً:</Text>
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.semibold, letterSpacing: 2 }}>
                  {manualCode}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: SPACE.xs }}>
              <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>أدخل الكود المكوّن من 6 أرقام:</Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={{
                  color: colors.text, backgroundColor: colors.bg,
                  borderWidth: 1, borderColor: colors.border,
                  borderRadius: RADIUS.lg, padding: SPACE.md,
                  fontSize: FONT.xl, letterSpacing: 6, textAlign: 'center',
                  fontWeight: WEIGHT.bold,
                }}
              />
            </View>

            {error && <Text style={{ color: '#f87171', fontSize: FONT.xs }}>{error}</Text>}

            <Pressable
              onPress={handleVerify}
              disabled={saving || code.length !== 6}
              style={{
                backgroundColor: BRAND, borderRadius: RADIUS.lg,
                paddingVertical: SPACE.md, alignItems: 'center',
                opacity: (saving || code.length !== 6) ? 0.5 : 1,
              }}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>تأكيد التفعيل</Text>
              }
            </Pressable>
          </>
        )}
        <View style={{ height: SPACE.xl }} />
      </ScrollView>
    </Modal>
  );
}

// ─── 2FA Disable Modal ────────────────────────────────────────────────────────

interface DisableModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function TwoFADisableModal({ visible, onClose, onSuccess }: DisableModalProps) {
  const { colors } = useTheme();
  const [code, setCode]           = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [showPass, setShowPass]   = useState(false);

  useEffect(() => {
    if (!visible) { setCode(''); setPassword(''); setError(null); }
  }, [visible]);

  const handleDisable = async () => {
    if (code.length !== 6 || !password) return;
    setSaving(true); setError(null);
    try {
      await apiClient.post('/api/auth/2fa/disable', { code, password });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (errCode === 'wrong_password') setError('كلمة المرور غير صحيحة');
      else if (errCode === 'invalid_code') setError('كود التحقق غير صحيح');
      else setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={{
        backgroundColor: colors.card,
        borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
        borderTopWidth: 1, borderColor: colors.border,
        padding: SPACE.xl, gap: SPACE.lg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <ShieldOff size={18} color='#f87171' />
            <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>تعطيل التحقق الثنائي</Text>
          </View>
          <Pressable onPress={onClose}><Text style={{ color: colors.textSub, fontSize: FONT.lg }}>✕</Text></Pressable>
        </View>

        <Text style={{ color: colors.textSub, fontSize: FONT.sm, lineHeight: 20 }}>
          لتعطيل التحقق الثنائي، أدخل كلمة مرورك وكود المصادقة:
        </Text>

        {/* Password */}
        <View style={{ gap: SPACE.xs }}>
          <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>كلمة المرور</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPass}
              style={{ flex: 1, color: colors.text, paddingVertical: SPACE.md, fontSize: FONT.sm }}
            />
            <Pressable onPress={() => setShowPass(p => !p)}>
              <Text style={{ color: colors.textMuted, fontSize: FONT.xs }}>{showPass ? 'إخفاء' : 'إظهار'}</Text>
            </Pressable>
          </View>
        </View>

        {/* 2FA code */}
        <View style={{ gap: SPACE.xs }}>
          <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>كود التحقق (6 أرقام)</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            style={{
              color: colors.text, backgroundColor: colors.bg,
              borderWidth: 1, borderColor: colors.border,
              borderRadius: RADIUS.lg, padding: SPACE.md,
              fontSize: FONT.xl, letterSpacing: 6, textAlign: 'center',
              fontWeight: WEIGHT.bold,
            }}
          />
        </View>

        {error && <Text style={{ color: '#f87171', fontSize: FONT.xs }}>{error}</Text>}

        <Pressable
          onPress={handleDisable}
          disabled={saving || code.length !== 6 || !password}
          style={{
            backgroundColor: '#ef4444', borderRadius: RADIUS.lg,
            paddingVertical: SPACE.md, alignItems: 'center',
            opacity: (saving || code.length !== 6 || !password) ? 0.5 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>تعطيل التحقق الثنائي</Text>
          }
        </Pressable>
        <View style={{ height: SPACE.xl }} />
      </View>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();

  const [security,    setSecurity]    = useState<SecurityData | null>(null);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [revoking,    setRevoking]    = useState<string | null>(null);
  const [show2FASetup,   setShow2FASetup]   = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, sessRes] = await Promise.all([
        apiClient.get('/api/user/security'),
        apiClient.get('/api/user/sessions'),
      ]);
      setSecurity(secRes.data as SecurityData);
      const list = (sessRes.data as { sessions?: Session[] })?.sessions ?? (sessRes.data as Session[]) ?? [];
      setSessions(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const revokeSession = async (id: string) => {
    Alert.alert('إنهاء الجلسة', 'هل تريد إنهاء هذه الجلسة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إنهاء', style: 'destructive',
        onPress: async () => {
          setRevoking(id);
          try {
            await apiClient.delete(`/api/user/sessions/${id}`);
            setSessions((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert('خطأ', 'تعذر إنهاء الجلسة');
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  };

  const revokeAllOthers = () => {
    Alert.alert('إنهاء كل الجلسات', 'سيتم تسجيل الخروج من جميع الأجهزة الأخرى. هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إنهاء الكل', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/api/user/sessions/revoke-all-other', {});
            await loadData();
          } catch {
            Alert.alert('خطأ', 'تعذر إنهاء الجلسات');
          }
        },
      },
    ]);
  };

  const on2FAEnabled  = useCallback(() => setSecurity((prev) => prev ? { ...prev, twoFactorEnabled: true } : prev), []);
  const on2FADisabled = useCallback(() => setSecurity((prev) => prev ? { ...prev, twoFactorEnabled: false, twoFactorEnabledAt: undefined } : prev), []);

  const twoFaEnabled = security?.twoFactorEnabled ?? false;

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View style={{
        borderBottomColor: colors.border, borderBottomWidth: 1,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center', gap: SPACE.sm,
        paddingHorizontal: SPACE.lg, paddingTop: 20, paddingBottom: SPACE.lg,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.hover, borderColor: colors.border, borderWidth: 1, width: 36, height: 36, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' }}
        >
          {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View style={{ width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: `${BRAND}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={15} color={BRAND} />
        </View>
        <Text style={{ color: colors.text, fontSize: FONT.base, fontWeight: WEIGHT.bold }}>الأمان والخصوصية</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACE.lg, gap: SPACE.lg }} showsVerticalScrollIndicator={false}>

          {/* ── Security Overview ───────────────────────── */}
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Shield size={14} color={BRAND} />
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>معلومات الأمان</Text>
            </View>
            <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}>
              {[
                { label: 'آخر تسجيل دخول',     value: fmtDate(security?.lastLoginAt) },
                { label: 'آخر تغيير كلمة مرور', value: fmtDate(security?.lastPasswordChangeAt) },
                { label: 'آخر IP',               value: security?.lastLoginIp ?? '—' },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACE.sm + 2, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.textSub, fontSize: FONT.sm }}>{row.label}</Text>
                  <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Two-Factor Auth ─────────────────────────── */}
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <ShieldCheck size={14} color={twoFaEnabled ? '#4ade80' : BRAND} />
              <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>التحقق الثنائي (2FA)</Text>
              <View style={{ marginStart: 'auto', backgroundColor: twoFaEnabled ? '#4ade8018' : '#f59e0b18', paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.full }}>
                <Text style={{ color: twoFaEnabled ? '#4ade80' : '#f59e0b', fontSize: 10, fontWeight: WEIGHT.semibold }}>
                  {twoFaEnabled ? 'مفعّل' : 'معطّل'}
                </Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.md }}>
              <Text style={{ color: colors.textSub, fontSize: FONT.xs, lineHeight: 18 }}>
                {twoFaEnabled
                  ? `مفعّل منذ ${fmtDate(security?.twoFactorEnabledAt)} — حسابك محمي بطبقة إضافية من الأمان.`
                  : 'فعّل التحقق الثنائي لحماية حسابك. ستحتاج كود من تطبيق المصادقة عند كل تسجيل دخول.'}
              </Text>

              <Pressable
                onPress={() => twoFaEnabled ? setShow2FADisable(true) : setShow2FASetup(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
                  backgroundColor: twoFaEnabled ? '#ef444415' : `${BRAND}15`,
                  borderWidth: 1, borderColor: twoFaEnabled ? '#ef444430' : `${BRAND}40`,
                  borderRadius: RADIUS.lg, paddingVertical: SPACE.md,
                }}
              >
                {twoFaEnabled
                  ? <ShieldOff size={15} color='#ef4444' />
                  : <ShieldCheck size={15} color={BRAND} />}
                <Text style={{ color: twoFaEnabled ? '#ef4444' : BRAND, fontSize: FONT.sm, fontWeight: WEIGHT.semibold }}>
                  {twoFaEnabled ? 'تعطيل التحقق الثنائي' : 'تفعيل التحقق الثنائي'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Biometric & PIN ─────────────────────────── */}
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
            <Pressable
              onPress={() => router.push('/settings/biometric')}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : 'transparent' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.lg }}>
                <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: `${colors.textSub}15`, alignItems: 'center', justifyContent: 'center' }}>
                  <Fingerprint size={18} color={colors.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }}>البصمة والـ PIN</Text>
                  <Text style={{ color: colors.textMuted, fontSize: FONT.xs, marginTop: 2 }}>تسجيل دخول سريع بدون كلمة مرور</Text>
                </View>
                {isRTL ? <ChevronLeft size={14} color={colors.textMuted} /> : <ChevronRight size={14} color={colors.textMuted} />}
              </View>
            </Pressable>
          </View>

          {/* ── Active Sessions ─────────────────────────── */}
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                <Monitor size={14} color={BRAND} />
                <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>
                  الجلسات النشطة ({sessions.length})
                </Text>
              </View>
              {sessions.length > 1 && (
                <Pressable onPress={revokeAllOthers}>
                  <Text style={{ color: '#ef4444', fontSize: FONT.xs, fontWeight: WEIGHT.medium }}>إنهاء الكل</Text>
                </Pressable>
              )}
            </View>

            {sessions.length === 0 ? (
              <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xl, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: FONT.sm }}>لا توجد جلسات نشطة</Text>
              </View>
            ) : (
              sessions.map((s, i) => (
                <View
                  key={s.id}
                  style={{ borderBottomWidth: i < sessions.length - 1 ? 1 : 0, borderBottomColor: colors.border, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm }}>
                    <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: `${BRAND}10`, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                      {s.deviceType === 'mobile'
                        ? <Smartphone size={16} color={BRAND} />
                        : <Monitor size={16} color={BRAND} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: colors.text, fontSize: FONT.sm, fontWeight: WEIGHT.medium }} numberOfLines={1}>
                        {sessionLabel(s)}
                      </Text>
                      {sessionLocation(s) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{sessionLocation(s)}</Text>
                        </View>
                      ) : null}
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                        منذ {fmtDate(s.createdAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => revokeSession(s.id)}
                      disabled={revoking === s.id}
                      style={{ padding: SPACE.xs }}
                    >
                      {revoking === s.id
                        ? <ActivityIndicator size="small" color='#ef4444' />
                        : <LogOut size={16} color='#ef4444' />}
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Bottom padding */}
          <View style={{ height: SPACE.xl }} />
        </ScrollView>
      )}

      <TwoFASetupModal
        visible={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        onSuccess={on2FAEnabled}
      />
      <TwoFADisableModal
        visible={show2FADisable}
        onClose={() => setShow2FADisable(false)}
        onSuccess={on2FADisabled}
      />
    </ScreenWrapper>
  );
}
