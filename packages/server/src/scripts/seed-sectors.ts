import { prisma } from '../lib/prisma.ts';
import { GicsSector } from '@prisma/client';
import { EGX_STOCKS } from '../lib/egxStocks.ts';
import { getOfficialGics, getOfficialSharia } from '../lib/egxStockOfficialData.ts';

// ─── 1) Name-based map (longest match wins per stock) ─────────────────────
const SECTOR_MAP: Record<string, GicsSector> = {
  'راية القابضة': GicsSector.INFORMATION_TECHNOLOGY,
  'المجموعة المتكاملة': GicsSector.INFORMATION_TECHNOLOGY,
  'قناة السويس لتوطين التكنولوجيا': GicsSector.INFORMATION_TECHNOLOGY,
  'نوفيدا للاستثمار والتكنولوجيا': GicsSector.INFORMATION_TECHNOLOGY,
  'فوري': GicsSector.INFORMATION_TECHNOLOGY,
  'اي فاينانس': GicsSector.INFORMATION_TECHNOLOGY,
  'ڤاليو': GicsSector.INFORMATION_TECHNOLOGY,
  'ديجيتايز للاستثمار والتقنية': GicsSector.INFORMATION_TECHNOLOGY,
  'ايكون': GicsSector.INFORMATION_TECHNOLOGY,
  'دايس': GicsSector.INFORMATION_TECHNOLOGY,
  'انترناشيونال بزنيس': GicsSector.INFORMATION_TECHNOLOGY,
  'الاسكندرية للأدوية': GicsSector.HEALTH_CARE,
  'جلاكسو سميثكلاين': GicsSector.HEALTH_CARE,
  'جلاكسو سميث كلاين': GicsSector.HEALTH_CARE,
  'القاهرة للأدوية': GicsSector.HEALTH_CARE,
  'مستشفي كليوباترا': GicsSector.HEALTH_CARE,
  'الاسكندرية للخدمات الطبية': GicsSector.HEALTH_CARE,
  'العبوات الدوائية': GicsSector.HEALTH_CARE,
  'العبوات الطبية': GicsSector.HEALTH_CARE,
  'مينا فارم للأودية': GicsSector.HEALTH_CARE,
  'ممفيس للأدوية': GicsSector.HEALTH_CARE,
  'أكتوبر فارما': GicsSector.HEALTH_CARE,
  'نيوداب': GicsSector.HEALTH_CARE,
  'سبيد ميديكال': GicsSector.HEALTH_CARE,
  'راميدا': GicsSector.HEALTH_CARE,
  'فاروتك': GicsSector.HEALTH_CARE,
  'الاتحاد الصيدلي': GicsSector.HEALTH_CARE,
  'ابن سينا': GicsSector.HEALTH_CARE,
  'ماكرو جروب': GicsSector.HEALTH_CARE,
  'بريميم هيلثكير جروب': GicsSector.HEALTH_CARE,
  'فتنس برايم للاندية الصحية': GicsSector.HEALTH_CARE,
  'البنك التجاري الدولي': GicsSector.FINANCIALS,
  'هيرمس': GicsSector.FINANCIALS,
  'القلعة للاستشارات المالية': GicsSector.FINANCIALS,
  'فالمور القابضة للاستثمار': GicsSector.FINANCIALS,
  'اسباير كابيتال': GicsSector.FINANCIALS,
  'بنك التعمير': GicsSector.FINANCIALS,
  'المالية والصناعية': GicsSector.FINANCIALS,
  'الغربية الإسلامية': GicsSector.FINANCIALS,
  'جراند انفستمنت': GicsSector.FINANCIALS,
  'العالمية للاستثمار والتنمية': GicsSector.FINANCIALS,
  'ليسيكو مصر': GicsSector.FINANCIALS,
  'مينا للاستثمار': GicsSector.FINANCIALS,
  'النعيم القابضة': GicsSector.FINANCIALS,
  'العربية المتحدة': GicsSector.FINANCIALS,
  'العرفة للاستثمارات': GicsSector.FINANCIALS,
  'المهندس للتأمين': GicsSector.FINANCIALS,
  'بنك قناة السويس': GicsSector.FINANCIALS,
  'كريدي أجريكول': GicsSector.FINANCIALS,
  'بنك قطر الوطني': GicsSector.FINANCIALS,
  'دلتا للتأمين': GicsSector.FINANCIALS,
  'البنك المصري الخليجي': GicsSector.FINANCIALS,
  'برايم القابضة': GicsSector.FINANCIALS,
  'بنك الشركة المصرفية': GicsSector.FINANCIALS,
  'فيصل الإسلامي': GicsSector.FINANCIALS,
  'ارابيا انفستمنتس': GicsSector.FINANCIALS,
  'أطلس': GicsSector.FINANCIALS,
  'الملتقى للاستثمارات': GicsSector.FINANCIALS,
  'بلتون المالية القابضة': GicsSector.FINANCIALS,
  'القاهرة للاستثمار': GicsSector.FINANCIALS,
  'إى إس بى للوساطة': GicsSector.FINANCIALS,
  'الوادي للاستثمار والتنمية': GicsSector.FINANCIALS,
  'العروبة للسمسرة': GicsSector.FINANCIALS,
  'أودن': GicsSector.FINANCIALS,
  'الأهلي للتنمية': GicsSector.FINANCIALS,
  'رواد': GicsSector.FINANCIALS,
  'بنك البركة': GicsSector.FINANCIALS,
  'ركاز القابضة للاستثمارات المالية': GicsSector.FINANCIALS,
  'المصرية الكويتية': GicsSector.FINANCIALS,
  'الأولى للاستثمار': GicsSector.FINANCIALS,
  'أوراسكوم المالية القابضة': GicsSector.FINANCIALS,
  'أوراسكوم للاستثمار': GicsSector.FINANCIALS,
  'التوفيق للتأجير التمويلي': GicsSector.FINANCIALS,
  'بي إنفستمنتس القابضة': GicsSector.FINANCIALS,
  'سي آي كابيتال': GicsSector.FINANCIALS,
  'العربية للإدارة والتطوير': GicsSector.FINANCIALS,
  'كونتكت المالية': GicsSector.FINANCIALS,
  'أكت فاينانشال': GicsSector.FINANCIALS,
  'المصرف المتحد': GicsSector.FINANCIALS,
  'كاتليست بارتنرز': GicsSector.FINANCIALS,
  'ارابيا انفستمنتس هولدنج': GicsSector.FINANCIALS,
  'توسع للتخصيم': GicsSector.FINANCIALS,
  'ايه كابيتال القابضة': GicsSector.FINANCIALS,
  'آراب للتنمية': GicsSector.FINANCIALS,
  'إم بي': GicsSector.FINANCIALS,
  'نهر الخير للتنمية': GicsSector.FINANCIALS,
  'فالمور': GicsSector.FINANCIALS,
  'الخليج للاستثمارات العربية': GicsSector.FINANCIALS,
  'الوطني': GicsSector.FINANCIALS,
  'أبو ظبي الإسلامي': GicsSector.FINANCIALS,
  'أبوظبي الإسلامي': GicsSector.FINANCIALS,
  'أسبر كابيتال': GicsSector.FINANCIALS,
  'صروة كابيتال': GicsSector.FINANCIALS,
  'المصرية للمنتجعات': GicsSector.CONSUMER_DISCRETIONARY,
  'جي بي أوتو': GicsSector.CONSUMER_DISCRETIONARY,
  'القناة للتوكيلات': GicsSector.CONSUMER_DISCRETIONARY,
  'الجوهرة': GicsSector.CONSUMER_DISCRETIONARY,
  'النزهة الدولية': GicsSector.CONSUMER_DISCRETIONARY,
  'النساجون الشرقيون': GicsSector.CONSUMER_DISCRETIONARY,
  'سبينالكس': GicsSector.CONSUMER_DISCRETIONARY,
  'مصر للفنادق': GicsSector.CONSUMER_DISCRETIONARY,
  'بيراميزا': GicsSector.CONSUMER_DISCRETIONARY,
  'جولدن كوست': GicsSector.CONSUMER_DISCRETIONARY,
  'جولدن تكس للاصواف': GicsSector.CONSUMER_DISCRETIONARY,
  'القاهرة للخدمات التعليمية': GicsSector.CONSUMER_DISCRETIONARY,
  'شارم دريمز': GicsSector.CONSUMER_DISCRETIONARY,
  'الشمس بيراميدز للمنشات السياحية': GicsSector.CONSUMER_DISCRETIONARY,
  'مرسى مرسى علم للتنمية السياحية': GicsSector.CONSUMER_DISCRETIONARY,
  'جينيال تورز': GicsSector.CONSUMER_DISCRETIONARY,
  'عامر جروب': GicsSector.CONSUMER_DISCRETIONARY,
  'ام.ام جروب': GicsSector.CONSUMER_DISCRETIONARY,
  'بي آي جي': GicsSector.CONSUMER_DISCRETIONARY,
  'المصرية لنظم التعليم': GicsSector.CONSUMER_DISCRETIONARY,
  'تعليم لخدمات الإدارة': GicsSector.CONSUMER_DISCRETIONARY,
  'سيتي تريد': GicsSector.CONSUMER_DISCRETIONARY,
  'جي إم سي': GicsSector.CONSUMER_DISCRETIONARY,
  'المصرية للدواجن': GicsSector.CONSUMER_STAPLES,
  'مطاحن مصر الوسطى': GicsSector.CONSUMER_STAPLES,
  'القاهره للزيوت والصابون': GicsSector.CONSUMER_STAPLES,
  'النصر للحاصلات': GicsSector.CONSUMER_STAPLES,
  'الاسماعيلية للدواجن': GicsSector.CONSUMER_STAPLES,
  'كابو': GicsSector.CONSUMER_STAPLES,
  'مصر للزيوت والصابون': GicsSector.CONSUMER_STAPLES,
  'المنصورة للدواجن': GicsSector.CONSUMER_STAPLES,
  'القاهرة للدواجن': GicsSector.CONSUMER_STAPLES,
  'الدلتا للسكر': GicsSector.CONSUMER_STAPLES,
  'مخابز الإسكندرية': GicsSector.CONSUMER_STAPLES,
  'مصر للأسواق': GicsSector.CONSUMER_STAPLES,
  'مطاحن شمال القاهرة': GicsSector.CONSUMER_STAPLES,
  'مطاحن شرق الدلتا': GicsSector.CONSUMER_STAPLES,
  'مطاحن جنوب القاهرة والجيزة': GicsSector.CONSUMER_STAPLES,
  'العامة للصوامع': GicsSector.CONSUMER_STAPLES,
  'مطاحن مصر العليا': GicsSector.CONSUMER_STAPLES,
  'مطاحن وسط وغرب الدلتا': GicsSector.CONSUMER_STAPLES,
  'آراب ديرى': GicsSector.CONSUMER_STAPLES,
  'الدولية للمحاصيل': GicsSector.CONSUMER_STAPLES,
  'أكرو مصر': GicsSector.CONSUMER_STAPLES,
  'ايسترن كومباني': GicsSector.CONSUMER_STAPLES,
  'فوديكو': GicsSector.CONSUMER_STAPLES,
  'جهينة الغذائية': GicsSector.CONSUMER_STAPLES,
  'دومتي': GicsSector.CONSUMER_STAPLES,
  'إيديتا للصناعات الغذائية': GicsSector.CONSUMER_STAPLES,
  'سوهاج للصناعات الغذائية': GicsSector.CONSUMER_STAPLES,
  'عبور لاند الغذائية': GicsSector.CONSUMER_STAPLES,
  'يونيفرت الغذائية': GicsSector.CONSUMER_STAPLES,
  'يونيراب': GicsSector.CONSUMER_STAPLES,
  'ثمار': GicsSector.CONSUMER_STAPLES,
  'فرتيكا': GicsSector.CONSUMER_STAPLES,
  'لوتس للتنمية والاستثمار الزراعي': GicsSector.CONSUMER_STAPLES,
  'جو جرين': GicsSector.CONSUMER_STAPLES,
  'بونى': GicsSector.CONSUMER_STAPLES,
  'جورميه ايجيبت دوت كوم للاغذية': GicsSector.CONSUMER_STAPLES,
  'الزيوت المستخلصه ومنتجاتها': GicsSector.CONSUMER_STAPLES,
  'سيدي كرير': GicsSector.ENERGY,
  'أموك': GicsSector.ENERGY,
  'الخليجية الكندية': GicsSector.ENERGY,
  'أدكو': GicsSector.ENERGY,
  'غاز مصر': GicsSector.ENERGY,
  'الحفر الوطنية': GicsSector.ENERGY,
  'طاقة عربية': GicsSector.ENERGY,
  'الكابلات الكهربائية': GicsSector.INDUSTRIALS,
  'ماريديف': GicsSector.INDUSTRIALS,
  'السويدي': GicsSector.INDUSTRIALS,
  'الصعيد العامة': GicsSector.INDUSTRIALS,
  'المجموعة المصرية': GicsSector.INDUSTRIALS,
  'التعمير والاستشارات': GicsSector.INDUSTRIALS,
  'دلتا للإنشاء': GicsSector.INDUSTRIALS,
  'ايجيترانس': GicsSector.INDUSTRIALS,
  'الجيزة للمقاولات': GicsSector.INDUSTRIALS,
  'النصر للأعمال المدنية': GicsSector.INDUSTRIALS,
  'روبكس': GicsSector.INDUSTRIALS,
  'إيجيفرت': GicsSector.INDUSTRIALS,
  'الشرقية الوطنية': GicsSector.INDUSTRIALS,
  'عبر المحيطات': GicsSector.INDUSTRIALS,
  'العامة لاستصلاح الأراضي': GicsSector.INDUSTRIALS,
  'الإسكندرية للحاويات': GicsSector.INDUSTRIALS,
  'العربية للصناعات الهندسية': GicsSector.INDUSTRIALS,
  'المصرية للمشروعات': GicsSector.INDUSTRIALS,
  'السعودية المصرية': GicsSector.INDUSTRIALS,
  'المصري لتنمية الصادرات': GicsSector.INDUSTRIALS,
  'العربية للمحابس': GicsSector.INDUSTRIALS,
  'العربية لاستصلاح الاراضي': GicsSector.INDUSTRIALS,
  'المشروعات الصناعية والهندسية': GicsSector.INDUSTRIALS,
  'أوراسكوم للإنشاءات': GicsSector.INDUSTRIALS,
  'النيل': GicsSector.INDUSTRIALS,
  'الاسكندرية الوطنية': GicsSector.INDUSTRIALS,
  'إنكوليس': GicsSector.INDUSTRIALS,
  'إليكو': GicsSector.INDUSTRIALS,
  'وادي كوم امبو لاستصلاح الاراضي': GicsSector.INDUSTRIALS,
  'الفنار للمقاولات': GicsSector.INDUSTRIALS,
  'ايكمي': GicsSector.INDUSTRIALS,
  'لكح جروب': GicsSector.INDUSTRIALS,
  'جدوى للتنمية الصناعية': GicsSector.INDUSTRIALS,
  'جيتكس للاستثمارات التجارية والصناعية': GicsSector.INDUSTRIALS,
  'البدر': GicsSector.INDUSTRIALS,
  'العربية لحليج الأقطان': GicsSector.MATERIALS,
  'حديد عز': GicsSector.MATERIALS,
  'جنوب الوادى للأسمنت': GicsSector.MATERIALS,
  'أسكوم': GicsSector.MATERIALS,
  'دلتا للطباعة والتغليف': GicsSector.MATERIALS,
  'النيل لحليج الاقطان': GicsSector.MATERIALS,
  'راكتا': GicsSector.MATERIALS,
  'يونيباك': GicsSector.MATERIALS,
  'أبو قير للأسمدة': GicsSector.MATERIALS,
  'مصر بنى سويف للأسمنت': GicsSector.MATERIALS,
  'قنا': GicsSector.MATERIALS,
  'القومية للأسمنت': GicsSector.MATERIALS,
  'باكين': GicsSector.MATERIALS,
  'ايبيكو': GicsSector.MATERIALS,
  'كيما': GicsSector.MATERIALS,
  'أسمنت سيناء': GicsSector.MATERIALS,
  'العز الدخيلة للصلب': GicsSector.MATERIALS,
  'كفر الزيات للمبيدات': GicsSector.MATERIALS,
  'الاسكندرية للأسمنت': GicsSector.MATERIALS,
  'الألومنيوم العربية': GicsSector.MATERIALS,
  'مصر للالومنيوم': GicsSector.MATERIALS,
  'الاهرام للطباعة والتغليف': GicsSector.MATERIALS,
  'الشروق الحديثة للطباعة والتغليف': GicsSector.MATERIALS,
  'الشرق الأوسط للزجاج': GicsSector.MATERIALS,
  'مصر للكيماويات': GicsSector.MATERIALS,
  'الحديد والصلب': GicsSector.MATERIALS,
  'شيني': GicsSector.MATERIALS,
  'الصخور العربية': GicsSector.MATERIALS,
  'سبأ للصناعات الكيماوية': GicsSector.MATERIALS,
  'موبكو': GicsSector.MATERIALS,
  'فيركيم': GicsSector.MATERIALS,
  'الحديد والصلب للمناجم والمحاجر': GicsSector.MATERIALS,
  'مصر انتركونتننتل لصناعة الجرانيت والرخام': GicsSector.MATERIALS,
  'الوطنية للطباعة': GicsSector.MATERIALS,
  'عتاقة': GicsSector.MATERIALS,
  'الدولية للأسمدة': GicsSector.MATERIALS,
  'أسمنت طرة': GicsSector.MATERIALS,
  'كريست مارك للمقاولات والتطوير العقاري': GicsSector.REAL_ESTATE,
  'القاهرة للإسكان': GicsSector.REAL_ESTATE,
  'كوبر للاستثمار التجاري والتطوير العقاري': GicsSector.REAL_ESTATE,
  'سوديك': GicsSector.REAL_ESTATE,
  'بالم هيلز': GicsSector.REAL_ESTATE,
  'رمكو': GicsSector.REAL_ESTATE,
  'طلعت مصطفى': GicsSector.REAL_ESTATE,
  'مصر الجديدة للاسكان والتعمير': GicsSector.REAL_ESTATE,
  'مدينة نصر للاسكان': GicsSector.REAL_ESTATE,
  'المصريين للاسكان': GicsSector.REAL_ESTATE,
  'الشمس للإسكان': GicsSector.REAL_ESTATE,
  'المتحدة للاسكان': GicsSector.REAL_ESTATE,
  'زهراء المعادي': GicsSector.REAL_ESTATE,
  'جي بي آي للنمو العمراني': GicsSector.REAL_ESTATE,
  'جولدن بيراميدز بلازا': GicsSector.REAL_ESTATE,
  'الإسماعيلية الجديدة للتطوير والتنمية العمرانية': GicsSector.REAL_ESTATE,
  'الوطنية للاسكان': GicsSector.REAL_ESTATE,
  'شمال افريقيا للاستثمار العقاري': GicsSector.REAL_ESTATE,
  'العبور للاستثمار العقاري': GicsSector.REAL_ESTATE,
  'أوراسكوم للتنمية': GicsSector.REAL_ESTATE,
  'مجموعة النعيم العقارية القابضة': GicsSector.REAL_ESTATE,
  'إعمار مصر': GicsSector.REAL_ESTATE,
  'المطورون العرب': GicsSector.REAL_ESTATE,
  'ريماس': GicsSector.REAL_ESTATE,
  'مرسيليا المصرية الخليجية': GicsSector.REAL_ESTATE,
  'تنمية للاستثمار العقاري': GicsSector.REAL_ESTATE,
  'المصريين العقاري': GicsSector.REAL_ESTATE,
  'بايونيرز بروبرتيز': GicsSector.REAL_ESTATE,
  'هيبكو للاستثمارات التجارية والتنمية العقارية': GicsSector.REAL_ESTATE,
  'يوتوبيا': GicsSector.REAL_ESTATE,
  'ديفكو 2': GicsSector.REAL_ESTATE,
  'أجواء': GicsSector.REAL_ESTATE,
  'المصرية للاتصالات': GicsSector.COMMUNICATION_SERVICES,
  'مدينة الإنتاج الإعلامي': GicsSector.COMMUNICATION_SERVICES,
  'جلوبال تيلكوم': GicsSector.COMMUNICATION_SERVICES,
  'نايل سات': GicsSector.COMMUNICATION_SERVICES,
  'فودافون مصر': GicsSector.COMMUNICATION_SERVICES,
  'راية للاتصالات': GicsSector.COMMUNICATION_SERVICES,
};

// ─── 2) Explicit ticker → GICS (overrides + stocks that don't match by name) ───
const TICKER_GICS_OVERRIDES: Partial<Record<string, GicsSector>> = {
  ADIB: GicsSector.FINANCIALS,
  SAUD: GicsSector.FINANCIALS,
  ALEXA: GicsSector.MATERIALS,
  AMER: GicsSector.CONSUMER_DISCRETIONARY,
  SPIN: GicsSector.CONSUMER_DISCRETIONARY,
  RREI: GicsSector.REAL_ESTATE,
  ARCC: GicsSector.MATERIALS,
  BTFH: GicsSector.FINANCIALS,
  BCAP: GicsSector.FINANCIALS,
  CAED: GicsSector.CONSUMER_DISCRETIONARY,
  COSG: GicsSector.CONSUMER_STAPLES,
  CPCI: GicsSector.HEALTH_CARE,
  POUL: GicsSector.CONSUMER_STAPLES,
  CCAP: GicsSector.FINANCIALS,
  CCAPP: GicsSector.FINANCIALS,
  DCRC: GicsSector.INDUSTRIALS,
  DTPP: GicsSector.MATERIALS,
  DEIN: GicsSector.FINANCIALS,
  SUGR: GicsSector.CONSUMER_STAPLES,
  EAST: GicsSector.CONSUMER_STAPLES,
  EGX30ETF: GicsSector.FINANCIALS,
  EGAL: GicsSector.MATERIALS,
  EPCO: GicsSector.CONSUMER_STAPLES,
  MISR: GicsSector.MATERIALS,
  ESAC: GicsSector.COMMUNICATION_SERVICES,
  EASB: GicsSector.FINANCIALS,
  EGCH: GicsSector.MATERIALS,
  OREG: GicsSector.COMMUNICATION_SERVICES,
  EFIC: GicsSector.FINANCIALS,
  EDBM: GicsSector.MATERIALS,
  EGTS: GicsSector.CONSUMER_DISCRETIONARY,
  EGBE: GicsSector.FINANCIALS,
  PHAR: GicsSector.HEALTH_CARE,
  EITP: GicsSector.CONSUMER_DISCRETIONARY,
  IRON: GicsSector.MATERIALS,
  EKHO: GicsSector.FINANCIALS,
  MPRC: GicsSector.COMMUNICATION_SERVICES,
  MOED: GicsSector.CONSUMER_DISCRETIONARY,
  AREH: GicsSector.REAL_ESTATE,
  AREHA: GicsSector.REAL_ESTATE,
  EGSA: GicsSector.COMMUNICATION_SERVICES,
  ESGI: GicsSector.CONSUMER_STAPLES,
  ETRS: GicsSector.INDUSTRIALS,
  ABRD: GicsSector.REAL_ESTATE,
  EIUD: GicsSector.REAL_ESTATE,
  EHDR: GicsSector.REAL_ESTATE,
  EPPK: GicsSector.MATERIALS,
  EEII: GicsSector.INDUSTRIALS,
  EALR: GicsSector.INDUSTRIALS,
  EBDP: GicsSector.MATERIALS,
  ICFC: GicsSector.MATERIALS,
  IRAX: GicsSector.MATERIALS,
  ECAP: GicsSector.MATERIALS,
  KWIN: GicsSector.FINANCIALS,
  ELKA: GicsSector.REAL_ESTATE,
  KABO: GicsSector.CONSUMER_STAPLES,
  ELNA: GicsSector.CONSUMER_STAPLES,
  NASR: GicsSector.INDUSTRIALS,
  OBRI: GicsSector.REAL_ESTATE,
  EOSB: GicsSector.FINANCIALS,
  ELSH: GicsSector.REAL_ESTATE,
  SPHT: GicsSector.CONSUMER_DISCRETIONARY,
  ELWA: GicsSector.CONSUMER_DISCRETIONARY,
  NIPH: GicsSector.HEALTH_CARE,
  ELEC: GicsSector.INDUSTRIALS,
  UEGC: GicsSector.REAL_ESTATE,
  SWDY: GicsSector.INDUSTRIALS,
  EMFD: GicsSector.REAL_ESTATE,
  ENGC: GicsSector.INFORMATION_TECHNOLOGY,
  EXPA: GicsSector.FINANCIALS,
  ZEOT: GicsSector.CONSUMER_STAPLES,
  ESRS: GicsSector.MATERIALS,
  FAIT: GicsSector.FINANCIALS,
  FAITA: GicsSector.FINANCIALS,
  FERC: GicsSector.MATERIALS,
  FIRED: GicsSector.REAL_ESTATE,
  AUTO: GicsSector.CONSUMER_DISCRETIONARY,
  AALR: GicsSector.INDUSTRIALS,
  GSSC: GicsSector.CONSUMER_STAPLES,
  GETO: GicsSector.CONSUMER_DISCRETIONARY,
  GIHD: GicsSector.REAL_ESTATE,
  GGCC: GicsSector.INDUSTRIALS,
  BIOC: GicsSector.HEALTH_CARE,
  GTHE: GicsSector.COMMUNICATION_SERVICES,
  GMCI: GicsSector.CONSUMER_DISCRETIONARY,
  GOCO: GicsSector.CONSUMER_DISCRETIONARY,
  GPPL: GicsSector.REAL_ESTATE,
  GTWL: GicsSector.CONSUMER_DISCRETIONARY,
  GRCA: GicsSector.FINANCIALS,
  HELI: GicsSector.REAL_ESTATE,
  HDBK: GicsSector.FINANCIALS,
  INEE: GicsSector.INDUSTRIALS,
  INEG: GicsSector.INDUSTRIALS,
  ICAL: GicsSector.MATERIALS,
  IFAP: GicsSector.CONSUMER_STAPLES,
  IBCT: GicsSector.CONSUMER_DISCRETIONARY,
  ICID: GicsSector.REAL_ESTATE,
  ICLE: GicsSector.FINANCIALS,
  ICMI: GicsSector.HEALTH_CARE,
  DIFC: GicsSector.MATERIALS,
  IPPM: GicsSector.MATERIALS,
  IDRE: GicsSector.REAL_ESTATE,
  ISMA: GicsSector.CONSUMER_STAPLES,
  INFI: GicsSector.CONSUMER_STAPLES,
  ITSY: GicsSector.INFORMATION_TECHNOLOGY,
  JUFO: GicsSector.CONSUMER_STAPLES,
  KZPC: GicsSector.MATERIALS,
  LKGP: GicsSector.HEALTH_CARE,
  MOIL: GicsSector.ENERGY,
  MMAT: GicsSector.CONSUMER_DISCRETIONARY,
  MAAL: GicsSector.REAL_ESTATE,
  MBEN: GicsSector.INDUSTRIALS,
  MEPA: GicsSector.HEALTH_CARE,
  MNHD: GicsSector.REAL_ESTATE,
  MENA: GicsSector.REAL_ESTATE,
  MEGM: GicsSector.MATERIALS,
  MBSC: GicsSector.MATERIALS,
  MCQE: GicsSector.MATERIALS,
  MICH: GicsSector.MATERIALS,
  MRCO: GicsSector.CONSUMER_DISCRETIONARY,
  MFSC: GicsSector.CONSUMER_DISCRETIONARY,
  MEDA: GicsSector.INFORMATION_TECHNOLOGY,
  MFINEG: GicsSector.FINANCIALS,
  MFPC: GicsSector.MATERIALS,
  MHOT: GicsSector.CONSUMER_DISCRETIONARY,
  MKIT: GicsSector.CONSUMER_STAPLES,
  ATQA: GicsSector.MATERIALS,
  MOSC: GicsSector.CONSUMER_STAPLES,
  WATP: GicsSector.MATERIALS,
  SMPP: GicsSector.MATERIALS,
  MOIN: GicsSector.FINANCIALS,
  NAHO: GicsSector.FINANCIALS,
  NCCW: GicsSector.INDUSTRIALS,
  NCEM: GicsSector.MATERIALS,
  NCMP: GicsSector.CONSUMER_STAPLES,
  NDRL: GicsSector.ENERGY,
  NHPS: GicsSector.REAL_ESTATE,
  COPR: GicsSector.REAL_ESTATE,
  EGAS: GicsSector.ENERGY,
  NCIS: GicsSector.CONSUMER_DISCRETIONARY,
  NCIN: GicsSector.REAL_ESTATE,
  NCGC: GicsSector.MATERIALS,
  NOAF: GicsSector.REAL_ESTATE,
  MILS: GicsSector.CONSUMER_STAPLES,
  NEDA: GicsSector.CONSUMER_STAPLES,
  NINH: GicsSector.HEALTH_CARE,
  OCPH: GicsSector.HEALTH_CARE,
  OCIC: GicsSector.INDUSTRIALS,
  ODHN: GicsSector.REAL_ESTATE,
  ORHD: GicsSector.CONSUMER_DISCRETIONARY,
  OTMT: GicsSector.FINANCIALS,
  ORWE: GicsSector.CONSUMER_DISCRETIONARY,
  EBSC: GicsSector.FINANCIALS,
  PACH: GicsSector.MATERIALS,
  PHDC: GicsSector.REAL_ESTATE,
  SIMO: GicsSector.MATERIALS,
  PTCC: GicsSector.INFORMATION_TECHNOLOGY,
  ASPI: GicsSector.FINANCIALS,
  PSAD: GicsSector.INDUSTRIALS,
  ARAB: GicsSector.REAL_ESTATE,
  PRMH: GicsSector.FINANCIALS,
  PHTV: GicsSector.CONSUMER_DISCRETIONARY,
  QNBA: GicsSector.FINANCIALS,
  RACC: GicsSector.INFORMATION_TECHNOLOGY,
  RAYA: GicsSector.INFORMATION_TECHNOLOGY,
  REAC: GicsSector.FINANCIALS,
  RTVC: GicsSector.CONSUMER_DISCRETIONARY,
  RIVA: GicsSector.HEALTH_CARE,
  RMTV: GicsSector.CONSUMER_DISCRETIONARY,
  ROTO: GicsSector.CONSUMER_DISCRETIONARY,
  RUBX: GicsSector.MATERIALS,
  SIPC: GicsSector.HEALTH_CARE,
  SMFR: GicsSector.MATERIALS,
  SMCS: GicsSector.REAL_ESTATE,
  SMCSA: GicsSector.REAL_ESTATE,
  SEIG: GicsSector.FINANCIALS,
  SEIGA: GicsSector.FINANCIALS,
  SNFC: GicsSector.CONSUMER_STAPLES,
  SDTI: GicsSector.CONSUMER_DISCRETIONARY,
  SKPC: GicsSector.ENERGY,
  SCEM: GicsSector.MATERIALS,
  OCDI: GicsSector.REAL_ESTATE,
  SLTD: GicsSector.CONSUMER_DISCRETIONARY,
  SAIB: GicsSector.FINANCIALS,
  SNFI: GicsSector.CONSUMER_STAPLES,
  SCFM: GicsSector.CONSUMER_STAPLES,
  SVCE: GicsSector.MATERIALS,
  SCTS: GicsSector.INFORMATION_TECHNOLOGY,
  SBAG: GicsSector.MATERIALS,
  CANA: GicsSector.FINANCIALS,
  SUCE: GicsSector.MATERIALS,
  TMGH: GicsSector.REAL_ESTATE,
  TECH: GicsSector.MATERIALS,
  ADPC: GicsSector.CONSUMER_STAPLES,
  TORA: GicsSector.MATERIALS,
  TOUR: GicsSector.CONSUMER_DISCRETIONARY,
  TRTO: GicsSector.CONSUMER_DISCRETIONARY,
  UASG: GicsSector.INDUSTRIALS,
  UNIT: GicsSector.REAL_ESTATE,
  UNIP: GicsSector.MATERIALS,
  UEFM: GicsSector.CONSUMER_STAPLES,
  UTOP: GicsSector.REAL_ESTATE,
  VERT: GicsSector.CONSUMER_STAPLES,
  WKOL: GicsSector.INDUSTRIALS,
  XPIN: GicsSector.INFORMATION_TECHNOLOGY,
  ZMID: GicsSector.REAL_ESTATE,
  DOMT: GicsSector.CONSUMER_STAPLES,
  CLHO: GicsSector.HEALTH_CARE,
  OLFI: GicsSector.CONSUMER_STAPLES,
  MTIE: GicsSector.CONSUMER_DISCRETIONARY,
  CICH: GicsSector.FINANCIALS,
  CIRA: GicsSector.REAL_ESTATE,
  CNFN: GicsSector.FINANCIALS,
  SRWA: GicsSector.FINANCIALS,
  FWRY: GicsSector.INFORMATION_TECHNOLOGY,
  ODIN: GicsSector.FINANCIALS,
  RMDA: GicsSector.HEALTH_CARE,
  AIVCB: GicsSector.FINANCIALS,
  SPMD: GicsSector.HEALTH_CARE,
  OFH: GicsSector.FINANCIALS,
  ACAMD: GicsSector.FINANCIALS,
  ISPH: GicsSector.HEALTH_CARE,
  TALM: GicsSector.CONSUMER_DISCRETIONARY,
  IDHC: GicsSector.HEALTH_CARE,
  ISMQ: GicsSector.MATERIALS,
  TANM: GicsSector.REAL_ESTATE,
  EFIH: GicsSector.INFORMATION_TECHNOLOGY,
  GDWA: GicsSector.INDUSTRIALS,
  PRDC: GicsSector.REAL_ESTATE,
  KRDI: GicsSector.CONSUMER_STAPLES,
  MCRO: GicsSector.HEALTH_CARE,
  ODID: GicsSector.FINANCIALS,
  // More from egxStocks that need explicit mapping
  AMPI: GicsSector.INFORMATION_TECHNOLOGY,
  FNAR: GicsSector.INDUSTRIALS,
  ATLC: GicsSector.FINANCIALS,
  ALCN: GicsSector.INDUSTRIALS,
  AFMC: GicsSector.CONSUMER_STAPLES,
  AMOC: GicsSector.ENERGY,
  ANFI: GicsSector.FINANCIALS,
  AMES: GicsSector.HEALTH_CARE,
  AXPH: GicsSector.HEALTH_CARE,
  AMEC: GicsSector.HEALTH_CARE,
  ALUM: GicsSector.MATERIALS,
  CERA: GicsSector.MATERIALS,
  ACGC: GicsSector.MATERIALS,
  AMIA: GicsSector.FINANCIALS,
  ADCI: GicsSector.HEALTH_CARE,
  APSW: GicsSector.CONSUMER_DISCRETIONARY,
  ARVA: GicsSector.INDUSTRIALS,
  AIND: GicsSector.FINANCIALS,
  ASCM: GicsSector.MATERIALS,
  AITG: GicsSector.FINANCIALS,
  ALRA: GicsSector.INDUSTRIALS,
  BIGP: GicsSector.FINANCIALS,
  BSFR: GicsSector.REAL_ESTATE,
  CIRF: GicsSector.REAL_ESTATE,
  CSAG: GicsSector.INDUSTRIALS,
  PRCL: GicsSector.MATERIALS,
  DAPH: GicsSector.INDUSTRIALS,
  DSCW: GicsSector.CONSUMER_DISCRETIONARY,
  EDFM: GicsSector.CONSUMER_STAPLES,
  AFDI: GicsSector.REAL_ESTATE,
  WCDF: GicsSector.CONSUMER_STAPLES,
  MIPH: GicsSector.HEALTH_CARE,
  NBKE: GicsSector.FINANCIALS,
  UNBE: GicsSector.FINANCIALS,
  VODE: GicsSector.COMMUNICATION_SERVICES,
  AJWA: GicsSector.CONSUMER_STAPLES,
};

// ─── 3) تسميات GICS بالعربية + شرح قصير لكل قطاع (للوصف «عن الشركة») ───
const GICS_LABEL_AR: Record<GicsSector, string> = {
  [GicsSector.INFORMATION_TECHNOLOGY]: 'تقنية المعلومات',
  [GicsSector.HEALTH_CARE]: 'الرعاية الصحية',
  [GicsSector.FINANCIALS]: 'المالية',
  [GicsSector.CONSUMER_DISCRETIONARY]: 'السلع والخدمات الاختيارية',
  [GicsSector.CONSUMER_STAPLES]: 'السلع والخدمات الأساسية',
  [GicsSector.ENERGY]: 'الطاقة',
  [GicsSector.INDUSTRIALS]: 'الصناعات',
  [GicsSector.MATERIALS]: 'المواد',
  [GicsSector.UTILITIES]: 'المرافق',
  [GicsSector.REAL_ESTATE]: 'العقارات',
  [GicsSector.COMMUNICATION_SERVICES]: 'خدمات الاتصالات',
};

/** شرح موجز لكل قطاع GICS — يُستخدم في وصف «عن الشركة» */
const GICS_SECTOR_DESCRIPTION_AR: Record<GicsSector, string> = {
  [GicsSector.INFORMATION_TECHNOLOGY]: 'يضم الشركات الناشطة في البرمجيات، الأجهزة، الاتصالات التقنية، والخدمات السحابية.',
  [GicsSector.HEALTH_CARE]: 'يشمل شركات الأدوية، المستشفيات، الأجهزة الطبية، والخدمات الصحية.',
  [GicsSector.FINANCIALS]: 'يتضمن البنوك، شركات التأمين، السماسرة، والاستثمارات المالية.',
  [GicsSector.CONSUMER_DISCRETIONARY]: 'يغطي السلع والخدمات غير الضرورية مثل السيارات، السياحة، الترفيه، والبيع بالتجزئة الاختياري.',
  [GicsSector.CONSUMER_STAPLES]: 'يضم منتجي المواد الغذائية، المشروبات، التبغ، والسلع الاستهلاكية الأساسية.',
  [GicsSector.ENERGY]: 'يشمل شركات النفط والغاز، التكرير، والطاقة.',
  [GicsSector.INDUSTRIALS]: 'يتضمن المقاولات، النقل، الآلات الصناعية، والخدمات اللوجستية.',
  [GicsSector.MATERIALS]: 'يغطي الأسمنت، الحديد والصلب، الكيماويات، التعدين، والمواد الخام.',
  [GicsSector.UTILITIES]: 'يشمل شركات الكهرباء، الغاز، والمياه.',
  [GicsSector.REAL_ESTATE]: 'يتضمن التطوير العقاري، الإسكان، وإدارة العقارات.',
  [GicsSector.COMMUNICATION_SERVICES]: 'يضم الاتصالات، الإعلام، والمنصات الرقمية.',
};

// ─── 4) أسهم غير متوافقة مع الشريعة (بنوك تقليدية، دخان، خمور، إلخ) ───
const SHARIA_NON_COMPLIANT_TICKERS = new Set<string>([
  'COMI', 'CIEB', 'EGBE', 'QNBA', 'HDBK', 'CCAP', 'CCAPP', 'HRHO', 'BTFH', 'BCAP', 'EFIC', 'MOIN', 'NBKE', 'UNBE',
  'EAST', // الشرقية للدخان
  'ORWE', // أوراسكوم للاستثمار - قد تكون مختلطة
]);

// ─── 5) أسهم متوافقة مع الشريعة (بنوك إسلامية، تمويل إسلامي) ─────────
const SHARIA_COMPLIANT_TICKERS = new Set<string>([
  'ADIB', 'SAUD', // أبوظبي الإسلامي، البركة
]);

/** يستنتج وصفاً دقيقاً للنشاط بناءً على اسم الشركة والقطاع */
function inferActivity(nameAr: string, sector: GicsSector): string {
  const n = nameAr;

  // ── المواد والصناعات الأساسية ────────────────────────────────────────
  if (n.includes('أسمنت')) return 'متخصصة في إنتاج وتسويق الأسمنت والمواد الإنشائية.';
  if (n.includes('أسمدة') || n.includes('سماد') || n.includes('للأسمدة')) return 'متخصصة في إنتاج الأسمدة الزراعية النيتروجينية والمواد الكيماوية.';
  if ((n.includes('حديد') && n.includes('صلب')) || n.includes('فولاذ')) return 'متخصصة في إنتاج وتسويق منتجات الحديد والصلب.';
  if (n.includes('حديد') || n.includes('صلب')) return 'تعمل في مجال صناعة الحديد والصلب والمنتجات المعدنية.';
  if (n.includes('ألومنيوم')) return 'متخصصة في إنتاج وتصنيع الألومنيوم ومنتجاته الصناعية.';
  if (n.includes('بتروكيماويات') || (n.includes('بترول') && n.includes('كيماويات'))) return 'متخصصة في إنتاج المواد البتروكيماوية والمشتقات النفطية.';
  if (n.includes('كيماويات') || n.includes('الكيماوية') || n.includes('كيما')) return 'متخصصة في إنتاج وتوزيع المواد الكيماوية الصناعية والزراعية.';
  if (n.includes('سيراميك') || n.includes('بورسلين')) return 'متخصصة في تصنيع وتسويق منتجات السيراميك والبورسلين.';
  if (n.includes('زجاج')) return 'متخصصة في تصنيع الزجاج ومنتجاته للأسواق المحلية والتصدير.';
  if (n.includes('ورق') && !n.includes('منسوجات')) return 'متخصصة في تصنيع وإنتاج الورق ومنتجاته الصناعية.';
  if (n.includes('دهانات') || n.includes('طلاء')) return 'متخصصة في تصنيع وتوزيع الدهانات والطلاءات الصناعية.';
  if (n.includes('موانع مائية') || n.includes('عزل مائي') || n.includes('مانع مائي')) return 'متخصصة في إنتاج مواد العزل المائي ومستلزمات البناء.';
  if (n.includes('مبيدات')) return 'متخصصة في إنتاج وتوزيع المبيدات الزراعية والمنتجات الكيماوية.';
  if (n.includes('تعدين') || n.includes('مناجم') || n.includes('محاجر')) return 'تعمل في قطاع التعدين واستخراج المعادن والخامات.';
  if (n.includes('نشا') || n.includes('جلوكوز')) return 'متخصصة في إنتاج النشا والجلوكوز من الذرة.';
  if (n.includes('بلاستيك') || n.includes('أكريليك')) return 'متخصصة في تصنيع منتجات البلاستيك والبوليمرات.';
  if (n.includes('أكياس')) return 'متخصصة في تصنيع الأكياس الصناعية ومواد التعبئة.';
  if (n.includes('صمامات') || n.includes('للصمامات')) return 'متخصصة في تصنيع وتوريد الصمامات والتجهيزات الصناعية.';
  if (n.includes('كابلات') || (n.includes('كهربائية') && n.includes('صناعات'))) return 'متخصصة في تصنيع الكابلات الكهربائية للأسواق المحلية والتصدير.';

  // ── البنوك ────────────────────────────────────────────────────────────
  if (n.includes('بنك') || n.includes('مصرف') || n.includes('بانك')) {
    if (n.includes('إسلامي') || n.includes('فيصل') || n.includes('بركة')) return 'بنك إسلامي يقدم خدمات مصرفية متوافقة مع أحكام الشريعة الإسلامية للأفراد والشركات.';
    if (n.includes('إسكان') || n.includes('تعمير')) return 'بنك متخصص في تمويل الإسكان والتطوير العقاري وتقديم الخدمات المصرفية.';
    if (n.includes('صادرات') || n.includes('تصدير')) return 'بنك متخصص في تمويل وتنمية الصادرات المصرية والتجارة الخارجية.';
    if (n.includes('الكويت') || n.includes('كويتي')) return 'فرع لمجموعة بنك الكويت الوطني في مصر يقدم خدمات مصرفية شاملة للأفراد والشركات.';
    if (n.includes('قطر')) return 'فرع لمجموعة بنك قطر الوطني في مصر يقدم خدمات مصرفية متكاملة.';
    if (n.includes('الخليجي') || n.includes('المصري الخليجي')) return 'بنك مصري خليجي يقدم خدمات مصرفية شاملة للأفراد والشركات والمؤسسات.';
    if (n.includes('أبوظبي')) return 'بنك إسلامي يقدم خدمات مصرفية متوافقة مع الشريعة، تابع لمجموعة بنك أبوظبي الإسلامي.';
    if (n.includes('الاتحادي الوطني')) return 'فرع البنك الاتحادي الوطني الإماراتي في مصر يقدم خدمات مصرفية للأفراد والشركات.';
    if (n.includes('الدولي') || n.includes('تجاري الدولي')) return 'بنك تجاري رائد يقدم خدمات مصرفية متكاملة للأفراد والشركات والمؤسسات.';
    if (n.includes('قناة السويس')) return 'بنك تجاري مصري يقدم خدمات مصرفية للأفراد والشركات مع تركيز على تمويل المشروعات.';
    return 'بنك تجاري يقدم خدمات مصرفية متكاملة للأفراد والشركات والمؤسسات في مصر.';
  }

  // ── الرعاية الصحية ────────────────────────────────────────────────────
  if (n.includes('أدوية') || n.includes('دواء') || n.includes('صيدل') || n.includes('فارما')) return 'متخصصة في تصنيع وتسويق الأدوية والمستحضرات الصيدلانية.';
  if (n.includes('مستشفى') || n.includes('مستشفيات')) return 'تعمل في قطاع الرعاية الصحية وإدارة المستشفيات وتقديم الخدمات الطبية المتخصصة.';
  if (n.includes('تشخيص') || n.includes('تحاليل') || n.includes('تشخيصية')) return 'متخصصة في خدمات التشخيص الطبي وإدارة مختبرات التحاليل الطبية.';
  if (n.includes('أجهزة طبية') || n.includes('الطبية') && n.includes('صناعات')) return 'متخصصة في تصنيع وتوريد الأجهزة والمعدات الطبية.';
  if (n.includes('تعبئة') && n.includes('دوائ')) return 'متخصصة في تصنيع مواد التعبئة والتغليف للصناعات الدوائية.';

  // ── العقارات ──────────────────────────────────────────────────────────
  if ((n.includes('تطوير') && n.includes('عقاري')) || n.includes('للتطوير') && n.includes('عقار')) return 'شركة تطوير عقاري متخصصة في إنشاء وتسويق المشروعات السكنية والتجارية.';
  if (n.includes('إسكان') || n.includes('للإسكان')) return 'شركة متخصصة في تطوير وبيع الوحدات السكنية.';
  if (n.includes('تعمير') || n.includes('التعمير') || n.includes('عمرانية')) return 'شركة متخصصة في مشروعات التعمير وتطوير المجمعات السكنية والتجارية.';
  if (n.includes('عقاري') || n.includes('عقارية') || n.includes('العقارية')) return 'شركة استثمار عقاري تعمل في تطوير وإدارة المشروعات السكنية والتجارية.';

  // ── الأغذية والسلع الاستهلاكية ────────────────────────────────────────
  if (n.includes('مطاحن') || n.includes('مطاحن ومخابز') || n.includes('طحن')) return 'شركة متخصصة في طحن الحبوب وإنتاج الدقيق ومشتقاته لخدمة السوق المحلي.';
  if (n.includes('سكر')) return 'متخصصة في إنتاج وتكرير السكر من قصب السكر أو البنجر السكري.';
  if (n.includes('زيوت') || n.includes('للزيوت') || n.includes('مستخلصات')) return 'متخصصة في إنتاج وتكرير الزيوت النباتية ومشتقاتها.';
  if (n.includes('صابون')) return 'متخصصة في إنتاج وتوزيع الزيوت والصابون ومنتجات التنظيف.';
  if (n.includes('دواجن') || n.includes('الدواجن')) return 'متخصصة في تربية وإنتاج وتسويق الدواجن ومنتجاتها.';
  if (n.includes('ألبان') || n.includes('منتجات ألبان') || n.includes('الألبان')) return 'متخصصة في إنتاج وتوزيع منتجات الألبان والأجبان.';
  if (n.includes('جبن') || n.includes('أجبان')) return 'متخصصة في إنتاج وتسويق الجبن والأجبان المتنوعة.';
  if (n.includes('غذائية') || n.includes('للأغذية') || n.includes('الغذائية') || n.includes('أغذية')) return 'شركة متخصصة في إنتاج وتوزيع المنتجات الغذائية المتنوعة.';
  if (n.includes('مشروبات') || n.includes('عصائر')) return 'متخصصة في إنتاج وتوزيع المشروبات والعصائر.';
  if (n.includes('دخان') || n.includes('تبغ')) return 'شركة حكومية تحتكر إنتاج وتوزيع منتجات التبغ والسجائر في مصر.';
  if (n.includes('الأمن الغذائي') || (n.includes('صوامع') && !n.includes('صناعات'))) return 'تعمل في مجال الأمن الغذائي وتخزين الحبوب والمواد الغذائية.';

  // ── الاتصالات والإعلام والتكنولوجيا ──────────────────────────────────
  if (n.includes('اتصالات') || n.includes('تليكوم') || n.includes('موبايل')) return 'شركة اتصالات تقدم خدمات الهاتف المحمول والإنترنت وخدمات الاتصالات المتكاملة.';
  if (n.includes('قمر صناعي') || n.includes('نايل سات') || n.includes('الأقمار')) return 'تشغّل منظومة الأقمار الصناعية وتبث القنوات الفضائية لمنطقة الشرق الأوسط وأفريقيا.';
  if ((n.includes('إنتاج') && n.includes('إعلام')) || n.includes('إعلامية') && n.includes('مدينة')) return 'تعمل في قطاع الإعلام والإنتاج التلفزيوني وتوفير خدمات الإنتاج الفني.';
  if (n.includes('للمدفوعات') || n.includes('دفع إلكتروني') || n.includes('مدفوعات')) return 'شركة رائدة في مجال الدفع الإلكتروني وتقنيات المعاملات المالية الرقمية.';
  if (n.includes('برمجة') || n.includes('تقنية') || n.includes('تكنولوجيا') || n.includes('رقمية')) return 'شركة تقنية تعمل في مجال البرمجيات والخدمات الرقمية وتقنية المعلومات.';
  if (n.includes('حاسب') || n.includes('كمبيوتر')) return 'شركة تعمل في مجال تقنية المعلومات وحلول الحاسب الآلي.';

  // ── الخدمات المالية (غير البنوك) ──────────────────────────────────────
  if (n.includes('تأمين')) return 'شركة تأمين تقدم خدمات التأمين على الحياة والممتلكات والمركبات للأفراد والمؤسسات.';
  if (n.includes('سمسرة') || n.includes('وساطة مالية') || n.includes('للسمسرة')) return 'شركة وساطة مالية متخصصة في تداول الأوراق المالية في البورصة المصرية.';
  if ((n.includes('تأجير') && n.includes('تمويلي')) || (n.includes('تأجير') && n.includes('تمويل'))) return 'شركة متخصصة في التأجير التمويلي وتمويل الأصول للشركات والأفراد.';
  if (n.includes('تمويل') && !n.includes('بنك') && !n.includes('الاستثمار')) return 'شركة مالية تقدم حلول التمويل والائتمان للأفراد والشركات.';
  if (n.includes('القابضة') || n.includes('قابضة') || n.includes('القابضه')) return 'شركة قابضة تمتلك حصصاً في مجموعة من الشركات في قطاعات اقتصادية متعددة.';
  if (n.includes('استثمار') || n.includes('الاستثمار')) return 'شركة استثمارية تدير محفظة متنوعة من الأصول والأوراق المالية في مختلف القطاعات.';

  // ── الفنادق والسياحة ──────────────────────────────────────────────────
  if (n.includes('فنادق') || n.includes('فندق') || n.includes('منتجعات')) return 'تعمل في مجال الفنادق والمنتجعات السياحية وتوفير خدمات الإقامة للسياح والزوار.';
  if (n.includes('سياحة') || n.includes('سياحي') || n.includes('تورز') || n.includes('السياحية')) return 'شركة سياحية متخصصة في خدمات السياحة والسفر والترفيه للسوق المحلي والدولي.';

  // ── الإنشاء والهندسة ──────────────────────────────────────────────────
  if (n.includes('مقاولات')) return 'شركة مقاولات متخصصة في تنفيذ مشاريع البناء والبنية التحتية والمشاريع الصناعية.';
  if (n.includes('للإنشاء') || n.includes('إنشاء') && !n.includes('سكن')) return 'شركة متخصصة في تنفيذ مشاريع الإنشاء والبنية التحتية الكبرى.';
  if (n.includes('هندسية') || n.includes('للهندسة') || n.includes('هندسي')) return 'شركة هندسية تقدم خدمات الاستشارات والتصميم وتنفيذ المشاريع الهندسية.';
  if (n.includes('كهرباء') || n.includes('كهربائية') && !n.includes('كابلات')) return 'شركة متخصصة في صناعة وتوزيع الأجهزة والمعدات الكهربائية.';
  if (n.includes('محولات') || n.includes('المحول')) return 'متخصصة في تصنيع محولات الكهرباء ومعدات نقل الطاقة.';

  // ── النقل واللوجستيات ─────────────────────────────────────────────────
  if (n.includes('شحن') || n.includes('ملاحة') || n.includes('وكالات ملاحية') || n.includes('وكالات')) return 'تعمل في قطاع الشحن البحري والخدمات الملاحية وتوكيلات السفن.';
  if (n.includes('حاويات') || n.includes('الحاويات')) return 'متخصصة في خدمات الموانئ وتداول الحاويات والشحن البحري.';
  if (n.includes('نقل') || n.includes('المواصلات')) return 'تعمل في قطاع النقل والمواصلات وتقديم الخدمات اللوجستية.';
  if (n.includes('تخزين') || n.includes('المستودعات')) return 'متخصصة في إدارة المستودعات والتخزين والخدمات اللوجستية.';

  // ── الغزل والنسيج والملابس ────────────────────────────────────────────
  if (n.includes('غزل') || n.includes('نسيج') || n.includes('منسوجات')) return 'متخصصة في صناعة الغزل والنسيج وإنتاج المنتجات النسيجية.';
  if (n.includes('ملابس') || n.includes('الملابس')) return 'متخصصة في تصنيع وتسويق الملابس الجاهزة.';
  if (n.includes('سجاد') || n.includes('موكيت') || n.includes('مفروشات')) return 'متخصصة في تصنيع وتصدير السجاد والمفروشات إلى الأسواق العالمية.';
  if (n.includes('صوف') || n.includes('صوفية')) return 'متخصصة في تصنيع المنسوجات الصوفية والملابس الشتوية.';

  // ── الزراعة واستصلاح الأراضي ─────────────────────────────────────────
  if (n.includes('استصلاح') || n.includes('استزراع')) return 'تعمل في مجال استصلاح الأراضي الزراعية وتنمية الإنتاج الزراعي.';
  if (n.includes('زراعي') || n.includes('زراعية') || n.includes('للزراعة') || n.includes('الزراعي')) return 'شركة زراعية تعمل في إنتاج وتوزيع المحاصيل الزراعية والمنتجات الزراعية.';

  // ── الطباعة والتغليف ──────────────────────────────────────────────────
  if (n.includes('طباعة') || n.includes('للطباعة')) return 'متخصصة في الطباعة وتصنيع مواد التغليف والتعبئة.';
  if (n.includes('تغليف') || n.includes('عبوات') || (n.includes('تعبئة') && !n.includes('دوائ'))) return 'متخصصة في إنتاج مواد التغليف والتعبئة للصناعات المتنوعة.';

  // ── النفط والغاز ──────────────────────────────────────────────────────
  if (n.includes('حفر') || n.includes('بترول')) return 'تعمل في قطاع خدمات النفط والغاز وعمليات الحفر والاستخراج.';
  if (n.includes('غاز') && !n.includes('كيماويات')) return 'متخصصة في توزيع وتوريد الغاز الطبيعي للمنازل والمنشآت الصناعية.';

  // ── افتراضي حسب القطاع ─────────────────────────────────────────────────
  switch (sector) {
    case GicsSector.INFORMATION_TECHNOLOGY:      return 'تعمل في قطاع تقنية المعلومات والبرمجيات وتقديم الحلول الرقمية.';
    case GicsSector.HEALTH_CARE:                 return 'تعمل في قطاع الرعاية الصحية وتقديم الخدمات الطبية والصيدلانية.';
    case GicsSector.FINANCIALS:                  return 'تعمل في قطاع الخدمات المالية والمصرفية والاستثمار.';
    case GicsSector.CONSUMER_DISCRETIONARY:      return 'تعمل في قطاع السلع والخدمات الاستهلاكية الاختيارية.';
    case GicsSector.CONSUMER_STAPLES:            return 'تعمل في قطاع إنتاج وتوزيع السلع الاستهلاكية الأساسية والمنتجات الغذائية.';
    case GicsSector.ENERGY:                      return 'تعمل في قطاع الطاقة والنفط والغاز.';
    case GicsSector.INDUSTRIALS:                 return 'تعمل في القطاع الصناعي وتنفيذ المشاريع وتوفير الخدمات اللوجستية.';
    case GicsSector.MATERIALS:                   return 'تعمل في قطاع المواد الأساسية والصناعات الخام والتحويلية.';
    case GicsSector.UTILITIES:                   return 'تعمل في قطاع المرافق العامة كالكهرباء والغاز والمياه.';
    case GicsSector.REAL_ESTATE:                 return 'تعمل في قطاع التطوير العقاري وإدارة الأصول العقارية.';
    case GicsSector.COMMUNICATION_SERVICES:      return 'تعمل في قطاع الاتصالات والإعلام والمنصات الرقمية.';
    default:                                      return 'شركة مساهمة مدرجة في البورصة المصرية.';
  }
}

function buildDescription(nameAr: string, nameEn: string, sector: GicsSector): string {
  const sectorAr = GICS_LABEL_AR[sector];
  const activity = inferActivity(nameAr, sector);
  return `${nameAr}: شركة مساهمة مدرجة في البورصة المصرية (EGX) ضمن قطاع ${sectorAr}، ${activity}`;
}

function getShariaCompliant(ticker: string, nameAr: string, sector: GicsSector | null): boolean | null {
  const official = getOfficialSharia(ticker);
  if (official !== undefined) return official;
  if (SHARIA_NON_COMPLIANT_TICKERS.has(ticker)) return false;
  if (SHARIA_COMPLIANT_TICKERS.has(ticker)) return true;
  if (sector === GicsSector.FINANCIALS) {
    const n = nameAr;
    if (n.includes('إسلامي') || n.includes('بركة') || n.includes('فيصل') || n.includes('أبوظبي الإسلامي')) return true;
    if (n.includes('بنك') || n.includes('مصرف') || n.includes('تأمين') || n.includes('سمسرة') || n.includes('كابيتال')) return false;
  }
  if (nameAr.includes('دخان') || nameAr.includes('تبغ')) return false;
  return null;
}

function inferSectorFromName(nameAr: string): GicsSector {
  const n = nameAr;
  if (n.includes('بنك') || n.includes('مصرف') || n.includes('تأمين') || n.includes('سمسرة') || n.includes('كابيتال') || n.includes('قابضة مالية')) return GicsSector.FINANCIALS;
  if (n.includes('أسمنت') || n.includes('حديد') || n.includes('صلب') || n.includes('كيماويات') || n.includes('أسمدة') || n.includes('سيراميك') || n.includes('ألومنيوم') || n.includes('ورق') || n.includes('طباعة') || n.includes('تغليف') || n.includes('زجاج') || n.includes('جرانيت') || n.includes('رخام')) return GicsSector.MATERIALS;
  if (n.includes('أدوية') || n.includes('دواء') || n.includes('صيدل') || n.includes('طبي') || n.includes('مستشفى') || n.includes('فارما')) return GicsSector.HEALTH_CARE;
  if (n.includes('عقار') || n.includes('إسكان') || n.includes('تعمير') || n.includes('عمرانية')) return GicsSector.REAL_ESTATE;
  if (n.includes('اتصالات') || n.includes('تليكوم') || n.includes('نايل سات') || n.includes('فودافون') || n.includes('أورنج') || n.includes('إعلامي')) return GicsSector.COMMUNICATION_SERVICES;
  if (n.includes('نفط') || n.includes('بترول') || n.includes('غاز') || n.includes('طاقة') || n.includes('بتروكيماويات')) return GicsSector.ENERGY;
  if (n.includes('فنادق') || n.includes('سياحة') || n.includes('منتجعات') || n.includes('تورز')) return GicsSector.CONSUMER_DISCRETIONARY;
  if (n.includes('مطاحن') || n.includes('دواجن') || n.includes('سكر') || n.includes('زيوت') || n.includes('غذائ') || n.includes('صابون') || n.includes('لبان')) return GicsSector.CONSUMER_STAPLES;
  if (n.includes('تقنية') || n.includes('تكنولوجيا') || n.includes('فوري') || n.includes('برمجة')) return GicsSector.INFORMATION_TECHNOLOGY;
  if (n.includes('إنشاء') || n.includes('مقاولات') || n.includes('نقل') || n.includes('حاويات') || n.includes('كهرباء') || n.includes('كابلات')) return GicsSector.INDUSTRIALS;
  return GicsSector.INDUSTRIALS;
}

function buildTickerToGics(): Map<string, GicsSector> {
  const map = new Map<string, GicsSector>();
  const keysByLength = Object.keys(SECTOR_MAP).sort((a, b) => b.length - a.length);

  for (const stock of EGX_STOCKS) {
    const official = getOfficialGics(stock.ticker);
    if (official !== undefined) {
      map.set(stock.ticker, official);
      continue;
    }
    const override = TICKER_GICS_OVERRIDES[stock.ticker];
    if (override !== undefined) {
      map.set(stock.ticker, override);
      continue;
    }
    let assigned: GicsSector | null = null;
    for (const key of keysByLength) {
      if (stock.nameAr.includes(key)) {
        assigned = SECTOR_MAP[key];
        break;
      }
    }
    if (assigned) {
      map.set(stock.ticker, assigned);
    } else {
      map.set(stock.ticker, inferSectorFromName(stock.nameAr));
    }
  }
  return map;
}

async function seedSectors() {
  console.log('🚀 GICS sector seeding (by ticker)...\n');

  const tickerToGics = buildTickerToGics();

  console.log('Syncing stocks from EGX list (كل سهم ضمن أحد الـ 11 قطاع GICS فقط، وصف عن الشركة، شريعة)...');
  for (const s of EGX_STOCKS) {
    const sector = tickerToGics.get(s.ticker) ?? inferSectorFromName(s.nameAr);
    const description = buildDescription(s.nameAr, s.nameEn, sector);
    const isShariaCompliant = getShariaCompliant(s.ticker, s.nameAr, sector);
    await prisma.stock.upsert({
      where: { ticker: s.ticker },
      create: {
        ticker: s.ticker,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        sector,
        description,
        isShariaCompliant,
      },
      update: {
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        sector,
        description,
        isShariaCompliant,
      },
    });
  }
  console.log(`✅ Synced ${EGX_STOCKS.length} stocks. كل سهم مصنّف ضمن أحد الـ 11 قطاع GICS فقط.\n`);

  const bySector: Record<string, number> = {};
  for (const sector of tickerToGics.values()) {
    bySector[sector] = (bySector[sector] || 0) + 1;
  }
  console.log('By sector:');
  Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, c]) => console.log(`  ${s}: ${c}`));

  const nullSectorCount = await prisma.stock.count({ where: { sector: null } });
  if (nullSectorCount > 0) {
    await prisma.stock.updateMany({
      where: { sector: null },
      data: { sector: GicsSector.INDUSTRIALS },
    });
    console.log(`\n✅ تعيين قطاع INDUSTRIALS لـ ${nullSectorCount} سهم كان بدون قطاع (لا يوجد «أخرى»).`);
  }

  await prisma.$disconnect();
}

seedSectors().catch(console.error);
