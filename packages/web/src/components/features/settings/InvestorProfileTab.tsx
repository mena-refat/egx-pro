import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target, Clock, AlertTriangle, Wallet, TrendingUp,
  Home, Umbrella, Compass, Zap, Plus, Check, Save, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../lib/api';
import { Button } from '../../ui/Button';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

// ─── Option IDs ──────────────────────────────────────────────────────────────

const GOAL_IDS = [
  { id: 'property_or_car', icon: Home,      titleKey: 'investorProfile.goalPropertyCar',   descKey: 'investorProfile.goalPropertyCarDesc' },
  { id: 'wealth',          icon: TrendingUp, titleKey: 'investorProfile.goalWealth',         descKey: 'investorProfile.goalWealthDesc' },
  { id: 'retirement',      icon: Umbrella,   titleKey: 'investorProfile.goalRetirement',     descKey: 'investorProfile.goalRetirementDesc' },
  { id: 'travel',          icon: Compass,    titleKey: 'investorProfile.goalTravel',         descKey: 'investorProfile.goalTravelDesc' },
  { id: 'trading',         icon: Zap,        titleKey: 'investorProfile.goalTrading',        descKey: 'investorProfile.goalTradingDesc' },
  { id: 'other',           icon: Plus,       titleKey: 'investorProfile.goalOther',          descKey: 'investorProfile.goalOtherDesc' },
] as const;

const TIMELINE_IDS = [
  { id: 'lt1', titleKey: 'investorProfile.timelineLt1', descKey: 'investorProfile.timelineLt1Desc', years: 1 },
  { id: '1_3', titleKey: 'investorProfile.timeline1_3', descKey: 'investorProfile.timeline1_3Desc', years: 3 },
  { id: '3_7', titleKey: 'investorProfile.timeline3_7', descKey: 'investorProfile.timeline3_7Desc', years: 5 },
  { id: 'gt7', titleKey: 'investorProfile.timelineGt7', descKey: 'investorProfile.timelineGt7Desc', years: 10 },
] as const;

const RISK_IDS = [
  { id: 'sell_immediately', risk: 'conservative' as const, titleKey: 'investorProfile.riskSellImmediately', descKey: 'investorProfile.riskSellImmediatelyDesc' },
  { id: 'wait_and_see',    risk: 'moderate' as const,     titleKey: 'investorProfile.riskWaitAndSee',      descKey: 'investorProfile.riskWaitAndSeeDesc' },
  { id: 'buy_more',        risk: 'aggressive' as const,   titleKey: 'investorProfile.riskBuyMore',         descKey: 'investorProfile.riskBuyMoreDesc' },
  { id: 'long_term_calm',  risk: 'moderate' as const,     titleKey: 'investorProfile.riskLongTermCalm',    descKey: 'investorProfile.riskLongTermCalmDesc' },
] as const;

const BUDGET_IDS = [
  { id: 'lt_1000', titleKey: 'investorProfile.budgetLt1000', descKey: 'investorProfile.budgetLt1000Desc', amount: 500 },
  { id: '1_5k',    titleKey: 'investorProfile.budget1_5k',   descKey: 'investorProfile.budget1_5kDesc',   amount: 3000 },
  { id: '5_20k',   titleKey: 'investorProfile.budget5_20k',  descKey: 'investorProfile.budget5_20kDesc',  amount: 10000 },
  { id: 'gt_20k',  titleKey: 'investorProfile.budgetGt20k',  descKey: 'investorProfile.budgetGt20kDesc',  amount: 25000 },
] as const;

const LEVEL_IDS = [
  { id: 'beginner',     titleKey: 'investorProfile.levelBeginner',     descKey: 'investorProfile.levelBeginnerDesc' },
  { id: 'basics',       titleKey: 'investorProfile.levelBasics',        descKey: 'investorProfile.levelBasicsDesc' },
  { id: 'intermediate', titleKey: 'investorProfile.levelIntermediate',  descKey: 'investorProfile.levelIntermediateDesc' },
  { id: 'advanced',     titleKey: 'investorProfile.levelAdvanced',      descKey: 'investorProfile.levelAdvancedDesc' },
] as const;

const SECTOR_IDS = [
  { id: 'banks_financial',          labelKey: 'investorProfile.sectorBanks' },
  { id: 'real_estate_construction',  labelKey: 'investorProfile.sectorRealEstate' },
  { id: 'food_beverages',            labelKey: 'investorProfile.sectorFood' },
  { id: 'healthcare_pharma',         labelKey: 'investorProfile.sectorHealthcare' },
  { id: 'it_media_telecom',          labelKey: 'investorProfile.sectorTech' },
  { id: 'industrial_auto',           labelKey: 'investorProfile.sectorIndustrial' },
  { id: 'tourism_entertainment',     labelKey: 'investorProfile.sectorTourism' },
  { id: 'basic_resources',           labelKey: 'investorProfile.sectorResources' },
  { id: 'utilities',                 labelKey: 'investorProfile.sectorUtilities' },
  { id: 'textiles_durables',         labelKey: 'investorProfile.sectorTextiles' },
  { id: 'diversified',               labelKey: 'investorProfile.sectorDiversified' },
  { id: 'unknown',                   labelKey: 'investorProfile.sectorUnknown' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvestorFormState {
  goal: string;
  timeline: string;
  reaction30: string;
  budgetBand: string;
  sectors: string[];
  level: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function invertRiskToReaction(riskTolerance?: string): string {
  switch (riskTolerance) {
    case 'conservative': return 'sell_immediately';
    case 'aggressive':   return 'buy_more';
    default:             return 'wait_and_see';
  }
}

function invertHorizonToBand(horizon?: number): string {
  if (!horizon) return '';
  if (horizon <= 1) return 'lt1';
  if (horizon <= 3) return '1_3';
  if (horizon <= 7) return '3_7';
  return 'gt7';
}

function invertBudgetToBand(budget?: number): string {
  if (!budget) return '';
  if (budget < 1000) return 'lt_1000';
  if (budget < 5000) return '1_5k';
  if (budget < 20000) return '5_20k';
  return 'gt_20k';
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-subtle)]">
        <Icon className="w-4 h-4 text-[var(--brand)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type OptionCardProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ className?: string }>;
};
const OptionCard: React.FC<OptionCardProps> = ({ selected, onClick, title, desc, icon: Icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-start w-full p-3.5 rounded-xl border-2 transition-all duration-150 text-sm
        ${selected
          ? 'border-[var(--brand)] bg-[var(--brand)]/8 shadow-sm'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
        }`}
    >
      {selected && (
        <span className="absolute top-2.5 end-2.5 w-4 h-4 rounded-full bg-[var(--brand)] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-center gap-2 mb-0.5">
        {Icon && <Icon className="w-4 h-4 text-[var(--brand)] shrink-0" />}
        <span className="font-semibold text-[var(--text-primary)]">{title}</span>
      </div>
      {desc && <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvestorProfileTab() {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language?.startsWith('ar');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const rawProfile = user?.investorProfile as Record<string, unknown> | null | undefined;

  const [form, setForm] = useState<InvestorFormState>({
    goal:       (rawProfile?.goal as string)       || '',
    timeline:   (rawProfile?.timeline as string)   || invertHorizonToBand(user?.investmentHorizon),
    reaction30: (rawProfile?.reaction30 as string) || invertRiskToReaction(user?.riskTolerance),
    budgetBand: (rawProfile?.budgetBand as string) || invertBudgetToBand(user?.monthlyBudget),
    sectors:    (rawProfile?.sectors as string[])  || user?.interestedSectors || [],
    level:      (rawProfile?.level as string)      || '',
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty);

  function update(patch: Partial<InvestorFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setStatus(null);
  }

  function toggleSector(id: string) {
    setForm((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(id)
        ? prev.sectors.filter((s) => s !== id)
        : [...prev.sectors, id],
    }));
    setDirty(true);
    setStatus(null);
  }

  const riskMap: Record<string, 'conservative' | 'moderate' | 'aggressive'> = {
    sell_immediately: 'conservative',
    wait_and_see:     'moderate',
    buy_more:         'aggressive',
    long_term_calm:   'moderate',
  };

  const timelineYears: Record<string, number> = { lt1: 1, '1_3': 3, '3_7': 5, gt7: 10 };
  const budgetAmount:  Record<string, number> = { lt_1000: 500, '1_5k': 3000, '5_20k': 10000, gt_20k: 25000 };

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await api.put('/user/profile', {
        riskTolerance:     riskMap[form.reaction30] ?? 'moderate',
        investmentHorizon: timelineYears[form.timeline] ?? 5,
        monthlyBudget:     budgetAmount[form.budgetBand] ?? 0,
        interestedSectors: form.sectors,
        investorProfile: {
          ...(rawProfile ?? {}),
          goal:       form.goal,
          timeline:   form.timeline,
          reaction30: form.reaction30,
          budgetBand: form.budgetBand,
          sectors:    form.sectors,
          level:      form.level,
        },
      });
      updateUser({
        interestedSectors: form.sectors,
        riskTolerance:     riskMap[form.reaction30] ?? 'moderate',
        investmentHorizon: timelineYears[form.timeline] ?? 5,
        monthlyBudget:     budgetAmount[form.budgetBand] ?? 0,
        investorProfile: {
          ...(rawProfile ?? {}),
          goal: form.goal, timeline: form.timeline, reaction30: form.reaction30,
          budgetBand: form.budgetBand, sectors: form.sectors, level: form.level,
        },
      });
      setStatus({ type: 'success', msg: t('investorProfile.savedSuccess') });
      setDirty(false);
    } catch {
      setStatus({ type: 'error', msg: t('investorProfile.saveError') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="relative bg-gradient-to-br from-violet-400/10 via-transparent to-transparent p-5">
          <div className="absolute -top-8 -end-8 w-32 h-32 rounded-full bg-violet-400/6 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t('investorProfile.title')}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('investorProfile.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal */}
      <Section icon={Target} title={t('investorProfile.sectionGoal')}>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_IDS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.goal === opt.id}
              onClick={() => update({ goal: opt.id })}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
              icon={opt.icon}
            />
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section icon={Clock} title={t('investorProfile.sectionTimeline')}>
        <div className="grid grid-cols-2 gap-2">
          {TIMELINE_IDS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.timeline === opt.id}
              onClick={() => update({ timeline: opt.id })}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
            />
          ))}
        </div>
      </Section>

      {/* Risk */}
      <Section icon={AlertTriangle} title={t('investorProfile.sectionRisk')}>
        <div className="grid grid-cols-1 gap-2">
          {RISK_IDS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.reaction30 === opt.id}
              onClick={() => update({ reaction30: opt.id })}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
            />
          ))}
        </div>
      </Section>

      {/* Budget */}
      <Section icon={Wallet} title={t('investorProfile.sectionBudget')}>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_IDS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.budgetBand === opt.id}
              onClick={() => update({ budgetBand: opt.id })}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
            />
          ))}
        </div>
      </Section>

      {/* Sectors */}
      <Section icon={Target} title={t('investorProfile.sectionSectors')}>
        <div className="flex flex-wrap gap-2">
          {SECTOR_IDS.map((sector) => {
            const selected = form.sectors.includes(sector.id);
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => toggleSector(sector.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                  ${selected
                    ? 'bg-[var(--brand)]/10 border-[var(--brand)] text-[var(--brand-text)]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
              >
                {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                {t(sector.labelKey)}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Level */}
      <Section icon={TrendingUp} title={t('investorProfile.sectionLevel')}>
        <div className="grid grid-cols-2 gap-2">
          {LEVEL_IDS.map((opt) => (
            <OptionCard
              key={opt.id}
              selected={form.level === opt.id}
              onClick={() => update({ level: opt.id })}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
            />
          ))}
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10">
        <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-[var(--shadow-xl)] backdrop-blur-sm transition-all duration-200
          ${dirty ? 'bg-[var(--bg-card)]/95 border-[var(--border-strong)]' : 'bg-[var(--bg-card)]/60 border-[var(--border)]'}`}>
          {status && (
            <p className={`text-xs font-medium flex-1 ${status.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {status.msg}
            </p>
          )}
          {!status && (
            <p className="text-xs text-[var(--text-muted)] flex-1">
              {dirty ? t('investorProfile.unsavedChanges') : t('investorProfile.allSaved')}
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!dirty || saving}
            onClick={handleSave}
            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            iconPosition="left"
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
