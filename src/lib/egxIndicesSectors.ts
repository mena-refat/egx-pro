/**
 * EGX index members and sector mapping for filters.
 * EGX30/70/100 are representative subsets; EGX33 = Sharia-compliant index.
 */

export const INDEX_EGX30 = [
  'COMI', 'CCAP', 'SWDY', 'HRHO', 'EFID', 'EXPA', 'ADIB', 'SAUD', 'CIEB', 'BTFH',
  'TMGH', 'OCDI', 'ETEL', 'ORAS', 'AMER', 'PIOH', 'ORWE', 'FWRY', 'EMFD', 'CIRA',
  'DCRC', 'EAST', 'ABUK', 'ESRS', 'CLHO', 'AMOC', 'ARCC', 'ECAP', 'IRON', 'MPRC',
] as const;

export const INDEX_EGX70 = [
  'ACRO', 'APPC', 'ADCI', 'ALEXA', 'AMIA', 'ANFI', 'ARVA', 'ASCM', 'BCAP', 'BIGP',
  'CAED', 'CERA', 'CIRF', 'COSG', 'CPCI', 'DAPH', 'DEIN', 'EAST', 'EDFM', 'EGAL',
  'EKHO', 'ELEC', 'EMFD', 'ENGC', 'EPCO', 'ESAC', 'ESGI', 'ETRS', 'FNAR',
  'HRHO', 'IDRE', 'IRAX', 'KABO', 'MOED', 'NASR', 'NIPH', 'OBRI', 'PHAR', 'POUL',
  'PRCL', 'RREI', 'SPHT', 'SUGR', 'SWDY', 'UEGC', 'ZEOT', 'AMEC', 'AXPH', 'DSCW',
  'EBDP', 'EEII', 'EOSB', 'ICFC', 'ISMQ', 'MTIE', 'ODIN', 'RMDA', 'SPMD', 'TALM',
  'IDHC', 'ISPH', 'MCRO', 'CNFN', 'CICH', 'EFIH', 'OFH', 'SRWA', 'TANM', 'GDWA',
] as const;

export const INDEX_EGX100 = [
  ...INDEX_EGX30,
  ...INDEX_EGX70.filter(t => !INDEX_EGX30.includes(t)),
] as const;

/** EGX 33 Sharia-compliant index (subset; used for Sharia badge) */
export const INDEX_EGX33_SHARIA = [
  'COMI', 'ADIB', 'SAUD', 'EXPA', 'FWRY', 'EFID', 'TMGH', 'CIRA', 'EMFD', 'SWDY',
  'HRHO', 'BTFH', 'BCAP', 'AMER', 'PIOH', 'ORWE', 'DCRC', 'EAST', 'CLHO', 'ARCC',
  'ECAP', 'MPRC', 'AMOC', 'PHAR', 'ETEL', 'ORAS', 'OCDI', 'ABUK', 'ESRS', 'IRON',
  'CERA', 'PRCL', 'IDRE',
] as const;

const EGX30_SET = new Set(INDEX_EGX30);
const EGX70_SET = new Set(INDEX_EGX70);
const EGX100_SET = new Set(INDEX_EGX100);
const EGX33_SET = new Set(INDEX_EGX33_SHARIA);

export function isInEGX30(ticker: string): boolean {
  return EGX30_SET.has(ticker as typeof INDEX_EGX30[number]);
}
export function isInEGX70(ticker: string): boolean {
  return EGX70_SET.has(ticker as typeof INDEX_EGX70[number]);
}
export function isInEGX100(ticker: string): boolean {
  return EGX100_SET.has(ticker as typeof INDEX_EGX100[number]);
}
export function isShariaCompliant(ticker: string): boolean {
  return EGX33_SET.has(ticker as typeof INDEX_EGX33_SHARIA[number]);
}

/** Sector by ticker (keywords from name; fallback "other") */
const SECTOR_KEYWORDS: { keys: string[]; sectorAr: string; sectorEn: string }[] = [
  { keys: ['بنك', 'بنوك', 'bank', 'credit', 'قابضة مالية', 'سمسرة'], sectorAr: 'بنوك', sectorEn: 'Banks' },
  { keys: ['عقار', 'عقارية', 'إسكان', 'real estate', 'إنشاء'], sectorAr: 'عقارات', sectorEn: 'Real Estate' },
  { keys: ['صناع', 'صناعة', 'industry', 'مطاحن', 'حديد', 'صلب', 'أسمنت', 'سيراميك'], sectorAr: 'صناعة', sectorEn: 'Industry' },
  { keys: ['طبي', 'مستشفى', 'أدوية', 'دواء', 'pharma', 'medical', 'صيدل'], sectorAr: 'رعاية صحية', sectorEn: 'Healthcare' },
  { keys: ['اتصال', 'اتصالات', 'telecom', 'فوري', 'تقني'], sectorAr: 'اتصالات وتقنية', sectorEn: 'Telecom & Tech' },
  { keys: ['سياحة', 'فندق', 'فنادق', 'tourist'], sectorAr: 'سياحة', sectorEn: 'Tourism' },
  { keys: ['زراع', 'غذائ', 'سكر', 'دواجن', 'أسمدة'], sectorAr: 'زراعة وغذاء', sectorEn: 'Agriculture & Food' },
];

export function getSector(ticker: string, nameAr: string, nameEn: string, lang: 'ar' | 'en'): string {
  const text = `${nameAr} ${nameEn}`.toLowerCase();
  for (const { keys, sectorAr, sectorEn } of SECTOR_KEYWORDS) {
    if (keys.some(k => text.includes(k.toLowerCase()))) return lang === 'ar' ? sectorAr : sectorEn;
  }
  return lang === 'ar' ? 'أخرى' : 'Other';
}
