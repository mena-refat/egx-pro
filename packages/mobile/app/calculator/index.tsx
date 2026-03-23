import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, Calculator, Wallet, TrendingUp, TrendingDown,
  Crown, Trophy, Target, BarChart2, ChevronDown, ChevronUp,
  Repeat2, AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../hooks/useTheme';
import { BRAND, BRAND_DARK, GREEN, RED, FONT, WEIGHT, RADIUS, SPACE } from '../../lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'growth' | 'target' | 'trade';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compound interest + DCA */
function calcGrowth(monthly: number, initial: number, years: number, annualRate: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const initialGrowth = initial * Math.pow(1 + r, n);
  const monthlyGrowth = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  const total    = initialGrowth + monthlyGrowth;
  const invested = initial + monthly * n;
  return { total, invested, profit: total - invested, profitPct: invested > 0 ? ((total - invested) / invested) * 100 : 0 };
}

/** Year-by-year breakdown */
function yearByYear(monthly: number, initial: number, years: number, annualRate: number) {
  return Array.from({ length: years }, (_, i) => calcGrowth(monthly, initial, i + 1, annualRate));
}

/** Reverse: monthly needed to reach target */
function calcMonthlyNeeded(target: number, initial: number, years: number, annualRate: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const initialFV = initial * Math.pow(1 + r, n);
  const remaining = target - initialFV;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / n;
  return remaining / ((Math.pow(1 + r, n) - 1) / r);
}

/** EGX real trade fees */
function calcTradeFees(value: number, brokerPct: number) {
  const broker   = value * (brokerPct / 100);
  const fra      = value * 0.00005;
  const mcsd     = Math.min(value * 0.00009, 100);
  const stamp    = value * 0.001;
  return { broker, fra, mcsd, stamp, total: broker + fra + mcsd + stamp };
}

function calcTrade(buyPrice: number, shares: number, sellPrice: number, brokerPct: number) {
  const buyVal    = buyPrice  * shares;
  const sellVal   = sellPrice * shares;
  const buyFees   = calcTradeFees(buyVal,  brokerPct);
  const sellFees  = calcTradeFees(sellVal, brokerPct);
  const totalFees = buyFees.total + sellFees.total;
  const netProfit = sellVal - buyVal - totalFees;
  const sellFeeRate = (brokerPct / 100) + 0.00005 + 0.00009 + 0.001;
  const exactBreakEven = (buyVal + buyFees.total) / (shares * (1 - sellFeeRate));
  return {
    buyVal, sellVal,
    buyFees, sellFees, totalFees,
    grossProfit: sellVal - buyVal,
    netProfit,
    roi: buyVal > 0 ? (netProfit / (buyVal + buyFees.total)) * 100 : 0,
    breakEven: exactBreakEven,
  };
}

function fmtFull(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

/** Locale-aware compact number formatter */
function useFmt() {
  const { t } = useTranslation();
  return useCallback((n: number, digits = 1): string => {
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(digits)}${t('calc.billion')}`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(digits)}${t('calc.million')}`;
    if (n >= 1_000)         return `${(n / 1_000).toFixed(digits)}${t('calc.thousand')}`;
    return Math.round(n).toLocaleString('en-US');
  }, [t]);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, suffix, placeholder = '0', hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; placeholder?: string; hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.inputField, { color: colors.text }]}
          textAlign="right"
        />
        {suffix ? <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={[styles.inputHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

function YearPicker({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const PRESETS = [1, 3, 5, 10, 15, 20, 30];
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{t('calc.durationLabel')}</Text>
      <View style={styles.pillRow}>
        {PRESETS.map((y) => (
          <Pressable
            key={y}
            onPress={() => onChange(y)}
            style={[styles.pill, {
              backgroundColor: value === y ? BRAND : colors.hover,
              borderColor:     value === y ? BRAND : colors.border,
            }]}
          >
            <Text style={[styles.pillText, { color: value === y ? '#fff' : colors.textSub }]}>{y}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RatePicker({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [custom, setCustom] = useState('');
  const OPTIONS = [
    { label: t('calc.rateConservative'), rate: 12 },
    { label: t('calc.rateBalanced'),     rate: 22 },
    { label: t('calc.rateOptimistic'),   rate: 38 },
  ];
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{t('calc.rateLabel')}</Text>
      <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.rate}
            onPress={() => { onChange(o.rate); setCustom(''); }}
            style={[styles.ratePill, {
              backgroundColor: value === o.rate && !custom ? BRAND : colors.hover,
              borderColor:     value === o.rate && !custom ? BRAND : colors.border,
            }]}
          >
            <Text style={[styles.pillSmall, { color: value === o.rate && !custom ? '#fff' : colors.textMuted }]}>{o.label}</Text>
            <Text style={[styles.rateValue, { color: value === o.rate && !custom ? '#fff' : colors.text }]}>{o.rate}%</Text>
          </Pressable>
        ))}
        {/* Custom rate input */}
        <View style={[styles.ratePill, {
          backgroundColor: custom ? 'rgba(139,92,246,0.12)' : colors.hover,
          borderColor:     custom ? BRAND : colors.border,
          minWidth: 70,
        }]}>
          <Text style={[styles.pillSmall, { color: colors.textMuted }]}>{t('calc.rateCustom')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <TextInput
              value={custom}
              onChangeText={(v) => { setCustom(v); const n = parseFloat(v); if (!isNaN(n) && n > 0) onChange(n); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[styles.customRateInput, { color: colors.text }]}
              textAlign="center"
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>%</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.inputHint, { color: colors.textMuted }]}>{t('calc.rateHint')}</Text>
    </View>
  );
}

function StatBox({ label, value, accent, icon: Icon, sub }: {
  label: string; value: string; accent: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  sub?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {Icon && (
        <View style={[styles.statIcon, { backgroundColor: accent + '18' }]}>
          <Icon size={14} color={accent} />
        </View>
      )}
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Mode: Growth ────────────────────────────────────────────────────────────

function GrowthMode() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fmt = useFmt();
  const egp = t('calc.egp');

  const [monthly,  setMonthly ] = useState('1000');
  const [initial,  setInitial ] = useState('10000');
  const [years,    setYears   ] = useState(10);
  const [rate,     setRate    ] = useState(22);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const m = Math.max(0, Number(monthly) || 0);
  const i = Math.max(0, Number(initial) || 0);

  const result      = useMemo(() => calcGrowth(m, i, years, rate),   [m, i, years, rate]);
  const compareBank = useMemo(() => calcGrowth(m, i, years, 7),      [m, i, years]);
  const compareGold = useMemo(() => calcGrowth(m, i, years, 14),     [m, i, years]);
  const breakdown   = useMemo(() => yearByYear(m, i, years, rate),   [m, i, years, rate]);

  const profitMultiplier = result.invested > 0 ? result.total / result.invested : 1;

  const milestoneKey =
    result.total < 100_000  ? 'calc.milestone1'
    : result.total < 500_000  ? 'calc.milestone2'
    : result.total < 1_000_000 ? 'calc.milestone3'
    : result.total < 5_000_000 ? 'calc.milestone4'
    : result.total < 10_000_000 ? 'calc.milestone5'
    : 'calc.milestone6';

  return (
    <View style={styles.modeContent}>
      {/* Inputs */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <NumInput label={t('calc.monthlyLabel')} value={monthly} onChange={setMonthly} suffix={egp} hint={t('calc.monthlyHint')} />
        <NumInput label={t('calc.initialLabel')} value={initial} onChange={setInitial} suffix={egp} hint={t('calc.initialHint')} />
        <YearPicker value={years} onChange={setYears} />
        <RatePicker value={rate}  onChange={setRate} />
      </View>

      {/* Main result */}
      <LinearGradient
        colors={['#0d0828', '#1a0a40', '#0a0d1e']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.resultHero}
      >
        <View style={styles.resultHeroOrb} />
        <Text style={styles.resultMilestone}>{t(milestoneKey)}</Text>
        <Text style={styles.resultLabel}>{t('calc.wealthAfter', { years })}</Text>
        <Text style={styles.resultValue}>{fmt(result.total)} {egp}</Text>
        <Text style={styles.resultFull}>({fmtFull(result.total)} {egp})</Text>
        <View style={styles.resultPillRow}>
          <View style={[styles.resultPill, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)' }]}>
            <Text style={{ color: BRAND, fontSize: 11, fontWeight: WEIGHT.bold }}>{t('calc.xTimes', { x: profitMultiplier.toFixed(1) })}</Text>
          </View>
          <View style={[styles.resultPill, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)' }]}>
            <Text style={{ color: '#10b981', fontSize: 11, fontWeight: WEIGHT.bold }}>{t('calc.returnPct', { pct: result.profitPct.toFixed(0) })}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatBox label={t('calc.invested')} value={`${fmt(result.invested)} ${egp}`}
          accent={colors.textSub} icon={Wallet} />
        <StatBox label={t('calc.profits')} value={`${fmt(result.profit)} ${egp}`}
          accent="#10b981" icon={TrendingUp} />
      </View>

      {/* Comparison */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSub }]}>{t('calc.compareTitle')}</Text>
        <View style={styles.compareRow}>
          {[
            { labelKey: 'calc.bankCerts', rate: 7,    value: compareBank.total, color: '#94a3b8' },
            { labelKey: 'calc.gold',      rate: 14,   value: compareGold.total, color: '#f59e0b' },
            { labelKey: 'calc.stockExchange', rate,   value: result.total,      color: BRAND, best: true },
          ].map((c) => {
            const barPct = result.total > 0 ? (c.value / result.total) : 1;
            return (
              <View key={c.labelKey} style={styles.compareItem}>
                {c.best && <View style={[styles.bestBadge, { backgroundColor: BRAND + '20', borderColor: BRAND + '40' }]}>
                  <Trophy size={8} color={BRAND} />
                  <Text style={{ color: BRAND, fontSize: 8, fontWeight: WEIGHT.bold }}>{t('calc.best')}</Text>
                </View>}
                <View style={[styles.compareBarTrack, { backgroundColor: colors.hover }]}>
                  <View style={[styles.compareBarFill, { height: `${Math.round(barPct * 100)}%` as any, backgroundColor: c.color }]} />
                </View>
                <Text style={[styles.compareVal, { color: c.color }]}>{fmt(c.value, 0)}</Text>
                <Text style={[styles.compareLabel, { color: colors.textMuted }]}>{t(c.labelKey)}</Text>
                <Text style={[styles.compareRate, { color: colors.textMuted }]}>~{c.rate}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Year-by-year breakdown */}
      <Pressable
        style={[styles.breakdownToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowBreakdown((v) => !v)}
      >
        <BarChart2 size={14} color={BRAND} />
        <Text style={[styles.breakdownToggleText, { color: colors.textSub }]}>{t('calc.growthTable')}</Text>
        {showBreakdown ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
      </Pressable>

      {showBreakdown && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 0 }]}>
          <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableCell, styles.tableCellHeader, { color: colors.textMuted, flex: 0.5 }]}>{t('calc.tableYear')}</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader, { color: colors.textMuted }]}>{t('calc.tableInvested')}</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader, { color: '#10b981' }]}>{t('calc.tableTotal')}</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader, { color: BRAND }]}>{t('calc.tableProfit')}</Text>
          </View>
          {breakdown.map((row, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, {
                borderBottomWidth: idx < breakdown.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: idx % 2 === 0 ? 'transparent' : colors.hover + '50',
              }]}
            >
              <Text style={[styles.tableCell, { color: colors.textMuted, flex: 0.5 }]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { color: colors.textSub }]}>{fmt(row.invested, 0)}</Text>
              <Text style={[styles.tableCell, { color: '#10b981', fontWeight: WEIGHT.semibold }]}>{fmt(row.total, 0)}</Text>
              <Text style={[styles.tableCell, { color: BRAND, fontWeight: WEIGHT.semibold }]}>+{fmt(row.profit, 0)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Mode: Target ────────────────────────────────────────────────────────────

function TargetMode() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fmt = useFmt();
  const egp = t('calc.egp');

  const [target,  setTarget  ] = useState('1000000');
  const [initial, setInitial ] = useState('0');
  const [years,   setYears   ] = useState(10);
  const [rate,    setRate    ] = useState(22);

  const tv  = Math.max(0, Number(target)  || 0);
  const i   = Math.max(0, Number(initial) || 0);
  const monthly = useMemo(() => calcMonthlyNeeded(tv, i, years, rate), [tv, i, years, rate]);
  const check   = useMemo(() => calcGrowth(monthly, i, years, rate),  [monthly, i, years, rate]);
  const yearsToDouble = useMemo(() => {
    if (rate <= 0) return null;
    return (Math.log(2) / Math.log(1 + rate / 100)).toFixed(1);
  }, [rate]);

  const alreadyReached = i >= tv;

  return (
    <View style={styles.modeContent}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <NumInput label={t('calc.goalLabel')} value={target} onChange={setTarget} suffix={egp} hint={t('calc.goalHint')} placeholder="1,000,000" />
        <NumInput label={t('calc.initialLabel')} value={initial} onChange={setInitial} suffix={egp} hint={t('calc.initialHintTarget')} />
        <YearPicker value={years} onChange={setYears} />
        <RatePicker value={rate}  onChange={setRate} />
      </View>

      {alreadyReached ? (
        <View style={[styles.card, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Trophy size={20} color="#10b981" />
            <Text style={{ color: '#10b981', fontSize: FONT.sm, fontWeight: WEIGHT.bold }}>{t('calc.goalReached')}</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Hero answer */}
          <LinearGradient
            colors={['#000e07', '#001a0c', '#000a06']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.resultHero, { borderColor: 'rgba(16,185,129,0.2)' }]}
          >
            <View style={[styles.resultHeroOrb, { backgroundColor: '#10b981', opacity: 0.07 }]} />
            <Text style={[styles.resultLabel, { color: 'rgba(16,185,129,0.7)' }]}>{t('calc.toReachGoal', { amount: fmt(tv), years })}</Text>
            <Text style={[styles.resultValue, { color: '#10b981' }]}>{fmt(monthly)} {egp}{t('calc.perMonth')}</Text>
            <Text style={[styles.resultFull, { color: 'rgba(16,185,129,0.55)' }]}>({fmtFull(monthly)} {t('calc.perMonthFull')})</Text>
          </LinearGradient>

          <View style={styles.statsRow}>
            <StatBox label={t('calc.totalDeposits')}   value={`${fmt(check.invested)} ${egp}`} accent={colors.textSub} icon={Wallet} />
            <StatBox label={t('calc.expectedProfits')} value={`${fmt(check.profit)} ${egp}`}   accent="#10b981"       icon={TrendingUp} />
          </View>
        </>
      )}

      {/* Rule of 72 insight */}
      <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Repeat2 size={14} color={BRAND} />
          <Text style={[styles.sectionTitle, { color: colors.textSub, marginBottom: 0 }]}>{t('calc.rule72Title')}</Text>
        </View>
        <Text style={[styles.insightText, { color: colors.textMuted }]}>
          {t('calc.rule72Text', { rate, years: yearsToDouble ?? '—' })}
        </Text>
      </View>
    </View>
  );
}

// ─── Mode: Trade ─────────────────────────────────────────────────────────────

function TradeMode() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fmt = useFmt();
  const egp = t('calc.egp');

  const EGX_FEE_BREAKDOWN = [
    { label: t('calc.feeBroker'), key: 'broker' as const },
    { label: t('calc.feeFRA'),    key: 'fra'    as const },
    { label: t('calc.feeMCSD'),   key: 'mcsd'   as const },
    { label: t('calc.feeStamp'),  key: 'stamp'  as const },
  ];

  const [buyPrice,  setBuyPrice ] = useState('10.00');
  const [shares,    setShares   ] = useState('1000');
  const [sellPrice, setSellPrice] = useState('12.50');
  const [brokerPct, setBrokerPct] = useState('0.25');

  const bp  = Math.max(0, Number(buyPrice)  || 0);
  const sh  = Math.max(0, Number(shares)    || 0);
  const sp  = Math.max(0, Number(sellPrice) || 0);
  const bk  = Math.max(0, Number(brokerPct) || 0);

  const result = useMemo(() => (bp > 0 && sh > 0 ? calcTrade(bp, sh, sp, bk) : null), [bp, sh, sp, bk]);

  const [showFees, setShowFees] = useState(false);
  const isProfit = (result?.netProfit ?? 0) >= 0;
  const profitColor = isProfit ? '#10b981' : RED;

  return (
    <View style={styles.modeContent}>
      {/* Inputs */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tradeRow}>
          <View style={{ flex: 1 }}>
            <NumInput label={t('calc.buyPrice')}  value={buyPrice}  onChange={setBuyPrice}  suffix={egp} placeholder="0.00" />
          </View>
          <View style={{ flex: 1 }}>
            <NumInput label={t('calc.sellPrice')} value={sellPrice} onChange={setSellPrice} suffix={egp} placeholder="0.00" />
          </View>
        </View>
        <NumInput label={t('calc.sharesCount')} value={shares} onChange={setShares} suffix={t('calc.sharesSuffix')} hint={t('calc.sharesHint')} />
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { color: colors.textSub }]}>{t('calc.brokerFeeLabel')}</Text>
          <View style={styles.pillRow}>
            {['0.175', '0.25', '0.35', '0.5'].map((v) => (
              <Pressable
                key={v}
                onPress={() => setBrokerPct(v)}
                style={[styles.pill, {
                  backgroundColor: brokerPct === v ? BRAND : colors.hover,
                  borderColor:     brokerPct === v ? BRAND : colors.border,
                }]}
              >
                <Text style={[styles.pillText, { color: brokerPct === v ? '#fff' : colors.textSub }]}>{v}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {result && (
        <>
          {/* Summary cards */}
          <View style={styles.tradeResultGrid}>
            <View style={[styles.tradeResultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Wallet size={14} color={colors.textMuted} />
              <Text style={[styles.tradeBoxLabel, { color: colors.textMuted }]}>{t('calc.buyValue')}</Text>
              <Text style={[styles.tradeBoxVal, { color: colors.text }]}>{fmtFull(result.buyVal)}</Text>
              <Text style={[styles.tradeBoxUnit, { color: colors.textMuted }]}>{egp}</Text>
            </View>
            <View style={[styles.tradeResultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TrendingUp size={14} color={colors.textMuted} />
              <Text style={[styles.tradeBoxLabel, { color: colors.textMuted }]}>{t('calc.sellValue')}</Text>
              <Text style={[styles.tradeBoxVal, { color: colors.text }]}>{fmtFull(result.sellVal)}</Text>
              <Text style={[styles.tradeBoxUnit, { color: colors.textMuted }]}>{egp}</Text>
            </View>
          </View>

          {/* Net profit hero */}
          <View style={[styles.tradeProfitHero, {
            backgroundColor: profitColor + '10',
            borderColor:     profitColor + '30',
          }]}>
            {isProfit
              ? <TrendingUp  size={22} color={profitColor} />
              : <TrendingDown size={22} color={profitColor} />
            }
            <View style={{ flex: 1 }}>
              <Text style={[styles.tradeProfitLabel, { color: colors.textMuted }]}>
                {isProfit ? t('calc.netProfit') : t('calc.netLoss')}
              </Text>
              <Text style={[styles.tradeProfitVal, { color: profitColor }]}>
                {isProfit ? '+' : ''}{fmtFull(result.netProfit)} {egp}
              </Text>
              <Text style={[styles.tradeRoi, { color: profitColor + 'bb' }]}>
                {t('calc.returnLabel')} {result.roi.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Break-even */}
          <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Target size={14} color="#f59e0b" />
              <Text style={[styles.sectionTitle, { color: colors.textSub, marginBottom: 0 }]}>{t('calc.breakEvenTitle')}</Text>
            </View>
            <Text style={[styles.breakEvenPrice, { color: '#f59e0b' }]}>{fmtPrice(result.breakEven)} {egp}</Text>
            <Text style={[styles.insightText, { color: colors.textMuted }]}>
              {t('calc.breakEvenText', { price: fmtPrice(result.breakEven) })}
            </Text>
          </View>

          {/* Fees breakdown */}
          <Pressable
            style={[styles.breakdownToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowFees((v) => !v)}
          >
            <AlertCircle size={14} color="#f59e0b" />
            <Text style={[styles.breakdownToggleText, { color: colors.textSub }]}>{t('calc.feesDetails')}</Text>
            <Text style={[styles.feesTotalPill, { backgroundColor: '#f59e0b18', color: '#f59e0b', borderColor: '#f59e0b30' }]}>
              {fmtFull(result.totalFees)} {egp}
            </Text>
            {showFees ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
          </Pressable>

          {showFees && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['buy', 'sell'] as const).map((side) => {
                const fees = side === 'buy' ? result.buyFees : result.sellFees;
                return (
                  <View key={side} style={{ marginBottom: side === 'buy' ? 12 : 0 }}>
                    <Text style={[styles.feesSideLabel, { color: side === 'buy' ? '#10b981' : RED }]}>
                      {side === 'buy' ? t('calc.feeBuySide') : t('calc.feeSellSide')} — {fmtFull(fees.total)} {egp}
                    </Text>
                    {EGX_FEE_BREAKDOWN.map(({ label, key }) => (
                      <View key={key} style={styles.feeRow}>
                        <Text style={[styles.feeLabel, { color: colors.textMuted }]}>{label}</Text>
                        <Text style={[styles.feeVal, { color: colors.textSub }]}>{fmtFull(fees[key])} {egp}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
              <View style={[styles.feesTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.feeLabel, { color: colors.textSub, fontWeight: WEIGHT.bold }]}>{t('calc.feeTotal')}</Text>
                <Text style={[styles.feeVal, { color: '#f59e0b', fontWeight: WEIGHT.bold }]}>{fmtFull(result.totalFees)} {egp}</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const router = useRouter();
  const { colors, isRTL } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('growth');

  const MODES: { id: Mode; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { id: 'growth', label: t('calc.modeGrowth'), icon: TrendingUp  },
    { id: 'target', label: t('calc.modeTarget'), icon: Target      },
    { id: 'trade',  label: t('calc.modeTrade'),  icon: BarChart2   },
  ];

  const modeColors: Record<Mode, string> = {
    growth: BRAND,
    target: '#10b981',
    trade:  '#f59e0b',
  };
  const activeColor = modeColors[mode];

  return (
    <ScreenWrapper padded={false}>
      {/* Header */}
      <View style={[styles.header, {
        borderBottomColor: colors.border,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.hover, borderColor: colors.border }]}
        >
          {isRTL ? <ArrowRight size={16} color={colors.textSub} /> : <ArrowLeft size={16} color={colors.textSub} />}
        </Pressable>
        <View style={[styles.headerIcon, { backgroundColor: activeColor + '18', borderColor: activeColor + '30' }]}>
          <Calculator size={15} color={activeColor} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('calc.title')}</Text>
      </View>

      {/* Mode tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {MODES.map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          const col    = modeColors[id];
          return (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              style={[styles.tab, {
                borderBottomWidth: active ? 2 : 0,
                borderBottomColor: col,
              }]}
            >
              <Icon size={14} color={active ? col : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: active ? col : colors.textMuted, fontWeight: active ? WEIGHT.bold : WEIGHT.normal }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'growth' && <GrowthMode />}
        {mode === 'target' && <TargetMode />}
        {mode === 'trade'  && <TradeMode />}

        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          {t('calc.disclaimer')}
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1, alignItems: 'center', gap: SPACE.sm,
    paddingHorizontal: SPACE.lg, paddingTop: 18, paddingBottom: 14,
  },
  backBtn:    { width: 36, height: 36, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 32, height: 32, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: FONT.base, fontWeight: WEIGHT.bold, flex: 1 },

  tabs:         { flexDirection: 'row', borderBottomWidth: 1 },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13 },
  tabLabel:     { fontSize: FONT.sm },

  scroll:       { padding: SPACE.lg, gap: SPACE.md, paddingBottom: 40 },
  modeContent:  { gap: SPACE.md },

  card:         { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.lg, gap: SPACE.md },
  sectionTitle: { fontSize: FONT.sm, fontWeight: WEIGHT.semibold, marginBottom: 6 },

  inputWrap:    { gap: 6 },
  inputLabel:   { fontSize: FONT.sm },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, gap: SPACE.sm },
  inputField:   { flex: 1, paddingVertical: 12, fontSize: FONT.sm },
  inputSuffix:  { fontSize: FONT.xs },
  inputHint:    { fontSize: 10 },

  pillRow:      { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'nowrap' },
  pill:         { flex: 1, paddingVertical: 9, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  pillText:     { fontSize: FONT.sm, fontWeight: WEIGHT.bold },

  ratePill:     { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', gap: 2, minWidth: 60 },
  pillSmall:    { fontSize: 10 },
  rateValue:    { fontSize: FONT.sm, fontWeight: WEIGHT.bold },
  customRateInput: { width: 36, fontSize: FONT.sm, fontWeight: WEIGHT.bold, paddingVertical: 0 },

  resultHero:   {
    borderRadius: RADIUS['2xl'], padding: SPACE.xl, alignItems: 'center',
    gap: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  resultHeroOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: BRAND, opacity: 0.06, top: -60, right: -40,
  },
  resultMilestone: { fontSize: FONT.sm, color: 'rgba(255,255,255,0.6)', fontWeight: WEIGHT.medium },
  resultLabel:     { fontSize: FONT.sm, color: 'rgba(255,255,255,0.5)' },
  resultValue:     { fontSize: 32, fontWeight: WEIGHT.bold, color: '#fff', letterSpacing: -0.5 },
  resultFull:      { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  resultPillRow:   { flexDirection: 'row', gap: SPACE.sm, marginTop: 4 },
  resultPill:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.lg, borderWidth: 1 },

  statsRow:     { flexDirection: 'row', gap: SPACE.sm },
  statBox:      { flex: 1, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.md, gap: 4 },
  statIcon:     { width: 28, height: 28, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  statLabel:    { fontSize: 10 },
  statValue:    { fontSize: FONT.base, fontWeight: WEIGHT.bold },
  statSub:      { fontSize: 10 },

  compareRow:   { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-end', height: 120 },
  compareItem:  { flex: 1, alignItems: 'center', gap: 4 },
  bestBadge:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  compareBarTrack: { width: '100%', flex: 1, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  compareBarFill:  { width: '100%', borderRadius: 4 },
  compareVal:   { fontSize: 10, fontWeight: WEIGHT.bold },
  compareLabel: { fontSize: 9, textAlign: 'center' },
  compareRate:  { fontSize: 9 },

  breakdownToggle:     { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.md },
  breakdownToggleText: { flex: 1, fontSize: FONT.sm },

  tableRow:    { flexDirection: 'row', paddingHorizontal: SPACE.md, paddingVertical: 10 },
  tableHeader: { borderBottomWidth: 1 },
  tableCell:   { flex: 1, fontSize: FONT.xs, textAlign: 'center' },
  tableCellHeader: { fontWeight: WEIGHT.semibold },

  insightBox:   { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.md, gap: 4 },
  insightText:  { fontSize: FONT.xs, lineHeight: 18 },
  breakEvenPrice: { fontSize: 22, fontWeight: WEIGHT.bold },

  tradeRow:     { flexDirection: 'row', gap: SPACE.md },
  tradeResultGrid: { flexDirection: 'row', gap: SPACE.sm },
  tradeResultBox:  { flex: 1, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.md, alignItems: 'center', gap: 3 },
  tradeBoxLabel:   { fontSize: 10 },
  tradeBoxVal:     { fontSize: FONT.base, fontWeight: WEIGHT.bold },
  tradeBoxUnit:    { fontSize: FONT.xs },
  tradeProfitHero: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACE.lg },
  tradeProfitLabel:{ fontSize: FONT.xs },
  tradeProfitVal:  { fontSize: 22, fontWeight: WEIGHT.bold },
  tradeRoi:        { fontSize: FONT.xs },

  feesTotalPill: { fontSize: 11, fontWeight: WEIGHT.bold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.lg, borderWidth: 1 },
  feesSideLabel: { fontSize: FONT.xs, fontWeight: WEIGHT.semibold, marginBottom: 6 },
  feeRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel:      { fontSize: FONT.xs },
  feeVal:        { fontSize: FONT.xs },
  feesTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACE.sm, marginTop: 4, borderTopWidth: 1 },

  disclaimer:   { fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: SPACE.sm },
});
