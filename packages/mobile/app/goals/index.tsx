import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Plus, Target, Trash2, CheckCircle,
  Home, Car, Briefcase, Globe, Wallet, MoreHorizontal,
  ExternalLink,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../lib/api/client';

type Category = 'home' | 'car' | 'retirement' | 'wealth' | 'travel' | 'other';

interface Goal {
  id: string;
  title: string;
  category: Category;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  isCompleted: boolean;
  currency: string;
}

const CATEGORIES: Record<Category, { icon: typeof Home; label: string; color: string }> = {
  home:       { icon: Home,          label: 'منزل',  color: '#3b82f6' },
  car:        { icon: Car,           label: 'سيارة', color: '#f59e0b' },
  retirement: { icon: Briefcase,     label: 'تقاعد', color: '#8b5cf6' },
  wealth:     { icon: Wallet,        label: 'ثروة',  color: '#4ade80' },
  travel:     { icon: Globe,         label: 'سفر',   color: '#06b6d4' },
  other:      { icon: MoreHorizontal,label: 'أخرى',  color: '#94a3b8' },
};

/** Where to take the user to "work on" each goal type */
const GOAL_ACTION: Record<Category, { label: string; href: string }> = {
  wealth:     { label: 'ابدأ الاستثمار',     href: '/(tabs)/portfolio' },
  retirement: { label: 'ابدأ الاستثمار',     href: '/(tabs)/portfolio' },
  home:       { label: 'احسب خطة التوفير',  href: '/calculator'       },
  car:        { label: 'احسب خطة التوفير',  href: '/calculator'       },
  travel:     { label: 'احسب خطة التوفير',  href: '/calculator'       },
  other:      { label: 'احسب خطة التوفير',  href: '/calculator'       },
};

function ProgressBar({ value, max }: { value: number; max: number }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 100 ? '#4ade80' : pct >= 60 ? '#8b5cf6' : '#f59e0b';
  return (
    <View style={{ backgroundColor: colors.hover }} className="h-2 rounded-full overflow-hidden">
      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </View>
  );
}

function GoalCard({ goal, onDelete, onAddAmount, onComplete, onAction }: {
  goal: Goal;
  onDelete: () => void;
  onAddAmount: () => void;
  onComplete: () => void;
  onAction: () => void;
}) {
  const { colors, isRTL } = useTheme();
  const cat    = CATEGORIES[goal.category] ?? CATEGORIES.other;
  const action = GOAL_ACTION[goal.category]  ?? GOAL_ACTION.other;
  const CatIcon = cat.icon;
  const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: goal.isCompleted ? '#4ade8030' : colors.border,
      }}
      className="border rounded-2xl p-4 gap-3"
    >
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${cat.color}18` }}>
          <CatIcon size={18} color={cat.color} />
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="text-sm font-bold" numberOfLines={1}>{goal.title}</Text>
          <Text style={{ color: colors.textSub }} className="text-xs mt-0.5">{cat.label}</Text>
        </View>
        {goal.isCompleted && (
          <View className="bg-emerald-500/15 px-2 py-0.5 rounded-lg">
            <Text className="text-xs font-bold text-emerald-400">مكتمل</Text>
          </View>
        )}
      </View>

      <View className="gap-1.5">
        <View className="flex-row justify-between items-center">
          <Text style={{ color: colors.textSub }} className="text-xs">التقدم</Text>
          <Text style={{ color: colors.text }} className="text-xs font-bold">{pct.toFixed(0)}%</Text>
        </View>
        <ProgressBar value={goal.currentAmount} max={goal.targetAmount} />
        <View className="flex-row justify-between items-center">
          <Text style={{ color: colors.textSub }} className="text-xs">
            {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} {goal.currency}
          </Text>
          {goal.deadline && (
            <Text style={{ color: colors.textMuted }} className="text-xs">
              {new Date(goal.deadline).toLocaleDateString('ar-EG')}
            </Text>
          )}
        </View>
      </View>

      {!goal.isCompleted && (
        <>
          {/* ── Action button: go work on the goal ─────────────── */}
          <Pressable
            onPress={onAction}
            style={({ pressed }) => ({
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: pressed ? `${cat.color}22` : `${cat.color}12`,
              borderWidth: 1,
              borderColor: `${cat.color}30`,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            })}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 7 }}>
              <ExternalLink size={13} color={cat.color} />
              <Text style={{ color: cat.color, fontSize: 12, fontWeight: '700' }}>{action.label}</Text>
            </View>
            <ChevronIcon size={13} color={cat.color} />
          </Pressable>

          {/* ── Secondary actions ───────────────────────────────── */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={onAddAmount}
              className="flex-1 py-2 rounded-xl bg-brand/15 items-center"
            >
              <Text className="text-xs font-bold text-brand">+ إضافة مبلغ</Text>
            </Pressable>
            <Pressable
              onPress={onComplete}
              className="flex-1 py-2 rounded-xl bg-emerald-500/15 items-center"
            >
              <Text className="text-xs font-bold text-emerald-400">إتمام</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center"
            >
              <Trash2 size={14} color="#f87171" />
            </Pressable>
          </View>
        </>
      )}
      {goal.isCompleted && (
        <Pressable
          onPress={onDelete}
          className="flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10"
        >
          <Trash2 size={12} color="#f87171" />
          <Text className="text-xs text-red-400">حذف</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function GoalsPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddAmount, setShowAddAmount] = useState<Goal | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('home');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Add amount state
  const [addAmount, setAddAmount] = useState('');
  const [addingAmount, setAddingAmount] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/goals');
      const data = res.data as { items?: Goal[] };
      setGoals(data.items ?? (Array.isArray(res.data) ? res.data : []));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchGoals(); }, [fetchGoals]);

  const handleCreate = async () => {
    if (!title.trim() || !targetAmount.trim()) {
      setCreateError('أدخل العنوان والمبلغ المستهدف');
      return;
    }
    const target = parseFloat(targetAmount.replace(/,/g, ''));
    if (isNaN(target) || target <= 0) { setCreateError('المبلغ المستهدف غير صحيح'); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = { title: title.trim(), category, targetAmount: target };
      const cur = parseFloat(currentAmount.replace(/,/g, ''));
      if (!isNaN(cur) && cur > 0) body.currentAmount = cur;
      if (deadline.trim()) body.deadline = deadline.trim();

      const res = await apiClient.post('/api/goals', body);
      const newGoal = res.data as Goal;
      setGoals((prev) => [newGoal, ...prev]);
      setShowCreate(false);
      setTitle(''); setCategory('home'); setTargetAmount(''); setCurrentAmount(''); setDeadline('');
    } catch {
      setCreateError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('حذف الهدف', 'هل أنت متأكد من حذف هذا الهدف؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/goals/${id}`);
            setGoals((prev) => prev.filter((g) => g.id !== id));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleComplete = (goal: Goal) => {
    Alert.alert('إتمام الهدف', `هل حققت هدف "${goal.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم!',
        onPress: async () => {
          try {
            const res = await apiClient.patch(`/api/goals/${goal.id}/complete`);
            const updated = res.data as Goal;
            setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, ...updated } : g));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleAddAmount = async () => {
    if (!showAddAmount) return;
    const amount = parseFloat(addAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return;
    setAddingAmount(true);
    try {
      const newTotal = (showAddAmount.currentAmount ?? 0) + amount;
      const res = await apiClient.patch(`/api/goals/${showAddAmount.id}/amount`, { currentAmount: newTotal });
      const updated = res.data as Goal;
      setGoals((prev) => prev.map((g) => g.id === showAddAmount.id ? { ...g, ...updated } : g));
      setShowAddAmount(null);
      setAddAmount('');
    } catch { /* ignore */ } finally {
      setAddingAmount(false);
    }
  };

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}
        className="items-center justify-between px-4 pt-5 pb-4"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
            className="w-9 h-9 rounded-xl border items-center justify-center"
          >
            {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
          </Pressable>
          <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
            <Target size={16} color="#4ade80" />
          </View>
          <Text style={{ color: colors.text }} className="text-base font-bold">الأهداف المالية</Text>
        </View>
        <Pressable
          onPress={() => { setShowCreate(true); setCreateError(null); }}
          className="w-9 h-9 rounded-xl bg-brand/15 items-center justify-center"
        >
          <Plus size={18} color="#8b5cf6" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
          {active.length === 0 && completed.length === 0 && (
            <View className="items-center gap-3 py-12">
              <View className="w-16 h-16 rounded-2xl bg-brand/10 items-center justify-center">
                <Target size={28} color="#8b5cf6" />
              </View>
              <Text style={{ color: colors.text }} className="text-base font-bold">لا توجد أهداف بعد</Text>
              <Text style={{ color: colors.textSub }} className="text-sm text-center">أضف هدفاً مالياً وتابع تقدمك</Text>
              <Pressable
                onPress={() => setShowCreate(true)}
                className="bg-brand rounded-xl px-5 py-2.5 mt-2"
              >
                <Text className="text-sm font-bold text-white">إضافة هدف</Text>
              </Pressable>
            </View>
          )}

          {active.length > 0 && (
            <View className="gap-3">
              <Text style={{ color: colors.textSub }} className="text-xs font-semibold uppercase tracking-wider">قيد التنفيذ</Text>
              {active.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onDelete={() => handleDelete(g.id)}
                  onAddAmount={() => { setShowAddAmount(g); setAddAmount(''); }}
                  onComplete={() => handleComplete(g)}
                  onAction={() => router.push(GOAL_ACTION[g.category]?.href as never ?? '/calculator')}
                />
              ))}
            </View>
          )}

          {completed.length > 0 && (
            <View className="gap-3">
              <Text style={{ color: colors.textSub }} className="text-xs font-semibold uppercase tracking-wider">مكتملة</Text>
              {completed.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onDelete={() => handleDelete(g.id)}
                  onAddAmount={() => { setShowAddAmount(g); setAddAmount(''); }}
                  onComplete={() => handleComplete(g)}
                  onAction={() => router.push(GOAL_ACTION[g.category]?.href as never ?? '/calculator')}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Goal Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowCreate(false)} />
        <View
          style={{ backgroundColor: colors.card, borderTopColor: colors.border }}
          className="border-t rounded-t-3xl px-4 pt-5 pb-10 gap-4"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text style={{ color: colors.text }} className="text-base font-bold">هدف مالي جديد</Text>
            <Pressable onPress={() => setShowCreate(false)} className="p-1">
              <Text style={{ color: colors.textSub }}>✕</Text>
            </Pressable>
          </View>

          {createError && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <Text className="text-xs text-red-400">{createError}</Text>
            </View>
          )}

          <View className="gap-1">
            <Text style={{ color: colors.textSub }} className="text-xs">العنوان</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: شراء سيارة"
              placeholderTextColor={colors.textMuted}
              style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
              className="border rounded-xl px-4 py-3 text-sm"
            />
          </View>

          <View className="gap-1">
            <Text style={{ color: colors.textSub }} className="text-xs">الفئة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
              {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES.home][]).map(([key, val]) => {
                const CatIcon = val.icon;
                const isSelected = category === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setCategory(key)}
                    className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
                    style={{
                      backgroundColor: isSelected ? `${val.color}18` : colors.bg,
                      borderColor: isSelected ? val.color : colors.border,
                    }}
                  >
                    <CatIcon size={13} color={val.color} />
                    <Text className="text-xs font-medium" style={{ color: isSelected ? val.color : colors.textSub }}>{val.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text style={{ color: colors.textSub }} className="text-xs">المبلغ المستهدف (EGP)</Text>
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
                className="border rounded-xl px-4 py-3 text-sm"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text style={{ color: colors.textSub }} className="text-xs">المبلغ الحالي (EGP)</Text>
              <TextInput
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
                className="border rounded-xl px-4 py-3 text-sm"
              />
            </View>
          </View>

          <View className="gap-1">
            <Text style={{ color: colors.textSub }} className="text-xs">الموعد النهائي (اختياري — YYYY-MM-DD)</Text>
            <TextInput
              value={deadline}
              onChangeText={setDeadline}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textMuted}
              style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
              className="border rounded-xl px-4 py-3 text-sm"
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={creating}
            className="bg-brand rounded-xl py-3.5 items-center"
            style={{ opacity: creating ? 0.6 : 1 }}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-sm font-bold text-white">إضافة الهدف</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* Add Amount Modal */}
      <Modal visible={!!showAddAmount} transparent animationType="slide" onRequestClose={() => setShowAddAmount(null)}>
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowAddAmount(null)} />
        <View
          style={{ backgroundColor: colors.card, borderTopColor: colors.border }}
          className="border-t rounded-t-3xl px-4 pt-5 pb-10 gap-4"
        >
          <Text style={{ color: colors.text }} className="text-base font-bold">إضافة مبلغ</Text>
          <Text style={{ color: colors.textSub }} className="text-sm">الهدف: {showAddAmount?.title}</Text>
          <TextInput
            value={addAmount}
            onChangeText={setAddAmount}
            placeholder="المبلغ المضاف بالجنيه"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            autoFocus
            style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
            className="border rounded-xl px-4 py-3 text-sm"
          />
          <Pressable
            onPress={handleAddAmount}
            disabled={addingAmount}
            className="bg-brand rounded-xl py-3.5 items-center"
            style={{ opacity: addingAmount ? 0.6 : 1 }}
          >
            {addingAmount ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-bold text-white">إضافة</Text>}
          </Pressable>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
