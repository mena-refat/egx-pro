import { Wallet, Clock, AlertTriangle, Target, Settings, TrendingUp, Users, Gift } from 'lucide-react';

export type TimelineChoice = 'lt1' | '1_3' | '3_7' | 'gt7';
export type BudgetBand = 'lt_1000' | '1_5k' | '5_20k' | 'gt_20k';

export interface FormData {
  goal: string;
  timeline: TimelineChoice | '';
  reaction30: string;
  budgetBand: BudgetBand | '';
  shariaMode: boolean;
  sectors: string[];
  level: string;
  hearAboutUs: string[];
  referralCode: string;
}

export const STEPS = [
  { id: 'goal', icon: Wallet },
  { id: 'timeline', icon: Clock },
  { id: 'risk', icon: AlertTriangle },
  { id: 'budget', icon: Wallet },
  { id: 'islamic', icon: Settings },
  { id: 'sectors', icon: Target },
  { id: 'level', icon: TrendingUp },
  { id: 'hear', icon: Users },
  { id: 'referral', icon: Gift },
];

export const SECTORS = [
  { id: 'banks_financial', label: 'البنوك والخدمات المالية (غير مصرفية)' },
  { id: 'real_estate_construction', label: 'العقارات والإنشاءات' },
  { id: 'food_beverages', label: 'الأغذية والمشروبات والتبغ' },
  { id: 'healthcare_pharma', label: 'الرعاية الصحية والأدوية' },
  { id: 'it_media_telecom', label: 'الاتصالات والتكنولوجيا والإعلام' },
  { id: 'industrial_auto', label: 'السلع والخدمات الصناعية والسيارات' },
  { id: 'tourism_entertainment', label: 'السياحة والترفيه' },
  { id: 'basic_resources', label: 'الموارد الأساسية' },
  { id: 'utilities', label: 'المرافق' },
  { id: 'textiles_durables', label: 'المنسوجات والسلع المعمرة' },
  { id: 'diversified', label: 'متنوع' },
  { id: 'unknown', label: 'لا أعرف بعد' },
];
