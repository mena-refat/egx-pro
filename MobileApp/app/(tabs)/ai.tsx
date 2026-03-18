import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Bot, Send } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import apiClient from '../../lib/api/client';

export default function AIPage() {
  const { ticker } = useLocalSearchParams<{ ticker?: string }>();
  const [query, setQuery] = useState(ticker ? `حلل سهم ${ticker}` : '');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await apiClient.post('/api/ai/analyze', { query: q, ticker });
      const body = res.data as { analysis?: string; message?: string };
      setResponse(body.analysis ?? body.message ?? '');
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="px-4 pt-5 pb-3 border-b border-[#30363d]">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-xl bg-brand/20 items-center justify-center">
              <Bot size={16} color="#8b5cf6" />
            </View>
            <Text className="text-base font-bold text-[#e6edf3]">مساعد AI</Text>
          </View>
        </View>

        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-6 gap-4"
          showsVerticalScrollIndicator={false}
        >
          {!response && !loading && !error && (
            <View className="items-center py-12 gap-3">
              <View className="w-16 h-16 rounded-2xl bg-brand/10 items-center justify-center">
                <Bot size={30} color="#8b5cf6" />
              </View>
              <Text className="text-base font-bold text-[#e6edf3]">تحليل ذكي للأسهم</Text>
              <Text className="text-sm text-[#8b949e] text-center">
                اسأل عن أي سهم في البورصة المصرية واحصل على تحليل مدعوم بالذكاء الاصطناعي
              </Text>
            </View>
          )}

          {loading && (
            <View className="items-center py-12 gap-3">
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text className="text-sm text-[#8b949e]">جارٍ التحليل...</Text>
            </View>
          )}

          {error && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <Text className="text-sm text-red-400 text-center">{error}</Text>
            </View>
          )}

          {response && !loading && (
            <View className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4">
              <Text className="text-sm text-[#e6edf3] leading-6">{response}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-4 pb-4 pt-2 border-t border-[#30363d]">
          <View className="flex-row items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="اسأل عن سهم أو السوق..."
              placeholderTextColor="#656d76"
              className="flex-1 text-sm text-[#e6edf3] py-2"
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!query.trim() || loading}
              className="w-8 h-8 rounded-lg bg-brand items-center justify-center"
              style={{ opacity: !query.trim() || loading ? 0.4 : 1 }}
            >
              <Send size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
