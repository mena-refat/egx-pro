import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, I18nManager } from 'react-native';
import { Send } from 'lucide-react-native';
import apiClient from '../../../lib/api/client';
import { useTheme } from '../../../hooks/useTheme';

export function CreateTicketForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const isRTL = I18nManager.isRTL;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const subjectTrim = subject.trim();
    const messageTrim = message.trim();

    if (!subjectTrim || !messageTrim) {
      setError('اكتب الموضوع والرسالة');
      return;
    }
    if (subjectTrim.length < 5) {
      setError('الموضوع قصير جداً (5 أحرف على الأقل)');
      return;
    }
    if (messageTrim.length < 10) {
      setError('الرسالة قصيرة جداً (10 أحرف على الأقل)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/support', { subject: subjectTrim, message: messageTrim });
      onCreated();
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && subject.trim().length >= 5 && message.trim().length >= 10;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 16,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>تذكرة دعم جديدة</Text>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>الموضوع</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="موضوع المشكلة أو الاستفسار"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
          style={{
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.hover,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600' }}>الرسالة</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="اشرح مشكلتك أو سؤالك بالتفصيل..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
          style={{
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.hover,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: 120,
            fontSize: 14,
          }}
        />

        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            textAlign: isRTL ? 'left' : 'right',
          }}
        >
          {message.length}/1000
        </Text>
      </View>

      {error && (
        <View
          style={{
            backgroundColor: '#ef444410',
            borderColor: '#ef444420',
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>{error}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={{
            flex: 1,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>إلغاء</Text>
        </Pressable>

        <Pressable
          onPress={() => void submit()}
          disabled={!canSubmit}
          style={{
            flex: 1,
            backgroundColor: '#8b5cf6',
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={13} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>إرسال</Text>
        </Pressable>
      </View>
    </View>
  );
}

