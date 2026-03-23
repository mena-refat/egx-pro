import { Wallet, Clock, AlertTriangle, Target, Settings, TrendingUp, Users, Gift } from 'lucide-react';

export type TimelineChoice = 'lt1' | '1_3' | '3_7' | 'gt7';
export type BudgetBand = 'lt_1000' | '1_5k' | '5_20k' | 'gt_20k';

export interface FormData {
  goal: string;
  timeline: TimelineChoice | '';
  reaction30: string;
  budgetBand: BudgetBand | '';
  shariaMode: boolean | null;
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
  { id: 'banks_financial',        ar: 'البنوك والخدمات المالية',     en: 'Banking & Financial Services' },
  { id: 'real_estate_construction', ar: 'العقارات والإنشاءات',       en: 'Real Estate & Construction'   },
  { id: 'food_beverages',         ar: 'الأغذية والمشروبات والتبغ',   en: 'Food, Beverages & Tobacco'    },
  { id: 'healthcare_pharma',      ar: 'الرعاية الصحية والأدوية',     en: 'Healthcare & Pharma'          },
  { id: 'it_media_telecom',       ar: 'الاتصالات والتكنولوجيا',      en: 'Telecom, Tech & Media'        },
  { id: 'industrial_auto',        ar: 'الصناعة والسيارات',           en: 'Industrial & Automotive'      },
  { id: 'tourism_entertainment',  ar: 'السياحة والترفيه',            en: 'Tourism & Entertainment'      },
  { id: 'basic_resources',        ar: 'الموارد الأساسية',            en: 'Basic Resources'              },
  { id: 'utilities',              ar: 'المرافق',                     en: 'Utilities'                    },
  { id: 'textiles_durables',      ar: 'المنسوجات والسلع المعمرة',    en: 'Textiles & Durables'          },
  { id: 'diversified',            ar: 'متنوع',                      en: 'Diversified'                  },
  { id: 'unknown',                ar: 'لا أعرف بعد',                 en: "I'm not sure yet"             },
];
