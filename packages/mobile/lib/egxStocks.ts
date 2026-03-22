// EGX Stocks — copied from web src/lib/egxStocks.ts
export interface EGXStock {
  ticker: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export const EGX_STOCKS: EGXStock[] = [
  { ticker: "ABUK", nameAr: "أبو قير للأسمدة", nameEn: "Abu Qir Fertilizers" },
  { ticker: "ADIB", nameAr: "بنك أبوظبي الإسلامي مصر", nameEn: "Abu Dhabi Islamic Bank Egypt" },
  { ticker: "ACRO", nameAr: "أكرو مصر", nameEn: "Acrow Misr" },
  { ticker: "APPC", nameAr: "التعبئة الدوائية المتقدمة", nameEn: "Advanced Pharmaceutical Packaging Co." },
  { ticker: "AJWA", nameAr: "عجوة للصناعات الغذائية", nameEn: "Ajwa For Food Industries Company Egypt" },
  { ticker: "SAUD", nameAr: "بنك البركة مصر", nameEn: "Al Baraka Bank Egypt" },
  { ticker: "FNAR", nameAr: "الفنار للمقاولات والتجارة", nameEn: "Al Fanar Contracting, Construction, Trade, Import And Export" },
  { ticker: "AMPI", nameAr: "المعاصر للبرمجة ونشر المعلومات", nameEn: "Al Moasher For Programming And Information Dissemination" },
  { ticker: "ATLC", nameAr: "التوفيق للتأجير التمويلي", nameEn: "Al Tawfeek Leasing Company - A.T.Lease" },
  { ticker: "ALEXA", nameAr: "أسمنت الإسكندرية", nameEn: "Alexandria Cement" },
  { ticker: "ALCN", nameAr: "الإسكندرية للحاويات والبضائع", nameEn: "Alexandria Containers And Goods" },
  { ticker: "AFMC", nameAr: "مطاحن الإسكندرية", nameEn: "Alexandria Flour Mills" },
  { ticker: "AMOC", nameAr: "الإسكندرية للزيوت المعدنية", nameEn: "Alexandria Mineral Oils Company" },
  { ticker: "ANFI", nameAr: "الإسكندرية الوطنية للاستثمارات المالية", nameEn: "Alexandria National Company For Financial Investments" },
  { ticker: "AMES", nameAr: "المركز الطبي الجديد بالإسكندرية", nameEn: "Alexandria New Medical Center" },
  { ticker: "AXPH", nameAr: "الإسكندرية للأدوية والصناعات الكيماوية", nameEn: "Alexandria Co for Pharmaceutical and Chemical Industries" },
  { ticker: "SPIN", nameAr: "الإسكندرية للغزل والنسيج", nameEn: "Alexandria Spinning & Weaving (SPINALEX)" },
  { ticker: "AMEC", nameAr: "أميكو للصناعات الطبية", nameEn: "Ameco Medical Industries" },
  { ticker: "AMER", nameAr: "أمير جروب القابضة", nameEn: "Amer Group Holding" },
  { ticker: "ALUM", nameAr: "العربية للألومنيوم", nameEn: "Arab Aluminum" },
  { ticker: "CERA", nameAr: "السيراميك العربي", nameEn: "Arab Ceramic" },
  { ticker: "ACGC", nameAr: "العربية لحليج الأقطان", nameEn: "Arab Cotton Ginning" },
  { ticker: "AMIA", nameAr: "العرب للملتقى الاستثماري", nameEn: "Arab Moltaka Investments Co." },
  { ticker: "ADCI", nameAr: "العربية للأدوية والصناعات الكيماوية", nameEn: "Arab Drug Company for Pharmaceuticals and Chemical" },
  { ticker: "APSW", nameAr: "العربية للغزل والنسيج بولفارا", nameEn: "Arab Polvara Spinning And Weaving" },
  { ticker: "RREI", nameAr: "العربية للاستثمار العقاري", nameEn: "Arab Real Estate Investment Co." },
  { ticker: "ARVA", nameAr: "العربية للصمامات", nameEn: "Arab Valves Company" },
  { ticker: "AIND", nameAr: "استثمارات العربية للتنمية", nameEn: "Arabia Investments Development Financial Investments Holding" },
  { ticker: "ARCC", nameAr: "الأسمنت العربية", nameEn: "Arabian Cement Company" },
  { ticker: "ASCM", nameAr: "أسيك للتعدين", nameEn: "Asek Company For Mining - Ascom" },
  { ticker: "AITG", nameAr: "أسيوط الإسلامية للتجارة والتنمية", nameEn: "Assiut Islamic National Trade and Development" },
  { ticker: "ALRA", nameAr: "أطلس لاستصلاح الأراضي", nameEn: "Atlas For Land Reclamation And Agricultural Processing" },
  { ticker: "BIGP", nameAr: "المجموعة الاستثمارية البربرية", nameEn: "El Barbary Investment Group (BIG)" },
  { ticker: "BTFH", nameAr: "بلتون المالية القابضة", nameEn: "Beltone Financial Holding" },
  { ticker: "BCAP", nameAr: "بلتون كابيتال للاستثمارات المالية", nameEn: "Beltone Capital Holding For Financial Investments" },
  { ticker: "BSFR", nameAr: "التضامن للإسكان والأمن الغذائي", nameEn: "Brothers Solidarity For Real Estate Investment And Food Security" },
  { ticker: "CIRF", nameAr: "القاهرة للتنمية والاستثمار", nameEn: "Cairo Development and Investment" },
  { ticker: "CAED", nameAr: "القاهرة للخدمات التعليمية", nameEn: "Cairo Educational Services" },
  { ticker: "COSG", nameAr: "القاهرة للزيوت والصابون", nameEn: "Cairo Oils & Soap" },
  { ticker: "CPCI", nameAr: "القاهرة للأدوية والصناعات الكيماوية", nameEn: "Cairo Pharmaceuticals and Chemical Industries" },
  { ticker: "POUL", nameAr: "القاهرة للدواجن", nameEn: "Cairo Poultry" },
  { ticker: "CSAG", nameAr: "وكالات قناة السويس للملاحة", nameEn: "Canal Shipping Agencies" },
  { ticker: "PRCL", nameAr: "السيراميك والبورسلين", nameEn: "Ceramic & Porcelain" },
  { ticker: "CCAP", nameAr: "قلعة القابضة", nameEn: "Qalaa Holdings" },
  { ticker: "CCAPP", nameAr: "قلعة القابضة - أسهم ممتازة", nameEn: "Qalaa Holdings - Preferred Shares" },
  { ticker: "COMI", nameAr: "البنك التجاري الدولي", nameEn: "Commercial International Bank (Egypt)" },
  { ticker: "CIEB", nameAr: "كريدي أجريكول مصر", nameEn: "Credit Agricole Egypt" },
  { ticker: "DCRC", nameAr: "دلتا للإنشاء وإعادة الإعمار", nameEn: "Delta Construction & Rebuilding" },
  { ticker: "DTPP", nameAr: "دلتا للطباعة والتغليف", nameEn: "Delta Co for Printing and Packaging" },
  { ticker: "DEIN", nameAr: "دلتا للتأمين", nameEn: "Delta Insurance" },
  { ticker: "SUGR", nameAr: "دلتا للسكر", nameEn: "Delta Sugar" },
  { ticker: "DAPH", nameAr: "الدلتا للاستشارات الهندسية", nameEn: "Development & Engineering Consultants" },
  { ticker: "DSCW", nameAr: "دايس للملابس الرياضية وال casual", nameEn: "Dice Sport & Casual Wear" },
  { ticker: "EDFM", nameAr: "مطاحن شرق الدلتا", nameEn: "East Delta Flour Mills" },
  { ticker: "EAST", nameAr: "الشرقية للدخان", nameEn: "Eastern Tobacco" },
  { ticker: "EFID", nameAr: "إديتا للصناعات الغذائية", nameEn: "Edita Food Industries" },
  { ticker: "HRHO", nameAr: "هيرمس القابضة", nameEn: "EFG Hermes Holding Company" },
  { ticker: "EGX30ETF", nameAr: "صندوق مؤشر EGX 30", nameEn: "Egx 30 Index Etf" },
  { ticker: "EGAL", nameAr: "مصر للألومنيوم", nameEn: "Egypt Aluminum Company" },
  { ticker: "EPCO", nameAr: "مصر للدواجن", nameEn: "Egypt For Poultry" },
  { ticker: "MISR", nameAr: "مصر القارية للجرانيت والرخام", nameEn: "Egypt Intercontinental for Granite and Marble" },
  { ticker: "ESAC", nameAr: "مصر جنوب أفريقيا للاتصالات", nameEn: "Egypt-South Africa For Communication" },
  { ticker: "EASB", nameAr: "المصرية العربية ثمار للسمسرة", nameEn: "Egyptian Arabian Company Themar for Securities Brokerage" },
  { ticker: "EGCH", nameAr: "الشركة المصرية للصناعات الكيماوية (كيما)", nameEn: "Egyptian Chemical Industries (Kima)" },
  { ticker: "OREG", nameAr: "أورنج مصر للاتصالات", nameEn: "Orange Egypt for Telecommunications" },
  { ticker: "EFIC", nameAr: "المصرية المالية والصناعية", nameEn: "Egyptian Financial & Industrial" },
  { ticker: "EDBM", nameAr: "المصرية لتطوير مواد البناء", nameEn: "Egyptian For Developing Building Materials" },
  { ticker: "EGTS", nameAr: "المصرية للمنتجعات السياحية", nameEn: "Egyptian For Tourism Resorts" },
  { ticker: "EGBE", nameAr: "البنك المصري الخليجي", nameEn: "Egyptian Gulf Bank" },
  { ticker: "PHAR", nameAr: "المصرية الدولية للأدوية", nameEn: "Egyptian International Pharmaceuticals Industries" },
  { ticker: "EITP", nameAr: "المصرية للمشروعات السياحية الدولية", nameEn: "Egyptian Company for International Touristic Projects" },
  { ticker: "IRON", nameAr: "المصرية للحديد والصلب", nameEn: "Egyptian Iron & Steel" },
  { ticker: "EKHO", nameAr: "المصرية الكويتية القابضة", nameEn: "Egyptian Kuwait Holding" },
  { ticker: "MPRC", nameAr: "المدينة الإعلامية", nameEn: "Egyptian Media Production City" },
  { ticker: "MOED", nameAr: "المصرية للتعليم الحديث", nameEn: "Egyptian Modern Education Systems" },
  { ticker: "AREH", nameAr: "التجمع المصري العقاري", nameEn: "Real Estate Egyptian Consortium" },
  { ticker: "AREHA", nameAr: "التجمع المصري العقاري لحاملي الأسهم", nameEn: "Real Estate Egyptian Consortium Bearer Shares" },
  { ticker: "EGSA", nameAr: "المصرية للأقمار الصناعية (نيل سات)", nameEn: "Egyptian Satellites (NileSat)" },
  { ticker: "ESGI", nameAr: "المصرية للنشا والجلوكوز", nameEn: "Egyptian Starch & Glucose" },
  { ticker: "ETRS", nameAr: "المصرية للنقل والخدمات التجارية", nameEn: "Egyptian Transport & Commercial Services" },
  { ticker: "ABRD", nameAr: "المصريين بالخارج للاستثمار والتنمية", nameEn: "Egyptians Abroad For Investment & Development" },
  { ticker: "EIUD", nameAr: "المصريين للاستثمار والتنمية العمرانية", nameEn: "Egyptians For Investment & Urban Development" },
  { ticker: "EHDR", nameAr: "المصريين للإسكان والتعمير", nameEn: "Egyptians for Housing Development" },
  { ticker: "AFDI", nameAr: "الأهلي للتنمية والاستثمار", nameEn: "Al Ahly for Development & Investment" },
  { ticker: "EPPK", nameAr: "الأهرام للطباعة والتغليف", nameEn: "El Ahram Co. For Printing And Packing" },
  { ticker: "EEII", nameAr: "الصناعات الهندسية العربية", nameEn: "Arab Engineering Industries" },
  { ticker: "EALR", nameAr: "العربية لاستصلاح الأراضي", nameEn: "El Arabia For Land Reclamation" },
  { ticker: "EBDP", nameAr: "البدر للبلاستيك", nameEn: "El Badr Plastic" },
  { ticker: "ICFC", nameAr: "الدولية للأسمدة والكيماويات", nameEn: "El Dawlia Fertilizers And Chemicals" },
  { ticker: "IRAX", nameAr: "العز الدخيلة للصلب - الإسكندرية", nameEn: "El Ezz Aldekhela Steel - Alexandria" },
  { ticker: "ECAP", nameAr: "العز للسيراميك والبورسلين (جيما)", nameEn: "El Ezz Ceramics & Porcelain (Gemma)" },
  { ticker: "KWIN", nameAr: "القاهرة الوطنية للاستثمار", nameEn: "El Kahera El Watania Investment" },
  { ticker: "ELKA", nameAr: "القاهرة للإسكان", nameEn: "El Kahera Housing" },
  { ticker: "KABO", nameAr: "النصر للملابس والمنسوجات - كابو", nameEn: "El Nasr Clothes & Textiles - KABO" },
  { ticker: "ELNA", nameAr: "النصر لصناعة المحاصيل الزراعية", nameEn: "El Nasr For Manufacturing Agricultural Crops" },
  { ticker: "NASR", nameAr: "النصر للمحولات (الماكو)", nameEn: "El Nasr Transformers (El Maco)" },
  { ticker: "OBRI", nameAr: "العبور للاستثمار العقاري", nameEn: "El Ebour Real Estate Investment" },
  { ticker: "EOSB", nameAr: "العروبة للسمسرة", nameEn: "Al Orouba Securities Brokerage" },
  { ticker: "ELSH", nameAr: "الشمس للإسكان والتعمير", nameEn: "El Shams Housing & Urbanization" },
  { ticker: "SPHT", nameAr: "الشمس للأهرامات للفنادق والمشروعات السياحية", nameEn: "El Shams Pyramids For Hotels & Touristic Projects" },
  { ticker: "ELWA", nameAr: "الوادي للتنمية السياحية", nameEn: "El Wadi Touristic Development" },
  { ticker: "NIPH", nameAr: "النيل للأدوية والصناعات الكيماوية", nameEn: "El-Nile Co. For Pharmaceuticals And Chemical Industries" },
  { ticker: "ELEC", nameAr: "الكابلات الكهربائية المصرية", nameEn: "Electro Cable Egypt Company" },
  { ticker: "UEGC", nameAr: "السعيد للمقاولات والاستثمار العقاري", nameEn: "El Saeed Contracting and Real Estate Investment" },
  { ticker: "SWDY", nameAr: "السويدى للكهرباء", nameEn: "El Sewedy Electric Company" },
  { ticker: "EMFD", nameAr: "إعمار مصر للتنمية", nameEn: "Emaar Misr For Development" },
  { ticker: "ENGC", nameAr: "الصناعات الهندسية (أيكون)", nameEn: "Engineering Industries (Icon)" },
  { ticker: "EXPA", nameAr: "بنك تنمية الصادرات", nameEn: "Export Development Bank Of Egypt" },
  { ticker: "ZEOT", nameAr: "الزيوت والمستخلصات", nameEn: "Extracted Oils & Derivatives" },
  { ticker: "ESRS", nameAr: "العز للصلب", nameEn: "Ezz Steel" },
  { ticker: "FAIT", nameAr: "بنك فيصل الإسلامي المصري (جنيه)", nameEn: "Faisal Islamic Bank Of Egypt (EGP)" },
  { ticker: "FAITA", nameAr: "بنك فيصل الإسلامي المصري (دولار)", nameEn: "Faisal Islamic Bank Of Egypt (USD)" },
  { ticker: "FERC", nameAr: "فيركيم مصر للأسمدة والكيماويات", nameEn: "Ferchem Misr Company for Fertilizers and Chemicals" },
  { ticker: "FIRED", nameAr: "الأولى للاستثمار والتنمية العقارية", nameEn: "First Investment And Real Estate Development" },
  { ticker: "AUTO", nameAr: "جي بي أوتو", nameEn: "GB Auto" },
  { ticker: "AALR", nameAr: "العامة لاستصلاح الأراضي والتنمية", nameEn: "General Co for Land Reclamation Development and Reconstruction" },
  { ticker: "GSSC", nameAr: "العامة للصوامع والتخزين", nameEn: "General Company for Silos and Storage" },
  { ticker: "GETO", nameAr: "جينيل تورز", nameEn: "Genial Tours" },
  { ticker: "GIHD", nameAr: "غربيه الإسلامية للإسكان", nameEn: "Gharbia Islamic Housing Development" },
  { ticker: "GGCC", nameAr: "الجيزة العامة للمقاولات", nameEn: "Giza General Contracting" },
  { ticker: "BIOC", nameAr: "جلاكسو سميث كلاين", nameEn: "Glaxo Smith Kline" },
  { ticker: "GTHE", nameAr: "جلوبال للاتصالات القابضة", nameEn: "Global Telecom Holding" },
  { ticker: "GMCI", nameAr: "جي ام سي للاستثمارات الصناعية والتجارية", nameEn: "GMC Group For Industrial, Commercial And Financial Investments" },
  { ticker: "GOCO", nameAr: "الساحل الذهبي", nameEn: "Golden Coast Company" },
  { ticker: "GPPL", nameAr: "الميادين الذهبية", nameEn: "Golden Pyramids Plaza" },
  { ticker: "GTWL", nameAr: "الذهبية للمنسوجات والملابس الصوفية", nameEn: "Golden Textiles & Clothes Wool" },
  { ticker: "GRCA", nameAr: "جراند كابيتال للاستثمار", nameEn: "Grand Investment Capital" },
  { ticker: "AGIN", nameAr: "الاستثمار الخليجي العربي", nameEn: "Gulf Arab Investment" },
  { ticker: "CCRS", nameAr: "الخليج الكندي للاستثمار العقاري", nameEn: "Gulf Canadian Real Estate Investment Co." },
  { ticker: "HELI", nameAr: "هليوبوليس للإسكان والتعمير", nameEn: "Heliopolis Housing" },
  { ticker: "HDBK", nameAr: "بنك الإسكان والتعمير", nameEn: "Housing & Development Bank" },
  { ticker: "INEE", nameAr: "إندس والهندسة", nameEn: "Indus & Engineer" },
  { ticker: "INEG", nameAr: "المتكاملة للهندسة", nameEn: "Integrated Engineering Group Sae" },
  { ticker: "ICAL", nameAr: "إنتر-القاهرة للألومنيوم", nameEn: "Inter-Cairo For Aluminum Industry" },
  { ticker: "IFAP", nameAr: "المنتجات الزراعية الدولية", nameEn: "International Agricultural Products" },
  { ticker: "IBCT", nameAr: "المؤسسة الدولية للتجارة والامتياز", nameEn: "International Business Corporation For Trade And Franchise" },
  { ticker: "ICID", nameAr: "الدولية للاستثمار والتنمية", nameEn: "International Co For Investment & Development" },
  { ticker: "ICLE", nameAr: "الدولية للتأجير التمويلي (إنكوليز)", nameEn: "International Company For Leasing (Incolease)" },
  { ticker: "ICMI", nameAr: "الدولية للصناعات الطبية", nameEn: "International Company For Medical Industries" },
  { ticker: "DIFC", nameAr: "ثاني أكسيد الكربون الجاف الدولي", nameEn: "International Dry Ice" },
  { ticker: "IPPM", nameAr: "الدولية لمواد الطباعة والتغليف", nameEn: "International Printing & Packaging Materials Co." },
  { ticker: "IDRE", nameAr: "الإسماعيلية للتنمية والعقارات", nameEn: "Ismailia Development And Real Estate" },
  { ticker: "ISMA", nameAr: "الإسماعيلية مصر للدواجن", nameEn: "Ismailia Misr Poultry" },
  { ticker: "INFI", nameAr: "الإسماعيلية الوطنية للصناعات الغذائية", nameEn: "Ismailia National Food Industries" },
  { ticker: "ITSY", nameAr: "آي تي سينرجي", nameEn: "IT Synergy" },
  { ticker: "JUFO", nameAr: "جهينة للصناعات الغذائية", nameEn: "Juhayna Food Industries" },
  { ticker: "KZPC", nameAr: "كفر الزيات للمبيدات والكيماويات", nameEn: "Kafr El Zayat Pesticides and Chemicals" },
  { ticker: "LKGP", nameAr: "مجموعة لاقا", nameEn: "Lakah Group" },
  { ticker: "LCSW", nameAr: "ليسيكو مصر", nameEn: "Lecico Egypt" },
  { ticker: "MPCO", nameAr: "المنصورة للدواجن", nameEn: "Mansoura Poultry" },
  { ticker: "MOIL", nameAr: "موريديف وخدمات النفط", nameEn: "Maridive & Oil Services" },
  { ticker: "MMAT", nameAr: "مرسى مرسى علم للتنمية السياحية", nameEn: "Marsa Marsa Alam For Tourism Development" },
  { ticker: "MAAL", nameAr: "مرسيليا المصريه الخليجية القابضة", nameEn: "Marseille Almasreia Alkhalegeya For Holding Investment" },
  { ticker: "MBEN", nameAr: "إم بي للهندسة", nameEn: "MB Engineering" },
  { ticker: "MEPA", nameAr: "التعبئة الطبية", nameEn: "Medical Packaging Company" },
  { ticker: "MNHD", nameAr: "مدينة نصر للإسكان", nameEn: "Medinet Nasr Housing" },
  { ticker: "MPCI", nameAr: "ممفيس للأدوية", nameEn: "Memphis Pharmaceuticals" },
  { ticker: "MENA", nameAr: "مينا للاستثمار السياحي والعقاري", nameEn: "Mena Touristic & Real Estate Investment" },
  { ticker: "WCDF", nameAr: "مطاحن مصر الوسطى", nameEn: "Middle & West Delta Flour Mills" },
  { ticker: "MEGM", nameAr: "الشرق الأوسط لصناعة الزجاج", nameEn: "Middle East Glass Manufacturing" },
  { ticker: "CEFM", nameAr: "مطاحن مصر الوسطى", nameEn: "Middle Egypt Flour Mills" },
  { ticker: "MIPH", nameAr: "مينافارم للأدوية", nameEn: "Minapharm Pharmaceuticals" },
  { ticker: "MBSC", nameAr: "مصر بني سويف للإسمنت", nameEn: "Misr Beni Suef Cement" },
  { ticker: "MCQE", nameAr: "مصر للإسمنت قنا", nameEn: "Misr Cement (Qena)" },
  { ticker: "MICH", nameAr: "مصر للصناعات الكيماوية", nameEn: "Misr Chemical Industries" },
  { ticker: "MRCO", nameAr: "مصر للتبريد وتكييف الهواء", nameEn: "Misr Refrigeration and Air Conditioning" },
  { ticker: "MFSC", nameAr: "مصر فري شوب", nameEn: "Egypt Free Shops" },
  { ticker: "MEDA", nameAr: "مصر السلام للتنمية والتكنولوجيا", nameEn: "Misr Elsalam For Development & Advanced Technology" },
  { ticker: "MFINEG", nameAr: "مصر للاستثمارات المالية", nameEn: "Misr Financial Investments" },
  { ticker: "MFPC", nameAr: "مصر لإنتاج الأسمدة", nameEn: "Misr Fertilizers Production Company" },
  { ticker: "MHOT", nameAr: "مصر للفنادق", nameEn: "Misr Hotels" },
  { ticker: "MKIT", nameAr: "مصر الكويت للاستثمار والتجارة (ميتيلو)", nameEn: "Misr Kuwait Investment And Trading (Meatello)" },
  { ticker: "ATQA", nameAr: "مصر الوطنية للصلب - العتاقة", nameEn: "Misr National Steel - Ataqa" },
  { ticker: "MOSC", nameAr: "مصر للزيوت والصابون", nameEn: "Misr Oils & Soap" },
  { ticker: "WATP", nameAr: "الحديثة للموانع المائية", nameEn: "Modern Waterproofing Company" },
  { ticker: "SMPP", nameAr: "الشروق للطباعة الحديثة والتغليف", nameEn: "Shorouk for Modern Printing and Packaging" },
  { ticker: "MOIN", nameAr: "المهندس للتأمين", nameEn: "Mohandes Insurance" },
  { ticker: "NAHO", nameAr: "نعيم القابضة", nameEn: "NAEEM Holding" },
  { ticker: "NCCW", nameAr: "النصر لأعمال المدنية", nameEn: "Nasr Company For Civil Works" },
  { ticker: "NBKE", nameAr: "البنك الوطني الكويتي مصر", nameEn: "National Bank Of Kuwait Egypt" },
  { ticker: "NCEM", nameAr: "الإسمنت الوطنية", nameEn: "National Cement" },
  { ticker: "NCMP", nameAr: "الوطنية لمنتجات الذرة", nameEn: "National Company For Maize Products" },
  { ticker: "NDRL", nameAr: "الوطنية للحفر", nameEn: "National Drilling Company" },
  { ticker: "NHPS", nameAr: "الإسكان الوطني للنقابات المهنية", nameEn: "National Housing for Professional Syndicates" },
  { ticker: "COPR", nameAr: "النحاس للاستثمار والتطوير العقاري", nameEn: "Copper For Commercial Investment & Real Estate Development" },
  { ticker: "EGAS", nameAr: "الشركة المصرية للغاز", nameEn: "Egypt Gas Company" },
  { ticker: "NCIS", nameAr: "نيوكاسل للاستثمار الرياضي", nameEn: "New Castle For Investment Sports" },
  { ticker: "NCIN", nameAr: "استثمارات مدينة نيل سيتي", nameEn: "Nile City Investment" },
  { ticker: "NCGC", nameAr: "النيل لحليج الأقطان", nameEn: "Nile Cotton Ginning" },
  { ticker: "NOAF", nameAr: "شمال أفريقيا للاستثمار العقاري", nameEn: "North Africa Company For Real Estate Investment" },
  { ticker: "MILS", nameAr: "مطاحن شمال القاهرة", nameEn: "North Cairo Flour Mills" },
  { ticker: "NEDA", nameAr: "شمال الصعيد للتنمية والإنتاج الزراعي", nameEn: "North Upper Egypt Development & Agricultural Production" },
  { ticker: "NINH", nameAr: "مستشفى النزهة الدولي", nameEn: "Nozha International Hospital" },
  { ticker: "OCPH", nameAr: "أكتوبر فارما", nameEn: "October Pharma" },
  { ticker: "OCIC", nameAr: "أوراسكوم للإنشاء والصناعة", nameEn: "Orascom Construction Industries" },
  { ticker: "ODHN", nameAr: "أوراسكوم للتنمية القابضة", nameEn: "Orascom Development Holding AG" },
  { ticker: "ORHD", nameAr: "أوراسكوم للفنادق والتنمية", nameEn: "Orascom Hotels And Development" },
  { ticker: "OTMT", nameAr: "أوراسكوم للاستثمار القابضة", nameEn: "Orascom Investment Holding" },
  { ticker: "ORWE", nameAr: "النساجون الشرقيون للسجاد", nameEn: "Oriental Weavers Carpet" },
  { ticker: "EBSC", nameAr: "أسوول إي إس بي للسمسرة", nameEn: "Osool ESB Securities Brokerage" },
  { ticker: "PACH", nameAr: "الدهانات والصناعات الكيماوية", nameEn: "Paint & Chemicals Industries" },
  { ticker: "PHDC", nameAr: "بالم هيلز للتطوير", nameEn: "Palm Hills Development Company" },
  { ticker: "SIMO", nameAr: "ورق الشرق الأوسط (سيمو)", nameEn: "Paper Middle East (Simo)" },
  { ticker: "PTCC", nameAr: "فرعون تك للتحكم والاتصالات", nameEn: "Pharaoh Tech For Control And Communication Systems" },
  { ticker: "ASPI", nameAr: "أسبر كابيتال للاستثمارات المالية", nameEn: "Aspire Capital Holding For Financial Investments" },
  { ticker: "PSAD", nameAr: "بورسعيد للتنمية الزراعية والإنشاء", nameEn: "Port Said Agricultural Development and Construction" },
  { ticker: "ARAB", nameAr: "المطورون العرب القابضة", nameEn: "Arab Developers Holding" },
  { ticker: "PRMH", nameAr: "بريمير القابضة", nameEn: "Prime Holding" },
  { ticker: "PHTV", nameAr: "فنادق ومنتجعات الأهرامات", nameEn: "Pyramisa Hotels and Resorts" },
  { ticker: "QNBA", nameAr: "قطر الوطني الأهلي", nameEn: "Qatar National Bank Alahly" },
  { ticker: "RAKT", nameAr: "العامة لصناعة الورق راكتا", nameEn: "General Company for Paper Industry Rakta" },
  { ticker: "RACC", nameAr: "راية لمراكز الاتصال", nameEn: "Raya Contact Center" },
  { ticker: "RAYA", nameAr: "راية القابضة للاستثمارات المالية", nameEn: "Raya Holding for Financial Investments" },
  { ticker: "REAC", nameAr: "ريكاب للاستثمارات المالية", nameEn: "Reacap Financial Investments" },
  { ticker: "RTVC", nameAr: "ريمكو لإنشاء القرى السياحية", nameEn: "Remco For Touristic Villages Construction" },
  { ticker: "RIVA", nameAr: "ريفا فارما", nameEn: "Riva Pharma" },
  { ticker: "RMTV", nameAr: "رواد مصر للاستثمار السياحي", nameEn: "Rowad Misr Tourism Investment" },
  { ticker: "ROTO", nameAr: "رواد السياحة (الرواد)", nameEn: "Rowad Tourism (Al Rowad)" },
  { ticker: "RUBX", nameAr: "روبكس الدولية للبلاستيك والأكريليك", nameEn: "Rubex International For Plastic And Acrylic Manufacturing" },
  { ticker: "SIPC", nameAr: "صابا الدولية للأدوية والكيماويات", nameEn: "Sabaa International Company For Pharmaceutical And Chemical" },
  { ticker: "SMFR", nameAr: "صمد مصر إيجيفرت", nameEn: "Samad Misr EGYFERT" },
  { ticker: "SMCS", nameAr: "سامكريت مصر", nameEn: "Samcrete Misr" },
  { ticker: "SMCSA", nameAr: "سامكريت مصر أسهم ممتازة", nameEn: "Samcrete Misr Preferred Shares" },
  { ticker: "SEIG", nameAr: "الاستثمار والتمويل السعودي المصري", nameEn: "Saudi Egyptian Investment & Finance" },
  { ticker: "SEIGA", nameAr: "الاستثمار والتمويل السعودي المصري (دولار)", nameEn: "Saudi Egyptian Investment & Finance (Usd)" },
  { ticker: "SNFC", nameAr: "الشرقية الوطنية للأمن الغذائي", nameEn: "Sharkia National Company for Food Security" },
  { ticker: "SDTI", nameAr: "شركة شرم دريمز للاستثمار السياحي", nameEn: "Sharm Dreams Co For Tourism Investment" },
  { ticker: "SKPC", nameAr: "بتروكيماويات سيدي كرير", nameEn: "Sidi Kerir Petrochemicals" },
  { ticker: "SCEM", nameAr: "سيناء للإسمنت", nameEn: "Sinai Cement" },
  { ticker: "OCDI", nameAr: "السادس من أكتوبر للتنمية والاستثمار (سوديك)", nameEn: "Six Of October Development & Investment (Sodic)" },
  { ticker: "SLTD", nameAr: "سكاى لايت للتنمية السياحية", nameEn: "Sky Light For Tourist Development Company" },
  { ticker: "SAIB", nameAr: "المصرف العربي الدولي", nameEn: "Societe Arabe Internationale De Banque" },
  { ticker: "SNFI", nameAr: "سوهاج الوطنية للصناعات الغذائية", nameEn: "Sohag National Company For Food Industries" },
  { ticker: "SCFM", nameAr: "مطاحن ومخابز جنوب القاهرة والجيزة", nameEn: "South Cairo & Giza Mills & Bakeries" },
  { ticker: "SVCE", nameAr: "أسمنت جنوب الوادي", nameEn: "South Valley Cement" },
  { ticker: "SCTS", nameAr: "قناة السويس للتكنولوجيا والتسوية", nameEn: "Sues Canal Company For Technology Settling" },
  { ticker: "SBAG", nameAr: "أكياس السويس", nameEn: "Suez Bags" },
  { ticker: "CANA", nameAr: "بنك قناة السويس", nameEn: "Suez Canal Bank" },
  { ticker: "SUCE", nameAr: "أسمنت السويس", nameEn: "Suez Cement" },
  { ticker: "TMGH", nameAr: "طلعت مصطفى القابضة", nameEn: "TMG Holding" },
  { ticker: "TECH", nameAr: "تغليف الصناعات - مصر", nameEn: "Taghleef Industries - Egypt" },
  { ticker: "ETEL", nameAr: "المصرية للاتصالات", nameEn: "Telecom Egypt" },
  { ticker: "ADPC", nameAr: "الألبان العربية", nameEn: "The Arab Dairy Products" },
  { ticker: "TORA", nameAr: "أسمنت طرة", nameEn: "Tourah Cement" },
  { ticker: "TOUR", nameAr: "السياحة والتعمير", nameEn: "Tourism Urbanization" },
  { ticker: "TRTO", nameAr: "ترانس أوشن تورز", nameEn: "Trans Oceans Tours" },
  { ticker: "UNBE", nameAr: "البنك الاتحادي الوطني مصر", nameEn: "Union National Bank Egypt" },
  { ticker: "UASG", nameAr: "الشحن العربي المتحدة", nameEn: "United Arab Stevedoring" },
  { ticker: "UNIT", nameAr: "المتحدة للإسكان والتعمير", nameEn: "United Housing & Development" },
  { ticker: "UNIP", nameAr: "العالمية لمواد التعبئة والورق", nameEn: "Universal Company for Packaging Materials and Paper" },
  { ticker: "UNFO", nameAr: "يونيفرت للصناعات الغذائية", nameEn: "Univert Food Industries" },
  { ticker: "UEFM", nameAr: "مطاحن مصر العليا", nameEn: "Upper Egypt Flour Mills" },
  { ticker: "UTOP", nameAr: "يوتوبيا للاستثمار العقاري والسياحي", nameEn: "Utopia Real Estate Investment and Tourism" },
  { ticker: "VERT", nameAr: "فيرتيكا", nameEn: "Vertika" },
  { ticker: "VODE", nameAr: "فودافون مصر", nameEn: "Vodafone Egypt" },
  { ticker: "WKOL", nameAr: "وادي كوم أمبو لاستصلاح الأراضي", nameEn: "Wadi Kom Ombo for Land Reclamation" },
  { ticker: "XPIN", nameAr: "اكسبريس للتكامل", nameEn: "Xpress Integration" },
  { ticker: "ZMID", nameAr: "زهراء المعادي للاستثمار والتنمية", nameEn: "Zahraa Maadi Investment & Development" },
  { ticker: "DOMT", nameAr: "العربية للصناعات الغذائية (دومتي)", nameEn: "Arabian Food Industries(DOMTY)" },
  { ticker: "CLHO", nameAr: "مستشفى كليوباترا", nameEn: "Cleopatra Hospital" },
  { ticker: "OLFI", nameAr: "أرض العبور للصناعات الغذائية", nameEn: "Obour Land For Food Industries" },
  { ticker: "MTIE", nameAr: "إم إم جروب للصناعة والتجارة الدولية", nameEn: "MM Group For Industry And International Trade" },
  { ticker: "CICH", nameAr: "سي كابيتال القابضة للاستثمارات المالية", nameEn: "CI Capital Holding for Financial Investments" },
  { ticker: "CIRA", nameAr: "القاهرة للاستثمار والتنمية العقارية", nameEn: "Cairo For Investment And Real Estate Development" },
  { ticker: "CNFN", nameAr: "كونتكت المالية القابضة", nameEn: "Contact Financial Holding" },
  { ticker: "SRWA", nameAr: "صروة كابيتال", nameEn: "Sarwa Capital" },
  { ticker: "FWRY", nameAr: "فوري لتكنولوجيا البنوك والمدفوعات الإلكترونية", nameEn: "Fawry for Banking Technology and Electronic Payment" },
  { ticker: "ODIN", nameAr: "أودين للاستثمار", nameEn: "ODIN Investment" },
  { ticker: "RMDA", nameAr: "العاشر من رمضان للأدوية والمستحضرات التشخيصية - راميدا", nameEn: "Tenth of Ramadan for Pharmaceutical Industries and Diagnostic Reagents - Rameda" },
  { ticker: "AIVCB", nameAr: "الأعراف للاستثمار والاستشارات بالجنيه", nameEn: "Al Arafa Investment And Consulting in EGP" },
  { ticker: "SPMD", nameAr: "سبيد ميديكال", nameEn: "Speed Medical" },
  { ticker: "OFH", nameAr: "أوراسكوم المالية القابضة", nameEn: "Orascom Financial Holdings" },
  { ticker: "ACAMD", nameAr: "العربية لإدارة الأصول والتنمية", nameEn: "Arab Company for Asset Management And Development" },
  { ticker: "ISPH", nameAr: "ابن سينا فارما", nameEn: "Ibnsina Pharma" },
  { ticker: "TALM", nameAr: "تعليم لإدارة الخدمات", nameEn: "Taaleem Management Services" },
  { ticker: "IDHC", nameAr: "المتكاملة للتشخيص القابضة", nameEn: "Integrated Diagnostics Holdings" },
  { ticker: "ISMQ", nameAr: "الحديد والصلب للمناجم والمحاجر", nameEn: "Iron and Steel for Mines and Quarries" },
  { ticker: "TANM", nameAr: "تنمية للاستثمار العقاري", nameEn: "Tanmiya for Real Estate Investment" },
  { ticker: "EFIH", nameAr: "إي-فاينانس للاستثمارات الرقمية والمالية", nameEn: "E-finance For Digital and Financial Investments" },
  { ticker: "GDWA", nameAr: "جدوى للتنمية الصناعية", nameEn: "Gadwa For Industrial Development" },
  { ticker: "PRDC", nameAr: "رواد الخصائص للتنمية العمرانية", nameEn: "Pioneers Properties For Urban Development" },
  { ticker: "KRDI", nameAr: "نهر الخير للتنمية والاستثمار الزراعي", nameEn: "Al Khair River For Development Agricultural Investment" },
  { ticker: "MCRO", nameAr: "ماكرو جروب للأدوية", nameEn: "Macro Group Pharmaceuticals" },
  { ticker: "ODID", nameAr: "أودين للاستثمار والتنمية", nameEn: "Odin for Investment & Development" },
];

// ── Company descriptions ──────────────────────────────────────────────────────
// Covers major EGX-listed companies. Remaining companies show a default fallback.
const EGX_DESCRIPTIONS: Record<string, { ar: string; en: string }> = {
  // Banks
  COMI: {
    ar: "البنك التجاري الدولي (CIB) أكبر بنك خاص في مصر، تأسس عام 1975 بشراكة مصرية أمريكية مع مجموعة تشيس مانهاتن. يُقدم خدمات مصرفية متكاملة للأفراد والشركات والمؤسسات، ويمتلك أكبر شبكة صراف آلي بين البنوك الخاصة في مصر، مع توسع نشط نحو أسواق أفريقيا جنوب الصحراء.",
    en: "Commercial International Bank (CIB), Egypt's largest private bank, founded in 1975 as a joint venture with Chase Manhattan. Delivers full-spectrum retail and corporate banking, commands Egypt's biggest private ATM network, and is actively expanding into sub-Saharan African markets.",
  },
  CIEB: {
    ar: "بنك كريدي أجريكول مصر، تأسس عام 1990 بشراكة مصرية فرنسية وهو الذراع المصرية لمجموعة كريدي أجريكول الفرنسية إحدى أكبر المجموعات المصرفية في العالم بحضور في أكثر من 47 دولة. يُقدم حلولاً مصرفية شاملة للأفراد والشركات الصغيرة والمتوسطة والمؤسسات الكبرى في مصر.",
    en: "Crédit Agricole Egypt, founded in 1990 as a French-Egyptian partnership, is the Egyptian arm of Crédit Agricole Group—one of the world's largest banking groups with presence in 47+ countries. Provides comprehensive banking solutions for individuals, SMEs and large corporates in Egypt.",
  },
  ADIB: {
    ar: "بنك أبوظبي الإسلامي مصر، الفرع المصري لمجموعة بنك أبوظبي الإسلامي الإماراتي العملاق العامل في أكثر من 7 دول. يُقدم خدمات مصرفية إسلامية متوافقة تماماً مع أحكام الشريعة في مجالات التجزئة والتمويل المؤسسي وإدارة الثروات للأفراد والشركات في مصر.",
    en: "Abu Dhabi Islamic Bank Egypt, the Egyptian branch of UAE's ADIB Group operating in 7+ countries. Provides fully Sharia-compliant banking across retail, corporate finance and wealth-management segments for individuals and businesses in Egypt.",
  },
  SAUD: {
    ar: "بنك البركة مصر، تأسس عام 1980 ويُعد أحد الفروع الرائدة لمجموعة البركة المصرفية الدولية العاملة في 17 دولة حول العالم. يُقدم باقة متكاملة من الخدمات المصرفية الإسلامية المتوافقة مع أحكام الشريعة للأفراد والشركات والمؤسسات في السوق المصري.",
    en: "Al Baraka Bank Egypt, founded in 1980, a flagship subsidiary of Al Baraka Banking Group which operates in 17 countries worldwide. Delivers a comprehensive suite of Sharia-compliant Islamic banking services for individuals, businesses and institutions in the Egyptian market.",
  },
  EGBE: {
    ar: "بنك إي جي بنك (المصرف المتحد سابقاً) تأسس عام 1981 ليُقدم خدمات مصرفية متنوعة للأفراد والشركات في مصر. يُركز على التجزئة المصرفية وتمويل الشركات الصغيرة والمتوسطة، وشهد في السنوات الأخيرة توسعاً ملحوظاً في شبكة فروعه ومنتجاته الرقمية وخدمات الدفع الإلكتروني.",
    en: "EG Bank, founded in 1981, offers diverse banking services for individuals and businesses in Egypt. Focuses on retail banking and SME financing, with notable recent expansion in its branch network, digital products and electronic-payment services.",
  },
  FAIT: {
    ar: "بنك فيصل الإسلامي المصري، أول بنك إسلامي في مصر وأفريقيا، تأسس عام 1977 بموجب قانون خاص. يُقدم منتجات مصرفية إسلامية متكاملة تشمل المرابحة والمشاركة والإجارة والمضاربة وفقاً لأحكام الشريعة الإسلامية للأفراد والشركات والمستثمرين في مختلف القطاعات.",
    en: "Faisal Islamic Bank of Egypt, the first Islamic bank in Egypt and Africa, established in 1977 under a special law. Offers a full range of Islamic banking products—murabaha, musharaka, ijara and mudaraba—to individuals, businesses and investors across all sectors.",
  },
  FAITA: {
    ar: "بنك فيصل الإسلامي المصري (حسابات الدولار)، أول بنك إسلامي في مصر وأفريقيا، تأسس عام 1977 بموجب قانون خاص. يُقدم منتجات مصرفية إسلامية متوافقة مع الشريعة للأفراد والشركات، وتُمثل هذه الأسهم الشريحة المقومة بالدولار الأمريكي من رأس مال البنك.",
    en: "Faisal Islamic Bank of Egypt (USD accounts), Africa's first Islamic bank, established in 1977 under a special law. Offers Sharia-compliant Islamic banking products for individuals and businesses; these shares represent the USD-denominated tranche of the bank's capital.",
  },
  HDBK: {
    ar: "بنك التعمير والإسكان، بنك حكومي متخصص تأسس عام 1979 بهدف تمويل مشاريع الإسكان والتعمير في مصر. يُقدم قروضاً عقارية بأسعار ميسّرة للأفراد وتمويلاً للمطورين العقاريين، ويُسهم بدور محوري في المنظومة الحكومية لتوفير الإسكان لمحدودي الدخل.",
    en: "Housing and Development Bank, a state-owned specialist bank founded in 1979 to finance housing and construction in Egypt. Offers affordable mortgages for individuals and developer finance, playing a key role in the government's affordable-housing programme for low-income citizens.",
  },
  EXPA: {
    ar: "بنك تنمية الصادرات، بنك حكومي مصري تأسس عام 1983 بهدف دعم وتمويل المصدرين المصريين. يُقدم تسهيلات ائتمانية مُخصصة وضمانات تصديرية وخدمات مصرفية دولية تُسهم في تنمية الصادرات غير النفطية المصرية وفتح أسواق جديدة أمام المنتجات المصرية في الخارج.",
    en: "Export Development Bank of Egypt, a state-owned bank founded in 1983 to support and finance Egyptian exporters. Offers tailored credit facilities, export guarantees and international banking services that help grow Egypt's non-oil exports and open new foreign markets for Egyptian products.",
  },
  CANA: {
    ar: "بنك القاهرة، أحد أعرق البنوك التجارية في مصر وأكبرها، تأسس عام 1952 بشبكة فروع واسعة تمتد عبر مختلف المحافظات. يُقدم خدمات مصرفية شاملة للأفراد والشركات والمؤسسات، مع اهتمام خاص بالشمول المالي ودعم المشاريع الصغيرة والمتوسطة في مصر.",
    en: "Banque du Caire, one of Egypt's oldest and largest commercial banks, founded in 1952 with a wide branch network across all governorates. Provides comprehensive banking to individuals, businesses and institutions, with special focus on financial inclusion and SME support.",
  },
  QNBA: {
    ar: "بنك QNB الأهلي، أحد أكبر البنوك في مصر، يتبع مجموعة بنك قطر الوطني (QNB) أكبر بنك في الشرق الأوسط وأفريقيا بحضور في 31 دولة. يُقدم خدمات مصرفية متكاملة للأفراد والشركات في مصر مع ربطها بشبكة QNB العالمية لتيسير المعاملات الدولية.",
    en: "QNB Al Ahli, one of Egypt's largest banks, part of QNB Group—the largest bank in the Middle East and Africa with presence in 31 countries. Offers integrated banking for retail and corporate clients in Egypt, connected to QNB's extensive global network to facilitate international transactions.",
  },
  NBKE: {
    ar: "بنك الكويت الوطني مصر، تابع لمجموعة بنك الكويت الوطني (NBK) أعرق وأكبر بنك كويتي بتاريخ يمتد لأكثر من 70 عاماً وحضور في 16 دولة. يُقدم خدمات مصرفية شاملة للأفراد والشركات في مصر مستفيداً من الخبرة والشبكة الإقليمية الواسعة للمجموعة.",
    en: "NBK Egypt, part of National Bank of Kuwait Group—Kuwait's oldest and largest bank with 70+ years of history and presence in 16 countries. Provides comprehensive banking for retail and corporate clients in Egypt, leveraging the group's deep expertise and broad regional network.",
  },
  SAIB: {
    ar: "الشركة العربية الدولية للبنوك (SAIB)، بنك متخصص في تمويل التجارة الخارجية والخدمات المؤسسية، تأسس عام 1976 بشراكة عربية دولية متعددة الأطراف. يمتاز بشبكة علاقات مصرفية مراسلة دولية واسعة وخبرة متراكمة في تمويل المشاريع وخطابات الاعتماد والضمانات البنكية.",
    en: "Societe Arabe Internationale de Banque (SAIB), a trade-finance and corporate-services specialist founded in 1976 as a multi-lateral Arab-international banking partnership. Boasts an extensive global correspondent banking network and long expertise in project finance, letters of credit and bank guarantees.",
  },
  UNBE: {
    ar: "بنك يونيون ناشيونال مصر، الفرع المصري لمجموعة مصرفية إماراتية تعمل في أكثر من 5 دول. يُقدم حلولاً مصرفية متنوعة للأفراد والشركات في مصر، ويستفيد من الربط مع شبكة المجموعة الإماراتية لتيسير التدفقات المالية والأعمال بين مصر ودول الخليج العربي.",
    en: "Union National Bank Egypt, the Egyptian branch of a UAE banking group operating in 5+ countries. Provides diverse banking solutions for retail and corporate clients in Egypt, leveraging group connectivity to facilitate financial flows and business between Egypt and the Gulf states.",
  },

  // Telecoms
  ETEL: {
    ar: "المصرية للاتصالات، الشركة الوطنية للاتصالات في مصر ذات التاريخ العريق الممتد منذ إنشاء أولى شبكات التلغراف عام 1854. تتولى تشغيل البنية التحتية الوطنية للاتصالات الثابتة وشبكة الألياف الضوئية وكابلات الإنترنت البحرية الدولية، وهي المشغل الوحيد للخطوط الأرضية في مصر.",
    en: "Telecom Egypt, the national operator with a heritage stretching to Egypt's first telegraph network in 1854. Operates the country's fixed-line infrastructure, national fibre-optic network and international submarine-cable systems, and remains Egypt's sole fixed-line carrier.",
  },
  OREG: {
    ar: "أورانج مصر (موبينيل سابقاً)، تأسست عام 1998 لتكون من أوائل مشغلي الهاتف المحمول في مصر، وأُعيدت تسميتها عام 2016 ضمن مجموعة أورانج الفرنسية العاملة في أكثر من 26 دولة. تخدم أكثر من 40 مليون مشترك وتُقدم خدمات الاتصال والإنترنت الجوال والمدفوعات الرقمية في مصر.",
    en: "Orange Egypt (formerly Mobinil), one of Egypt's first mobile operators, founded in 1998 and rebranded in 2016 under Orange Group (France), which operates in 26+ countries. Serves over 40 million subscribers with mobile, mobile internet and digital-payment services.",
  },
  VODE: {
    ar: "فودافون مصر، تأسست عام 1998 ضمن مجموعة فودافون البريطانية العملاقة العاملة في أكثر من 20 دولة حول العالم. تُقدم خدمات الهاتف المحمول والإنترنت الجوال والمدفوعات الإلكترونية (فودافون كاش) لعشرات الملايين من العملاء في مختلف أنحاء مصر.",
    en: "Vodafone Egypt, founded in 1998 as part of Vodafone Group (UK), operating in 20+ countries worldwide. Provides mobile, broadband and e-payment services (Vodafone Cash) to tens of millions of customers across Egypt.",
  },
  GTHE: {
    ar: "جلوبال تيليكوم هولدينج، شركة اتصالات دولية متعددة الأسواق تابعة لمجموعة VEON الهولندية، تمتلك تراخيص اتصالات وعمليات في عدة أسواق ناشئة بأفريقيا وآسيا. تُعد من أبرز الاستثمارات في قطاع الاتصالات في الأسواق الناشئة والحدودية حول العالم.",
    en: "Global Telecom Holding, an international multi-market telecom company under VEON Group (Netherlands), holding telecom licences and operations in several emerging markets across Africa and Asia. A significant investment vehicle in frontier and emerging-market telecommunications worldwide.",
  },

  // Real Estate
  TMGH: {
    ar: "مجموعة طلعت مصطفى، أكبر شركة تطوير عقاري في مصر والشرق الأوسط، تُطوّر مشروع مدينتي أكبر مجتمع عمراني متكامل في المنطقة بمساحة 8,000 فدان ويضم أكثر من 250,000 وحدة سكنية. تمتلك أيضاً مشروع الرحاب والنور وفنادق ومنتجعات في شرم الشيخ والساحل الشمالي.",
    en: "Talaat Mostafa Group, the largest real-estate developer in Egypt and the Middle East. Develops Madinaty—the region's largest master-planned community spanning 8,000 feddans with 250,000+ units—plus Al Rehab, Al Nour, and hotel and resort projects on the Red Sea and North Coast.",
  },
  PHDC: {
    ar: "بالم هيلز للتطوير، شركة تطوير عقاري رائدة تأسست عام 2005 متخصصة في المجتمعات السكنية المتكاملة الفاخرة. تمتلك مشروعات ضخمة في القاهرة الجديدة ومدينة السادس من أكتوبر والساحل الشمالي وسيناء، بمحفظة أراضٍ تتجاوز 30 مليون متر مربع.",
    en: "Palm Hills Developments, a leading real-estate developer founded in 2005, specialising in premium integrated residential communities. Holds major projects in New Cairo, 6th October, the North Coast and Sinai, with a land bank exceeding 30 million square metres.",
  },
  OCDI: {
    ar: "سوديك (شركة السادس من أكتوبر للتنمية والاستثمار)، مطور عقاري راقٍ تأسس عام 1996 ومتخصص في المجتمعات السكنية الفاخرة. تمتلك مشروعات SODIC West وEast وVYE والنور في مدينة أكتوبر والقاهرة الجديدة، وتستهدف شريحة العملاء ذوي الدخل المرتفع.",
    en: "SODIC (6th of October for Development and Investment), a premium real-estate developer founded in 1996. Operates SODIC West, East, VYE and Al Nour projects in October City and New Cairo, targeting high-income residential buyers.",
  },
  EMFD: {
    ar: "إعمار مصر، الفرع المصري لشركة إعمار العقارية الإماراتية إحدى أكبر شركات التطوير العقاري في العالم. تُطوّر مشروعات ميفيدا وكايرو جيت وأبراج إعمار في القاهرة الجديدة، مُقدِّمةً نموذج الحياة المتكامل الذي أثبتت إعمار نجاحه في دبي والأسواق الدولية.",
    en: "Emaar Misr, the Egyptian subsidiary of Emaar Properties UAE—one of the world's largest real-estate developers. Develops Mivida, Cairo Gate and Emaar Towers in New Cairo, bringing Emaar's proven master-planned community model from Dubai to the Egyptian market.",
  },
  MNHD: {
    ar: "مدينة نصر للإسكان والتعمير، شركة حكومية مصرية تأسست عام 1959 لتُدير وتُطوّر أراضي مدينة نصر إحدى أعرق أحياء القاهرة. تبيع وحدات سكنية وأراضي تجارية وإدارية في محيط مدينة نصر، وتُعد من أعرق وأقدم شركات التطوير العقاري في مصر.",
    en: "Madinet Nasr for Housing and Development, a state-owned company founded in 1959 to manage and develop land in Nasr City, one of Cairo's most established districts. Sells residential, commercial and administrative units and plots in Nasr City, one of Egypt's oldest real-estate companies.",
  },
  HELI: {
    ar: "شركة هيليوبوليس للإسكان والتعمير، من أعرق شركات التطوير العقاري في مصر والعالم، أُسست عام 1906 على يد البارون الإمبراطوري البلجيكي إمبان لتطوير حي مصر الجديدة (هيليوبوليس). تُطوّر وتبيع وحدات سكنية وتجارية في هذا الحي التاريخي الراقي الذي صممه المهندسون الأوروبيون.",
    en: "Heliopolis Housing and Development, one of Egypt's oldest real-estate companies, founded in 1906 by Belgian Baron Empain to develop the Heliopolis district. Develops and sells residential and commercial units in this prestigious historic neighbourhood originally designed by European architects.",
  },
  ARAB: {
    ar: "الشركة العربية للاستثمار العقاري، شركة قابضة عقارية مصرية تمتلك محفظة متنوعة من المشروعات السكنية والتجارية في أرجاء مختلفة من مصر. تسعى لتوسيع محفظتها العقارية والاستفادة من الطفرة العمرانية الكبيرة التي تشهدها مصر في إطار المشروعات القومية الكبرى.",
    en: "Arab Real Estate Investment Company, an Egyptian real-estate holding company with a diversified portfolio of residential and commercial projects across Egypt. Seeks to grow its property portfolio and capitalise on Egypt's major urban expansion driven by large-scale national development initiatives.",
  },

  // Fertilizers & Chemicals
  ABUK: {
    ar: "شركة أبو قير للأسمدة والصناعات الكيماوية، من أكبر منتجي الأسمدة النيتروجينية في الشرق الأوسط وأفريقيا، تأسست عام 1976 ومصنعها الرئيسي في أبو قير بالإسكندرية. تُنتج الأمونيا واليوريا ونترات الأمونيوم وتُصدّر نسبة كبيرة من إنتاجها إلى أسواق أوروبا وآسيا وأمريكا.",
    en: "Abu Qir Fertilizers & Chemical Industries, one of the largest nitrogen-fertilizer producers in MENA and Africa, founded in 1976 with its main plant in Abu Qir, Alexandria. Produces ammonia, urea and ammonium nitrate, exporting a substantial share to European, Asian and American markets.",
  },
  MFPC: {
    ar: "موبكو (شركة مصر لإنتاج الأسمدة)، منشأة صناعية كيماوية ضخمة تأسست عام 2002 في دمياط على ساحل البحر المتوسط. تُنتج اليوريا والأمونيا بطاقة إنتاجية كبيرة معتمدةً على الغاز الطبيعي المصري مدخلاً أساسياً، وتُعد من أحدث وأكبر مصانع الأسمدة في مصر.",
    en: "MOPCO (Misr Fertilizers Production Company), a large chemical-industrial complex founded in 2002 at Damietta on the Mediterranean coast. Produces urea and ammonia at high capacity using Egyptian natural gas as primary feedstock, among the newest and largest fertilizer plants in Egypt.",
  },
  SMFR: {
    ar: "شركة أسمدة مصرية متخصصة في إنتاج الأسمدة النيتروجينية تعتمد على الغاز الطبيعي المحلي مدخلاً أساسياً في العملية الإنتاجية. تُسهم في تلبية احتياجات سوق الأسمدة المحلي وتدعم قطاع الزراعة المصري بمنتجاتها من اليوريا والأمونيا لزيادة الإنتاجية الزراعية.",
    en: "An Egyptian nitrogen-fertilizer producer using local natural gas as its primary feedstock. Contributes to meeting domestic fertilizer-market needs and supports the Egyptian agricultural sector with urea and ammonia products to boost farm productivity.",
  },
  EGCH: {
    ar: "كيما (الشركة المصرية للصناعات الكيماوية)، مصنع صناعي تاريخي في أسوان تأسس عام 1960، يعتمد كلياً على الطاقة الكهرومائية الرخيصة من السد العالي. يُنتج الأسمدة النيتروجينية والكيماويات الصناعية، وكان له دور محوري في مسيرة التصنيع المصري منذ ستينيات القرن الماضي.",
    en: "Kima (Egyptian Chemical Industries), a historic industrial plant in Aswan founded in 1960, running entirely on cheap hydroelectric power from the Aswan High Dam. Produces nitrogen fertilizers and industrial chemicals, and has played a pivotal role in Egypt's industrial history since the 1960s.",
  },
  SKPC: {
    ar: "شركة سيدي كرير للبتروكيماويات (سيكبيك)، متخصصة في إنتاج البولي إيثيلين ومشتقات بتروكيماوية أخرى، تقع في سيدي كرير على ساحل البحر المتوسط غرب الإسكندرية. تُعد من الشركات الريادية في صناعة البتروكيماويات في مصر وتُغذي صناعات تحويلية محلية متعددة.",
    en: "Sidi Kerir Petrochemicals (SIDPEC), specialised in polyethylene and other petrochemical derivatives, located at Sidi Kerir on the Mediterranean coast west of Alexandria. A pioneer in Egypt's petrochemical industry, supplying feedstock to numerous domestic downstream manufacturers.",
  },

  // Steel & Heavy Industry
  ESRS: {
    ar: "شركة حديد عز، أكبر منتج للصلب في مصر ومنطقة الشرق الأوسط وأفريقيا، تأسست عام 1994 وسيطرت على حصة كبيرة من سوق حديد التسليح المحلي بتقنية الفرن القوسي الكهربائي الحديثة. تمتلك طاقة إنتاجية ضخمة وتُصدّر جزءاً من إنتاجها إلى أسواق أفريقيا والشرق الأوسط وأوروبا.",
    en: "Ezz Steel, Egypt's largest steelmaker and one of the biggest in MENA and Africa, founded in 1994. Dominates the domestic rebar market using modern electric-arc furnace technology, holds massive production capacity and exports a portion of output to African, Middle Eastern and European markets.",
  },
  IRAX: {
    ar: "شركة عز الدخيلة للصلب، مصنع صلب رائد يقع في منطقة الدخيلة بالإسكندرية ضمن مجموعة حديد عز. يُنتج حديد التسليح والأشكال الصلبية المتنوعة، ويستفيد من موقعه الاستراتيجي في الميناء لاستيراد الخامات وتصدير المنتجات إلى الأسواق الأوروبية والأفريقية والمتوسطية.",
    en: "Ezz El-Dekheila Steel, a major steel plant in Alexandria's El Dekheila port zone, part of Ezz Steel Group. Produces rebar and various structural steel shapes, leveraging its strategic port location to import raw materials and export products to European, African and Mediterranean markets.",
  },
  SWDY: {
    ar: "السويدي إلكتريك، شركة عالمية رائدة في صناعة الكابلات الكهربائية وحلول نقل الطاقة والطاقة المتجددة والعدادات الذكية، تأسست عام 1938 وتعمل في أكثر من 40 دولة عبر القارات. من أكبر منتجي الكابلات الكهربائية في العالم وتضم أكثر من 25,000 موظف على مستواه.",
    en: "Elsewedy Electric, a global leader in electrical cables, energy-transmission solutions, renewables and smart meters, founded in 1938 and operating in 40+ countries across continents. One of the world's largest cable manufacturers with over 25,000 employees worldwide.",
  },
  EGAL: {
    ar: "الشركة المصرية للألومنيوم (إيجال)، الشركة الحكومية الوحيدة لإنتاج الألومنيوم الأولي في مصر، تأسست عام 1975 ومصنعها في نجع حمادي بصعيد مصر. تعتمد على الطاقة الكهرومائية الرخيصة من السد العالي، وتُنتج سبائك الألومنيوم التي تُغذي صناعات التغليف والإنشاءات والمركبات.",
    en: "Egyptian Aluminium (EGAL), Egypt's sole state-owned primary aluminium producer, founded in 1975 and located in Nag Hammadi, Upper Egypt. Powered by cheap hydroelectric energy from the Aswan High Dam, it produces aluminium ingots that feed packaging, construction and automotive industries.",
  },

  // Finance & Investment
  HRHO: {
    ar: "إي إف جي هيرميس، أكبر بنك استثماري وشركة خدمات مالية متكاملة في منطقة الأسواق الناشئة والحدودية بالشرق الأوسط وأفريقيا، تأسس عام 1984. يعمل في أكثر من 14 دولة منها الإمارات والسعودية والكويت والأردن وباكستان وبنغلاديش وكينيا، ويُقدم إدارة الأصول والوساطة وبنك الاستثمار وإدارة الثروات.",
    en: "EFG Hermes, the largest investment bank and integrated financial-services firm in MENA and frontier markets, founded in 1984. Operates in 14+ countries including UAE, Saudi Arabia, Kuwait, Jordan, Pakistan, Bangladesh and Kenya, offering asset management, brokerage, investment banking and wealth services.",
  },
  FWRY: {
    ar: "فوري لتكنولوجيا البنوك والمدفوعات الإلكترونية، رائدة الدفع الإلكتروني ودفع الفواتير في مصر، تأسست عام 2008 وأُدرجت في البورصة المصرية عام 2019. تخدم أكثر من 30 مليون عميل وتعالج مئات الملايين من المعاملات سنوياً عبر شبكة تتجاوز 300,000 نقطة بيع وخدمة في مصر.",
    en: "Fawry, Egypt's leading e-payment and bill-payment company, founded in 2008 and listed on the EGX in 2019. Serves over 30 million customers and processes hundreds of millions of transactions annually across a network of 300,000+ payment and service points.",
  },
  EFIH: {
    ar: "إي-فاينانس للاستثمارات الرقمية والمالية، منصة الدفع الحكومي الرقمي في مصر تأسست عام 2005. تُشغّل منظومة صرف رواتب الحكومة والمعاشات والدعم النقدي وتحصيل الضرائب والرسوم، وتعالج تريليونات الجنيهات سنوياً لتكون العمود الفقري للتحول الرقمي المالي للدولة المصرية.",
    en: "E-Finance for Digital and Financial Investments, Egypt's government digital-payment platform founded in 2005. Operates the state's salary, pension, cash-subsidy, tax and fee-collection systems, processing trillions of Egyptian pounds annually as the backbone of Egypt's government financial digitalisation.",
  },
  CNFN: {
    ar: "كونتكت للخدمات المالية المتكاملة، شركة رائدة في مجال التمويل الاستهلاكي والتأجير التمويلي وإدارة المدفوعات في مصر. تُقدم حلول التمويل للتجزئة والمستهلكين والشركات، بمحفظة متنوعة من المنتجات المالية تستهدف شرائح الطبقة المتوسطة والمشاريع الصغيرة والمتوسطة.",
    en: "Contact Financial Holding, a leading integrated financial-services company in Egypt providing consumer finance, leasing and payments management. Offers financing solutions for retail, consumer and corporate segments, with a diversified product portfolio targeting middle-income consumers and small businesses.",
  },
  CICH: {
    ar: "مجموعة CI كابيتال للخدمات المالية المتكاملة، تضم CI Capital لخدمات بنك الاستثمار والاكتتابات وإدارة الأصول والوساطة إلى جانب منصات التمويل الاستهلاكي والتأجير التمويلي. من أبرز مجموعات الخدمات المالية في مصر مع طموح للتوسع في الشرق الأوسط وأفريقيا.",
    en: "CI Capital Holding, an integrated financial-services group comprising CI Capital investment banking, underwriting, asset management and brokerage, alongside consumer-finance and leasing platforms. One of Egypt's most prominent financial-services groups with ambitions to expand in MENA and Africa.",
  },
  SRWA: {
    ar: "سروة كابيتال للخدمات المالية، شركة مالية مصرية متخصصة في التمويل الاستهلاكي والتأجير التمويلي وإدارة الأصول وخدمات التحصيل. تُقدم منتجات تمويلية مبتكرة للأفراد والشركات الصغيرة وتسعى لتوسيع قاعدة عملائها عبر القنوات الرقمية الحديثة.",
    en: "Sarwa Capital Financial Services, an Egyptian financial company specialising in consumer finance, leasing, asset management and collection services. Offers innovative financing products for individuals and small businesses, seeking to grow its customer base through modern digital channels.",
  },
  BTFH: {
    ar: "بلتون المالية القابضة، شركة خدمات مالية متكاملة تعمل في إدارة الأصول والوساطة في الأوراق المالية وبنك الاستثمار في مصر والمنطقة. تمتلك خبرة متراكمة في أسواق المال المصرية والعربية وتستهدف المستثمرين من القطاع الخاص والمؤسسي بحلول مالية متطورة.",
    en: "Beltone Financial Holding, an integrated financial-services company providing asset management, securities brokerage and investment banking in Egypt and the region. Holds accumulated expertise in Egyptian and Arab capital markets and targets both private and institutional investors with sophisticated financial solutions.",
  },
  CCAP: {
    ar: "سيتادل كابيتال، شركة قابضة استراتيجية متنوعة تستثمر في قطاعات الطاقة والبنية التحتية والإعلام واللوجستيات والزراعة عبر محفظة واسعة من الشركات التابعة في مصر وأفريقيا. تُركز على الاستثمارات ذات الطابع التنموي والتأثير الاقتصادي في الأسواق الناشئة والحدودية.",
    en: "Citadel Capital, a diversified strategic holding company investing in energy, infrastructure, media, logistics and agriculture through a broad portfolio of subsidiaries in Egypt and Africa. Focuses on development-oriented investments with real economic impact in emerging and frontier markets.",
  },
  OFH: {
    ar: "أوراسكوم للاستثمار المالي، الذراع المالية لمجموعة أوراسكوم القابضة المصرية، متخصصة في الاستثمار في قطاعات الخدمات المالية والتكنولوجيا المالية في مصر ومنطقة الشرق الأوسط وأفريقيا. تُشارك في تأسيس وامتلاك وإدارة شركات مالية واعدة في الأسواق الناشئة.",
    en: "Orascom Financial Holding, the financial arm of Orascom Holding Group, specialising in investments in financial services and fintech in Egypt, MENA and Africa. Participates in founding, owning and managing promising financial companies across emerging markets.",
  },
  EKHO: {
    ar: "المصرية الكويتية القابضة (EKH)، شركة قابضة مصرية-كويتية متنوعة تستثمر في قطاعات الطاقة والبتروكيماويات والأسمدة والتأمين والخدمات المالية. تمتلك حصصاً استراتيجية في عدد من شركات الطاقة والصناعة في مصر وتسعى لتوسيع محفظتها الاستثمارية.",
    en: "Egyptian-Kuwaiti Holding (EKH), a diversified Egyptian-Kuwaiti holding company investing in energy, petrochemicals, fertilizers, insurance and financial services. Holds strategic stakes in several energy and industrial companies in Egypt and pursues ongoing portfolio expansion.",
  },

  // Healthcare
  CLHO: {
    ar: "مجموعة مستشفيات كليوباترا، سلسلة مستشفيات خاصة رائدة في مصر تأسست عام 1978. تضم عدة مستشفيات في القاهرة الكبرى تُقدم خدمات صحية شاملة في الجراحة والأمومة والطوارئ والرعاية المركزة، وتعمل على توسيع شبكتها لتشمل مزيداً من المحافظات المصرية.",
    en: "Cleopatra Hospitals Group, a leading private hospital chain in Egypt founded in 1978. Comprises multiple hospitals across Greater Cairo offering comprehensive healthcare in surgery, maternity, emergency and critical-care specialties, with ongoing plans to expand its network to more governorates.",
  },
  IDHC: {
    ar: "المجموعة المتكاملة للتشخيص (IDH)، أكبر مجموعة مختبرات تشخيصية طبية في مصر والشرق الأوسط، مُدرجة في البورصة المصرية وبورصة لندن. تمتلك شبكة واسعة من المختبرات في مصر وتمتلك Biolab في الأردن وعمليات في السودان، وتخدم ملايين المرضى سنوياً.",
    en: "Integrated Diagnostics Holdings (IDH), the largest medical-diagnostic laboratory group in Egypt and the Middle East, listed on both the EGX and London Stock Exchange. Operates an extensive lab network in Egypt, owns Biolab in Jordan and has operations in Sudan, serving millions of patients annually.",
  },
  ISPH: {
    ar: "ابن سينا فارما، أكبر موزع أدوية في مصر، تأسست عام 2001 وتُدير منظومة لوجستية دوائية متطورة تربط شركات الأدوية بأكثر من 60,000 صيدلية ومستشفى على مستوى الجمهورية. تُعد العمود الفقري لسلسلة توريد الدواء في مصر وتتمتع بتغطية جغرافية شاملة.",
    en: "Ibnsina Pharma, Egypt's largest pharmaceutical distributor, founded in 2001. Operates a sophisticated pharma-logistics network connecting manufacturers to over 60,000 pharmacies and hospitals nationwide, serving as the backbone of Egypt's drug-supply chain with comprehensive geographic coverage.",
  },
  RMDA: {
    ar: "راميدا للأدوية والمستلزمات الطبية، شركة أدوية مصرية رائدة متخصصة في تطوير وإنتاج الأدوية الجنيسة عالية الجودة والكواشف التشخيصية. تعتمد على تكنولوجيا متقدمة وتستهدف أسواق تصدير في الشرق الأوسط وأفريقيا إضافة إلى السوق المحلي.",
    en: "Rameda Pharmaceuticals, a leading Egyptian drug company specialising in developing and manufacturing high-quality generic medicines and diagnostic reagents. Employs advanced technology and targets export markets in MENA and Africa alongside the domestic Egyptian market.",
  },
  MIPH: {
    ar: "مينافارم للأدوية والتكنولوجيا الحيوية، شركة متخصصة في تطوير وتصنيع الأدوية الحيوية (البيولوجيكس) والبروتينات الطبية المعقدة لعلاج الأمراض المزمنة كالسرطان والسكري. تأسست عام 1995 وتستخدم تقنيات بيوتكنولوجية متقدمة نادراً ما تتوفر في مصر والمنطقة.",
    en: "Minapharm Pharmaceuticals, founded in 1995, specialising in developing and manufacturing biopharmaceuticals and complex medical proteins for chronic conditions such as cancer and diabetes. Employs advanced biotech technologies rarely available in Egypt and the wider region.",
  },
  MCRO: {
    ar: "ماكرو جروب للأدوية، شركة قابضة دوائية متنوعة تعمل في توزيع وتصنيع وتسويق الأدوية البشرية في مصر والأسواق الإقليمية. تمتلك شبكة توزيع واسعة وعلاقات مع كبرى الشركات الدوائية العالمية، وتسعى لتوسيع قدراتها التصنيعية والتصديرية.",
    en: "Macro Group Pharmaceuticals, a diversified pharma holding company engaged in drug distribution, manufacturing and marketing for human medicines in Egypt and regional markets. Holds a wide distribution network and partnerships with major global drug companies, while expanding manufacturing and export capabilities.",
  },
  SPMD: {
    ar: "شركة خدمات طبية متخصصة رائدة في مجال إدارة معامل التحاليل الطبية وتقديم خدمات التشخيص الدقيق في مصر. تمتلك شبكة من مراكز التحاليل توفر خدمات تشخيصية شاملة للمرضى في مختلف التخصصات وفق معايير جودة عالمية.",
    en: "A leading specialist medical-services company in medical-laboratory management and precision diagnostics in Egypt. Operates a network of testing centres providing comprehensive diagnostic services across specialties, following international quality standards.",
  },
  NINH: {
    ar: "مستشفى النيل الدولي، منشأة طبية خاصة متخصصة تُقدم خدمات الرعاية الصحية المتقدمة في منطقة النزهة بالقاهرة. تُغطي طيفاً واسعاً من التخصصات الطبية والجراحية وتستهدف تقديم رعاية بمستويات دولية للمرضى المصريين والوافدين على حد سواء.",
    en: "Nile International Hospital, a private specialist medical facility offering advanced healthcare services in Cairo's Nozha district. Covers a wide spectrum of medical and surgical specialties, targeting international-standard care for both Egyptian and foreign patients.",
  },

  // Education
  TALM: {
    ar: "تعليم القابضة، شركة رائدة في إدارة وتشغيل المدارس الخاصة والدولية في مصر. تُشغّل مجموعة من المدارس الدولية والوطنية ذات المناهج المعتمدة دولياً وتخدم عشرات الآلاف من الطلاب، وتستثمر في التوسع بقطاع التعليم قبل الجامعي في ظل الطلب المتنامي.",
    en: "TALEEM Holding, a leading operator of private and international schools in Egypt. Manages internationally accredited national and international-curriculum schools serving tens of thousands of students, investing in pre-university education expansion amid growing demand.",
  },
  MOED: {
    ar: "المجموعة المصرية للتعليم الحديث، شركة متخصصة في تقديم خدمات وحلول التعليم الحديث وإدارة المدارس والمراكز التعليمية في مصر. تُركز على تطوير المناهج الرقمية وتطبيقات التعليم الإلكتروني ودمج التكنولوجيا في العملية التعليمية لتحسين المخرجات.",
    en: "Modern Education Group, a company specialising in modern educational services, school management and learning-centre operations in Egypt. Focuses on developing digital curricula, e-learning applications and integrating technology into the educational process to improve student outcomes.",
  },
  CIRA: {
    ar: "سيرا للاستثمار والتطوير، مجموعة قابضة متنوعة تعمل في قطاع التعليم الجامعي والمدارس الدولية والتطوير العقاري في مصر. تمتلك جامعة سيرا ومدارس دولية وعدداً من مشروعات التطوير العقاري المتكاملة بهدف توفير بيئة تعليمية وسكنية متميزة.",
    en: "CIRA for Investment and Development, a diversified holding group in education (universities and international schools) and real-estate development in Egypt. Owns CIRA University, international schools and integrated real-estate projects, aiming to deliver excellent educational and residential environments.",
  },

  // Food & Consumer
  JUFO: {
    ar: "جهينة للصناعات الغذائية، أكبر منتج للألبان والعصائر والأغذية في مصر، تأسست عام 1983 وتمتلك ماركة جهينة الأشهر في السوق المصري. تمتلك محطات تجميع حليب على مستوى الجمهورية وخطوط إنتاج متنوعة للألبان والعصائر والمياه، وتُصدّر منتجاتها إلى أسواق عربية وأفريقية.",
    en: "Juhayna Food Industries, Egypt's largest dairy, juice and food producer, founded in 1983 and owning the iconic Juhayna brand. Operates milk-collection stations nationwide and diverse production lines for dairy, juice and water, exporting to Arab and African markets.",
  },
  EFID: {
    ar: "إديتا للصناعات الغذائية، شركة رائدة في صناعة الحلوى والمخبوزات المعلبة في مصر والشرق الأوسط، تأسست عام 1996 وتمتلك ماركات شهيرة كهوهوز وتايكي وكريمي. مُدرَجة في بورصتي مصر ولندن، وتُصدّر منتجاتها إلى أكثر من 25 دولة في المنطقة.",
    en: "Edita Food Industries, a leading packaged-snack and baked-goods company in Egypt and MENA, founded in 1996 and owning popular brands including HoHos, Twinkies and Creemy. Listed on both the EGX and London Stock Exchange, exporting products to 25+ countries in the region.",
  },
  DOMT: {
    ar: "دومتي لمنتجات الألبان، أكبر منتج للجبن المطبوخ في مصر، تأسست عام 1990 وتمتلك حصة سوقية تزيد على 60% في فئة الجبن المعالج. تُصدّر منتجاتها إلى أكثر من 25 دولة حول العالم وتمتلك خطوط إنتاج متطورة لمجموعة واسعة من منتجات الألبان والجبن.",
    en: "Domty Dairy Products, Egypt's largest processed-cheese manufacturer, founded in 1990 with a market share exceeding 60% in the processed-cheese segment. Exports to over 25 countries worldwide and operates advanced production lines for a wide range of dairy and cheese products.",
  },
  OLFI: {
    ar: "شركة أراضي العبور للصناعات الغذائية، شركة صناعات غذائية متنوعة تمتلك مصانع في مدينة العبور الصناعية لإنتاج الألبان والأجبان والمنتجات الغذائية المصنعة. من الموردين الرئيسيين لمنتجات الألبان في السوق المصري وتُركز على الجودة والابتكار.",
    en: "Obour Land for Food Industries, a diversified food company with manufacturing plants in Obour Industrial City producing dairy, cheese and processed-food products. A key dairy supplier in the Egyptian market, focused on quality and product innovation.",
  },
  EAST: {
    ar: "الشركة الشرقية للدخان، الشركة الحكومية المحتكرة لإنتاج وتوزيع السجائر ومنتجات التبغ في مصر منذ تأسيسها عام 1920. من أكثر الشركات ربحية في البورصة المصرية، تمتلك ماركات محلية شهيرة وترخيص إنتاج ماركات عالمية كمارلبورو وكنت ووينستون.",
    en: "Eastern Company, the state-owned monopoly for cigarette and tobacco production and distribution in Egypt, established in 1920. One of the EGX's most profitable companies, it owns well-known domestic brands and holds licensed production rights for international brands including Marlboro, Kent and Winston.",
  },
  ADPC: {
    ar: "شركة المنتجات الألبانية العربية، شركة مصرية متخصصة في إنتاج وتسويق مجموعة متنوعة من منتجات الألبان والأجبان العربية الطراز. تُركز على تلبية احتياجات المستهلك المصري من المنتجات الألبانية التقليدية وتعمل على توسيع خطوط منتجاتها ومناطق توزيعها.",
    en: "Arab Dairy Products Company, an Egyptian company specialising in producing and marketing a diverse range of traditional Arab-style dairy and cheese products. Focuses on meeting Egyptian consumer demand for traditional dairy items and works to expand its product lines and distribution reach.",
  },

  // Autos
  AUTO: {
    ar: "جي بي أوتو، أكبر موزع للسيارات والمركبات في مصر ومنطقة الشرق الأوسط وأفريقيا، تأسست عام 1997 ومُدرجة في بورصتي القاهرة ولندن. تُمثّل علامات عالمية كهيونداي وجيلي وشيري وباجاج، وتعمل في قطاعات السيارات الركاب والتجارية والموتوسيكلات والتمويل والضمان.",
    en: "GB Auto, Egypt's largest vehicle distributor and a major MENA/Africa automotive group, founded in 1997 and listed on both the Cairo and London exchanges. Represents global brands including Hyundai, Geely, Chery and Bajaj across passenger cars, commercial vehicles, motorcycles, and vehicle financing and aftersales.",
  },

  // Construction & Engineering
  OCIC: {
    ar: "أوراسكوم للإنشاء، شركة مقاولات عالمية عملاقة تمتد جذورها إلى خمسينيات القرن الماضي وتأسست في شكلها الحالي عام 2015، مُدرجة في بورصة مصر وناسداك دبي. تُنفّذ مشاريع البنية التحتية والطاقة والصناعة والمباني في أمريكا الشمالية والشرق الأوسط وأفريقيا وأوروبا.",
    en: "Orascom Construction, a global construction giant with roots in the 1950s, incorporated in its current form in 2015 and listed on the EGX and NASDAQ Dubai. Executes infrastructure, energy, industrial and building projects across North America, MENA, Africa and Europe.",
  },

  // Media & Tech
  MPRC: {
    ar: "مدينة الإنتاج الإعلامي، أكبر مجمع للإنتاج الإعلامي والتلفزيوني في منطقة الشرق الأوسط وأفريقيا. تمتلك استوديوهات تلفزيونية وسينمائية ضخمة وبنية تحتية متكاملة لما بعد الإنتاج، وتستضيف عشرات القنوات الفضائية ومنتجات الإعلام العربي بمعايير تقنية عالية.",
    en: "Media Production City, the largest media and TV production complex in MENA and Africa. Houses extensive TV and film studios with full post-production infrastructure, hosting dozens of satellite channels and Arab media productions to high technical standards.",
  },
  RAYA: {
    ar: "راية القابضة، مجموعة قابضة مصرية متنوعة تأسست عام 2000 وتعمل في قطاعات تكنولوجيا المعلومات والاتصالات وإدارة المعرفة وتوزيع معدات تكنولوجيا المعلومات والخدمات اللوجستية والتعليم. تمتلك حصصاً في شركات تكنولوجية وخدمية ناجحة في مصر والمنطقة.",
    en: "Raya Holding, a diversified Egyptian holding group founded in 2000, operating in IT, telecoms, knowledge management, IT-equipment distribution, logistics and education. Holds stakes in successful tech and service companies in Egypt and the region.",
  },
  RACC: {
    ar: "راية لمراكز الاتصال وإدارة الأعمال، من أكبر مزودي خدمات مراكز الاتصال وإدارة تجربة العملاء في مصر والشرق الأوسط. تُقدم خدمات outsourcing للتواصل مع العملاء لكبرى الشركات العالمية، وتعمل من عدة مراكز في مصر بفريق عمل يتجاوز الآلاف.",
    en: "Raya Contact Center, one of Egypt's and the Middle East's largest contact-centre and customer-experience management providers. Delivers customer-operations outsourcing to major global companies, operating from multiple centres in Egypt with a workforce of thousands.",
  },
  EGSA: {
    ar: "شركة النيل للاتصالات الفضائية (نايل سات)، تأسست عام 1996 وتُشغّل منظومة الأقمار الصناعية المصرية (نايل سات 201 و204) التي تبث مئات القنوات التلفزيونية وخدمات الإنترنت لجمهور الشرق الأوسط وشمال أفريقيا وأوروبا وجنوب آسيا.",
    en: "NileSat (Nile for Space Communications), founded in 1996, operates Egypt's NileSat 201 and 204 satellite fleet broadcasting hundreds of TV channels and internet services to audiences across MENA, Europe and South Asia.",
  },

  // Textiles
  ORWE: {
    ar: "النساجون الشرقيون، أكبر منتج للسجاد في العالم، تأسست عام 1979 وتُصدّر إلى أكثر من 130 دولة. تمتلك مصانع في مصر والولايات المتحدة الأمريكية (دالتون - جورجيا) وتُسيطر على حصة سوقية عالمية تتجاوز 11% من سوق السجاد الآلي العالمي، وتخدم كبرى العلامات التجارية العالمية.",
    en: "Oriental Weavers, the world's largest carpet manufacturer, founded in 1979 and exporting to 130+ countries. Operates plants in Egypt and the United States (Dalton, Georgia), commands over 11% of the global machine-made carpet market and serves major international brands.",
  },

  // Cement
  ARCC: {
    ar: "الأسمنت العربية، من أكبر منتجي الأسمنت في مصر، تأسست عام 1997 ومصنعها في السويس بطاقة إنتاجية تتجاوز 5 مليون طن سنوياً. تُزود مشاريع البنية التحتية والإسكان في مصر بالأسمنت، وتُصدّر جزءاً من إنتاجها إلى أسواق شرق أفريقيا والشرق الأوسط.",
    en: "Arabian Cement, one of Egypt's largest cement producers, founded in 1997 with its plant in Suez and annual capacity exceeding 5 million tonnes. Supplies Egypt's infrastructure and housing projects and exports part of its output to East African and Middle Eastern markets.",
  },
  SUCE: {
    ar: "مجموعة أسمنت السويس، من أعرق شركات الأسمنت في مصر، تأسست عام 1927 وتتبع الآن مجموعة هايدلبرغ ماتيريالز الألمانية إحدى أكبر شركات مواد البناء في العالم بحضور في أكثر من 50 دولة. تمتلك مصانع في السويس وعطاقة بطاقة إجمالية تتجاوز 10 ملايين طن سنوياً.",
    en: "Suez Cement Group, one of Egypt's oldest cement companies, founded in 1927 and now part of Heidelberg Materials (Germany)—one of the world's largest building-materials companies with presence in 50+ countries. Operates plants in Suez and Ataka with combined annual capacity exceeding 10 million tonnes.",
  },
  ALEXA: {
    ar: "أسمنت الإسكندرية (بورتلاند)، من أوائل وأعرق شركات الأسمنت في مصر، تأسست عام 1948 ومصنعها في منطقة أبو قير بالإسكندرية. تخدم أسواق شمال مصر ومتطلبات البنية التحتية والإسكان، وتُصدّر جزءاً من إنتاجها بطاقة إنتاجية تلبي احتياجات الإنشاءات في المنطقة.",
    en: "Alexandria Portland Cement, one of Egypt's earliest and most established cement companies, founded in 1948 with its plant in the Abu Qir district of Alexandria. Serves northern Egypt's infrastructure and housing demands and exports a portion of its output to meet regional construction needs.",
  },
  SVCE: {
    ar: "أسمنت جنوب الوادي، شركة أسمنت تُشغّل مصانعها في منطقة جنوب الوادي بصعيد مصر. تُسهم بدور محوري في تلبية احتياجات مواد البناء لمشروعات الإسكان والبنية التحتية في جنوب مصر، وتستفيد من القرب الجغرافي من احتياطيات الحجر الجيري الضخمة في الصعيد.",
    en: "South Valley Cement, a cement company operating plants in Upper Egypt's South Valley region. Plays a key role in supplying construction materials for housing and infrastructure projects in southern Egypt, benefiting from proximity to the region's extensive limestone reserves.",
  },
  TORA: {
    ar: "أسمنت طرة، من أقدم وأعرق مصانع الأسمنت في مصر والشرق الأوسط، تأسست عام 1927 ومصنعها في منطقة طرة جنوب القاهرة. تمتلك تاريخاً صناعياً عريقاً وخبرة متراكمة لأكثر من 90 عاماً في صناعة الأسمنت وتُسهم في تلبية احتياجات القاهرة الكبرى من مواد البناء.",
    en: "Tourah Portland Cement, one of Egypt's and the Middle East's oldest cement factories, founded in 1927 with its plant south of Cairo in Tourah. Holds an industrial legacy and accumulated expertise spanning 90+ years in cement manufacturing, supplying the Greater Cairo area.",
  },
  SCEM: {
    ar: "أسمنت سيناء، شركة أسمنت تُشغّل مصانعها في شبه جزيرة سيناء مستفيدةً من الموقع الاستراتيجي والثروات الطبيعية الوفيرة من الحجر الجيري في المنطقة. تُلبي احتياجات مشاريع البنية التحتية والإسكان في سيناء وشرق القناة وتُسهم في التنمية العمرانية بالمنطقة.",
    en: "Sinai Cement, a cement company operating plants in the Sinai Peninsula, leveraging the region's strategic location and abundant natural limestone resources. Serves construction and infrastructure projects in Sinai and the eastern Canal Zone, contributing to urban development in the area.",
  },

  // Oil & Gas
  EGAS: {
    ar: "مصر للغاز، الشركة الحكومية المتخصصة في توزيع الغاز الطبيعي للاستخدامات المنزلية والصناعية والتجارية في عدد من المحافظات المصرية. تُدير شبكة أنابيب توزيع واسعة وتلعب دوراً محورياً في المنظومة الوطنية للطاقة ومخطط تحويل المنازل المصرية للغاز الطبيعي.",
    en: "Egypt Gas, the state-owned specialist in natural gas distribution for domestic, industrial and commercial uses across Egyptian governorates. Manages an extensive gas-distribution pipeline network and plays a pivotal role in the national energy system and Egypt's home gas-conversion programme.",
  },
  MOIL: {
    ar: "شركة حفر بترول البحر المتوسط، متخصصة في خدمات الحفر البحري وإدارة عمليات إنتاج النفط والغاز في البحر الأحمر وشمال أفريقيا والمتوسط. تمتلك أسطولاً من الوحدات البحرية الحفّارة وتُقدم خدمات فنية متخصصة لكبرى شركات النفط الدولية والمحلية.",
    en: "Mediterranean Offshore Leasing, specialised in offshore drilling services and oil-and-gas production management in the Red Sea, North Africa and Mediterranean. Operates a fleet of offshore drilling units and provides specialist technical services to major international and domestic oil companies.",
  },

  // Orascom Group
  ODHN: {
    ar: "أوراسكوم للتنمية القابضة (ODH)، شركة سياحية-عقارية عملاقة تأسست عام 1989 ومُدرجة في بورصتي مصر وسويسرا. تمتلك وتُشغّل مدناً ومنتجعات سياحية متكاملة في مصر (الجونة ومكادي باي وطابا) وسلطنة عُمان (حوانا صلالة) وسويسرا (أندرمات) والمغرب والأردن.",
    en: "Orascom Development Holding (ODH), a major tourism and real-estate developer founded in 1989, listed on both the Egyptian Exchange and SIX Swiss Exchange. Owns and operates integrated tourist destinations in Egypt (El Gouna, Makadi Bay, Taba), Oman (Hawana Salalah), Switzerland (Andermatt), Morocco and Jordan.",
  },
  OTMT: {
    ar: "أوراسكوم للاستثمار القابضة، الشركة القابضة الرئيسية لمجموعة أوراسكوم إحدى أكبر التكتلات الاستثمارية المصرية. تمتلك محفظة متنوعة من الاستثمارات في قطاعات الطاقة والبتروكيماويات والإنشاء والخدمات المالية في مصر ومنطقة الشرق الأوسط وأفريقيا.",
    en: "Orascom Investment Holding, the main holding company of Orascom Group, one of Egypt's largest conglomerates. Holds a diversified portfolio of investments in energy, petrochemicals, construction and financial services in Egypt, MENA and Africa.",
  },
  ORHD: {
    ar: "أوراسكوم للفنادق والتنمية، شركة متخصصة في تطوير وإدارة الفنادق الفاخرة والمنتجعات السياحية والمشروعات العقارية في مصر وعدد من الأسواق الدولية. تمتلك محفظة من العقارات الفندقية الراقية في المناطق السياحية البارزة وتستهدف التوسع الدولي.",
    en: "Orascom Hotels & Development, specialising in developing and managing luxury hotels, tourist resorts and real-estate projects in Egypt and select international markets. Holds a portfolio of upscale hotel properties in prominent tourist destinations and targets international expansion.",
  },

  // Pharma (additional)
  PHAR: {
    ar: "فاركو للأدوية والصناعات الكيماوية، شركة أدوية مصرية رائدة تأسست عام 1983 متخصصة في تطوير وتصنيع الأدوية الجنيسة والمستحضرات الطبية. تُصدّر منتجاتها إلى أكثر من 50 دولة في أفريقيا والشرق الأوسط وآسيا وأمريكا اللاتينية، وتمتلك مصانع بمعايير GMP الدولية.",
    en: "Pharco Pharmaceuticals & Chemical Industries, a leading Egyptian pharmaceutical company founded in 1983, specialising in generic medicines and pharmaceutical preparations. Exports to 50+ countries across Africa, MENA, Asia and Latin America, with GMP-certified manufacturing plants.",
  },
  AXPH: {
    ar: "أكسيس للأدوية (الإسكندرية للأدوية سابقاً)، شركة دوائية راسخة في الإسكندرية تُنتج مجموعة متنوعة من المستحضرات الدوائية والكيماوية للاستخدام البشري. تمتلك خبرة صناعية دوائية طويلة في السوق المصري وتُركز على تعزيز جودة منتجاتها وتوسيع شبكة توزيعها.",
    en: "Axis Pharmaceuticals (formerly Alexandria Pharmaceuticals), an established Alexandria-based pharmaceutical company producing a wide range of medicinal and chemical preparations for human use. Holds long industrial expertise in the Egyptian pharma market, focused on quality improvement and distribution expansion.",
  },

  // Flour Mills
  AFMC: {
    ar: "شركة مطاحن الإسكندرية لتصنيع الدقيق، من أكبر شركات طحن الحبوب في شمال مصر. تمتلك منشآت طحن متطورة في الإسكندرية وتُزود السوق المحلي بالدقيق وردة القمح ومنتجات المطاحن الأخرى، وتُسهم في تحقيق الأمن الغذائي الوطني.",
    en: "Alexandria Flour Mills & Baking, one of northern Egypt's largest grain-milling companies. Operates advanced milling facilities in Alexandria supplying the domestic market with flour, wheat bran and other milled products, contributing to national food security.",
  },
  EDFM: {
    ar: "مطاحن شرق الدلتا، شركة طحن حبوب رائدة تعمل في منطقة شرق دلتا النيل وتُزود المحافظات الشرقية باحتياجاتها من الدقيق ومنتجات الطحن. تمتلك طاقة إنتاجية كبيرة وترتبط بمنظومة الدعم الحكومي لدقيق الخبز المدعم في مصر.",
    en: "East Delta Flour Mills, a leading grain-milling company in Egypt's eastern Nile Delta supplying eastern governorates with flour and milling products. Commands substantial production capacity and is linked to the government's subsidised bread-flour supply programme.",
  },
  MILS: {
    ar: "مطاحن شمال القاهرة، شركة طحن حبوب تعمل في منطقة شمال القاهرة وتُعد من الموردين الرئيسيين للدقيق للعاصمة المصرية. تمتلك طاقة إنتاجية جيدة وتُسهم في منظومة إمداد الخبز المدعم وتلبية احتياجات المخابز والمصانع في القاهرة الكبرى.",
    en: "North Cairo Flour Mills, a grain-milling company north of Cairo and a primary flour supplier to the Egyptian capital. Holds good production capacity and contributes to the subsidised bread-supply system, meeting the flour needs of bakeries and factories across Greater Cairo.",
  },
  WCDF: {
    ar: "مطاحن وسط وغرب الدلتا، شركة طحن حبوب تُشغّل مصانعها في منطقة وسط وغرب دلتا النيل لإمداد المحافظات المجاورة بالدقيق ومنتجات الطحن الأخرى. تمتلك طاقة طحن وافية وتستفيد من قرب المصانع من مناطق زراعة القمح الرئيسية في الدلتا.",
    en: "West and Central Delta Flour Mills, a grain-milling company operating plants in the central and western Nile Delta, supplying neighbouring governorates with flour and other milled products. Has sufficient milling capacity and benefits from proximity to the Delta's main wheat-growing areas.",
  },
};

export function getStockName(ticker: string, lang: 'ar' | 'en' = 'ar'): string {
  const stock = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  if (!stock) return ticker;
  return lang === 'ar' ? stock.nameAr : stock.nameEn;
}

export function getStockInfo(ticker: string): EGXStock | undefined {
  const stock = EGX_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  if (!stock) return undefined;
  const desc = EGX_DESCRIPTIONS[ticker.toUpperCase()];
  if (!desc) return stock;
  return { ...stock, descriptionAr: desc.ar, descriptionEn: desc.en };
}

