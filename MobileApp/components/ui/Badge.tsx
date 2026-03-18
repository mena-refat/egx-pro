import { View, Text } from 'react-native';

const styles: Record<string, { bg: string; text: string }> = {
  free: { bg: 'bg-slate-700/60', text: 'text-slate-300' },
  pro: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  yearly: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
  ultra: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  ultra_yearly: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
};

export function Badge({ label }: { label: string }) {
  const s = styles[label] ?? styles.free;
  return (
    <View className={`self-start px-2 py-0.5 rounded-md ${s.bg}`}>
      <Text className={`text-[10px] font-bold uppercase ${s.text}`}>{label}</Text>
    </View>
  );
}

