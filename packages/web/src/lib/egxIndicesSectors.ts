/**
 * EGX index members and sector mapping for filters.
 * مصدر المؤشرات والشريعة: بيانات رسمية من الإيرادات (جدول المستخدم).
 * EGX30/70/100 = مؤشرات تمثيلية؛ EGX33 = مؤشر الشرعية.
 */

/** مؤشر EGX 30 - الأسهم الـ 30 الأكثر نشاطاً وسيولة في البورصة المصرية */
export const INDEX_EGX30 = [
  'ABUK', 'ADIB', 'AMOC', 'EFID', 'EGAL', 'ARCC', 'ECAP', 'ESRS', 'FAIT', 'FAITA',
  'AUTO', 'SWDY', 'EMFD', 'TMGH', 'PHDC', 'OCDI', 'ETEL', 'CLHO', 'OLFI', 'MTIE',
  'ISPH', 'RMDA', 'FWRY', 'VLMR', 'VLMRA', 'EAST', 'COMI', 'HRHO',
  'EFIH', 'JUFO',
] as const;

export const INDEX_EGX70 = [
  // الدفعة الأصلية — تم حذف الأسهم المكررة مع EGX30 (EAST EGAL EMFD HRHO ISPH MTIE RMDA SWDY EFIH)
  'ACRO', 'APPC', 'ADCI', 'ALEXA', 'AMIA', 'ANFI', 'ARVA', 'ASCM', 'BCAP', 'BIGP',
  'CAED', 'CERA', 'CIRF', 'COSG', 'CPCI', 'DAPH', 'DEIN', 'EDFM',
  'EKHO', 'ELEC', 'ENGC', 'EPCO', 'ESAC', 'ESGI', 'ETRS', 'FNAR',
  'IDRE', 'IRAX', 'KABO', 'MOED', 'NASR', 'NIPH', 'OBRI', 'PHAR', 'POUL',
  'PRCL', 'RREI', 'SPHT', 'SUGR', 'UEGC', 'ZEOT', 'AMEC', 'AXPH', 'DSCW',
  'EBDP', 'EEII', 'EOSB', 'ICFC', 'ISMQ', 'ODIN', 'SPMD', 'TALM',
  'IDHC', 'MCRO', 'CNFN', 'CICH', 'OFH', 'SRWA', 'TANM', 'GDWA',
  // أسهم مضافة — مؤكدة من مؤشر EGX35-LV (تنتمي لـ EGX100 وليست في EGX30)
  'CIRA', 'HDBK', 'MFPC', 'OCIC', 'SKPC', 'CIEB', 'HELI', 'ALCN',
  'EXPA', 'EGCH', 'PRDC', 'AIND', 'ELSH', 'ACGC', 'EHDR', 'BTFH', 'MNHD',
] as const;

export const INDEX_EGX100 = [
  ...INDEX_EGX30,
  ...INDEX_EGX70.filter(t => !(INDEX_EGX30 as readonly string[]).includes(t)),
] as const;

/**
 * EGX 35 LV - مؤشر منخفض التقلبات (أُطلق رسمياً 3 أغسطس 2025)
 * يضم 35 سهماً من الأكثر سيولة والأقل تذبذباً سعرياً من داخل مؤشر EGX100
 * المصدر: البيان الرسمي للبورصة المصرية + bankygate.com (يوليو 2025)
 * الترتيب: تنازلي حسب الوزن النسبي (COMI الأعلى 4.26% — BTFH الأدنى 2.23%)
 */
export const INDEX_EGX35_LV = [
  // 1  البنك التجاري الدولي            4.26%
  'COMI',
  // 2  المصرية للاتصالات               3.51%
  'ETEL',
  // 3  إيبيكو للصناعات الدوائية        3.37%
  'PHAR',
  // 4  سيرا للتعليم                    3.36%
  'CIRA',
  // 5  القابضة المصرية الكويتية        3.28%
  'EKHO',
  // 6  بنك التعمير والإسكان            3.22%
  'HDBK',
  // 7  موبكو لإنتاج الأسمدة            3.18%
  'MFPC',
  // 8  مدينة مصر للإسكان والتعمير      3.17%
  'MNHD',
  // 9  أوراسكوم للبناء والصناعة        3.14%
  'OCIC',
  // 10 إيديتا للصناعات الغذائية        3.07%
  'EFID',
  // 11 الإسكندرية للزيوت المعدنية      3.03%
  'AMOC',
  // 12 سيدي كرير للبتروكيماويات        2.97%
  'SKPC',
  // 13 دلتا للسكر                      2.95%
  'SUGR',
  // 14 كريدي أجريكول مصر               2.95%
  'CIEB',
  // 15 مصرف أبو ظبي الإسلامي          2.89%
  'ADIB',
  // 16 الكابلات الكهربائية المصرية     2.89%
  'ELEC',
  // 17 أبو قير للأسمدة                 2.87%
  'ABUK',
  // 18 هليوبوليس للإسكان (مصر الجديدة) 2.85%
  'HELI',
  // 19 الإسكندرية للحاويات والبضائع    2.77%
  'ALCN',
  // 20 طلعت مصطفى القابضة             2.77%
  'TMGH',
  // 21 بنك تنمية الصادرات              2.76%
  'EXPA',
  // 22 كيما للصناعات الكيماوية         2.72%
  'EGCH',
  // 23 بايونيرز بروبرتيز               2.69%
  'PRDC',
  // 24 أرابيا للاستثمار والتنمية       2.64%
  'AIND',
  // 25 إي-فاينانس                       2.55%
  'EFIH',
  // 26 الشرقية للدخان                  2.55%
  'EAST',
  // 27 الشمس للإسكان والتعمير          2.55%
  'ELSH',
  // 28 ماكرو جروب للأدوية              2.53%
  'MCRO',
  // 29 الصناعات الهندسية (أيكون)       2.53%
  'ENGC',
  // 30 فوري للبنوك والمدفوعات          2.45%
  'FWRY',
  // 31 العربية لحليج الأقطان           2.35%
  'ACGC',
  // 32 مستشفى كليوباترا                2.34%
  'CLHO',
  // 33 المصريين للإسكان والتعمير       2.34%
  'EHDR',
  // 34 إي إف جي القابضة (هيرمس)        2.28%
  'HRHO',
  // 35 بلتون المالية القابضة           2.23%
  'BTFH',
] as const;

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
  return EGX35_LV_SET.has(ticker as typeof INDEX_EGX35_LV[number]);
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
