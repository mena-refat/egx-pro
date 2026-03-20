/**
 * EGX index members and sector mapping for filters.
 * مصدر المؤشرات والشريعة: بيانات رسمية من الإيرادات (جدول المستخدم).
 * EGX30/70/100 = مؤشرات تمثيلية؛ EGX33 = مؤشر الشرعية.
 */

/** مؤشر EGX 30 - من عمود المؤشر (EGX 30 / 100 / 33 أو EGX 30) */
export const INDEX_EGX30 = [
  'ABUK', 'ADIB', 'AMOC', 'EFID', 'EGAL', 'ARCC', 'ECAP', 'ESRS', 'FAIT', 'FAITA',
  'AUTO', 'SWDY', 'EMFD', 'TMGH', 'PHDC', 'OCDI', 'ETEL', 'CLHO', 'OLFI', 'MTIE',
  'ISPH', 'RMDA', 'FWRY', 'VLMR', 'VLMRA', 'EAST', 'COMI', 'HRHO',
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
  ...INDEX_EGX70.filter(t => !(INDEX_EGX30 as readonly string[]).includes(t)),
] as const;

/** EGX 35 LV - low volatility index (Aug 2025); extend as official list is confirmed */
export const INDEX_EGX35_LV: readonly string[] = [];

/** EGX 33 / متوافق مع الشريعة - من عمود «متوافق مع الشريعة: نعم» في الجدول الرسمي */
export const INDEX_EGX33_SHARIA = [
  'ABUK', 'ADIB', 'ACRO', 'APPC', 'AJWA', 'SAUD', 'FNAR', 'AMPI', 'ATLC', 'ALCN',
  'AFMC', 'AMOC', 'AMES', 'AXPH', 'SPIN', 'AMEC', 'AMER', 'ALUM', 'CERA', 'ACGC',
  'AMIA', 'ADCI', 'APSW', 'RREI', 'ARVA', 'AIND', 'ARCC', 'ASCM', 'AITG', 'ALRA',
  'BIGP', 'BSFR', 'CAED', 'CPCI', 'POUL', 'CSAG', 'PRCL', 'DCRC', 'DTPP', 'SUGR',
  'DAPH', 'DSCW', 'EDFM', 'EFID', 'EGAL', 'EPCO', 'MISR', 'EGCH', 'EFIC', 'EDBM',
  'EGTS', 'PHAR', 'IRON', 'MOED', 'AREH', 'AREHA', 'ESGI', 'ETRS', 'ABRD', 'EIUD',
  'EHDR', 'AFDI', 'EEII', 'EALR', 'ICFC', 'IRAX', 'ECAP', 'ELKA', 'ELNA', 'OBRI',
  'ELSH', 'ELWA', 'NIPH', 'ELEC', 'UEGC', 'SWDY', 'EMFD', 'ENGC', 'ZEOT', 'ESRS',
  'FAIT', 'FAITA', 'FIRED', 'AUTO', 'GETO', 'GIHD', 'GGCC', 'BIOC', 'GOCO', 'CCRS',
  'HELI', 'INEE', 'INEG', 'ICAL', 'IFAP', 'IBCT', 'ICMI', 'DIFC', 'IPPM', 'IDRE',
  'ISMA', 'INFI', 'ITSY', 'JUFO', 'LCSW', 'MPCO', 'MOIL', 'MMAT', 'MAAL', 'MBEN',
  'MEPA', 'MNHD', 'MPCI', 'MENA', 'WCDF', 'MEGM', 'CEFM', 'MIPH', 'MBSC', 'MCQE',
  'MICH', 'MRCO', 'MFPC', 'ATQA', 'MOSC', 'WATP', 'SMPP', 'NCMP', 'NDRL', 'EGAS',
  'NCIS', 'MILS', 'NEDA', 'NINH', 'OCPH', 'OCIC', 'ODHN', 'ORHD', 'OTMT', 'ORWE',
  'PACH', 'PHDC', 'PTCC', 'ASPI', 'PSAD', 'ARAB', 'RACC', 'RAYA', 'REAC', 'RIVA',
  'RUBX', 'SIPC', 'SMFR', 'SNFC', 'SDTI', 'SKPC', 'SCEM', 'OCDI', 'SNFI', 'SCFM',
  'SVCE', 'SCTS', 'SBAG', 'TMGH', 'ADPC', 'TOUR', 'UNIT', 'UNFO', 'UEFM', 'VERT',
  'WKOL', 'DOMT', 'CLHO', 'OLFI', 'MTIE', 'CICH', 'CIRA', 'FWRY', 'RMDA', 'AIVCB',
  'SPMD', 'OFH', 'ACAMD', 'ISPH', 'TALM', 'IDHC', 'ISMQ', 'KRDI', 'MCRO', 'AIHC',
  'ETEL',
] as const;

const EGX30_SET = new Set(INDEX_EGX30);
const EGX70_SET = new Set(INDEX_EGX70);
const EGX100_SET = new Set(INDEX_EGX100);
const EGX35_LV_SET = new Set(INDEX_EGX35_LV);
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
export function isInEGX35LV(ticker: string): boolean {
  return EGX35_LV_SET.has(ticker);
}
export function isShariaCompliant(ticker: string): boolean {
  return EGX33_SET.has(ticker as typeof INDEX_EGX33_SHARIA[number]);
}

/** Sector by ticker (keywords from name; fallback "other") */
const SECTOR_KEYWORDS: { keys: string[]; sectorAr: string; sectorEn: string; gics: string }[] = [
  { keys: ['بنك', 'بنوك', 'bank', 'credit', 'قابضة مالية', 'سمسرة'], sectorAr: 'بنوك', sectorEn: 'Banks', gics: 'FINANCIALS' },
  { keys: ['عقار', 'عقارية', 'إسكان', 'real estate', 'إنشاء'], sectorAr: 'عقارات', sectorEn: 'Real Estate', gics: 'REAL_ESTATE' },
  { keys: ['حديد', 'صلب', 'أسمنت', 'سيراميك', 'ألومنيوم', 'كيماويات', 'أسمدة', 'ورق', 'زجاج', 'جرانيت'], sectorAr: 'المواد والصناعات', sectorEn: 'Materials', gics: 'MATERIALS' },
  { keys: ['صناع', 'صناعة', 'industry', 'مطاحن', 'مقاولات', 'نقل', 'حاويات', 'كهرباء', 'كابلات'], sectorAr: 'صناعة', sectorEn: 'Industry', gics: 'INDUSTRIALS' },
  { keys: ['طبي', 'مستشفى', 'أدوية', 'دواء', 'pharma', 'medical', 'صيدل'], sectorAr: 'رعاية صحية', sectorEn: 'Healthcare', gics: 'HEALTH_CARE' },
  { keys: ['اتصال', 'اتصالات', 'telecom', 'فوري', 'تليكوم', 'نايل سات'], sectorAr: 'اتصالات', sectorEn: 'Telecom', gics: 'COMMUNICATION_SERVICES' },
  { keys: ['تقنية', 'تكنولوجيا', 'برمجة', 'software'], sectorAr: 'تقنية المعلومات', sectorEn: 'Information Technology', gics: 'INFORMATION_TECHNOLOGY' },
  { keys: ['سياحة', 'فندق', 'فنادق', 'tourist'], sectorAr: 'سياحة', sectorEn: 'Tourism', gics: 'CONSUMER_DISCRETIONARY' },
  { keys: ['زراع', 'غذائ', 'سكر', 'دواجن', 'زيوت', 'صابون', 'لبان'], sectorAr: 'زراعة وغذاء', sectorEn: 'Agriculture & Food', gics: 'CONSUMER_STAPLES' },
  { keys: ['نفط', 'بترول', 'غاز', 'طاقة', 'بتروكيماويات'], sectorAr: 'الطاقة', sectorEn: 'Energy', gics: 'ENERGY' },
  { keys: ['كهرباء', 'مياه', 'مرافق'], sectorAr: 'المرافق', sectorEn: 'Utilities', gics: 'UTILITIES' },
];

export function getSector(ticker: string, nameAr: string, nameEn: string, lang: 'ar' | 'en'): string {
  const text = `${nameAr} ${nameEn}`.toLowerCase();
  for (const { keys, sectorAr, sectorEn } of SECTOR_KEYWORDS) {
    if (keys.some(k => text.includes(k.toLowerCase()))) return lang === 'ar' ? sectorAr : sectorEn;
  }
  return lang === 'ar' ? 'أخرى' : 'Other';
}

/** مفتاح GICS من اسم السهم (للمحفظة والرسوم عندما لا يرجع الـ API القطاع) */
export function getSectorGicsKey(ticker: string, nameAr: string, nameEn: string): string | null {
  const text = `${nameAr} ${nameEn}`.toLowerCase();
  for (const { keys, gics } of SECTOR_KEYWORDS) {
    if (keys.some(k => text.includes(k.toLowerCase()))) return gics;
  }
  return null;
}
