import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, LifeBuoy, Plus, Lock, AlertCircle } from 'lucide-react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { BRAND } from '../../lib/theme';
import { useSupportPage } from './useSupportPage';
import { CreateTicketForm } from './components/CreateTicketForm';
import { TicketDetail } from './components/TicketDetail';
import { SupportTicketList } from './components/SupportTicketList';
import { SupportLockedBanner } from './components/SupportLockedBanner';

export default function SupportPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();

  const {
    canUseSupport,
    tickets,
    loading,
    refreshing,
    showCreate,
    setShowCreate,
    selected,
    setSelected,
    loadError,
    refresh,
    handleCreated,
    markReplyRead,
    rateTicket,
  } = useSupportPage();

  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  if (selected) {
    return (
      <ScreenWrapper padded={false}>
        <TicketDetail
          ticket={selected}
          onBack={() => setSelected(null)}
          onReplyMarkedRead={markReplyRead}
          onRated={rateTicket}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false} withKeyboard={showCreate}>
      {/* Header */}
      <View
        style={{
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          opacity: 0.5,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => {
              if (showCreate) setShowCreate(false);
              else router.back();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.hover,
              borderColor: colors.border,
              borderWidth: 1,
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowIcon size={16} color={colors.textSub} />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                backgroundColor: `${BRAND}10`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LifeBuoy size={15} color={BRAND} />
            </View>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>الدعم الفني</Text>
          </View>
        </View>

        {canUseSupport ? (
          <Pressable
            onPress={() => setShowCreate((v) => !v)}
            style={{
              backgroundColor: showCreate ? colors.hover : BRAND,
              borderColor: showCreate ? colors.border : 'transparent',
              borderWidth: showCreate ? 1 : 0,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Plus size={13} color={showCreate ? colors.textSub : '#fff'} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: showCreate ? colors.textSub : '#fff' }}>
              {showCreate ? 'إلغاء' : 'تذكرة جديدة'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/settings/subscription' as never)}
            style={{
              backgroundColor: '#f59e0b18',
              borderColor: '#f59e0b35',
              borderWidth: 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Lock size={13} color="#f59e0b" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#f59e0b' }}>ترقية</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {!canUseSupport && <SupportLockedBanner onUpgrade={() => router.push('/settings/subscription' as never)} />}

        {canUseSupport && loadError && !loading && (
          <View
            style={{
              backgroundColor: '#ef444410',
              borderColor: '#ef444420',
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertCircle size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, flex: 1, fontSize: 13, fontWeight: '600' }} numberOfLines={2}>
              {loadError}
            </Text>
            <Pressable
              onPress={() => void refresh()}
              style={{
                backgroundColor: BRAND,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>حاول مرة أخرى</Text>
            </Pressable>
          </View>
        )}

        {showCreate && canUseSupport && <CreateTicketForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />}

        {canUseSupport && !showCreate && (
          <SupportTicketList
            loading={loading}
            canUseSupport={canUseSupport}
            tickets={tickets}
            onSelectTicket={(t) => setSelected(t)}
            onCreateTicket={() => setShowCreate(true)}
          />
        )}

        {/* Info note */}
        {!loading && (
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertCircle size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
            <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 20, flex: 1 }}>
              متوسط وقت الرد 24 ساعة. للأمور العاجلة راسلنا على واتساب أو البريد الإلكتروني.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
